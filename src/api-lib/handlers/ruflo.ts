import { Router } from 'express';
import { rufloService } from '../services/RufloIntegrationService.js';

const rufloHandler = Router();

// Health check is public and should not be blocked by user authentication
rufloHandler.get('/health', async (req, res) => {
  try {
    const health = await rufloService.health();
    res.json(health);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Self-contained role verification for admin operations
const requireAdminRole = (req: any, res: any, next: any) => {
  const user = req.user;
  if (!user || !user.role) {
    return res.status(403).json({ error: 'Forbidden: No role assigned' });
  }
  const role = user.role;
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || (Array.isArray(role) && (role.includes('admin') || role.includes('super_admin')));
  if (isSuperAdmin || isAdmin) {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: Requires admin privileges' });
};

rufloHandler.post('/init', requireAdminRole, async (req, res) => {
  try {
    const success = await rufloService.initialize();
    res.json({ success, message: success ? 'Ruflo initialized (L1)' : 'Initialization failed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

rufloHandler.post('/execute', async (req, res) => {
  try {
    const result = await rufloService.execute(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

rufloHandler.get('/metrics', async (req, res) => {
  try {
    const metrics = await rufloService.metrics();
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default rufloHandler;
