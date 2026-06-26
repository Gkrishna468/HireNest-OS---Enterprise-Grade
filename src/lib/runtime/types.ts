export interface RuntimeContext {
  currentTime: Date;
  businessHours: boolean;
  activeOffices: string[];
}

export interface BusinessGraphNode {
  id: string;
  type: 'Client' | 'Requirement' | 'Vendor' | 'Candidate' | 'Submission' | 'Interview' | 'Placement' | 'Invoice';
  state: string;
  metadata: Record<string, any>;
  connections: string[];
}

export interface OfficeState {
  officeId: string;
  currentState: 'Idle' | 'Working' | 'Waiting_External' | 'Blocked' | 'Escalated' | 'Completed';
  currentTask?: string;
  activeWorkflows: number;
  capacity: number;
  health: 'Healthy' | 'Degraded' | 'Failing';
}

export interface EnterpriseEvent {
  eventId: string;
  eventType: string;
  sourceOffice: string;
  timestamp: Date;
  payload: Record<string, any>;
  priority: 'Low' | 'Normal' | 'High' | 'Critical';
  requiredSLA?: number;
}
