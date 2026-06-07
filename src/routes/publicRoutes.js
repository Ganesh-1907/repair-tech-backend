import express from 'express';
import { Record } from '../models/Record.js';
import { seedRecords } from '../data/seedData.js';
import { saveRecord } from '../utils/store.js';

export const publicRouter = express.Router();

const getRecordsByBucket = async (bucket) => {
  const rows = await Record.find({ bucket }).sort({ createdAt: -1 }).lean();
  return rows.map((row) => ({
    ...row.data,
    id: row.recordId,
  }));
};

const seedIfEmpty = async (bucket) => {
  const count = await Record.countDocuments({ bucket });
  if (count > 0) return;
  const rows = seedRecords[bucket];
  if (rows && rows.length) {
    await Record.insertMany(rows.map((row) => ({
      bucket,
      recordId: row.id,
      data: row,
    })));
    console.log(`[Public] Seeded ${rows.length} records for bucket: ${bucket}`);
  }
};

publicRouter.get('/website-rentals', async (_req, res, next) => {
  try {
    await seedIfEmpty('websiteRentals');
    const items = await getRecordsByBucket('websiteRentals');
    res.json(items);
  } catch (error) {
    next(error);
  }
});

publicRouter.get('/website-services', async (_req, res, next) => {
  try {
    await seedIfEmpty('websiteServices');
    const items = await getRecordsByBucket('websiteServices');
    res.json(items);
  } catch (error) {
    next(error);
  }
});

publicRouter.get('/website-amc-plans', async (_req, res, next) => {
  try {
    const items = await getRecordsByBucket('amcPlans');
    const publicPlans = items
      .filter((p) => p.isPublic === true)
      .slice(0, 3);
    res.json(publicPlans);
  } catch (error) {
    next(error);
  }
});

publicRouter.get('/website-cmc-plans', async (_req, res, next) => {
  try {
    const items = await getRecordsByBucket('cmcPlans');
    const publicPlans = items
      .filter((p) => p.isPublic === true)
      .slice(0, 3);
    res.json(publicPlans);
  } catch (error) {
    next(error);
  }
});

publicRouter.post('/contact', async (req, res, next) => {
  try {
    const { name, phone, email, serviceType, device, message } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required.' });
    }
    const lead = await saveRecord('leads', {
      customerName: String(name).trim(),
      mobileNumber: String(phone).replace(/\D/g, '').slice(0, 10),
      email: String(email || '').trim(),
      company: '',
      serviceType: String(serviceType || ''),
      source: 'Website',
      device: String(device || ''),
      problemInwardNote: String(message || '').trim(),
      category: 'Pending',
      tracker: [
        { step: 'Lead Captured', status: 'completed', date: new Date().toISOString() },
        { step: 'Assign to Technician', status: 'current', date: null },
      ],
      createdAt: new Date().toISOString().slice(0, 10),
    }, 'LEAD');
    res.status(201).json({ success: true, lead });
  } catch (error) {
    next(error);
  }
});

publicRouter.get('/lead-options', async (_req, res, next) => {
  try {
    const rows = await Record.find({ bucket: 'appSettings' }).lean();
    const settings = rows.find((r) => r.data && r.data.settingsId === 'lead-options');
    const serviceTypes = settings?.data?.serviceTypes || ['Walk-in', 'Onsite service'];
    const devices = settings?.data?.devices || ['Laptop', 'Desktop', 'Server', 'Printer', 'CCTV', 'VPS'];
    res.json({ serviceTypes, devices });
  } catch (error) {
    next(error);
  }
});
