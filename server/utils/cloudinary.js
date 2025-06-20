const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary storage for profile pictures
const profilePictureStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chatter-app/profile-pictures',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good' }
    ]
  }
});

// Configure Cloudinary storage for group images
const groupImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chatter-app/group-images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill' },
      { quality: 'auto:good' }
    ]
  }
});

// Configure Cloudinary storage for chat media
const chatMediaStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    let folder = 'chatter-app/chat-media';
    let transformation = [];

    // Different handling for different file types
    if (file.mimetype.startsWith('image/')) {
      folder = 'chatter-app/chat-images';
      transformation = [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto:good' }
      ];
    } else if (file.mimetype.startsWith('video/')) {
      folder = 'chatter-app/chat-videos';
      transformation = [
        { width: 1280, height: 720, crop: 'limit', quality: 'auto:good' }
      ];
    } else {
      folder = 'chatter-app/chat-files';
    }

    return {
      folder: folder,
      resource_type: file.mimetype.startsWith('video/') ? 'video' : 'auto',
      transformation: transformation
    };
  }
});

// Multer configurations
const profilePictureUpload = multer({
  storage: profilePictureStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for profile pictures'), false);
    }
  }
});

const groupImageUpload = multer({
  storage: groupImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for group images'), false);
    }
  }
});

const chatMediaUpload = multer({
  storage: chatMediaStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for chat media
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and common document types
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/ogg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported'), false);
    }
  }
});

// Helper function to delete files from Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

// Helper function to extract public ID from Cloudinary URL
const extractPublicId = (url) => {
  if (!url) return null;
  
  try {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    const publicId = filename.split('.')[0];
    
    // Include folder path for organized deletion
    const folderIndex = parts.findIndex(part => part === 'chatter-app');
    if (folderIndex !== -1 && folderIndex < parts.length - 1) {
      const folderPath = parts.slice(folderIndex, parts.length - 1).join('/');
      return `${folderPath}/${publicId}`;
    }
    
    return publicId;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

// Helper function to optimize image URL
const getOptimizedImageUrl = (url, width, height, quality = 'auto:good') => {
  if (!url) return null;
  
  try {
    // Insert transformation parameters into Cloudinary URL
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      const transformation = `w_${width},h_${height},c_fill,q_${quality}`;
      return `${parts[0]}/upload/${transformation}/${parts[1]}`;
    }
    return url;
  } catch (error) {
    console.error('Error optimizing image URL:', error);
    return url;
  }
};

// Helper function to generate thumbnail for videos
const generateVideoThumbnail = (videoUrl) => {
  if (!videoUrl) return null;
  
  try {
    const parts = videoUrl.split('/upload/');
    if (parts.length === 2) {
      const transformation = 'so_0,w_400,h_300,c_fill,q_auto:good,f_jpg';
      return `${parts[0]}/upload/${transformation}/${parts[1]}`;
    }
    return null;
  } catch (error) {
    console.error('Error generating video thumbnail:', error);
    return null;
  }
};

module.exports = {
  cloudinary,
  profilePictureUpload,
  groupImageUpload,
  chatMediaUpload,
  deleteFromCloudinary,
  extractPublicId,
  getOptimizedImageUrl,
  generateVideoThumbnail
};
