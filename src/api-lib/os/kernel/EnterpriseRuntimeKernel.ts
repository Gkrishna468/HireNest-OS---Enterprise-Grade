import { StateEngine } from "./StateEngine.js";
import { DecisionEngine } from "./DecisionEngine.js";
import { WorkflowEngine } from "./WorkflowEngine.js";
import { EventEngine } from "./EventEngine.js";
import { SLAEngine } from "./SLAEngine.js";
import { PolicyEngine } from "./PolicyEngine.js";
import { AuditEngine } from "./AuditEngine.js";
import { CapabilityBroker } from "../capabilities/CapabilityBroker.js";
import { ObjectivesEngine } from "./ObjectivesEngine.js";
import { AICOO } from "./AICOO.js";
import { ContinuousImprovementEngine } from "./ContinuousImprovementEngine.js";
import { EnterpriseSimulation } from "./EnterpriseSimulation.js";

export class EnterpriseRuntimeKernel {
  private static _state?: StateEngine;
  private static _decision?: DecisionEngine;
  private static _workflow?: WorkflowEngine;
  private static _event?: EventEngine;
  private static _sla?: SLAEngine;
  private static _policy?: PolicyEngine;
  private static _audit?: AuditEngine;
  private static _broker?: CapabilityBroker;
  private static _objectives?: ObjectivesEngine;
  private static _coo?: AICOO;
  private static _improvement?: ContinuousImprovementEngine;
  private static _simulation?: EnterpriseSimulation;

  public static get state(): StateEngine {
    if (!this._state) this._state = new StateEngine();
    return this._state;
  }
  public static get decision(): DecisionEngine {
    if (!this._decision) this._decision = new DecisionEngine();
    return this._decision;
  }
  public static get workflow(): WorkflowEngine {
    if (!this._workflow) this._workflow = new WorkflowEngine();
    return this._workflow;
  }
  public static get event(): EventEngine {
    if (!this._event) this._event = new EventEngine();
    return this._event;
  }
  public static get sla(): SLAEngine {
    if (!this._sla) this._sla = new SLAEngine();
    return this._sla;
  }
  public static get policy(): PolicyEngine {
    if (!this._policy) this._policy = new PolicyEngine();
    return this._policy;
  }
  public static get audit(): AuditEngine {
    if (!this._audit) this._audit = new AuditEngine();
    return this._audit;
  }
  public static get broker(): CapabilityBroker {
    if (!this._broker) this._broker = new CapabilityBroker();
    return this._broker;
  }
  public static get objectives(): ObjectivesEngine {
    if (!this._objectives) this._objectives = new ObjectivesEngine();
    return this._objectives;
  }
  public static get coo(): AICOO {
    if (!this._coo) this._coo = new AICOO();
    return this._coo;
  }
  public static get improvement(): ContinuousImprovementEngine {
    if (!this._improvement)
      this._improvement = new ContinuousImprovementEngine();
    return this._improvement;
  }
  public static get simulation(): EnterpriseSimulation {
    if (!this._simulation) this._simulation = new EnterpriseSimulation();
    return this._simulation;
  }
}
