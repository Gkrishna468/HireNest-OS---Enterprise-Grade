import { StateEngine } from './StateEngine.js';
import { DecisionEngine } from './DecisionEngine.js';
import { WorkflowEngine } from './WorkflowEngine.js';
import { EventEngine } from './EventEngine.js';
import { SLAEngine } from './SLAEngine.js';
import { PolicyEngine } from './PolicyEngine.js';
import { AuditEngine } from './AuditEngine.js';
import { CapabilityBroker } from '../capabilities/CapabilityBroker.js';
import { ObjectivesEngine } from './ObjectivesEngine.js';
import { AICOO } from './AICOO.js';
import { ContinuousImprovementEngine } from './ContinuousImprovementEngine.js';
import { EnterpriseSimulation } from './EnterpriseSimulation.js';

export class EnterpriseRuntimeKernel {
    public static state = new StateEngine();
    public static decision = new DecisionEngine();
    public static workflow = new WorkflowEngine();
    public static event = new EventEngine();
    public static sla = new SLAEngine();
    public static policy = new PolicyEngine();
    public static audit = new AuditEngine();
    public static broker = new CapabilityBroker();
    public static objectives = new ObjectivesEngine();
    public static coo = new AICOO();
    public static improvement = new ContinuousImprovementEngine();
    public static simulation = new EnterpriseSimulation();
}
