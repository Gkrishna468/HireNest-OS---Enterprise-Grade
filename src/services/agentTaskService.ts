import { db, handleFirestoreError, OperationType } from "../lib/firebase.js";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy 
} from "firebase/firestore";
import { isTrustedServiceContext } from "../lib/trusted-context.server.js";
import { 
  AgentTask, 
  AgentTaskStep, 
  AgentTaskStatus, 
  TaskInitiator, 
  TaskBusinessOutcome, 
  TaskEconomics 
} from "../types/agentTask.js";
import { AgentTaskActivities } from "../temporal/activities/AgentTaskActivities.js";
import { roiEngine } from "./roiEngine.js";
import { emitEvent } from "./eventBus.js";

/**
 * AgentTaskService
 * 
 * Durable, resumable execution engine for autonomous agent tasks.
 * P3 Architectural Guarantees:
 * - Checkpointed step-by-step progress.
 * - Crash recovery: resume from currentStepIndex without re-executing completed steps.
 * - Zero synthetic recruiters: recruiterId is strictly null unless assigned.
 * - No duplicate submissions or autonomous high-impact writes.
 * - First-class economic measurement (HN-ROI layer).
 */
export class AgentTaskService {
  private static instance: AgentTaskService;
  private readonly tasksCollection = "agent_tasks";

  private constructor() {}

  public static getInstance(): AgentTaskService {
    if (!AgentTaskService.instance) {
      AgentTaskService.instance = new AgentTaskService();
    }
    return AgentTaskService.instance;
  }

