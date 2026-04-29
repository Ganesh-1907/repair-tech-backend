import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

export const STAFF_DEFAULT_PASSWORD = 'staff@123';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export const ensureStaffUser = async (staff) => {
  const email = normalizeEmail(staff.email);
  if (!email) return null;

  const existingByStaffId = staff.id ? await User.findOne({ staffId: staff.id }) : null;
  const existingByEmail = await User.findOne({ email });
  const user = existingByStaffId || existingByEmail;

  const payload = {
    name: staff.name,
    email,
    role: 'staff',
    staffId: staff.id,
  };

  if (user) {
    await User.updateOne({ _id: user._id }, { $set: payload });
    return User.findById(user._id);
  }

  return User.create({
    ...payload,
    passwordHash: await bcrypt.hash(STAFF_DEFAULT_PASSWORD, 10),
  });
};

export const removeStaffUser = async (staffId) => {
  if (!staffId) return;
  await User.deleteOne({ staffId });
};
