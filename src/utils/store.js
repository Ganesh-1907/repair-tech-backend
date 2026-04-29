import { Record } from '../models/Record.js';
import { getModel } from './modelRegistry.js';

export const makeId = (prefix) => `${prefix}-${Date.now().toString().slice(-6)}`;

export const toClientRecord = (doc, isGeneric = true) => {
  if (isGeneric) {
    return {
      ...doc.data,
      id: doc.recordId,
      _mongoId: doc._id.toString(),
      createdAt: doc.data.createdAt || doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    ...obj,
    _mongoId: obj._id.toString(),
  };
};

export const listRecords = async (collection) => {
  const Model = getModel(collection);
  if (Model === Record) {
    const rows = await Record.find({ bucket: collection }).sort({ createdAt: -1 }).lean();
    console.log(`[Store] Listed ${rows.length} records for bucket: ${collection}`);
    return rows.map((row) => toClientRecord(row, true));
  }
  const rows = await Model.find({}).sort({ createdAt: -1 }).lean();
  console.log(`[Store] Listed ${rows.length} records for dedicated model: ${collection}`);
  return rows.map((row) => toClientRecord(row, false));
};

export const getRecord = async (collection, id) => {
  const Model = getModel(collection);
  if (Model === Record) {
    const row = await Record.findOne({ bucket: collection, recordId: id });
    return row ? toClientRecord(row, true) : null;
  }
  const row = await Model.findOne({ id });
  return row ? toClientRecord(row, false) : null;
};

export const saveRecord = async (collection, payload, prefix = 'REC') => {
  const Model = getModel(collection);
  const id = payload.id || payload.recordId || makeId(prefix);

  if (Model === Record) {
    const data = { ...payload, id };
    const row = await Record.findOneAndUpdate(
      { bucket: collection, recordId: id },
      { $set: { bucket: collection, recordId: id, data } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return toClientRecord(row, true);
  }

  const row = await Model.findOneAndUpdate(
    { id },
    { $set: { ...payload, id } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return toClientRecord(row, false);
};

export const patchRecord = async (collection, id, patch) => {
  const current = await getRecord(collection, id);
  if (!current) return null;
  return saveRecord(collection, { ...current, ...patch, id });
};

export const removeRecord = async (collection, id) => {
  const Model = getModel(collection);
  if (Model === Record) {
    const deleted = await Record.findOneAndDelete({ bucket: collection, recordId: id });
    return Boolean(deleted);
  }
  const deleted = await Model.findOneAndDelete({ id });
  return Boolean(deleted);
};
