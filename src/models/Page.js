import mongoose from 'mongoose';

const SectionItemSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    value: { type: String, default: '' },
    label: { type: String, default: '' },
    image: { type: String, default: '' },
    author: { type: String, default: '' },
    role: { type: String, default: '' },
    rating: { type: Number, default: 5 },
    link: { type: String, default: '' },
  },
  { _id: false }
);

const SectionButtonSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    href: { type: String, required: true },
    variant: { type: String, default: 'primary', enum: ['primary', 'secondary', 'outline', 'ghost'] },
    isExternal: { type: Boolean, default: false },
  },
  { _id: false }
);

const SectionImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: '' },
    caption: { type: String, default: '' },
  },
  { _id: false }
);

const SectionSettingsSchema = new mongoose.Schema(
  {
    visible: { type: Boolean, default: true },
    backgroundColor: { type: String, default: '' },
    textColor: { type: String, default: '' },
    paddingY: { type: String, default: 'normal', enum: ['none', 'compact', 'normal', 'spacious'] },
    alignment: { type: String, default: 'center', enum: ['left', 'center', 'right'] },
    containerWidth: { type: String, default: 'wide', enum: ['narrow', 'normal', 'wide', 'full'] },
  },
  { _id: false }
);

const SectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
        'hero',
        'stats',
        'features',
        'plans_catalog',
        'about_story',
        'testimonials',
        'faq',
        'cta',
        'rich_text',
        'gallery',
        'announcement_banner',
        'contact_block',
        'custom_html',
      ],
    },
    name: { type: String, default: '' },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    content: { type: String, default: '' },
    badge: { type: String, default: '' },
    images: { type: [SectionImageSchema], default: [] },
    videoUrl: { type: String, default: '' },
    buttons: { type: [SectionButtonSchema], default: [] },
    items: { type: [SectionItemSchema], default: [] },
    settings: { type: SectionSettingsSchema, default: () => ({}) },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const PageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
      index: true,
    },
    isSystemPage: {
      type: Boolean,
      default: false,
    },
    sections: {
      type: [SectionSchema],
      default: [],
    },
    featuredImage: {
      type: String,
      default: '',
    },
    seo: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      keywords: { type: String, default: '' },
      ogTitle: { type: String, default: '' },
      ogDescription: { type: String, default: '' },
      ogImage: { type: String, default: '' },
      canonicalUrl: { type: String, default: '' },
      noIndex: { type: Boolean, default: false },
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

PageSchema.index({ slug: 1, status: 1 });

export const Page = mongoose.models.Page || mongoose.model('Page', PageSchema);
export default Page;
