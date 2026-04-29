import express from 'express';
import { Record } from '../models/Record.js';
import { getRecord, listRecords, patchRecord, removeRecord, saveRecord } from '../utils/store.js';
import { seedRecords } from '../data/seedData.js';
import { ensureStaffUser, removeStaffUser } from '../utils/staffAuth.js';

export const crudRouter = express.Router();

const prefixes = {
  inventory: 'INV',
  assets: 'AST',
  expenses: 'EXP',
  leads: 'LEAD',
  billingInvoices: 'BILL',
  dashboardSnapshots: 'DASH',
  expenseDashboardSnapshots: 'EXPDASH',
  dashboardAlerts: 'DAL',
  staff: 'STF',
  pendingJobs: 'JOB',
  campaigns: 'CAMP',
  campaignJobs: 'JOB',
  campaignPricingTemplates: 'PRICE',
  campaignInventoryParts: 'PART',
  rentalCustomers: 'RC',
  rentalAssets: 'AST',
  rentalContracts: 'RCON',
  rentalInvoices: 'INV',
  rentalPayments: 'PAY',
  rentalQuotations: 'RQ',
  rentalMaintenanceLogs: 'MNT',
  rentalAlerts: 'ALT',
  amcPlans: 'AMCPLN',
  amcContracts: 'AMC',
  amcDevices: 'AMCDEV',
  amcSchedules: 'AMCSCH',
  amcInvoices: 'AMCI',
  amcRenewals: 'AMCR',
  cmcPlans: 'CMCPLN',
  cmcContracts: 'CMC',
  cmcDevices: 'CMCDEV',
  cmcSchedules: 'CMCSCH',
  cmcInvoices: 'CMCI',
  cmcPartsUsage: 'CMCPRT',
};

const allowedCollections = new Set([
  'inventory',
  'assets',
  'expenses',
  'leads',
  'billingInvoices',
  'dashboardSnapshots',
  'expenseDashboardSnapshots',
  'dashboardAlerts',
  'staff',
  'pendingJobs',
  'campaigns',
  'campaignJobs',
  'campaignPricingTemplates',
  'campaignInventoryParts',
  'rentalCustomers',
  'rentalAssets',
  'rentalContracts',
  'rentalInvoices',
  'rentalPayments',
  'rentalQuotations',
  'rentalPricingPlans',
  'rentalMaintenanceLogs',
  'rentalAlerts',
  'amcPlans',
  'amcContracts',
  'amcDevices',
  'amcSchedules',
  'amcInvoices',
  'amcRenewals',
  'cmcPlans',
  'cmcContracts',
  'cmcDevices',
  'cmcSchedules',
  'cmcInvoices',
  'cmcPartsUsage',
]);

crudRouter.param('collection', (req, res, next, collection) => {
  if (!allowedCollections.has(collection)) {
    return res.status(404).json({ message: `Unknown collection: ${collection}` });
  }
  return next();
});

crudRouter.get('/:collection', async (req, res, next) => {
  try {
    res.json(await listRecords(req.params.collection));
  } catch (error) {
    next(error);
  }
});

crudRouter.get('/:collection/:id', async (req, res, next) => {
  try {
    const row = await getRecord(req.params.collection, req.params.id);
    if (!row) return res.status(404).json({ message: 'Record not found' });
    return res.json(row);
  } catch (error) {
    return next(error);
  }
});

crudRouter.post('/:collection', async (req, res, next) => {
  try {
    const payload = req.params.collection === 'staff' ? { ...req.body, role: 'Staff' } : req.body;
    const created = await saveRecord(req.params.collection, payload, prefixes[req.params.collection]);
    if (req.params.collection === 'staff') {
      await ensureStaffUser({ ...created, role: 'Staff' });
    }
    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
});

crudRouter.put('/:collection/:id', async (req, res, next) => {
  try {
    const payload = req.params.collection === 'staff' ? { ...req.body, role: 'Staff' } : req.body;
    const updated = await saveRecord(req.params.collection, { ...payload, id: req.params.id }, prefixes[req.params.collection]);
    if (req.params.collection === 'staff') {
      await ensureStaffUser({ ...updated, role: 'Staff' });
    }
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

crudRouter.patch('/:collection/:id', async (req, res, next) => {
  try {
    const updated = await patchRecord(req.params.collection, req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Record not found' });
    if (req.params.collection === 'staff') {
      await ensureStaffUser({ ...updated, role: 'Staff' });
    }
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

crudRouter.delete('/:collection/:id', async (req, res, next) => {
  try {
    const deleted = await removeRecord(req.params.collection, req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Record not found' });
    if (req.params.collection === 'staff') {
      await removeStaffUser(req.params.id);
    }
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

crudRouter.post('/:collection/reset', async (req, res, next) => {
  try {
    const rows = seedRecords[req.params.collection] || [];
    await Record.deleteMany({ bucket: req.params.collection });
    if (rows.length) {
      await Record.insertMany(rows.map((row) => ({ bucket: req.params.collection, recordId: row.id, data: row })));
    }
    res.json(await listRecords(req.params.collection));
  } catch (error) {
    next(error);
  }
});
