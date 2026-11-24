import mongoose from 'mongoose';

const MenuItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    href: { type: String, required: true, trim: true },
    icon: { type: String, default: '' },
    isExternal: { type: Boolean, default: false },
    isProtected: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    children: [
      {
        id: { type: String, required: true },
        label: { type: String, required: true, trim: true },
        href: { type: String, required: true, trim: true },
        isExternal: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
      },
    ],
  },
  { _id: false }
);

const NavigationMenuSchema = new mongoose.Schema(
  {
    location: {
      type: String,
      required: true,
      unique: true,
      enum: ['header', 'footer', 'mobile', 'quick_links'],
      index: true,
    },
    title: {
      type: String,
      default: '',
    },
    items: {
      type: [MenuItemSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

export const NavigationMenu =
  mongoose.models.NavigationMenu || mongoose.model('NavigationMenu', NavigationMenuSchema);
export default NavigationMenu;
