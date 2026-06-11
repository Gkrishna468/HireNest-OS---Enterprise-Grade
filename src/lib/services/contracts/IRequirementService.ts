import { Requirement, RequirementInput, RequirementUpdate } from '../../../types/Requirement';

export interface IRequirementService {
  getRequirement(id: string): Promise<Requirement | null>;
  createRequirement(data: RequirementInput): Promise<Requirement>;
  updateRequirement(id: string, updates: RequirementUpdate): Promise<void>;
  archiveRequirement(id: string): Promise<void>;
}
