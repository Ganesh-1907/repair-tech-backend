const ROLE_ALIASES = {
  Staff: 'staff',
  staff: 'staff',
  Sales: 'sales',
  sales: 'sales',
  salesPerson: 'sales',
  salesperson: 'sales',
  'Sales Person': 'sales',
  FrontOffice: 'frontOffice',
  frontOffice: 'frontOffice',
  frontoffice: 'frontOffice',
  'Front Office': 'frontOffice',
  CAAdmin: 'caAdmin',
  caAdmin: 'caAdmin',
  caadmin: 'caAdmin',
  'CA Admin': 'caAdmin',
  'CA admin': 'caAdmin',
  'Ca Admin': 'caAdmin',
};

export const normalizeRole = (role) => ROLE_ALIASES[role] || role;

export const CA_ADMIN_ROLE = 'caAdmin';

export const isCaAdminRole = (role) => normalizeRole(role) === CA_ADMIN_ROLE;

export const staffLoginRoles = [
  'staff',
  'Staff',
  'sales',
  'Sales',
  'salesPerson',
  'salesperson',
  'Sales Person',
  'frontOffice',
  'frontoffice',
  'Front Office',
  'caAdmin',
  'caadmin',
  'CA Admin',
];
