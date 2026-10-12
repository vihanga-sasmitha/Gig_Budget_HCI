const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const reportController = require('../controllers/reportController');
const syncController = require('../controllers/syncController');
const savingsController = require('../controllers/savingsController');
const billController = require('../controllers/billController');
const notificationController = require('../controllers/notificationController');
const fxController = require('../controllers/fxController');
const { createCrudController } = require('../controllers/crudFactory');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Platform = require('../models/Platform');
const Budget = require('../models/Budget');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/health', (_req, res) => res.json({ ok: true, service: 'gigbudget-api' }));
/** Public FX table for display conversion — no secrets in client. */
router.get('/fx/rates', fxController.rates);

router.post('/auth/register', authLimiter, authController.register);
router.post('/auth/login', authLimiter, authController.login);
router.post('/auth/refresh', authLimiter, authController.refresh);
router.post('/auth/forgot-password', authLimiter, authController.forgotPassword);
router.post('/auth/reset-password', authLimiter, authController.resetPassword);
router.post('/auth/logout', requireAuth, authController.logout);
router.post('/auth/change-password', requireAuth, authController.changePassword);

router.get('/users/me', requireAuth, userController.me);
router.patch('/users/me', requireAuth, userController.updateMe);
router.patch('/users/me/preferences', requireAuth, userController.updatePreferences);
router.delete('/users/me', requireAuth, userController.deleteMe);

function mountCrud(path, Model, mapCreate) {
  const c = createCrudController(Model, { mapCreate });
  router.get(path, requireAuth, c.list);
  router.get(`${path}/:id`, requireAuth, c.get);
  router.post(path, requireAuth, c.create);
  router.patch(`${path}/:id`, requireAuth, c.update);
  router.delete(`${path}/:id`, requireAuth, c.remove);
}

const asTyped = (type) => (body) => ({ ...body, type });

mountCrud('/income', Transaction, asTyped('income'));
mountCrud('/expenses', Transaction, asTyped('expense'));
mountCrud('/categories', Category);
mountCrud('/platforms', Platform);
mountCrud('/budgets', Budget);

router.get('/savings-goals', requireAuth, savingsController.list);
router.get('/savings-goals/:id', requireAuth, savingsController.get);
router.post('/savings-goals', requireAuth, savingsController.create);
router.patch('/savings-goals/:id', requireAuth, savingsController.update);
router.delete('/savings-goals/:id', requireAuth, savingsController.remove);
router.post('/savings-goals/:id/entries', requireAuth, savingsController.addEntry);
router.patch('/savings-goals/:id/entries/:entryId', requireAuth, savingsController.updateEntry);
router.delete('/savings-goals/:id/entries/:entryId', requireAuth, savingsController.deleteEntry);

router.get('/bills', requireAuth, billController.list);
router.get('/bills/:id', requireAuth, billController.get);
router.post('/bills', requireAuth, billController.create);
router.patch('/bills/:id', requireAuth, billController.update);
router.delete('/bills/:id', requireAuth, billController.remove);
router.post('/bills/:id/pay', requireAuth, billController.pay);

router.get('/notifications', requireAuth, notificationController.list);
router.post('/notifications', requireAuth, notificationController.create);
router.post('/notifications/:id/read', requireAuth, notificationController.markRead);
router.delete('/notifications/:id', requireAuth, notificationController.remove);

router.get('/dashboard', requireAuth, reportController.dashboard);
router.get('/reports', requireAuth, reportController.reports);
router.post('/sync/push', requireAuth, syncController.push);
router.get('/sync/pull', requireAuth, syncController.pull);

module.exports = router;
