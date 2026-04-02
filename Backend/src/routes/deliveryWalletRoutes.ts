import { Router } from 'express';
import { authenticate, requireUserType } from '../middleware/auth';
import {
    getBalance,
    getTransactions,
    requestWithdrawal,
    getWithdrawals,
    getCommissions,
    createSettleCashOrder,
    hdfcSettleCashReturn,
    hdfcSettleCashCancel,
} from '../modules/delivery/controllers/deliveryWalletController';

const router = Router();

// Settlement callbacks (Public - Called by HDFC)
router.post('/settle-cash/return', hdfcSettleCashReturn);
router.post('/settle-cash/cancel', hdfcSettleCashCancel);

// All other routes require delivery boy authentication
router.use(authenticate, requireUserType('Delivery'));

// Wallet balance
router.get('/balance', getBalance);

// Wallet transactions
router.get('/transactions', getTransactions);

// Withdrawal requests
router.post('/withdraw', requestWithdrawal);
router.get('/withdrawals', getWithdrawals);

// Commission earnings
router.get('/commissions', getCommissions);

// Settle Cash
router.post('/settle-cash/create', createSettleCashOrder);
export default router;
