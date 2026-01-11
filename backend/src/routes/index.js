
import { Router } from 'express';
import auth from '../../modules/auth/controller.js';
import uploads from '../../modules/uploads/controller.js';
import employees from '../../modules/employees/controller.js';
import vouchersRouter from '../../modules/vouchers/routes.js';
import analytics from '../../modules/analytics/controller.js';
import designations from '../../modules/designations/controller.js';
import targets from '../../modules/targets/controller.js';
import creditnotes from '../../modules/creditnotes/controller.js';

const router = Router();

router.use('/auth', auth);
router.use('/uploads', uploads);
router.use('/employees', employees);
router.use('/vouchers', vouchersRouter);
router.use('/analytics', analytics);
router.use('/designations', designations);
router.use('/targets', targets);
router.use('/creditnotes', creditnotes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
