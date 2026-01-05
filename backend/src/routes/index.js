
import { Router } from 'express';
import auth from '../../modules/auth/controller.js';
import uploads from '../../modules/uploads/controller.js';
import employees from '../../modules/employees/controller.js';
import vouchers from '../../modules/vouchers/controller.js';
import analytics from '../../modules/analytics/controller.js';
import designations from '../../modules/designations/controller.js';
import targets from '../../modules/targets/controller.js';

const router = Router();

router.use('/auth', auth);
router.use('/uploads', uploads);
router.use('/employees', employees);
router.use('/vouchers', vouchers);
router.use('/analytics', analytics);
router.use('/designations', designations);
router.use('/targets', targets);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
