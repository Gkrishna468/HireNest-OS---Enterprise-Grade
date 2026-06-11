export interface Client {
  id: string; // The canonical ID
  name: string;
  industry: string;
  contactPerson: string;
  activeRequirements: number;
  totalPlacements: number;
  accessSettings: string; // Or a specific type if you prefer, going with string as per the markdown
}

export type ClientInput = Omit<Client, 'id'>;
export type ClientUpdate = Partial<ClientInput>;
