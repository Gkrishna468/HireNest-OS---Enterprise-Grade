
import analyticsHandler from '../src/api-lib/handlers/analytics.ts';
export default async function handler(req: any, res: any) {
  return await analyticsHandler(req, res);
}
