const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import utilities
const connectDB = require('./utils/database');
const { initializeSocket } = require('./socket');

// Import middlewares
const { errorHandler, notFound } = require('./middlewares/errorMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Connect to database
connectDB();

// Initialize Socket.io
const io = initializeSocket(server);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all requests
app.use(limiter);

// More strict rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth routes
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  }
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);

// Serve static files (for uploaded files)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API documentation endpoint (basic info)
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Chatter API v1.0.0',
    documentation: {
      auth: '/api/auth',
      chats: '/api/chats',
      messages: '/api/messages'
    },
    endpoints: {
      auth: [
        'POST /api/auth/register - Register a new user',
        'POST /api/auth/login - Login user',
        'POST /api/auth/logout - Logout user',
        'GET /api/auth/me - Get current user profile',
        'PUT /api/auth/profile - Update user profile',
        'POST /api/auth/profile-picture - Upload profile picture',
        'PUT /api/auth/change-password - Change password',
        'POST /api/auth/refresh - Refresh access token',
        'DELETE /api/auth/account - Delete account',
        'GET /api/auth/search - Search users'
      ],
      chats: [
        'GET /api/chats - Get all user chats',
        'POST /api/chats/private - Create or get private chat',
        'POST /api/chats/group - Create group chat',
        'GET /api/chats/:chatId - Get chat details',
        'PUT /api/chats/:chatId - Update group chat',
        'DELETE /api/chats/:chatId - Delete chat',
        'POST /api/chats/:chatId/image - Upload group image',
        'POST /api/chats/:chatId/add-user - Add user to group',
        'POST /api/chats/:chatId/remove-user - Remove user from group',
        'POST /api/chats/:chatId/leave - Leave group chat',
        'POST /api/chats/:chatId/read - Mark chat as read'
      ],
      messages: [
        'GET /api/messages/:chatId - Get chat messages',
        'POST /api/messages/:chatId - Send message',
        'GET /api/messages/:chatId/search - Search messages in chat',
        'PUT /api/messages/:messageId - Edit message',
        'DELETE /api/messages/:messageId - Delete message',
        'POST /api/messages/:messageId/read - Mark message as read',
        'POST /api/messages/:messageId/forward - Forward message',
        'POST /api/messages/:messageId/react - Add reaction to message',
        'DELETE /api/messages/:messageId/react - Remove reaction from message'
      ]
    },
    socketEvents: {
      connection: 'User connects to socket',
      'join-chat': 'Join a chat room',
      'leave-chat': 'Leave a chat room',
      'send-message': 'Send a message in real-time',
      'typing-start': 'User starts typing',
      'typing-stop': 'User stops typing',
      'mark-message-read': 'Mark message as read',
      'add-reaction': 'Add reaction to message',
      'remove-reaction': 'Remove reaction from message',
      'user-online': 'User comes online',
      'user-offline': 'User goes offline'
    }
  });
});

// Handle 404 routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
🚀 Server is running on port ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📝 API Documentation: http://localhost:${PORT}/api
🔗 Health Check: http://localhost:${PORT}/health
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Unhandled Promise Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(`❌ Uncaught Exception: ${err.message}`);
  console.log('💥 Shutting down...');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔒 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('💤 Process terminated');
  });
});

module.exports = { app, server, io };
