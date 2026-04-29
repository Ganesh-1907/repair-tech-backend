import express from 'express';
import { getRecord, listRecords, patchRecord, saveRecord } from '../utils/store.js';
import { requireAuth } from '../middleware/auth.js';
import { Job } from '../models/Job.js';

export const moduleRouter = express.Router();

const toNumber = (value) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};

const sum = (rows, pick) => rows.reduce((total, row) => total + toNumber(pick(row)), 0);

const titleCase = (value) => String(value || '')
  .replace(/[-_]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const normalized = String(value).length === 7 ? `${value}-01` : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isoDate = (date) => date.toISOString().slice(0, 10);

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date, offset) => new Date(date.getFullYear(), date.getMonth() + offset, 1);

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const monthLabel = (date) => date.toLocaleString('en-US', { month: 'short' });

const dayLabel = (date) => date.toLocaleString('en-US', { weekday: 'short' });

const daysBetween = (from, to) => Math.ceil((startOfDay(to) - startOfDay(from)) / 86400000);

const formatRelativeTime = (value) => {
  const date = parseDate(value);
  if (!date) return value || '-';
  const minutes = Math.max(Math.round((Date.now() - date.getTime()) / 60000), 0);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.round(hours / 24);
  return `${days} days ago`;
};

const formatSignedNumber = (current, previous, suffix = '') => {
  const delta = current - previous;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}${suffix}`;
};

const formatSignedPercent = (current, previous) => {
  if (!previous && !current) return '0%';
  if (!previous) return '+100%';
  const value = Math.round(((current - previous) / previous) * 100);
  return `${value > 0 ? '+' : ''}${value}%`;
};

const normalizeLeadStatus = (lead) => titleCase(lead.category || lead.status || lead.leadStatus || 'Unknown');

const isPendingLead = (lead) => ['Pending', 'Open', 'New', 'Follow Up', 'Follow-up'].includes(normalizeLeadStatus(lead));

const isMissedLead = (lead) => ['Missed', 'Lost'].includes(normalizeLeadStatus(lead));

const isAssignedLead = (lead) => Boolean(lead.assignedTechnicianId || lead.assignedTechnician || lead.staffId || lead.staffName || lead.assignedTo);

const isClosedLead = (lead) => ['Completed', 'Closed', 'Converted', 'Missed', 'Lost'].includes(normalizeLeadStatus(lead));

const isClosedJob = (job) => {
  const status = String(job.status || job.jobStatus || job.deliveryStatus || '').toLowerCase();
  return ['completed', 'closed', 'cancelled', 'canceled', 'delivered', 'repair completed', 'paid'].some((item) => status.includes(item));
};

const normalizeAssignmentValue = (value) => String(value || '').trim().toLowerCase();

const isAssignedToUser = (user, { ids = [], names = [] }) => {
  if (user.role !== 'staff') return true;

  const userStaffId = normalizeAssignmentValue(user.staffId);
  const assignedIds = ids.map(normalizeAssignmentValue).filter(Boolean);

  if (assignedIds.length && userStaffId) {
    return assignedIds.includes(userStaffId);
  }

  const userNames = [user.name, user.email].map(normalizeAssignmentValue).filter(Boolean);
  return names.map(normalizeAssignmentValue).filter(Boolean).some((name) => userNames.includes(name));
};

const getNextLeadStep = (lead) => {
  const tracker = Array.isArray(lead.tracker) ? lead.tracker : [];
  const nextStep = tracker.find((item) => !['completed', 'done', 'closed'].includes(String(item.status || '').toLowerCase()));
  return nextStep?.step || 'Lead follow-up';
};

const getLeadTaskDate = (lead) => {
  const tracker = Array.isArray(lead.tracker) ? lead.tracker : [];
  const nextStepWithDate = tracker.find((item) => item.date && !['completed', 'done', 'closed'].includes(String(item.status || '').toLowerCase()));
  return lead.dueDate || lead.followUpDate || lead.expectedDelivery || nextStepWithDate?.date || lead.updatedAt || lead.createdAt;
};

const jobToStaffTask = (job) => ({
  id: job.id,
  ticketId: job.ticketId,
  title: job.title || job.problem || job.issue || job.deviceType || 'Assigned task',
  customerName: job.customerName || '-',
  device: job.device || job.deviceModel || job.deviceType || '-',
  issue: job.issue || job.problem || job.problemNotes || '-',
  priority: job.priority || 'Medium',
  status: job.status || job.jobStatus || job.deliveryStatus || 'Assigned',
  assignedTo: job.assignedTo || job.technician || job.staffName || '-',
  expectedDelivery: job.expectedDelivery,
  updatedAt: job.updatedAt,
  source: 'Job',
});

const leadToStaffTask = (lead) => ({
  id: `TASK-${lead.id}`,
  ticketId: lead.id,
  title: 'Lead follow-up',
  customerName: lead.customerName || lead.name || '-',
  device: lead.company || lead.source || 'Lead',
  issue: getNextLeadStep(lead),
  priority: lead.priority || 'Medium',
  status: lead.category || lead.status || 'Assigned',
  assignedTo: lead.assignedTechnician || lead.staffName || lead.assignedTo || '-',
  expectedDelivery: getLeadTaskDate(lead),
  updatedAt: lead.updatedAt || lead.createdAt,
  source: 'Lead',
  leadId: lead.id,
  phoneNumber: lead.mobileNumber || lead.phone || lead.phoneNumber,
});

const getJobAmount = (job) => toNumber(job.total || job.amount || job.paidAmount || job.estimate || job.quote?.estimate || 0);

const getInvoiceAmount = (invoice) => toNumber(invoice.total || invoice.amount || invoice.subtotal || invoice.revenue || 0);

const getInvoiceDate = (invoice) => parseDate(invoice.date || invoice.issueDate || invoice.createdAt || invoice.billingMonth || invoice.paidOn);

const buildRevenueRows = ({ billingInvoices, rentalInvoices, amcInvoices, cmcInvoices }) => [
  ...billingInvoices.map((row) => ({ ...row, source: 'Billing' })),
  ...rentalInvoices.map((row) => ({ ...row, source: 'Rental' })),
  ...amcInvoices.map((row) => ({ ...row, source: 'AMC' })),
  ...cmcInvoices.map((row) => ({ ...row, source: 'CMC' })),
];

const buildInventoryAlerts = (inventory, campaignInventoryParts) => {
  const inventoryAlerts = inventory
    .filter((item) => item.currentStock !== undefined && item.minStock !== undefined && toNumber(item.currentStock) <= toNumber(item.minStock))
    .map((item) => ({
      id: item.id,
      partName: item.name || item.partName || item.itemName || item.id,
      currentStock: toNumber(item.currentStock),
      minLevel: toNumber(item.minStock),
      unit: item.unit || item.uom || 'pcs',
    }));

  const campaignPartAlerts = campaignInventoryParts
    .filter((item) => item.availableStock !== undefined && item.lowStockAt !== undefined && toNumber(item.availableStock) <= toNumber(item.lowStockAt))
    .map((item) => ({
      id: item.id,
      partName: item.name || item.partName || item.id,
      currentStock: toNumber(item.availableStock),
      minLevel: toNumber(item.lowStockAt),
      unit: item.unit || 'pcs',
    }));

  return [...inventoryAlerts, ...campaignPartAlerts].sort((a, b) => a.currentStock - b.currentStock);
};

const buildExpiryReminders = ({ amcContracts, cmcContracts, rentalContracts }, today = new Date()) => {
  const contractRows = [
    ...amcContracts.map((contract) => ({ type: 'AMC', contract, expiryDate: contract.expiryDate || contract.endDate })),
    ...cmcContracts.map((contract) => ({ type: 'CMC', contract, expiryDate: contract.expiryDate || contract.endDate })),
    ...rentalContracts.map((contract) => ({ type: 'Rental', contract, expiryDate: contract.endDate || contract.expiryDate })),
  ];

  return contractRows
    .map(({ type, contract, expiryDate }) => {
      const expiry = parseDate(expiryDate);
      if (!expiry) return null;
      const daysLeft = daysBetween(today, expiry);
      return {
        id: `${type}-${contract.id}`,
        type,
        client: contract.customerName || contract.companyName || contract.contactPerson || contract.id,
        contractId: contract.id,
        expiryDate: isoDate(expiry),
        daysLeft,
        status: contract.status || '',
      };
    })
    .filter((row) => row && row.daysLeft >= 0 && row.daysLeft <= 60)
    .sort((a, b) => a.daysLeft - b.daysLeft);
};

const buildDashboardAlerts = ({ rentalAlerts, expiryReminders }, today = new Date()) => {
  const usageAlerts = rentalAlerts.map((alert) => {
    const typeLabel = String(alert.alertType || '').toLowerCase();
    const alertType = typeLabel.includes('high') ? 'highUsage' : typeLabel.includes('contract') ? 'contractExpiry' : 'lowUsage';
    return {
      id: alert.id,
      type: alertType,
      title: titleCase(alert.alertType || 'Rental Alert'),
      customerName: alert.customerName || alert.customer || 'Customer',
      deviceName: alert.deviceName || alert.assetName || undefined,
      deviceId: alert.assetId || alert.deviceId || undefined,
      usageLabel: alert.usage !== undefined ? `${alert.usage} usage units` : undefined,
      threshold: alert.minimumCommitment ? `Minimum commitment: ${alert.minimumCommitment}` : undefined,
      recommendation: alert.suggestedAction || 'Review alert',
      status: alert.status || 'New',
      priority: alert.severity || 'Medium',
      createdAt: formatRelativeTime(alert.createdAt || alert.updatedAt || today),
      actions: alertType === 'contractExpiry'
        ? ['View Contract', 'Send Reminder', 'Renew Contract']
        : ['View Details', 'Mark for Review'],
    };
  });

  const contractAlerts = expiryReminders.slice(0, 8).map((reminder) => ({
    id: `expiry-${reminder.id}`,
    type: 'contractExpiry',
    title: `${reminder.type} nearing expiry`,
    customerName: reminder.client,
    contractType: reminder.type,
    expiryDate: reminder.expiryDate,
    daysLeft: reminder.daysLeft,
    recommendation: 'Start renewal follow-up',
    status: reminder.daysLeft <= 7 ? 'New' : 'In Review',
    priority: reminder.daysLeft <= 7 ? 'High' : 'Medium',
    createdAt: `${reminder.daysLeft} days left`,
    actions: ['View Contract', 'Send Reminder', 'Renew Contract'],
  }));

  return [...usageAlerts, ...contractAlerts];
};

const buildStaffPerformance = (staff, campaignJobs, assignedLeads = []) => {
  const revenueByName = new Map();
  const jobsByName = new Map();
  const staffNameById = new Map(staff.map((person) => [person.id, person.name]));

  campaignJobs.forEach((job) => {
    const names = [job.technician, job.staffName, job.assignedTo].filter(Boolean);
    names.forEach((name) => {
      revenueByName.set(name, (revenueByName.get(name) || 0) + getJobAmount(job));
      jobsByName.set(name, (jobsByName.get(name) || 0) + 1);
    });
  });

  assignedLeads.forEach((lead) => {
    const name = lead.assignedTechnician || staffNameById.get(lead.assignedTechnicianId || lead.staffId) || lead.staffName || lead.assignedTo;
    if (name) jobsByName.set(name, (jobsByName.get(name) || 0) + 1);
  });

  return staff
    .map((person) => ({
      id: person.id,
      name: person.name,
      role: person.role || 'Staff',
      revenue: revenueByName.get(person.name) || 0,
      assignedJobs: toNumber(person.assignedJobs) + (jobsByName.get(person.name) || 0),
      status: person.status || 'Inactive',
      attendanceStatus: person.attendanceStatus || 'Absent',
      departmentSkill: person.departmentSkill || '',
      rating: toNumber(person.rating || person.performance || 0),
    }))
    .sort((a, b) => (b.assignedJobs - a.assignedJobs) || a.name.localeCompare(b.name));
};

const buildStaffDashboard = ({ staff, pendingJobs, campaignJobs, leads = [] }) => {
  const totalStaff = staff.length;
  const activeStaff = staff.filter((row) => row.status === 'Active' || row.status === 'Available' || row.attendanceStatus === 'Present').length;
  const onJob = staff.filter((row) => row.status === 'On Job' || row.attendanceStatus === 'On Job').length;
  const onLeave = staff.filter((row) => row.status === 'On Leave' || row.attendanceStatus === 'On Leave').length;
  const inactive = staff.filter((row) => row.status === 'Inactive' || row.attendanceStatus === 'Absent').length;
  const present = staff.filter((row) => row.attendanceStatus === 'Present' || row.status === 'Active' || row.status === 'Available' || row.status === 'On Job').length;
  
  const assignedLeads = leads.filter(isAssignedLead);
  const activeLeads = assignedLeads.filter((l) => !isClosedLead(l));
  
  const activeJobs = pendingJobs.filter((job) => !isClosedJob(job)).length + campaignJobs.filter((job) => !isClosedJob(job)).length + activeLeads.length;
  const completedJobs = campaignJobs.filter(isClosedJob).length + leads.filter(isClosedLead).length;
  const totalJobs = pendingJobs.length + campaignJobs.length + leads.length;
  const staffPerformance = buildStaffPerformance(staff, campaignJobs, leads);
  const totalRevenue = sum(staffPerformance, (row) => row.revenue);
  const attendanceRate = totalStaff ? Math.round((present / totalStaff) * 100) : 0;
  const productivity = totalJobs ? Math.round((completedJobs / totalJobs) * 100) : 0;
  const skillGaps = staff.filter((row) => !String(row.departmentSkill || '').trim()).length;
  const maxPerformanceValue = Math.max(...staffPerformance.map((row) => row.revenue || row.assignedJobs || 0), 1);

  const months = Array.from({ length: 6 }, (_, index) => addMonths(startOfMonth(new Date()), index - 5));
  const monthlyCompleted = months.map((month) => {
    const key = monthKey(month);
    return campaignJobs.filter((job) => isClosedJob(job) && monthKey(parseDate(job.expectedDelivery || job.createdAt || job.updatedAt) || new Date(0)) === key).length;
  });
  const monthlyOpen = months.map((month) => {
    const key = monthKey(month);
    return campaignJobs.filter((job) => !isClosedJob(job) && monthKey(parseDate(job.expectedDelivery || job.createdAt || job.updatedAt) || new Date(0)) === key).length;
  });

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = startOfDay(new Date());
    date.setDate(date.getDate() + index - 6);
    return date;
  });
  const attendanceTrend = days.map((day, index) => index === days.length - 1 ? attendanceRate : 0);

  const roleCounts = staff.reduce((acc, row) => {
    const role = row.role || 'Staff';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  const statusCounts = staff.reduce((acc, row) => {
    const status = row.status || 'Inactive';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const technicianRows = staffPerformance.map((perf, index) => {
    const row = staff.find((s) => s.id === perf.id) || perf;
    return {
      id: row.id,
      name: row.name,
      role: row.role || 'Staff',
      phone: row.phone || '',
      email: row.email || '',
      skills: String(row.departmentSkill || '').split(',').map((item) => item.trim()).filter(Boolean),
      status: row.status || 'Inactive',
      attendanceStatus: row.attendanceStatus || 'Absent',
      assignedJobs: perf.assignedJobs,
      lastSeen: formatRelativeTime(row.lastSeen || row.updatedAt || row.createdAt),
      mapPosition: row.mapPosition || {
        left: `${20 + ((index * 17) % 65)}%`,
        top: `${30 + ((index * 13) % 45)}%`,
      },
    };
  });

  return {
    totalStaff,
    activeStaff,
    availableStaff: activeStaff,
    onJob,
    onLeave,
    inactive,
    present,
    pendingWorkload: activeJobs,
    metrics: [
      { label: 'Total Personnel', value: totalStaff, type: 'number', trend: '0' },
      { label: 'Attendance', value: attendanceRate, type: 'percent', trend: '0%' },
      { label: 'Active Tasks', value: activeJobs, type: 'number', trend: '0' },
      { label: 'Completed Jobs', value: completedJobs, type: 'number', trend: '0' },
      { label: 'On Leave', value: onLeave, type: 'number', trend: '0' },
      { label: 'Skill Gaps', value: skillGaps, type: 'number', trend: '0' },
    ],
    charts: {
      performanceVsWorkload: {
        labels: months.map(monthLabel),
        completed: monthlyCompleted,
        active: monthlyOpen,
      },
      roleAllocation: {
        labels: Object.keys(roleCounts),
        data: Object.values(roleCounts),
      },
      attendanceVelocity: {
        labels: days.map(dayLabel),
        data: attendanceTrend,
      },
    },
    roleCounts,
    statusCounts,
    staffPerformance: staffPerformance.map((row) => ({
      ...row,
      progress: Math.round(((row.revenue || row.assignedJobs || 0) / maxPerformanceValue) * 100),
    })),
    technicians: technicianRows,
    attendanceLogs: technicianRows.map((row) => ({
      id: `ATT-${row.id}`,
      name: row.name,
      status: row.attendanceStatus,
      meta: row.lastSeen === '-' ? row.status : `${row.status} - ${row.lastSeen}`,
    })),
    pendingJobs,
    weeklyChampion: staffPerformance[0] || null,
  };
};

moduleRouter.get('/dashboard/summary', requireAuth, async (req, res, next) => {
  try {
    const user = req.user;
    const [
      allLeads,
      allStaff,
      allPendingJobs,
      allCampaignJobs,
      billingInvoices,
      rentalInvoices,
      amcInvoices,
      cmcInvoices,
      inventory,
      campaignInventoryParts,
      rentalAlerts,
      amcContracts,
      cmcContracts,
      rentalContracts,
    ] = await Promise.all([
      listRecords('leads'),
      listRecords('staff'),
      listRecords('pendingJobs'),
      listRecords('campaignJobs'),
      listRecords('billingInvoices'),
      listRecords('rentalInvoices'),
      listRecords('amcInvoices'),
      listRecords('cmcInvoices'),
      listRecords('inventory'),
      listRecords('campaignInventoryParts'),
      listRecords('rentalAlerts'),
      listRecords('amcContracts'),
      listRecords('cmcContracts'),
      listRecords('rentalContracts'),
    ]);

    // Filter data if user is staff
    const leads = allLeads.filter(lead => isAssignedToUser(user, { 
      ids: [lead.assignedTechnicianId, lead.staffId], 
      names: [lead.assignedTechnician, lead.staffName, lead.assignedTo] 
    }));
    
    const pendingJobs = allPendingJobs.filter(job => isAssignedToUser(user, { 
      ids: [job.staffId], 
      names: [job.assignedTo, job.technician, job.staffName] 
    }));

    const campaignJobs = allCampaignJobs.filter(job => isAssignedToUser(user, { 
      ids: [job.staffId], 
      names: [job.assignedTo, job.technician, job.staffName] 
    }));

    const staff = allStaff.filter(person => {
      if (user.role !== 'staff') return true;
      return isAssignedToUser(user, { ids: [person.id], names: [person.name] });
    });

    const today = new Date();
    const revenueRows = buildRevenueRows({ billingInvoices, rentalInvoices, amcInvoices, cmcInvoices });
    const totalRevenue = sum(revenueRows, getInvoiceAmount);
    const currentMonth = startOfMonth(today);
    const previousMonth = addMonths(currentMonth, -1);
    const currentRevenue = sum(revenueRows.filter((row) => {
      const date = getInvoiceDate(row);
      return date && date >= currentMonth;
    }), getInvoiceAmount);
    const previousRevenue = sum(revenueRows.filter((row) => {
      const date = getInvoiceDate(row);
      return date && date >= previousMonth && date < currentMonth;
    }), getInvoiceAmount);

    const currentMonthLeads = leads.filter((lead) => {
      const date = parseDate(lead.createdAt);
      return date && date >= currentMonth;
    });
    const previousMonthLeads = leads.filter((lead) => {
      const date = parseDate(lead.createdAt);
      return date && date >= previousMonth && date < currentMonth;
    });

    const pendingLeads = leads.filter(isPendingLead);
    const missedLeads = leads.filter(isMissedLead);
    const activeJobs = pendingJobs.filter((job) => !isClosedJob(job)).length + campaignJobs.filter((job) => !isClosedJob(job)).length;
    const previousActiveJobs = campaignJobs.filter((job) => {
      const date = parseDate(job.createdAt);
      return date && date >= previousMonth && date < currentMonth && !isClosedJob(job);
    }).length;

    const months = Array.from({ length: 6 }, (_, index) => addMonths(currentMonth, index - 5));
    const monthlyRevenue = months.map((month) => {
      const key = monthKey(month);
      return sum(revenueRows.filter((row) => {
        const date = getInvoiceDate(row);
        return date && monthKey(date) === key;
      }), getInvoiceAmount);
    });

    const leadCounts = leads.reduce((acc, lead) => {
      const status = normalizeLeadStatus(lead);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const responseLeads = leads
      .map((lead) => {
        const created = parseDate(lead.createdAt);
        const responded = parseDate(lead.firstResponseAt || lead.respondedAt || lead.updatedAt);
        if (!created || !responded || responded < created) return null;
        return { ...lead, responseMinutes: Math.round((responded - created) / 60000), responded };
      })
      .filter(Boolean);

    const avgResponse = responseLeads.length
      ? Math.round(sum(responseLeads, (lead) => lead.responseMinutes) / responseLeads.length)
      : 0;

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = startOfDay(today);
      date.setDate(date.getDate() + index - 6);
      return date;
    });
    const responseTrend = days.map((day) => {
      const nextDay = startOfDay(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const rows = responseLeads.filter((lead) => lead.responded >= day && lead.responded < nextDay);
      return rows.length ? Math.round(sum(rows, (lead) => lead.responseMinutes) / rows.length) : 0;
    });

    const inventoryAlerts = buildInventoryAlerts(inventory, campaignInventoryParts);
    const expiryReminders = buildExpiryReminders({ amcContracts, cmcContracts, rentalContracts }, today);
    const staffPerformance = buildStaffPerformance(staff, campaignJobs);
    const dashboardAlerts = buildDashboardAlerts({ rentalAlerts, expiryReminders }, today);
    const targetRows = await listRecords('dashboardTargets').catch(() => []);
    const monthlyTargets = months.map((month) => {
      const key = monthKey(month);
      const target = targetRows.find((row) => row.month === key || row.period === key);
      return toNumber(target?.amount || target?.target || 0);
    });
    const totalTarget = sum(monthlyTargets, (value) => value);
    const targetAchievement = totalTarget ? Math.round((sum(monthlyRevenue, (value) => value) / totalTarget) * 100) : 0;

    res.json({
      metrics: [
        { label: 'Total Revenue', value: totalRevenue, type: 'currency', trend: formatSignedPercent(currentRevenue, previousRevenue) },
        { label: 'Target Achievement', value: targetAchievement, type: 'percent', trend: '0%' },
        { label: 'Total Leads', value: leads.length, type: 'number', trend: formatSignedNumber(currentMonthLeads.length, previousMonthLeads.length) },
        { label: 'Pending Leads', value: pendingLeads.length, type: 'number', trend: formatSignedNumber(pendingLeads.length, 0) },
        { label: 'Missed Leads', value: missedLeads.length, type: 'number', trend: formatSignedNumber(missedLeads.length, 0) },
        { label: 'Avg Response Time', value: `${avgResponse}m`, type: 'string', trend: '0m' },
        { label: 'Active Jobs', value: activeJobs, type: 'number', trend: formatSignedNumber(activeJobs, previousActiveJobs) },
      ],
      charts: {
        revenueVsTarget: {
          labels: months.map(monthLabel),
          revenue: monthlyRevenue,
          target: monthlyTargets,
        },
        leadStatus: {
          labels: Object.keys(leadCounts),
          data: Object.values(leadCounts),
        },
        responseTime: {
          labels: days.map(dayLabel),
          data: responseTrend,
        },
      },
      staffPerformance,
      expiryReminders,
      inventoryAlerts,
      alerts: dashboardAlerts,
      notifications: [
        { label: 'Pending service jobs', value: activeJobs, tone: activeJobs ? 'warning' : 'success' },
        { label: 'Low stock internal alerts', value: inventoryAlerts.length, tone: inventoryAlerts.length ? 'danger' : 'success' },
        { label: 'AMC / CMC renewals due', value: expiryReminders.filter((row) => row.type === 'AMC' || row.type === 'CMC').length, tone: 'warning' },
        { label: 'Rental renewals due', value: expiryReminders.filter((row) => row.type === 'Rental').length, tone: 'info' },
      ],
      periodLabel: months.length ? `${monthLabel(months[0])} - ${monthLabel(months[months.length - 1])}` : '',
    });
  } catch (error) {
    next(error);
  }
});

moduleRouter.get('/inventory/stats', async (req, res, next) => {
  try {
    const items = await listRecords('inventory');
    const totalProfitPotential = sum(items, (item) => (Number(item.sellingPrice) - Number(item.purchasePrice)) * (item.type === 'Sales' ? Number(item.currentStock || 0) : 1));
    res.json({
      totalItems: items.length,
      stockValue: sum(items, (item) => Number(item.currentStock || 0) * Number(item.purchasePrice || 0)),
      lowStock: items.filter((item) => item.type === 'Sales' && Number(item.currentStock || 0) <= Number(item.minStock || 0)).length,
      salesItems: items.filter((item) => item.type === 'Sales').length,
      serviceItems: items.filter((item) => item.type === 'Service').length,
      avgMargin: items.length ? (sum(items, (item) => ((Number(item.sellingPrice) - Number(item.purchasePrice)) / (Number(item.sellingPrice) || 1)) * 100) / items.length).toFixed(1) : 0,
      totalProfitPotential,
    });
  } catch (error) {
    next(error);
  }
});

moduleRouter.patch('/inventory/:id/stock', async (req, res, next) => {
  try {
    const item = await getRecord('inventory', req.params.id);
    if (!item) return res.status(404).json({ message: 'Inventory item not found' });
    const qtyChange = Number(req.body.qtyChange || 0);
    const newStock = Number(item.currentStock || 0) + qtyChange;
    if ((item.isStockDependent || item.type === 'Sales') && newStock < 0) {
      return res.status(400).json({ message: 'Insufficient stock available.' });
    }
    const updated = await patchRecord('inventory', req.params.id, { currentStock: item.isStockDependent || item.type === 'Sales' ? newStock : item.currentStock });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

moduleRouter.get('/assets/stats', async (req, res, next) => {
  try {
    const assets = await listRecords('assets');
    res.json({
      totalAssets: assets.length,
      available: assets.filter((asset) => asset.status === 'Available').length,
      rented: assets.filter((asset) => asset.status === 'Rented').length,
      sold: assets.filter((asset) => asset.status === 'Sold').length,
      underRepair: assets.filter((asset) => asset.status === 'Under Repair').length,
      idle: assets.filter((asset) => asset.status === 'Idle').length,
      replaced: assets.filter((asset) => asset.status === 'Replaced').length,
      totalValue: sum(assets, (asset) => asset.currentValue),
    });
  } catch (error) {
    next(error);
  }
});

moduleRouter.get('/expenses/stats', async (req, res, next) => {
  try {
    const expenses = await listRecords('expenses');
    const income = sum(expenses.filter((row) => row.flowType === 'Income'), (row) => row.amount);
    const outgoing = sum(expenses.filter((row) => row.flowType !== 'Income'), (row) => row.amount);
    res.json({ income, outgoing, net: income - outgoing, totalRows: expenses.length });
  } catch (error) {
    next(error);
  }
});

moduleRouter.get('/staff/stats', async (req, res, next) => {
  try {
    const [staff, pendingJobs, campaignJobs, leads] = await Promise.all([
      listRecords('staff'),
      listRecords('pendingJobs'),
      listRecords('campaignJobs'),
      listRecords('leads'),
    ]);
    res.json(buildStaffDashboard({ staff, pendingJobs, campaignJobs, leads }));
  } catch (error) {
    next(error);
  }
});

moduleRouter.post('/staff/assign-job', async (req, res, next) => {
  try {
    const { staffId, pendingJobId, priority, notes } = req.body;
    const staff = await getRecord('staff', staffId);
    const job = await getRecord('pendingJobs', pendingJobId);
    if (!staff || !job) return res.status(404).json({ message: 'Staff or job not found' });
    const assignedJob = { ...job, assignedTo: staff.name, staffId, priority, notes, status: 'Assigned' };
    await patchRecord('pendingJobs', pendingJobId, assignedJob);
    const updatedStaff = await patchRecord('staff', staffId, {
      status: 'On Job',
      assignedJobs: Number(staff.assignedJobs || 0) + 1,
      lastAssignedJob: pendingJobId,
    });
    res.json({ staff: updatedStaff, job: assignedJob });
  } catch (error) {
    next(error);
  }
});

moduleRouter.get('/staff/tasks', requireAuth, async (req, res, next) => {
  try {
    const user = req.user || {};
    const [jobs, leads] = await Promise.all([
      Job.find({}).sort({ updatedAt: -1 }).lean(),
      listRecords('leads'),
    ]);

    const userNames = [user.name, user.email].map(normalizeAssignmentValue).filter(Boolean);
    const userStaffId = normalizeAssignmentValue(user.staffId);

    const filteredJobs = jobs.filter((job) => {
      if (user.role !== 'staff') return true;
      const assignedIds = [job.staffId].map(normalizeAssignmentValue).filter(Boolean);
      const assignedNames = [job.assignedTo, job.technician, job.staffName].map(normalizeAssignmentValue).filter(Boolean);
      const matchId = userStaffId && assignedIds.includes(userStaffId);
      const matchName = assignedNames.some((name) => userNames.includes(name));
      return matchId || matchName;
    });

    const filteredLeads = leads.filter((lead) => {
      if (user.role !== 'staff') return true;
      const assignedIds = [lead.assignedTechnicianId, lead.staffId].map(normalizeAssignmentValue).filter(Boolean);
      const assignedNames = [lead.assignedTechnician, lead.staffName, lead.assignedTo].map(normalizeAssignmentValue).filter(Boolean);
      const matchId = userStaffId && assignedIds.includes(userStaffId);
      const matchName = assignedNames.some((name) => userNames.includes(name));
      return matchId || matchName;
    });

    const tasks = [
      ...filteredJobs.map(jobToStaffTask),
      ...filteredLeads.map(leadToStaffTask),
    ].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

moduleRouter.patch('/jobs/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const user = req.user;

    let task = await Job.findOne({ id }).exec();
    let isLead = false;

    if (!task) {
      const leads = await listRecords('leads');
      // Handle both raw ID and TASK- prefix
      const lead = leads.find((l) => String(l.id) === String(id) || `TASK-${l.id}` === id);
      if (lead) {
        task = lead;
        isLead = true;
      }
    }

    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Authorization check
    if (user.role === 'staff') {
      const ids = isLead ? [task.assignedTechnicianId, task.staffId] : [task.staffId];
      const names = isLead ? [task.assignedTechnician, task.staffName, task.assignedTo] : [task.assignedTo, task.technician, task.staffName];
      const isAssigned = isAssignedToUser(user, { ids, names });
      if (!isAssigned) return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    if (isLead) {
      const nextTracker = [...(task.tracker || [])];
      const stepIndex = nextTracker.findIndex(t => t.step === status);
      
      if (stepIndex !== -1) {
        // Mark current and all previous steps as completed
        for (let i = 0; i <= stepIndex; i++) {
          if (nextTracker[i].status !== 'completed') {
            nextTracker[i].status = 'completed';
            nextTracker[i].date = nextTracker[i].date || new Date().toISOString();
          }
        }
        // Mark next step as current
        if (stepIndex + 1 < nextTracker.length && nextTracker[stepIndex + 1].status === 'pending') {
          nextTracker[stepIndex + 1].status = 'current';
        }
      }

      const updated = await patchRecord('leads', task.id, {
        status: status,
        category: status,
        tracker: nextTracker,
        updatedAt: new Date().toISOString(),
      });
      return res.json(leadToStaffTask(updated));
    }

    task.jobStatus = status;
    task.status = status;
    task.activity.unshift({
      id: `ACT-${Date.now()}`,
      action: `Status changed to ${status}`,
      at: new Date(),
      user: user.name || user.email,
      channel: 'System',
      status: status,
    });

    await task.save();
    res.json(jobToStaffTask(task));
  } catch (error) {
    next(error);
  }
});

moduleRouter.get('/rental/state', async (req, res, next) => {
  try {
    const [customers, assets, contracts, invoices, payments, quotations, pricingPlans, maintenanceLogs, alerts] = await Promise.all([
      listRecords('rentalCustomers'),
      listRecords('rentalAssets'),
      listRecords('rentalContracts'),
      listRecords('rentalInvoices'),
      listRecords('rentalPayments'),
      listRecords('rentalQuotations'),
      listRecords('rentalPricingPlans'),
      listRecords('rentalMaintenanceLogs'),
      listRecords('rentalAlerts'),
    ]);
    res.json({ customers, assets, contracts, invoices, payments, quotations, pricingPlans, maintenanceLogs, alerts });
  } catch (error) {
    next(error);
  }
});

moduleRouter.post('/rental/payments', async (req, res, next) => {
  try {
    const payment = await saveRecord('rentalPayments', req.body, 'PAY');
    const invoice = await getRecord('rentalInvoices', req.body.invoiceId);
    if (invoice) {
      const paidAmount = Number(invoice.paidAmount || 0) + Number(req.body.amount || 0);
      const outstanding = Math.max(Number(invoice.total || 0) - paidAmount, 0);
      await patchRecord('rentalInvoices', invoice.id, {
        paidAmount,
        outstanding,
        paymentStatus: outstanding === 0 ? 'Paid' : paidAmount > 0 ? 'Partially Paid' : invoice.paymentStatus,
      });
    }
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
});
