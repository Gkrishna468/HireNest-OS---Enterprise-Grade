
import userHandler from '../src/api-lib/handlers/user.ts';
export default async function handler(req: any, res: any) {
  return await userHandler(req, res);
}
