// backend/src/controllers/admin/entityController.js
import { Category } from '../../models/Category.js';
import { Author } from '../../models/Author.js';
import { Publisher } from '../../models/Publisher.js';
import { Banner } from '../../models/Banner.js';
import { Page } from '../../models/Page.js';
import { Coupon } from '../../models/Coupon.js';
import { Order } from '../../models/Order.js';
import { User } from '../../models/User.js';
import { RMA } from '../../models/RMA.js';

export const crud = (Model) => ({
  list: async (_req, res) => res.json(await Model.find({}).lean()),
  get:  async (req, res) => {
    const doc = await Model.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  },
  create: async (req, res) => res.status(201).json(await Model.create(req.body)),
  update: async (req, res) => res.json(
    await Model.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true })
  ),
  remove: async (req, res) => { await Model.deleteOne({ _id: req.params.id }); res.json({ ok: true }); }
});

export const CategoryCtrl  = crud(Category);
export const AuthorCtrl    = crud(Author);
export const PublisherCtrl = crud(Publisher);
export const BannerCtrl    = crud(Banner);
export const PageCtrl      = crud(Page);
export const CouponCtrl    = crud(Coupon);

export const UsersCtrl = {
  list:   async (_req, res) => res.json(await User.find({}).select('-passwordHash').lean()),
  update: async (req, res) => res.json(
    await User.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }).select('-passwordHash')
  )
};

export const OrdersCtrl = {
  list: async (req, res) => {
    const q = {};
    if (req.query.status) q.status = req.query.status;
    res.json(await Order.find(q).sort({ createdAt: -1 }).lean());
  },

  // Quan trọng: chặn admin set 'completed'; chỉ cho chuyển theo pipeline
  updateStatus: async (req, res) => {
    const id = req.params.id;
    const next = String(req.body.status || '').toLowerCase();
    if (next === 'completed') {
      return res.status(400).json({ message: 'Admin cannot mark as completed. Buyer/system completes after protection window.' });
    }

    const o = await Order.findById(id);
    if (!o) return res.status(404).json({ message: 'Not found' });

    const now = new Date();
    const allowed = {
      pending:     ['processing','cancelled'],
      processing:  ['shipping','cancel_requested','cancelled'],
      shipping:    ['delivered','cancel_requested'],
      delivered:   ['cancel_requested'],
      cancel_requested: ['cancelled','processing'] // tuỳ chọn nếu admin muốn trả lại flow
    };
    const from = String(o.status || 'pending');

    if (!allowed[from] || !allowed[from].includes(next)) {
      return res.status(400).json({ message: `Invalid transition: ${from} -> ${next}` });
    }

    if (next === 'processing')  o.processingAt = now;
    if (next === 'shipping')    o.shippedAt    = now;
    if (next === 'delivered') {
      o.deliveredAt = now;
      const days = Number(o?.protection?.windowDays ?? process.env.BUYER_PROTECTION_DAYS ?? 3);
      o.protection = { ...(o.protection||{}), windowDays: days, expiresAt: new Date(now.getTime() + days*24*60*60*1000) };
    }
    if (next === 'cancelled')   o.cancelledAt  = now;

    o.status = next;
    await o.save();
    return res.json(o.toObject());
  }
};

export const RMACtrl = {
  list:   async (_req, res) => res.json(await RMA.find({}).lean()),
  update: async (req, res) => res.json(
    await RMA.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true })
  )
};
