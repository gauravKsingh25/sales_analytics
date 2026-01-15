import express from 'express';
import {
  getAllVouchers,
  getVoucherById,
  getVoucherStats,
  getPartyTransactions,
  getVoucherItems
} from './controller.js';

const router = express.Router();

router.get('/', getAllVouchers);
router.get('/stats', getVoucherStats);
router.get('/party/:partyName/transactions', getPartyTransactions);
router.get('/:id/items', getVoucherItems);
router.get('/:id', getVoucherById);

export default router;
