// Response helper functions
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
    data
  };

  // Remove data field if null
  if (data === null) {
    delete response.data;
  }

  return res.status(statusCode).json(response);
};

const sendError = (res, message = 'Internal Server Error', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
    errors
  };

  // Remove errors field if null
  if (errors === null) {
    delete response.errors;
  }

  return res.status(statusCode).json(response);
};

// Validation error formatter
const formatValidationErrors = (errors) => {
  const formattedErrors = {};
  
  if (errors.name === 'ValidationError') {
    // Mongoose validation errors
    Object.keys(errors.errors).forEach(key => {
      formattedErrors[key] = errors.errors[key].message;
    });
  } else if (Array.isArray(errors)) {
    // Express-validator errors
    errors.forEach(error => {
      formattedErrors[error.param] = error.msg;
    });
  }
  
  return formattedErrors;
};

// Pagination helper
const getPaginationData = (page, limit, total) => {
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = parseInt(limit) || 20;
  const totalPages = Math.ceil(total / itemsPerPage);
  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;

  return {
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems: total,
    hasNext,
    hasPrev
  };
};

// Generate random string
const generateRandomString = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Sanitize user input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Limit length
};

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Check if string is valid email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Check if string is valid URL
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Generate chat room ID for socket.io
const generateChatRoomId = (chatId) => {
  return `chat_${chatId}`;
};

// Generate user room ID for socket.io (for private notifications)
const generateUserRoomId = (userId) => {
  return `user_${userId}`;
};

// Check if user is online based on last seen
const isUserOnline = (lastSeen, onlineThreshold = 5) => {
  if (!lastSeen) return false;
  
  const now = new Date();
  const lastSeenTime = new Date(lastSeen);
  const diffInMinutes = (now - lastSeenTime) / (1000 * 60);
  
  return diffInMinutes <= onlineThreshold;
};

// Format time ago (e.g., "5 minutes ago", "2 hours ago")
const formatTimeAgo = (date) => {
  const now = new Date();
  const messageTime = new Date(date);
  const diffInSeconds = Math.floor((now - messageTime) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  // For older messages, return formatted date
  return messageTime.toLocaleDateString();
};

// Async error handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Remove sensitive fields from user object
const sanitizeUser = (user) => {
  const sanitized = user.toObject ? user.toObject() : { ...user };
  delete sanitized.password;
  delete sanitized.__v;
  delete sanitized.blockedUsers;
  return sanitized;
};

// Check if two arrays have common elements
const hasCommonElements = (arr1, arr2) => {
  return arr1.some(item => arr2.includes(item));
};

// Deep clone object
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Capitalize first letter
const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

module.exports = {
  sendSuccess,
  sendError,
  formatValidationErrors,
  getPaginationData,
  generateRandomString,
  sanitizeInput,
  formatFileSize,
  isValidEmail,
  isValidUrl,
  generateChatRoomId,
  generateUserRoomId,
  isUserOnline,
  formatTimeAgo,
  asyncHandler,
  sanitizeUser,
  hasCommonElements,
  deepClone,
  capitalizeFirst
};
