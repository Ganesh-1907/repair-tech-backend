import express from 'express';
import { Record } from '../models/Record.js';
import { requireAuth } from '../middleware/auth.js';
import { getRecord, listRecords, patchRecord, removeRecord, saveRecord } from '../utils/store.js';
import { seedRecords } from '../data/seedData.js';
import { ensureStaffUser, removeStaffUser } from '../utils/staffAuth.js';
import { hasInvoiceGst } from '../utils/gst.js';
import { isCaAdminRole } from '../utils/roles.js';

export const crudRouter = express.Router();

const prefixes = {
  inventory: 'INV',
  assets: 'AST',
  expenses: 'EXP',
  leads: 'LEAD',
  leadRepairs: 'LRPR',
  leadQuotations: 'LQ',
  leadBillings: 'LB',
  appSettings: 'SET',
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
  amcRepairs: 'AMCRPR',
  cmcPlans: 'CMCPLN',
  cmcContracts: 'CMC',
  cmcDevices: 'CMCDEV',
  cmcSchedules: 'CMCSCH',
  cmcInvoices: 'CMCI',
  cmcPartsUsage: 'CMCPRT',
  cmcRepairs: 'CMCRPR',
  staffExpenses: 'SEXP',
  staffPayments: 'SPAY',
  staffTargets: 'STGT',
  adminPayments: 'APAY',
  customerAuth: 'CAUTH',
  serviceRequests: 'SREQ',
};

const allowedCollections = new Set([
  'inventory',
  'assets',
  'expenses',
  'leads',
  'leadRepairs',
  'leadQuotations',
  'leadBillings',
  'appSettings',
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
  'amcRepairs',
  'cmcPlans',
  'cmcContracts',
  'cmcDevices',
  'cmcSchedules',
  'cmcInvoices',
  'cmcPartsUsage',
  'cmcRepairs',
  'staffExpenses',
  'staffPayments',
  'staffTargets',
  'adminPayments',
  'serviceRequests',
]);

const caAdminReadableCollections = new Set([
  'leads',
  'leadBillings',
  'billingInvoices',
  'rentalCustomers',
  'rentalContracts',
  'rentalInvoices',
  'amcContracts',
  'amcInvoices',
  'cmcContracts',
  'cmcInvoices',
  'inventory',
  'assets',
  'expenses',
  'staffExpenses',
  'adminPayments',
  'staffPayments',
  'campaignJobs',
]);

const caAdminGstCollections = new Set([
  'leadBillings',
  'billingInvoices',
  'rentalInvoices',
  'amcInvoices',
  'cmcInvoices',
]);

const filterRecordsForRole = (user, collection, rows) => {
  if (!isCaAdminRole(user?.role)) return rows;
  if (!caAdminReadableCollections.has(collection)) return [];
  if (caAdminGstCollections.has(collection)) return rows.filter(hasInvoiceGst);
  return rows;
};

const canReadRecordForRole = (user) => {
  if (!isCaAdminRole(user?.role)) return true;
  return false;
};

const blockCaAdminWrite = (req, res, next) => {
  if (isCaAdminRole(req.user?.role)) {
    return res.status(403).json({ message: 'CA Admin access is read-only.' });
  }
  return next();
};

crudRouter.use(requireAuth);

crudRouter.param('collection', (req, res, next, collection) => {
  if (!allowedCollections.has(collection)) {
    return res.status(404).json({ message: `Unknown collection: ${collection}` });
  }
  return next();
});

crudRouter.get('/:collection', async (req, res, next) => {
  try {
    const rows = await listRecords(req.params.collection);
    res.json(filterRecordsForRole(req.user, req.params.collection, rows));
  } catch (error) {
    next(error);
  }
});

crudRouter.get('/:collection/:id', async (req, res, next) => {
  try {
    const row = await getRecord(req.params.collection, req.params.id);
    if (!row || !canReadRecordForRole(req.user)) {
      return res.status(404).json({ message: 'Record not found' });
    }
    return res.json(row);
  } catch (error) {
    return next(error);
  }
});

crudRouter.post('/:collection', blockCaAdminWrite, async (req, res, next) => {
  try {
    if (req.params.collection === 'rentalQuotations' && req.body?.customerId) {
      const existingRows = await listRecords('rentalQuotations');
      const existing = existingRows.find((row) => row.customerId === req.body.customerId);
      if (existing) {
        const merged = {
          ...existing,
          ...req.body,
          id: existing.id,
          updatedAt: new Date().toISOString().slice(0, 10),
        };
        const updated = await saveRecord('rentalQuotations', merged, prefixes.rentalQuotations);
        return res.status(200).json(updated);
      }
    }

    const created = await saveRecord(req.params.collection, req.body, prefixes[req.params.collection]);
    if (req.params.collection === 'staff') {
      await ensureStaffUser(created, { sendEmail: true });
    }
    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
});

crudRouter.put('/:collection/:id', blockCaAdminWrite, async (req, res, next) => {
  try {
    const updated = await saveRecord(req.params.collection, { ...req.body, id: req.params.id }, prefixes[req.params.collection]);
    if (req.params.collection === 'staff') {
      await ensureStaffUser(updated);
    }
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

crudRouter.patch('/:collection/:id', blockCaAdminWrite, async (req, res, next) => {
  try {
    const updated = await patchRecord(req.params.collection, req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Record not found' });
    if (req.params.collection === 'staff') {
      await ensureStaffUser(updated);
    }
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

crudRouter.delete('/:collection/:id', blockCaAdminWrite, async (req, res, next) => {
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

crudRouter.post('/:collection/reset', blockCaAdminWrite, async (req, res, next) => {
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
