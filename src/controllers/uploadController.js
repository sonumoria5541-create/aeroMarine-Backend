import { uploadPaymentProofToCloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';

export const uploadPaymentScreenshot = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'failed',
        message: 'No screenshot image file provided. Please select a valid JPG, PNG, or WebP screenshot.',
      });
    }

    const result = await uploadPaymentProofToCloudinary(req.file.buffer, req.file.originalname);

    return res.status(200).json({
      status: 'success',
      message: 'Payment screenshot uploaded successfully',
      data: {
        url: result.url,
        publicId: result.publicId,
        provider: result.provider,
        isCloudinary: isCloudinaryConfigured(),
      },
    });
  } catch (error) {
    console.error('[Upload] Error processing screenshot upload:', error);
    return res.status(500).json({
      status: 'failed',
      message: 'Failed to upload payment screenshot. Please try again or check network.',
    });
  }
};
