import crypto from 'crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { listRecords, saveRecord } from '../utils/store.js';
import { sendCredentialEmail, sendPasswordResetEmail } from '../services/emailService.js';
import { normalizeRole } from '../utils/roles.js';

export const authRouter = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'repairboy_dev_secret';

const publicUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: normalizeRole(user.role),
  staffId: user.staffId,
  forcePasswordChange: user.forcePasswordChange || false,
});

// ── Admin / Staff login ────────────────────────────────────────────────────────
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const userData = publicUser(user);
    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: userData });
  } catch (error) {
    return next(error);
  }
});

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

// ── Admin/Staff: Set new password (first login or after reset) ─────────────────
authRouter.post('/set-new-password', requireAuth, async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.forcePasswordChange = false;
    await user.save();

    const userData = publicUser(user);
    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, token, user: userData });
  } catch (error) {
    return next(error);
  }
});

// ── Admin/Staff: Forgot password ───────────────────────────────────────────────
authRouter.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalEmail = String(email || '').trim().toLowerCase();
    const user = await User.findOne({ email: normalEmail });

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = token;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
      try {
        await sendPasswordResetEmail({ to: normalEmail, name: user.name, resetUrl, isCustomer: false });
      } catch (mailErr) {
        console.error('[Email] Failed to send reset email:', mailErr.message);
      }
    }

    // Always respond success to prevent email enumeration
    return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    return next(error);
  }
});

// ── Admin/Staff: Reset password via token ─────────────────────────────────────
authRouter.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Token and password (min 6 chars) are required.' });
    }
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ message: 'Reset link is invalid or has expired.' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.forcePasswordChange = false;
    await user.save();

    return res.json({ success: true, message: 'Password updated. You can now log in.' });
  } catch (error) {
    return next(error);
  }
});

// ── Customer auth helpers ──────────────────────────────────────────────────────

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const customerPublic = (record) => ({
  id: record.id,
  email: record.email,
  customerName: record.customerName,
  role: 'customer',
  contractIds: record.contractIds || [],
  forcePasswordChange: record.forcePasswordChange || false,
});

// ── POST /auth/customer/setup  (admin calls this to create/update credentials) ─
authRouter.post('/customer/setup', requireAuth, async (req, res, next) => {
  try {
    if (!['admin', 'staff'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    const { email, customerName, contractId, contractIds } = req.body;
    if (!email || !customerName) {
      return res.status(400).json({ message: 'email and customerName are required.' });
    }

    const normalEmail = String(email).trim().toLowerCase();
    const allIds = [...new Set([
      ...(Array.isArray(contractIds) ? contractIds : []),
      ...(contractId ? [contractId] : []),
    ])];

    const existing = (await listRecords('customerAuth')).find((r) => r.email === normalEmail);
    const plainPassword = generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const record = {
      ...(existing || {}),
      email: normalEmail,
      customerName,
      passwordHash,
      contractIds: existing
        ? [...new Set([...(existing.contractIds || []), ...allIds])]
        : allIds,
      status: 'active',
      forcePasswordChange: true,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveRecord('customerAuth', record, 'CAUTH');

    const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/customer/login`;
    try {
      await sendCredentialEmail({
        to: normalEmail,
        customerName,
        password: plainPassword,
        contractIds: saved.contractIds,
        loginUrl,
      });
    } catch (mailError) {
      console.error('[Email] Failed to send credential email:', mailError.message);
    }

    return res.json({
      success: true,
      id: saved.id,
      email: normalEmail,
      customerName,
      contractIds: saved.contractIds,
    });
  } catch (error) {
    return next(error);
  }
});

// ── POST /auth/customer/login ─────────────────────────────────────────────────
authRouter.post('/customer/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const normalEmail = String(email).trim().toLowerCase();
    const records = await listRecords('customerAuth');
    const record = records.find((r) => r.email === normalEmail && r.status === 'active');

    if (!record || !(await bcrypt.compare(password, record.passwordHash || ''))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    await saveRecord('customerAuth', { ...record, lastLogin: new Date().toISOString() }, 'CAUTH');

    const payload = customerPublic(record);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ token, user: payload });
  } catch (error) {
    return next(error);
  }
});

// ── PATCH /auth/customer/add-contract  (link extra contract to existing login) ─
authRouter.patch('/customer/add-contract', requireAuth, async (req, res, next) => {
  try {
    if (!['admin', 'staff'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Admin access required.' });
    }
    const { email, contractId } = req.body;
    if (!email || !contractId) {
      return res.status(400).json({ message: 'email and contractId are required.' });
    }
    const normalEmail = String(email).trim().toLowerCase();
    const records = await listRecords('customerAuth');
    const record = records.find((r) => r.email === normalEmail);
    if (!record) return res.status(404).json({ message: 'No portal account found for this email.' });

    const updated = {
      ...record,
      contractIds: [...new Set([...(record.contractIds || []), contractId])],
      updatedAt: new Date().toISOString(),
    };
    const saved = await saveRecord('customerAuth', updated, 'CAUTH');
    return res.json({ success: true, contractIds: saved.contractIds });
  } catch (error) {
    return next(error);
  }
});

// ── Customer: Set new password (first login) ───────────────────────────────────
authRouter.post('/customer/set-new-password', requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role !== 'customer') {
      return res.status(403).json({ message: 'Customer access required.' });
    }
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const records = await listRecords('customerAuth');
    const record = records.find((r) => r.email === req.user.email);
    if (!record) return res.status(404).json({ message: 'Account not found.' });

    const updated = {
      ...record,
      passwordHash: await bcrypt.hash(newPassword, 10),
      forcePasswordChange: false,
      updatedAt: new Date().toISOString(),
    };
    await saveRecord('customerAuth', updated, 'CAUTH');

    const payload = customerPublic(updated);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ success: true, token, user: payload });
  } catch (error) {
    return next(error);
  }
});

// ── Customer: Forgot password ──────────────────────────────────────────────────
authRouter.post('/customer/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalEmail = String(email || '').trim().toLowerCase();
    const records = await listRecords('customerAuth');
    const record = records.find((r) => r.email === normalEmail && r.status === 'active');

    if (record) {
      const token = crypto.randomBytes(32).toString('hex');
      const updated = {
        ...record,
        passwordResetToken: token,
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveRecord('customerAuth', updated, 'CAUTH');

      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/customer/reset-password?token=${token}`;
      try {
        await sendPasswordResetEmail({
          to: normalEmail,
          name: record.customerName,
          resetUrl,
          isCustomer: true,
        });
      } catch (mailErr) {
        console.error('[Email] Failed to send customer reset email:', mailErr.message);
      }
    }

    return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    return next(error);
  }
});

// ── Customer: Reset password via token ────────────────────────────────────────
authRouter.post('/customer/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Token and password (min 6 chars) are required.' });
    }

    const records = await listRecords('customerAuth');
    const record = records.find(
      (r) => r.passwordResetToken === token && r.passwordResetExpires && new Date(r.passwordResetExpires) > new Date()
    );
    if (!record) return res.status(400).json({ message: 'Reset link is invalid or has expired.' });

    const updated = {
      ...record,
      passwordHash: await bcrypt.hash(newPassword, 10),
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
      forcePasswordChange: false,
      updatedAt: new Date().toISOString(),
    };
    await saveRecord('customerAuth', updated, 'CAUTH');

    return res.json({ success: true, message: 'Password updated. You can now log in.' });
  } catch (error) {
    return next(error);
  }
});
