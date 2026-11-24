import mongoose from 'mongoose';

const MediaItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: '',
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      default: '',
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      index: true,
    },
    format: {
      type: String,
      default: '',
      lowercase: true,
    },
    size: {
      type: Number,
      required: true,
    },
    width: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    folder: {
      type: String,
      default: 'general',
      index: true,
    },
    altText: {
      type: String,
      default: '',
      trim: true,
    },
    caption: {
      type: String,
      default: '',
      trim: true,
    },
    storageProvider: {
      type: String,
      enum: ['cloudinary', 'local'],
      default: 'local',
      index: true,
    },
    usedIn: [
      {
        model: { type: String, required: true },
        field: { type: String, required: true },
        refId: { type: String, required: true },
      },
    ],
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

MediaItemSchema.index({ createdAt: -1 });
MediaItemSchema.index({ folder: 1, mimeType: 1 });

export const MediaItem = mongoose.models.MediaItem || mongoose.model('MediaItem', MediaItemSchema);
export default MediaItem;
