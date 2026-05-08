import express from 'express';
import { saveRecord } from '../utils/store.js';

export const leadsRouter = express.Router();

const SERVICE_TYPES = new Set(['Walk-in', 'Onsite service']);
const DEFAULT_TRACKER = {
  'Walk-in': [
    'Lead Captured',
    'Assign',
    'Device Check',
    'Problem Inward',
    'Quote',
    'Billing',
    'Review Message Link',
  ],
  'Onsite service': [
    'Lead Captured',
    'Location Visit',
    'Assign',
    'Device Check / Internal Report',
    'Device Receive Customer Confirmation',
    'Quote',
    'Device Delivery Customer Confirmation',
    'Billing',
    'Images Upload',
    'Review Message Link',
  ],
};

const trimString = (value) => String(value || '').trim();

const normalizeServiceType = (value) => {
  const raw = trimString(value);
  return SERVICE_TYPES.has(raw) ? raw : 'Walk-in';
};

const normalizeImages = (value) => Array.isArray(value)
  ? value
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      name: trimString(item.name),
      dataUrl: trimString(item.dataUrl),
    }))
    .filter((item) => item.dataUrl)
  : [];

const buildTracker = (serviceType, hasAssignee) => {
  const now = new Date().toISOString();
  const steps = DEFAULT_TRACKER[serviceType] || DEFAULT_TRACKER['Walk-in'];
  return steps.map((step, index) => {
    const isLeadCaptured = index === 0;
    const isAssign = step === 'Assign';
    const completed = isLeadCaptured || (hasAssignee && isAssign);
    return {
      step,
      status: completed ? 'completed' : index === (hasAssignee ? 2 : 1) ? 'current' : 'pending',
      date: completed ? now : null,
    };
  });
};

const validateLead = (payload) => {
  const errors = {};
  const company = trimString(payload.company);
  const customerName = trimString(payload.customerName);
  const mobileNumber = trimString(payload.mobileNumber).replace(/\D/g, '');
  const serviceType = normalizeServiceType(payload.serviceType);
  const source = trimString(payload.source);

  if (!company) errors.company = 'Company is required.';
  if (!customerName) errors.customerName = 'Customer name is required.';
  if (!mobileNumber) {
    errors.mobileNumber = 'Mobile number is required.';
  } else if (!/^\d{10}$/.test(mobileNumber)) {
    errors.mobileNumber = 'Enter a valid 10 digit mobile number.';
  }
  if (!source) errors.source = 'Source is required.';

  const onsiteImages = normalizeImages(payload.onsiteImages);
  if (serviceType === 'Onsite service' && onsiteImages.length < 3) {
    errors.onsiteImages = 'Upload at least 3 onsite images.';
  }

  return {
    errors,
    data: {
      company,
      customerName,
      mobileNumber,
      serviceType,
      source,
      onsiteImages,
    },
  };
};

leadsRouter.post('/', async (req, res, next) => {
  try {
    const { errors, data } = validateLead(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'Lead validation failed.', errors });
    }

    const assignedTechnician = trimString(req.body.assignedTechnician);
    const assignedTechnicianId = trimString(req.body.assignedTechnicianId);
    const hasAssignee = Boolean(assignedTechnician || assignedTechnicianId);
    const createdAt = req.body.createdAt || new Date().toISOString();

    const leadPayload = {
      ...req.body,
      ...data,
      id: req.body.id,
      device: trimString(req.body.device),
      locationLink: trimString(req.body.locationLink),
      problemInwardNote: trimString(req.body.problemInwardNote),
      deviceCheckNote: trimString(req.body.deviceCheckNote),
      quote: trimString(req.body.quote),
      billing: trimString(req.body.billing),
      reviewMessageLink: trimString(req.body.reviewMessageLink),
      assignedTechnician,
      assignedTechnicianId,
      deviceReceiveConfirmed: Boolean(req.body.deviceReceiveConfirmed),
      deviceDeliveryConfirmed: Boolean(req.body.deviceDeliveryConfirmed),
      problemInwardImages: normalizeImages(req.body.problemInwardImages),
      deviceCheckImages: normalizeImages(req.body.deviceCheckImages),
      category: hasAssignee ? 'Assigned' : trimString(req.body.category) || 'Pending',
      tracker: Array.isArray(req.body.tracker) && req.body.tracker.length
        ? req.body.tracker
        : buildTracker(data.serviceType, hasAssignee),
      createdAt,
    };

    const created = await saveRecord('leads', leadPayload, 'LEAD');
    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
});
