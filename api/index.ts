import expressAppPromise from "../server";

export default async function handler(req: any, res: any) {
  const app = await expressAppPromise;
  return app(req, res);
}
