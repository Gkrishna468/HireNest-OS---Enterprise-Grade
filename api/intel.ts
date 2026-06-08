
import intelHandler from '../src/api-lib/handlers/intel.ts';
export default async function handler(req: any, res: any) {
  return await intelHandler(req, res);
}
