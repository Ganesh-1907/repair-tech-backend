import { Record } from '../models/Record.js';
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

export const modelMap = {
  billingInvoices: ContractInvoice,
  inventory: InventoryItem,
  assets: Asset,
  staff: Staff,
  pendingJobs: Job,
  campaignJobs: Job,
  campaignInventoryParts: InventoryItem,
  rentalCustomers: Customer,
  rentalAssets: Asset,
  rentalContracts: Contract,
  rentalInvoices: ContractInvoice,
  rentalPayments: Payment,
  rentalMaintenanceLogs: MaintenanceLog,
  rentalAlerts: Alert,
  amcContracts: Contract,
  amcDevices: ContractDevice,
  amcSchedules: ContractSchedule,
  amcInvoices: ContractInvoice,
  amcRenewals: Alert,
  cmcContracts: Contract,
  cmcDevices: ContractDevice,
  cmcSchedules: ContractSchedule,
  cmcInvoices: ContractInvoice,
  cmcPartsUsage: MaintenanceLog,
};

export const getModel = (bucket) => modelMap[bucket] || Record;
