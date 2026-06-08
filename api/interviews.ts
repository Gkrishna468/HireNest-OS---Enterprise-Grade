
import interviewsHandler from '../src/api-lib/handlers/interviews.ts';
export default async function handler(req: any, res: any) {
  return await interviewsHandler(req, res);
}
