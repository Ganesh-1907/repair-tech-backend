import {
  createCmcContract,
  deleteCmcContract,
  exportCmcContractsCsv,
  getCmcContractById,
  listCmcContracts,
  updateCmcContract,
  updateCmcContractStatus,
} from './cmc.service.js';
import { parseListQuery, validateContractPayload, validateStatusPayload } from './cmc.validation.js';

const badRequest = (res, errors) => res.status(400).json({ success: false, message: errors.join(', ') });

export const getCmcContracts = async (req, res, next) => {
  try {
    const query = parseListQuery(req.query);
    const result = await listCmcContracts(query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getCmcContract = async (req, res, next) => {
  try {
    const row = await getCmcContractById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'CMC contract not found' });
    return res.json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const postCmcContract = async (req, res, next) => {
  try {
    const validation = validateContractPayload(req.body);
    if (!validation.valid) return badRequest(res, validation.errors);

    const created = await createCmcContract(req.body);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return next(error);
  }
};

export const putCmcContract = async (req, res, next) => {
  try {
    const validation = validateContractPayload(req.body);
    if (!validation.valid) return badRequest(res, validation.errors);

    const updated = await updateCmcContract(req.params.id, req.body);
    return res.json({ success: true, data: updated });
  } catch (error) {
    return next(error);
  }
};

export const removeCmcContract = async (req, res, next) => {
  try {
    const removed = await deleteCmcContract(req.params.id);
    if (!removed) return res.status(404).json({ success: false, message: 'CMC contract not found' });
    return res.json({ success: true, message: 'CMC contract deleted' });
  } catch (error) {
    return next(error);
  }
};

export const patchCmcContractStatus = async (req, res, next) => {
  try {
    const validation = validateStatusPayload(req.body);
    if (!validation.valid) return badRequest(res, validation.errors);

    const updated = await updateCmcContractStatus(req.params.id, req.body.status);
    if (!updated) return res.status(404).json({ success: false, message: 'CMC contract not found' });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return next(error);
  }
};

export const exportCmcContracts = async (req, res, next) => {
  try {
    const query = parseListQuery(req.query);
    const csv = await exportCmcContractsCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cmc-contracts.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    return next(error);
  }
};
