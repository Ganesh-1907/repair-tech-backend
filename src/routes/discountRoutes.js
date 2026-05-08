import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listRecords, getRecord, saveRecord, patchRecord, removeRecord, makeId } from '../utils/store.js';

export const discountRouter = express.Router();
const COLLECTION = 'discounts';
const PREFIX = 'DSC';

// Dashboard stats
discountRouter.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    const coupons = await listRecords(COLLECTION);
    const now = new Date();

    const total = coupons.length;
    const active = coupons.filter(
      (c) => c.isActive && (!c.expiryDate || new Date(c.expiryDate) > now)
    ).length;
    const expired = coupons.filter(
      (c) => c.expiryDate && new Date(c.expiryDate) <= now
    ).length;
    const disabled = coupons.filter((c) => !c.isActive).length;

    const totalUsed = coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);
    const totalDiscountGiven = coupons.reduce(
      (sum, c) => sum + (c.totalDiscountGiven || 0), 0
    );

    const byType = coupons.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {});

    const topCoupons = [...coupons]
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        usageCount: c.usageCount || 0,
        totalDiscountGiven: c.totalDiscountGiven || 0,
        type: c.type,
        isActive: c.isActive,
      }));

    const recentUsage = coupons
      .flatMap((c) =>
        (c.userUsage || []).map((u) => ({
          ...u,
          code: c.code,
          couponName: c.name,
          couponId: c.id,
        }))
      )
      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
      .slice(0, 10);

    res.json({
      total,
      active,
      expired,
      disabled,
      totalUsed,
      totalDiscountGiven,
      byType,
      topCoupons,
      recentUsage,
    });
  } catch (err) {
    next(err);
  }
});

// List all coupons
discountRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const coupons = await listRecords(COLLECTION);
    res.json(coupons);
  } catch (err) {
    next(err);
  }
});

// Get single coupon
discountRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const coupon = await getRecord(COLLECTION, req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json(coupon);
  } catch (err) {
    next(err);
  }
});

// Create coupon
discountRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const { code, name, type, discountType, discountValue } = req.body;
    if (!code || !name || !type || !discountType || discountValue === undefined) {
      return res.status(400).json({ message: 'code, name, type, discountType, discountValue are required' });
    }

    // Check duplicate code
    const existing = await listRecords(COLLECTION);
    const duplicate = existing.find(
      (c) => c.code?.toUpperCase() === code.toUpperCase()
    );
    if (duplicate) {
      return res.status(409).json({ message: `Coupon code "${code.toUpperCase()}" already exists` });
    }

    const id = makeId(PREFIX);
    const payload = {
      ...req.body,
      id,
      code: code.toUpperCase().trim(),
      usageCount: 0,
      totalDiscountGiven: 0,
      userUsage: [],
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      createdAt: new Date().toISOString(),
    };

    const saved = await saveRecord(COLLECTION, payload, PREFIX);
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

// Update coupon
discountRouter.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const coupon = await getRecord(COLLECTION, req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    const code = req.body.code?.toUpperCase().trim() || coupon.code;

    // Check duplicate code (exclude self)
    const existing = await listRecords(COLLECTION);
    const duplicate = existing.find(
      (c) => c.code?.toUpperCase() === code && c.id !== req.params.id
    );
    if (duplicate) {
      return res.status(409).json({ message: `Coupon code "${code}" already exists` });
    }

    const updated = await saveRecord(
      COLLECTION,
      { ...coupon, ...req.body, id: req.params.id, code },
      PREFIX
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Toggle enable/disable
discountRouter.patch('/:id/toggle', requireAuth, async (req, res, next) => {
  try {
    const coupon = await getRecord(COLLECTION, req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    const updated = await patchRecord(COLLECTION, req.params.id, {
      isActive: !coupon.isActive,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete coupon
discountRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const removed = await removeRecord(COLLECTION, req.params.id);
    if (!removed) return res.status(404).json({ message: 'Coupon not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Validate a coupon code (public — used at checkout)
discountRouter.post('/validate', async (req, res, next) => {
  try {
    const { code, userIdentifier, orderAmount = 0 } = req.body;
    if (!code) return res.status(400).json({ message: 'Coupon code required' });

    const coupons = await listRecords(COLLECTION);
    const coupon = coupons.find(
      (c) => c.code?.toUpperCase() === code.toUpperCase()
    );

    if (!coupon) return res.status(404).json({ valid: false, message: 'Invalid coupon code' });
    if (!coupon.isActive) return res.status(400).json({ valid: false, message: 'Coupon is currently inactive' });

    const now = new Date();
    if (coupon.startDate && new Date(coupon.startDate) > now) {
      return res.status(400).json({ valid: false, message: 'Coupon is not yet active' });
    }
    if (coupon.expiryDate && new Date(coupon.expiryDate) < now) {
      return res.status(400).json({ valid: false, message: 'Coupon has expired' });
    }
    if (coupon.totalUsageLimit && coupon.usageCount >= coupon.totalUsageLimit) {
      return res.status(400).json({ valid: false, message: 'Coupon usage limit has been reached' });
    }
    if (coupon.minimumOrderAmount && orderAmount < coupon.minimumOrderAmount) {
      return res.status(400).json({
        valid: false,
        message: `Minimum order amount of ₹${coupon.minimumOrderAmount} required`,
      });
    }

    if (userIdentifier && coupon.usageLimitPerUser) {
      const entry = (coupon.userUsage || []).find(
        (u) => u.identifier === userIdentifier
      );
      if (entry && entry.count >= coupon.usageLimitPerUser) {
        return res.status(400).json({ valid: false, message: 'You have already used this coupon the maximum number of times' });
      }
    }

    if (coupon.applicableTo === 'selected' && userIdentifier) {
      const allowed = (coupon.allowedUsers || []).some(
        (u) => u.identifier === userIdentifier
      );
      if (!allowed) {
        return res.status(400).json({ valid: false, message: 'This coupon is not applicable for your account' });
      }
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (Number(orderAmount) * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    } else {
      discountAmount = coupon.discountValue;
    }
    discountAmount = Math.min(discountAmount, Number(orderAmount));

    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      discountAmount: Math.round(discountAmount * 100) / 100,
    });
  } catch (err) {
    next(err);
  }
});

// Record coupon usage (called after successful order)
discountRouter.post('/:id/use', requireAuth, async (req, res, next) => {
  try {
    const { userIdentifier, discountAmount = 0 } = req.body;
    const coupon = await getRecord(COLLECTION, req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    const userUsage = [...(coupon.userUsage || [])];
    if (userIdentifier) {
      const entry = userUsage.find((u) => u.identifier === userIdentifier);
      if (entry) {
        entry.count = (entry.count || 0) + 1;
        entry.lastUsed = new Date().toISOString();
      } else {
        userUsage.push({
          identifier: userIdentifier,
          count: 1,
          lastUsed: new Date().toISOString(),
        });
      }
    }

    const updated = await patchRecord(COLLECTION, req.params.id, {
      usageCount: (coupon.usageCount || 0) + 1,
      totalDiscountGiven: (coupon.totalDiscountGiven || 0) + Number(discountAmount),
      userUsage,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});
