import bcrypt from 'bcryptjs';
import { Record } from '../models/Record.js';
import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
import { Staff } from '../models/Staff.js';
import { Job } from '../models/Job.js';
import { InventoryItem } from '../models/InventoryItem.js';
import { Asset } from '../models/Asset.js';
import { Contract } from '../models/Contract.js';
import { ContractDevice } from '../models/ContractDevice.js';
import { ContractSchedule } from '../models/ContractSchedule.js';
import { ContractInvoice } from '../models/ContractInvoice.js';
import { Payment } from '../models/Payment.js';
import { MaintenanceLog } from '../models/MaintenanceLog.js';
import { Alert } from '../models/Alert.js';
import { seedRecords } from './seedData.js';
import { modelMap } from '../utils/modelRegistry.js';
import { ensureStaffUser } from '../utils/staffAuth.js';

export const seedDatabase = async ({ reset = false, demo = false } = {}) => {
  const adminEmail = 'ganesh.bora@gmail.com';
  const legacyAdminEmails = ['admin@enterprise.com'];
  const deprecatedRecordBuckets = ['dashboardSnapshots', 'dashboardAlerts'];
  const syncStaffUsers = async () => {
    const staffRows = await Staff.find({}).lean();
    await Promise.all(staffRows.map((staff) => ensureStaffUser(staff)));
  };

  if (reset) {
    await User.deleteMany({ $or: [{ email: { $in: [adminEmail, ...legacyAdminEmails] } }, { role: 'staff' }] });
    await Record.deleteMany({}); // Delete all records during reset
    await Customer.deleteMany({});
    await Staff.deleteMany({});
    await Job.deleteMany({});
    await InventoryItem.deleteMany({});
    await Asset.deleteMany({});
    await Contract.deleteMany({});
    await ContractDevice.deleteMany({});
    await ContractSchedule.deleteMany({});
    await ContractInvoice.deleteMany({});
    await Payment.deleteMany({});
    await MaintenanceLog.deleteMany({});
    await Alert.deleteMany({});
  } else {
    await Record.deleteMany({ bucket: { $in: deprecatedRecordBuckets } });
  }

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      name: 'Ganesh Bora',
      email: adminEmail,
      passwordHash: await bcrypt.hash('Ganesh@1907', 10),
      role: 'admin',
    });
  }

  if (!demo) {
    await syncStaffUsers();
    return;
  }

  for (const [bucket, rows] of Object.entries(seedRecords)) {
    const Model = modelMap[bucket] || Record;

    const count = Model === Record ? await Record.countDocuments({ bucket }) : await Model.countDocuments({ id: { $in: rows.map((r) => r.id) } });
    if (count > 0 && !reset) continue;

    const dataToInsert = rows.map((row) => {
      if (Model === Record) {
        return { bucket, recordId: row.id, data: row };
      }

      // Add contractType for Contract model
      if (Model === Contract) {
        let contractType = 'AMC';
        if (bucket === 'rentalContracts') contractType = 'Rental';
        if (bucket === 'cmcContracts') contractType = 'CMC';

        const amcDetails = bucket === 'amcContracts' ? row : undefined;
        const cmcDetails = bucket === 'cmcContracts' ? row : undefined;
        const rentalDetails = bucket === 'rentalContracts' ? row : undefined;

        return {
          ...row,
          contractType,
          customerId: row.customerId || row.customerName || 'UNKNOWN',
          endDate: row.endDate || row.expiryDate,
          amcDetails,
          cmcDetails,
          rentalDetails,
        };
      }

      // Handle contractId mapping for other models
      if ([ContractDevice, ContractSchedule, ContractInvoice, MaintenanceLog].includes(Model)) {
        return {
          ...row,
          contractId: row.contractId || row.amcId || row.cmcId || row.agreementId,
        };
      }

      return row;
    });

    await Model.insertMany(dataToInsert);
  }

  await syncStaffUsers();
};
