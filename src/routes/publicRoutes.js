import express from 'express';
import { Record } from '../models/Record.js';
import { seedRecords } from '../data/seedData.js';

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
