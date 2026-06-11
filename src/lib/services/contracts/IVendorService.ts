import { Vendor, VendorInput, VendorUpdate } from '../../../types/Vendor';

export interface IVendorService {
  getVendor(id: string): Promise<Vendor | null>;
  createVendor(data: VendorInput): Promise<Vendor>;
  updateVendor(id: string, updates: VendorUpdate): Promise<void>;
  archiveVendor(id: string): Promise<void>;
}
