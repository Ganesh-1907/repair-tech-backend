import { getRecord, listRecords, removeRecord, saveRecord } from '../../utils/store.js';

const CONTRACT_BUCKET = 'amcContracts';
const CONTRACT_PREFIX = 'AMC';

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toCsvValue = (value) => {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const matchesSearch = (row, search) => {
  if (!search) return true;
  const hay = `${row.customerName || ''} ${row.planName || ''} ${row.status || ''} ${row.id || ''}`.toLowerCase();
  return hay.includes(search);
};

const matchesDateRange = (row, fromDate, toDateValue) => {
  const from = fromDate ? new Date(fromDate) : null;
  const to = toDateValue ? new Date(toDateValue) : null;
  const rowStart = toDate(row.startDate);

  if (!rowStart) return true;
  if (from && rowStart < from) return false;
  if (to && rowStart > to) return false;
  return true;
};

export const listAmcContracts = async ({ search, status, fromDate, toDate, page, limit }) => {
  const rows = await listRecords(CONTRACT_BUCKET);

  const filtered = rows.filter((row) => {
    if (status && row.status !== status) return false;
    if (!matchesSearch(row, search)) return false;
    if (!matchesDateRange(row, fromDate, toDate)) return false;
    return true;
  });

  const total = filtered.length;
  const offset = (page - 1) * limit;
  const data = filtered.slice(offset, offset + limit);

  return {
    data,
    total,
    page,
    limit,
  };
};

export const getAmcContractById = async (id) => getRecord(CONTRACT_BUCKET, id);

export const createAmcContract = async (payload) => {
  const nextPayload = {
    ...payload,
    contractType: 'AMC',
    amcDetails: payload.amcDetails || payload,
  };
  return saveRecord(CONTRACT_BUCKET, nextPayload, CONTRACT_PREFIX);
};

export const updateAmcContract = async (id, payload) => {
  const nextPayload = {
    ...payload,
    id,
    contractType: 'AMC',
    amcDetails: payload.amcDetails || payload,
  };
  return saveRecord(CONTRACT_BUCKET, nextPayload, CONTRACT_PREFIX);
};

export const deleteAmcContract = async (id) => removeRecord(CONTRACT_BUCKET, id);

export const updateAmcContractStatus = async (id, status) => {
  const current = await getRecord(CONTRACT_BUCKET, id);
  if (!current) return null;

  return saveRecord(CONTRACT_BUCKET, {
    ...current,
    id,
    status,
    contractType: 'AMC',
  }, CONTRACT_PREFIX);
};

export const exportAmcContractsCsv = async (query) => {
  const { data } = await listAmcContracts({ ...query, page: 1, limit: Number.MAX_SAFE_INTEGER });

  const headers = ['Contract ID', 'Customer', 'Plan', 'Status', 'Price', 'Start Date', 'Expiry Date'];
  const lines = data.map((row) => ([
    row.id,
    row.customerName,
    row.planName,
    row.status,
    row.revenue ?? row.contractValue ?? row.price ?? '',
    row.startDate,
    row.expiryDate,
  ].map(toCsvValue).join(',')));

  return [headers.join(','), ...lines].join('\n');
};
