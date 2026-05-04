const allowedStatuses = ['Active', 'Expired', 'Pending', 'Cancelled', 'Expiring Soon'];

export const validateContractPayload = (payload = {}) => {
  const errors = [];

  if (!payload.customerName || String(payload.customerName).trim() === '') {
    errors.push('customerName is required');
  }

  if (!payload.planName || String(payload.planName).trim() === '') {
    errors.push('planName is required');
  }

  if (!payload.startDate || Number.isNaN(new Date(payload.startDate).getTime())) {
    errors.push('startDate must be a valid date');
  }

  if (!payload.expiryDate || Number.isNaN(new Date(payload.expiryDate).getTime())) {
    errors.push('expiryDate must be a valid date');
  }

  if (!payload.status || !allowedStatuses.includes(payload.status)) {
    errors.push(`status must be one of: ${allowedStatuses.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateStatusPayload = (payload = {}) => {
  if (!payload.status || !allowedStatuses.includes(payload.status)) {
    return {
      valid: false,
      errors: [`status must be one of: ${allowedStatuses.join(', ')}`],
    };
  }

  return { valid: true, errors: [] };
};

export const parseListQuery = (query = {}) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.max(Number.parseInt(query.limit, 10) || 10, 1);

  return {
    search: String(query.search || '').trim().toLowerCase(),
    status: String(query.status || '').trim(),
    fromDate: query.fromDate || '',
    toDate: query.toDate || '',
    page,
    limit,
  };
};
