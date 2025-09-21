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
  list: async (req, res) => {
    const items = await Model.find({}).lean();
    res.json(items);
  },
  get: async (req, res) => {
    const doc = await Model.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  },
  create: async (req, res) => res.status(201).json(await Model.create(req.body)),
  update: async (req, res) => res.json(await Model.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true })),
  remove: async (req, res) => { await Model.deleteOne({ _id: req.params.id }); res.json({ ok: true }); }
});

export const CategoryCtrl = crud(Category);
export const AuthorCtrl = crud(Author);
export const PublisherCtrl = crud(Publisher);
export const BannerCtrl = crud(Banner);
export const PageCtrl = crud(Page);
export const CouponCtrl = crud(Coupon);

export const UsersCtrl = {
  list: async (_req, res) => res.json(await User.find({}).select('-passwordHash').lean()),
  update: async (req, res) => res.json(await User.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }).select('-passwordHash'))
};

export const OrdersCtrl = {
  list: async (req, res) => {
    const q = {};
    if (req.query.status) q.status = req.query.status;
    res.json(await Order.find(q).sort({ createdAt: -1 }).lean());
  },
  updateStatus: async (req, res) => {
    const order = await Order.findByIdAndUpdate(req.params.id, { $set: { status: req.body.status } }, { new: true });
    res.json(order);
  }
};

export const RMACtrl = {
  list: async (_req, res) => res.json(await RMA.find({}).lean()),
  update: async (req, res) => res.json(await RMA.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }))
};
