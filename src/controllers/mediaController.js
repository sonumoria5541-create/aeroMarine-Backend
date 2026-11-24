import fs from 'fs';
import path from 'path';
import MediaItem from '../models/MediaItem.js';
import Page from '../models/Page.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import { v2 as cloudinary } from 'cloudinary';
import { logAudit } from '../services/auditService.js';

export const uploadMedia = async (req, res) => {
  try {
    const file = req.file;
    const admin = req.user;
    const { folder = 'general', altText = '', caption = '', title = '' } = req.body;

    if (!file) {
      return res.status(400).json({ status: 'failed', success: false, message: 'No file uploaded' });
    }

    // MIME type security check
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'video/mp4',
      'video/webm',
    ];

    if (!allowedMimes.includes(file.mimetype)) {
      return res.status(400).json({
        status: 'failed',
        success: false,
        message: 'Invalid file format. Supported: JPG, PNG, WebP, GIF, SVG, MP4, WebM',
      });
    }

    let fileUrl = '';
    let publicId = '';
    let storageProvider = 'local';
    let width = null;
    let height = null;

    // Cloudinary upload if configured
    if (isCloudinaryConfigured()) {
      try {
        const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: `aeromarine/media/${folder}`,
              resource_type: resourceType,
              transformation: resourceType === 'image' ? [{ quality: 'auto:good', fetch_format: 'auto' }] : undefined,
            },
            (err, res) => (err ? reject(err) : resolve(res))
          );
          stream.end(file.buffer);
        });

        fileUrl = result.secure_url;
        publicId = result.public_id;
        storageProvider = 'cloudinary';
        width = result.width || null;
        height = result.height || null;
      } catch (cloudErr) {
        console.warn('[Cloudinary Error] Falling back to local disk storage:', cloudErr.message);
      }
    }

    // Local disk fallback
    if (!fileUrl) {
      const ext = path.extname(file.originalname) || `.${file.mimetype.split('/')[1] || 'bin'}`;
      const safeFilename = `media_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}${ext}`;
      const uploadDir = path.join(process.cwd(), 'uploads/media', folder);

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, safeFilename);
      fs.writeFileSync(filePath, file.buffer);

      fileUrl = `/uploads/media/${folder}/${safeFilename}`;
      storageProvider = 'local';
      publicId = safeFilename;
    }

    const cleanTitle = title.trim() || path.parse(file.originalname).name;
    const mediaItem = await MediaItem.create({
      title: cleanTitle,
      originalName: file.originalname,
      filename: publicId || file.originalname,
      url: fileUrl,
      publicId,
      mimeType: file.mimetype,
      format: path.extname(file.originalname).replace('.', '').toLowerCase(),
      size: file.size,
      width,
      height,
      folder,
      altText: altText.trim(),
      caption: caption.trim(),
      storageProvider,
      uploadedBy: admin?._id || null,
    });

    await logAudit({
      actor: admin,
      action: 'UPLOAD_MEDIA',
      targetType: 'MediaItem',
      targetId: mediaItem._id,
      reason: `Uploaded media asset: ${mediaItem.originalName} (${(file.size / 1024).toFixed(1)} KB)`,
      req,
    });

    return res.status(201).json({
      status: 'success',
      success: true,
      message: 'Media asset uploaded successfully',
      data: mediaItem,
    });
  } catch (error) {
    console.error('[Media] uploadMedia error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error uploading media file' });
  }
};

export const getMediaList = async (req, res) => {
  try {
    const { folder, type, search, page = 1, limit = 40 } = req.query;
    const query = {};

    if (folder && folder !== 'all') {
      query.folder = folder;
    }

    if (type && type !== 'all') {
      if (type === 'image') query.mimeType = { $regex: '^image/' };
      if (type === 'video') query.mimeType = { $regex: '^video/' };
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { title: { $regex: s, $options: 'i' } },
        { originalName: { $regex: s, $options: 'i' } },
        { altText: { $regex: s, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 40;
    const skip = (pageNum - 1) * pageSize;

    const [total, items, folders] = await Promise.all([
      MediaItem.countDocuments(query),
      MediaItem.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      MediaItem.distinct('folder'),
    ]);

    return res.json({
      status: 'success',
      success: true,
      data: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / pageSize),
        folders: folders.length > 0 ? folders : ['general', 'fleet', 'banners', 'icons'],
        items,
      },
    });
  } catch (error) {
    console.error('[Media] getMediaList error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error loading media assets' });
  }
};

export const updateMediaItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, altText, caption, folder } = req.body;
    const admin = req.user;

    const item = await MediaItem.findById(id);
    if (!item) {
      return res.status(404).json({ status: 'failed', success: false, message: 'Media item not found' });
    }

    if (title !== undefined) item.title = title.trim();
    if (altText !== undefined) item.altText = altText.trim();
    if (caption !== undefined) item.caption = caption.trim();
    if (folder !== undefined) item.folder = folder.trim();

    await item.save();

    await logAudit({
      actor: admin,
      action: 'UPDATE_MEDIA',
      targetType: 'MediaItem',
      targetId: item._id,
      reason: `Updated media metadata: ${item.title || item.originalName}`,
      req,
    });

    return res.json({
      status: 'success',
      success: true,
      message: 'Media details updated',
      data: item,
    });
  } catch (error) {
    console.error('[Media] updateMediaItem error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error updating media' });
  }
};

export const deleteMediaItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.body;
    const admin = req.user;

    const item = await MediaItem.findById(id);
    if (!item) {
      return res.status(404).json({ status: 'failed', success: false, message: 'Media item not found' });
    }

    // Safety check: Check if media is referenced in any Page
    const pageUsage = await Page.find({
      $or: [
        { featuredImage: item.url },
        { 'sections.images.url': item.url },
        { 'sections.content': { $regex: item.url, $options: 'i' } },
      ],
    }).select('title slug');

    if (pageUsage.length > 0 && !force) {
      const pageNames = pageUsage.map((p) => p.title).join(', ');
      return res.status(400).json({
        status: 'failed',
        success: false,
        isUsed: true,
        usedInPages: pageUsage,
        message: `This media item is currently referenced in: ${pageNames}. To delete anyway, confirm force delete.`,
      });
    }

    // Delete from Cloudinary if hosted there
    if (item.storageProvider === 'cloudinary' && item.publicId && isCloudinaryConfigured()) {
      try {
        const resourceType = item.mimeType.startsWith('video/') ? 'video' : 'image';
        await cloudinary.uploader.destroy(item.publicId, { resource_type: resourceType });
      } catch (cloudErr) {
        console.warn('[Cloudinary Delete Notice]:', cloudErr.message);
      }
    }

    // Delete local disk file if stored locally
    if (item.storageProvider === 'local' && item.url.startsWith('/uploads/')) {
      try {
        const localPath = path.join(process.cwd(), item.url.replace(/^\//, ''));
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      } catch (fsErr) {
        console.warn('[Local File Delete Notice]:', fsErr.message);
      }
    }

    await MediaItem.findByIdAndDelete(id);

    await logAudit({
      actor: admin,
      action: 'DELETE_MEDIA',
      targetType: 'MediaItem',
      targetId: item._id,
      reason: `Deleted media asset: ${item.originalName}`,
      req,
    });

    return res.json({
      status: 'success',
      success: true,
      message: 'Media asset deleted successfully',
    });
  } catch (error) {
    console.error('[Media] deleteMediaItem error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error deleting media asset' });
  }
};