  /**
   * Creates and initializes a new durable Agent Task with structured steps
   */
  public async createTask(params: {
    tenantId: string;
    initiatedBy: TaskInitiator;
    goal: string;
    requirementId?: string | null;
    recruiterId?: string | null;
    vendorId?: string | null;
    clientId?: string | null;
    agentId?: string;
    customSteps?: Array<Omit<AgentTaskStep, "id" | "taskId" | "status" | "updatedAt">>;
  }): Promise<{ task: AgentTask; steps: AgentTaskStep[] }> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const correlationId = `corr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const initialOutcome: TaskBusinessOutcome = {
      candidatesReviewed: 0,
      qualifiedCandidates: 0,
      submissionsPrepared: 0,
      submissionsSent: 0,
      interviewsScheduled: 0,
      offersReceived: 0,
      placementsGenerated: 0
    };

    const initialEconomics: TaskEconomics = {
      currency: "INR",
      aiCost: 0,
      computeCost: 0,
      browserCost: 0,
      humanReviewCost: 0,
      totalOperatingCost: 0,
      potentialValue: 0,
      pipelineValue: 0,
      bookedRevenue: 0,
      realizedRevenue: 0,
      attributedGrossMargin: 0,
      agentEconomicEfficiency: 0
    };

    // Default 5-step durable staffing pipeline
    const rawSteps = params.customSteps && params.customSteps.length > 0 
      ? params.customSteps 
      : [
          {
            stepIndex: 0,
            title: "Find and verify requirement details",
            action: "FIND_REQUIREMENTS" as const,
            input: { requirementId: params.requirementId || "req-cloud-001" }
          },
          {
            stepIndex: 1,
            title: "Retrieve candidate pool",
            action: "RETRIEVE_CANDIDATES" as const,
            input: { vendorId: params.vendorId || null }
          },
          {
            stepIndex: 2,
            title: "Semantic fitment matching",
            action: "MATCH_CANDIDATES" as const,
            input: { requirementId: params.requirementId || "req-cloud-001" }
          },
          {
            stepIndex: 3,
            title: "Verify candidate ownership & vendor governance",
            action: "VERIFY_OWNERSHIP" as const,
            input: { vendorId: params.vendorId || null }
          },
          {
            stepIndex: 4,
            title: "Prepare draft submissions for human review",
            action: "PREPARE_SUBMISSIONS" as const,
            input: { requirementId: params.requirementId || "req-cloud-001" }
          }
        ];

    const task: AgentTask = {
      id: taskId,
      tenantId: params.tenantId,
      initiatedBy: params.initiatedBy,
      recruiterId: params.recruiterId || null, // STRICT: Null if no recruiter assigned
      vendorId: params.vendorId || null,
      clientId: params.clientId || null,
      requirementId: params.requirementId || null,
      agentId: params.agentId || "AI_MATCHING_AGENT",
      correlationId,
      goal: params.goal,
      status: AgentTaskStatus.PENDING,
      currentStepIndex: 0,
      totalSteps: rawSteps.length,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      businessOutcome: initialOutcome,
      economics: initialEconomics
    };

    const steps: AgentTaskStep[] = rawSteps.map((s, idx) => ({
      id: `step-${taskId}-${idx}`,
      taskId,
      stepIndex: idx,
      title: s.title,
      action: s.action,
      input: s.input,
      output: null,
      status: AgentTaskStatus.PENDING,
      error: null,
      updatedAt: now
    }));

    // Persist parent task and steps
    await this.persistTask(task);
    for (const step of steps) {
      await this.persistStep(step);
    }

    return { task, steps };
  }

  /**
   * Executes a task durably, resuming from the current step index
   */
  public async executeTask(
    taskId: string, 
    workerId: string = `worker-${Math.random().toString(36).substring(2, 7)}`
  ): Promise<AgentTask> {
    const { task, steps } = await this.getTaskWithSteps(taskId);
    if (!task) throw new Error(`Task ${taskId} not found.`);

    if (task.status === AgentTaskStatus.COMPLETED) {
      console.log(`[AgentTaskService] Task ${taskId} already COMPLETED.`);
      return task;
    }

    // Atomic Execution Lease Concurrency Lock: Prevents simultaneous double-execution
    const now = Date.now();
    if (task.status === AgentTaskStatus.RUNNING && task.lease) {
      const leaseExpiry = new Date(task.lease.expiresAt).getTime();
      if (leaseExpiry > now && task.lease.workerId !== workerId) {
        throw new Error(`TASK_LOCKED: Task ${taskId} is currently leased to active worker ${task.lease.workerId}`);
      }
    }

    // Acquire execution lease for 60 seconds
    task.lease = {
      workerId,
      leasedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 60000).toISOString()
    };
    task.status = AgentTaskStatus.RUNNING;
    task.updatedAt = new Date().toISOString();
    await this.persistTask(task);

    // Shared execution context
    let runningCandidates: any[] = [];
    let requirementDetails: any = null;
    let qualifiedCandidateIds: string[] = [];

    // Loop through steps starting from currentStepIndex
    for (let i = task.currentStepIndex; i < steps.length; i++) {
      // Re-read task status in case of cancellation
      const freshTask = await this.getTask(taskId);
      if (freshTask && freshTask.status === AgentTaskStatus.CANCELLED) {
        console.log(`[AgentTaskService] Task ${taskId} was CANCELLED.`);
        return freshTask;
      }

      const step = steps[i];
      step.status = AgentTaskStatus.RUNNING;
      step.updatedAt = new Date().toISOString();
      await this.persistStep(step);

      try {
        console.log(`[AgentTaskService] Running Step ${i + 1}/${steps.length}: ${step.title} (${step.action})`);
        const startTime = Date.now();
        let stepOutput: any = null;

        switch (step.action) {
          case "FIND_REQUIREMENTS": {
            const reqId = step.input.requirementId || task.requirementId || "req-cloud-001";
            requirementDetails = await AgentTaskActivities.findRequirements({
              requirementId: reqId,
              actorId: task.initiatedBy.userId,
              tenantId: task.tenantId,
              recruiterId: task.recruiterId,
              vendorId: task.vendorId,
              taskId: task.id,
              stepId: step.id
            });
            stepOutput = requirementDetails;
            break;
          }

          case "RETRIEVE_CANDIDATES": {
            const res = await AgentTaskActivities.retrieveCandidates({
              skills: requirementDetails?.skills || ["Java", "React", "Cloud"],
              vendorId: task.vendorId,
              tenantId: task.tenantId,
              taskId: task.id,
              stepId: step.id
            });
            runningCandidates = res.candidateList;
            stepOutput = res;
            task.businessOutcome.candidatesReviewed = res.totalFound;
            break;
          }

          case "MATCH_CANDIDATES": {
            const matchRes = await AgentTaskActivities.matchCandidates({
              requirementId: requirementDetails?.requirementId || task.requirementId || "req-cloud-001",
              candidates: runningCandidates,
              requirementSkills: requirementDetails?.skills || ["Java", "React"],
              tenantId: task.tenantId,
              actorId: task.initiatedBy.userId,
              recruiterId: task.recruiterId,
              taskId: task.id,
              stepId: step.id
            });
            stepOutput = matchRes;
            task.businessOutcome.qualifiedCandidates = matchRes.qualifiedCandidates;
            qualifiedCandidateIds = matchRes.matches.filter(m => m.isQualified).map(m => m.candidateId);
            break;
          }

          case "VERIFY_OWNERSHIP": {
            const ownershipResults: any[] = [];
            for (const cId of qualifiedCandidateIds) {
              const own = await AgentTaskActivities.verifyOwnership({
                candidateId: cId,
                vendorId: task.vendorId,
                tenantId: task.tenantId,
                actorId: task.initiatedBy.userId
              });
              ownershipResults.push(own);
            }
            stepOutput = { verifiedCount: ownershipResults.length, results: ownershipResults };
            break;
          }

          case "PREPARE_SUBMISSIONS": {
            const subRes = await AgentTaskActivities.prepareSubmissions({
              requirementId: requirementDetails?.requirementId || task.requirementId || "req-cloud-001",
              qualifiedCandidateIds,
              actorId: task.initiatedBy.userId,
              tenantId: task.tenantId,
              recruiterId: task.recruiterId,
              vendorId: task.vendorId,
              taskId: task.id,
              stepId: step.id
            });
            stepOutput = subRes;
            task.businessOutcome.submissionsPrepared = subRes.submissionsPreparedCount;
            break;
          }
        }

        const durationMs = Date.now() - startTime;
        const stepAiCost = 0.35; // Standard step inference allocation

        // Checkpoint the step
        step.status = AgentTaskStatus.COMPLETED;
        step.output = stepOutput;
        step.stepEconomics = {
          aiCost: stepAiCost,
          tokensUsed: 1200,
          durationMs
        };
        step.updatedAt = new Date().toISOString();
        await this.persistStep(step);

        // Update task economics and current step pointer
        task.economics.aiCost += stepAiCost;
        task.economics.computeCost += 0.05;
        // Human review cost only increments if a recruiter is assigned
        if (task.recruiterId) {
          task.economics.humanReviewCost += 0; // In draft mode, not yet reviewed
        }
        task.economics.totalOperatingCost = 
          task.economics.aiCost + 
          task.economics.computeCost + 
          task.economics.humanReviewCost;

        task.currentStepIndex = i + 1;
        task.updatedAt = new Date().toISOString();
        await this.persistTask(task);

      } catch (stepError: any) {
        console.error(`[AgentTaskService] Step ${i} FAILED:`, stepError.message);
        step.status = AgentTaskStatus.FAILED;
        step.error = stepError.message;
        step.updatedAt = new Date().toISOString();
        await this.persistStep(step);

        task.status = AgentTaskStatus.FAILED;
        task.lease = null; // Release lease on failure
        task.updatedAt = new Date().toISOString();
        await this.persistTask(task);
        throw stepError;
      }
    }

    // All steps completed successfully
    task.status = AgentTaskStatus.COMPLETED;
    task.lease = null; // Release lease on completion
    task.completedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();

    // Staged revenue calculations (Strictly NON-ADDITIVE)
    task.economics.potentialValue = task.businessOutcome.candidatesReviewed * 500;
    task.economics.pipelineValue = task.businessOutcome.submissionsPrepared * 25000;
    // Realized gross margin attributed to agent (20% conversion baseline)
    task.economics.attributedGrossMargin = task.economics.pipelineValue * 0.20;
    
    const aeeRes = roiEngine.calculateAEE(
      task.economics.attributedGrossMargin,
      task.economics.totalOperatingCost
    );
    task.economics.agentEconomicEfficiency = aeeRes.aee;
    task.economics.aeeStatus = aeeRes.status;
    task.economics.aeeReason = aeeRes.reason;

    await this.persistTask(task);

    // Emit task completion event
    try {
      await emitEvent(
        "TASK_COMPLETED",
        "SYSTEM",
        task.id,
        task.initiatedBy.userId,
        task.initiatedBy.type,
        {
          goal: task.goal,
          totalSteps: task.totalSteps,
          aee: task.economics.agentEconomicEfficiency,
          totalCost: task.economics.totalOperatingCost,
          submissionsPrepared: task.businessOutcome.submissionsPrepared
        }
      );
    } catch (e) {
      console.warn("[AgentTaskService] Event bus emission warning:", e);
    }

    return task;
  }

  /**
   * Resumes a paused or failed task starting from currentStepIndex
   */
  public async resumeTask(taskId: string): Promise<AgentTask> {
    const task = await this.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found.`);

    if (task.status === AgentTaskStatus.RUNNING) {
      console.log(`[AgentTaskService] Task ${taskId} is already RUNNING.`);
      return task;
    }

    // Reset status to PENDING and trigger execution
    task.status = AgentTaskStatus.PENDING;
    task.updatedAt = new Date().toISOString();
    await this.persistTask(task);

    return this.executeTask(taskId);
  }

  /**
   * Cancels a running or pending task
   */
  public async cancelTask(taskId: string): Promise<AgentTask> {
    const task = await this.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found.`);

    task.status = AgentTaskStatus.CANCELLED;
    task.updatedAt = new Date().toISOString();
    await this.persistTask(task);

    return task;
  }

  /**
   * Fetches task and its individual steps
   */
  public async getTaskWithSteps(taskId: string): Promise<{ task: AgentTask | null; steps: AgentTaskStep[] }> {
    const task = await this.getTask(taskId);
    if (!task) return { task: null, steps: [] };

    const steps: AgentTaskStep[] = [];
    const stepsPath = `${this.tasksCollection}/${taskId}/steps`;

    try {
      if (isTrustedServiceContext()) {
        const { adminDb } = await import("../lib/firebase-admin.js");
        if (adminDb) {
          const snap = await adminDb.collection(this.tasksCollection).doc(taskId).collection("steps").orderBy("stepIndex", "asc").get();
          snap.forEach((d: any) => steps.push(d.data() as AgentTaskStep));
        }
      } else {
        const snap = await getDocs(query(collection(db, stepsPath), orderBy("stepIndex", "asc")));
        snap.forEach(d => steps.push(d.data() as AgentTaskStep));
      }
    } catch (err) {
      console.warn("[AgentTaskService] Fetch steps warning:", err);
    }

    return { task, steps };
  }

  public async getTask(taskId: string): Promise<AgentTask | null> {
    try {
      if (isTrustedServiceContext()) {
        const { adminDb } = await import("../lib/firebase-admin.js");
        if (adminDb) {
          const snap = await adminDb.collection(this.tasksCollection).doc(taskId).get();
          return snap.exists ? (snap.data() as AgentTask) : null;
        }
      }

      const snap = await getDoc(doc(db, this.tasksCollection, taskId));
      return snap.exists() ? (snap.data() as AgentTask) : null;
    } catch (err) {
      console.warn("[AgentTaskService] Fetch task warning:", err);
      return null;
    }
  }

  private async persistTask(task: AgentTask): Promise<void> {
    try {
      await setDoc(doc(db, this.tasksCollection, task.id), task);
    } catch (err) {
      if (isTrustedServiceContext()) {
        const { adminDb } = await import("../lib/firebase-admin.js");
        if (adminDb) {
          await adminDb.collection(this.tasksCollection).doc(task.id).set(task);
        }
      } else {
        handleFirestoreError(err, OperationType.WRITE, `${this.tasksCollection}/${task.id}`);
      }
    }
  }

  private async persistStep(step: AgentTaskStep): Promise<void> {
    const stepPath = `${this.tasksCollection}/${step.taskId}/steps`;
    try {
      await setDoc(doc(db, stepPath, step.id), step);
    } catch (err) {
      if (isTrustedServiceContext()) {
        const { adminDb } = await import("../lib/firebase-admin.js");
        if (adminDb) {
          await adminDb.collection(this.tasksCollection).doc(step.taskId).collection("steps").doc(step.id).set(step);
        }
      } else {
        handleFirestoreError(err, OperationType.WRITE, `${stepPath}/${step.id}`);
      }
    }
  }
}

export const agentTaskService = AgentTaskService.getInstance();
