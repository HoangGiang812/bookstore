import { Router } from 'express';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { getMyTasks, pickupOrder, completeDelivery, reportFailed, retryDelivery, confirmReturn, getMyRMATasks, pickupRMA, dropoffRMA, replyAssignment, replyRMAAssignment, getTaskPool, claimTask } from '../controllers/shipperController.js';

const r = Router();
// Chỉ shipper mới gọi được
const guard = [requireAuth, requireRoles('shipper')];

r.get('/tasks', ...guard, getMyTasks);
r.post('/tasks/:id/pickup', ...guard, pickupOrder);
r.post('/tasks/:id/complete', ...guard, completeDelivery);
r.post('/tasks/:id/fail', ...guard, reportFailed);
r.post('/tasks/:id/retry', ...guard, retryDelivery);
r.post('/tasks/:id/return', ...guard, confirmReturn);
r.post('/tasks/:id/reply', ...guard, replyAssignment);
r.get('/rma-tasks', ...guard, getMyRMATasks);
r.post('/rma-tasks/:id/reply', ...guard, replyRMAAssignment);
r.post('/rma-tasks/:id/pickup', ...guard, pickupRMA);
r.post('/rma-tasks/:id/dropoff', ...guard, dropoffRMA);
r.get('/pool', ...guard, getTaskPool);
r.post('/claim', ...guard, claimTask);

export default r;