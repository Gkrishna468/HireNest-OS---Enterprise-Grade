
import adminHandler from '../src/api-lib/handlers/admin.ts';
export default async function handler(req: any, res: any) {
  return await adminHandler(req, res);
}
