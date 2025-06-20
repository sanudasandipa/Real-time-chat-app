const { body, param, query, validationResult } = require('express-validator');
const { sendError } = require('../utils/helpers');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = {};
    errors.array().forEach(error => {
      formattedErrors[error.param] = error.msg;
    });
    return sendError(res, 'Validation failed', 400, formattedErrors);
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

const validateProfileUpdate = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Bio cannot exceed 200 characters'),
  
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  handleValidationErrors
];

// Chat validation rules
const validateChatCreation = [
  body('users')
    .isArray({ min: 1 })
    .withMessage('Users array is required with at least one user'),
  
  body('users.*')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  body('isGroupChat')
    .optional()
    .isBoolean()
    .withMessage('isGroupChat must be a boolean'),
  
  body('chatName')
    .if(body('isGroupChat').equals(true))
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Group chat name is required and must be between 1 and 50 characters'),
  
  body('groupDescription')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Group description cannot exceed 200 characters'),
  
  handleValidationErrors
];

const validateChatUpdate = [
  body('chatName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Chat name must be between 1 and 50 characters'),
  
  body('groupDescription')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Group description cannot exceed 200 characters'),
  
  handleValidationErrors
];

const validateAddRemoveUser = [
  body('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  handleValidationErrors
];

// Message validation rules
const validateMessageSend = [
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message content must be between 1 and 1000 characters'),
  
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file'])
    .withMessage('Invalid message type'),
  
  body('replyTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid reply message ID format'),
  
  // Custom validation to ensure either content or media is provided
  body().custom((value, { req }) => {
    const hasContent = req.body.content && req.body.content.trim();
    const hasFile = req.file;
    
    if (!hasContent && !hasFile) {
      throw new Error('Either message content or media file is required');
    }
    
    return true;
  }),
  
  handleValidationErrors
];

const validateMessageUpdate = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message content must be between 1 and 1000 characters'),
  
  handleValidationErrors
];

const validateReaction = [
  body('emoji')
    .notEmpty()
    .withMessage('Emoji is required')
    .isLength({ min: 1, max: 10 })
    .withMessage('Emoji must be between 1 and 10 characters'),
  
  handleValidationErrors
];

// Parameter validation rules
const validateMongoId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),
  
  handleValidationErrors
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

// Search validation
const validateSearch = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  handleValidationErrors
];

// Password change validation
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
  
  handleValidationErrors
];

// File upload validation
const validateFileUpload = (allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(req.file.mimetype)) {
      return sendError(res, 'Invalid file type', 400);
    }

    // Check file size
    if (req.file.size > maxSize) {
      return sendError(res, 'File too large', 400);
    }

    next();
  };
};

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateProfileUpdate,
  validateChatCreation,
  validateChatUpdate,
  validateAddRemoveUser,
  validateMessageSend,
  validateMessageUpdate,
  validateReaction,
  validateMongoId,
  validatePagination,
  validateSearch,
  validatePasswordChange,
  validateFileUpload
};
