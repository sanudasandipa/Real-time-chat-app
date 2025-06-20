const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');
const { sendError } = require('../utils/helpers');
const User = require('../models/User');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    const authHeader = req.headers.authorization;
    token = extractTokenFromHeader(authHeader);

    if (!token) {
      return sendError(res, 'Access denied. No token provided', 401);
    }

    try {
      // Verify token
      const decoded = verifyToken(token);
      
      // Get user from token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return sendError(res, 'Token is valid but user not found', 401);
      }

      // Add user to request
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return sendError(res, 'Token expired', 401);
      } else if (error.name === 'JsonWebTokenError') {
        return sendError(res, 'Invalid token', 401);
      } else {
        return sendError(res, 'Token verification failed', 401);
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return sendError(res, 'Authentication failed', 500);
  }
};

// Optional authentication - don't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.id).select('-password');
        
        if (user) {
          req.user = user;
        }
      } catch (error) {
        // Ignore token errors in optional auth
        console.log('Optional auth token error:', error.message);
      }
    }

    next();
  } catch (error) {
    // Don't fail the request, just continue without user
    next();
  }
};

// Check if user is admin (for future admin features)
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!req.user.isAdmin) {
    return sendError(res, 'Admin access required', 403);
  }

  next();
};

// Check if user owns the resource or is admin
const requireOwnershipOrAdmin = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (req.user._id.toString() !== resourceUserId && !req.user.isAdmin) {
      return sendError(res, 'Access denied. You can only access your own resources', 403);
    }

    next();
  };
};

// Check if user is member of a chat
const requireChatMembership = async (req, res, next) => {
  try {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    const chatId = req.params.chatId || req.body.chatId;
    
    if (!chatId) {
      return sendError(res, 'Chat ID is required', 400);
    }

    const Chat = require('../models/Chat');
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return sendError(res, 'Chat not found', 404);
    }

    // Check if user is a member of the chat
    const isMember = chat.users.some(userId => userId.toString() === req.user._id.toString());
    
    if (!isMember) {
      return sendError(res, 'Access denied. You are not a member of this chat', 403);
    }

    // Add chat to request for use in controller
    req.chat = chat;
    next();
  } catch (error) {
    console.error('Chat membership check error:', error);
    return sendError(res, 'Failed to verify chat membership', 500);
  }
};

// Rate limiting for sensitive operations
const sensitiveOperationLimit = (req, res, next) => {
  // This would integrate with express-rate-limit
  // For now, just pass through
  next();
};

// Check if user account is active
const requireActiveAccount = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }

  if (req.user.isBlocked || req.user.isDeleted) {
    return sendError(res, 'Account is not active', 403);
  }

  next();
};

// Socket.io authentication middleware
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const cleanToken = extractTokenFromHeader(token);
    const decoded = verifyToken(cleanToken);
    
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error: ' + error.message));
  }
};

module.exports = {
  protect,
  optionalAuth,
  requireAdmin,
  requireOwnershipOrAdmin,
  requireChatMembership,
  sensitiveOperationLimit,
  requireActiveAccount,
  socketAuth
};
