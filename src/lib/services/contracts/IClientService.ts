import { Client, ClientInput, ClientUpdate } from '../../../types/Client';

export interface IClientService {
  getClient(id: string): Promise<Client | null>;
  createClient(data: ClientInput): Promise<Client>;
  updateClient(id: string, updates: ClientUpdate): Promise<void>;
  archiveClient(id: string): Promise<void>;
}
