import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { sendStaffCredentialEmail } from '../services/emailService.js';
import { normalizeRole } from './roles.js';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export const ensureStaffUser = async (staff, { sendEmail = false } = {}) => {
  const email = normalizeEmail(staff.email);
  if (!email) return null;

  const existingByStaffId = staff.id ? await User.findOne({ staffId: staff.id }) : null;
  const existingByEmail = await User.findOne({ email });
  const user = existingByStaffId || existingByEmail;

  const payload = {
    name: staff.name,
    email,
    role: normalizeRole(staff.role) || 'staff',
    staffId: staff.id,
  };

  if (user) {
    await User.updateOne({ _id: user._id }, { $set: payload });
    return User.findById(user._id);
  }

  const plainPassword = generatePassword();
  const created = await User.create({
    ...payload,
    passwordHash: await bcrypt.hash(plainPassword, 10),
    forcePasswordChange: true,
  });

  if (sendEmail) {
    const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;
    try {
      await sendStaffCredentialEmail({
        to: email,
        name: staff.name,
        password: plainPassword,
        loginUrl,
      });
    } catch (err) {
      console.error('[Email] Failed to send staff credential email:', err.message);
    }
  }

  return created;
};

export const removeStaffUser = async (staffId) => {
  if (!staffId) return;
  await User.deleteOne({ staffId });
};
