// src/models/Address.js
import mongoose from 'mongoose';

const AddressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },

    label: { type: String, default: 'Nhà riêng' },
    receiver: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },

    province: { type: String, required: true, trim: true },
    district: { type: String, default: '', trim: true },
    ward: { type: String, default: '', trim: true },
    detail: { type: String, required: true, trim: true },

    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Không cho phép một user có >1 địa chỉ default (enforce ở controller, index để query nhanh)
AddressSchema.index({ userId: 1, isDefault: 1 });

export const Address = mongoose.models.Address || mongoose.model('Address', AddressSchema);
