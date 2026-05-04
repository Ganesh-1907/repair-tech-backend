import {
  createAmcContract,
  deleteAmcContract,
  exportAmcContractsCsv,
  getAmcContractById,
  listAmcContracts,
  updateAmcContract,
  updateAmcContractStatus,
} from './amc.service.js';
import { parseListQuery, validateContractPayload, validateStatusPayload } from './amc.validation.js';

const badRequest = (res, errors) => res.status(400).json({ success: false, message: errors.join(', ') });

export const getAmcContracts = async (req, res, next) => {
  try {
    const query = parseListQuery(req.query);
    const result = await listAmcContracts(query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getAmcContract = async (req, res, next) => {
  try {
    const row = await getAmcContractById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'AMC contract not found' });
    return res.json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const postAmcContract = async (req, res, next) => {
  try {
    const validation = validateContractPayload(req.body);
    if (!validation.valid) return badRequest(res, validation.errors);

    const created = await createAmcContract(req.body);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return next(error);
  }
};

export const putAmcContract = async (req, res, next) => {
  try {
    const validation = validateContractPayload(req.body);
    if (!validation.valid) return badRequest(res, validation.errors);

    const updated = await updateAmcContract(req.params.id, req.body);
    return res.json({ success: true, data: updated });
  } catch (error) {
    return next(error);
  }
};

export const removeAmcContract = async (req, res, next) => {
  try {
    const removed = await deleteAmcContract(req.params.id);
    if (!removed) return res.status(404).json({ success: false, message: 'AMC contract not found' });
    return res.json({ success: true, message: 'AMC contract deleted' });
  } catch (error) {
    return next(error);
  }
};

export const patchAmcContractStatus = async (req, res, next) => {
  try {
    const validation = validateStatusPayload(req.body);
    if (!validation.valid) return badRequest(res, validation.errors);

    const updated = await updateAmcContractStatus(req.params.id, req.body.status);
    if (!updated) return res.status(404).json({ success: false, message: 'AMC contract not found' });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return next(error);
  }
};

export const exportAmcContracts = async (req, res, next) => {
  try {
    const query = parseListQuery(req.query);
    const csv = await exportAmcContractsCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="amc-contracts.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    return next(error);
  }
};
