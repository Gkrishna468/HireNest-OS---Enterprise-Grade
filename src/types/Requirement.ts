export interface Requirement {
  id: string; // The canonical ID
  clientId: string;
  title: string;
  skills: string[];
  budget: string;
  priority: string;
  status: string;
  submissions: string[]; // List of submission IDs
}

export type RequirementInput = Omit<Requirement, 'id'>;
export type RequirementUpdate = Partial<RequirementInput>;
