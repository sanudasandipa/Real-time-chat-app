# Chatter - Real-Time Chat App Backend

A comprehensive real-time chat application backend built with Node.js, Express.js, Socket.io, and MongoDB. This backend supports one-to-one messaging, group chats, media sharing, typing indicators, read receipts, and online status tracking.

## 🚀 Features

### Core Features
- **User Authentication** - JWT-based authentication with refresh tokens
- **Real-time Messaging** - Socket.io for instant communication
- **One-to-One Chats** - Private messaging between users
- **Group Chats** - Create and manage group conversations
- **Media Sharing** - Upload and share images, videos, and files via Cloudinary
- **Typing Indicators** - Show when users are typing
- **Read Receipts** - Track message delivery and read status
- **Online Status** - Real-time user online/offline status
- **Message Reactions** - React to messages with emojis
- **Message Editing** - Edit sent messages (within time limit)
- **Message Forwarding** - Forward messages to other chats
- **User Search** - Search for users to start conversations

### Advanced Features
- **Profile Management** - Update profile info and profile pictures
- **Group Management** - Add/remove members, change group info
- **Message Search** - Search within chat conversations
- **Pagination** - Efficient loading of messages and chats
- **Rate Limiting** - Protect against spam and abuse
- **Input Validation** - Comprehensive request validation
- **Error Handling** - Robust error handling and logging
- **Security** - Helmet, CORS, and various security measures

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.io
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer + Cloudinary
- **Validation**: Express-validator
- **Security**: Helmet, CORS, bcryptjs
- **Environment**: dotenv

## 📁 Project Structure

```
server/
├── controllers/           # Route controllers
│   ├── authController.js     # Authentication logic
│   ├── chatController.js     # Chat management
│   └── messageController.js  # Message handling
├── middlewares/          # Custom middlewares
│   ├── authMiddleware.js     # Authentication middleware
│   ├── errorMiddleware.js    # Error handling
│   └── validationMiddleware.js # Request validation
├── models/              # Database models
│   ├── User.js              # User schema
│   ├── Chat.js              # Chat schema
│   └── Message.js           # Message schema
├── routes/              # API routes
│   ├── authRoutes.js        # Auth endpoints
│   ├── chatRoutes.js        # Chat endpoints
│   └── messageRoutes.js     # Message endpoints
├── utils/               # Utility functions
│   ├── cloudinary.js        # Cloudinary configuration
│   ├── database.js          # Database connection
│   ├── helpers.js           # Helper functions
│   └── jwt.js               # JWT utilities
├── socket.js            # Socket.io configuration
├── server.js            # Main server file
├── package.json         # Dependencies
└── .env.example         # Environment variables template
```

## 🚦 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Cloudinary account (for media uploads)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Real-time-chat-app/server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/chatter-app
   
   # JWT Secret
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=7d
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret
   
   # CORS Origins
   CORS_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

4. **Start the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:5000`

## 📖 API Documentation

### Authentication Endpoints
```
POST /api/auth/register          # Register new user
POST /api/auth/login            # Login user
POST /api/auth/logout           # Logout user
GET  /api/auth/me               # Get current user profile
PUT  /api/auth/profile          # Update user profile
POST /api/auth/profile-picture  # Upload profile picture
PUT  /api/auth/change-password  # Change password
POST /api/auth/refresh          # Refresh access token
DELETE /api/auth/account        # Delete account
GET  /api/auth/search           # Search users
```

### Chat Endpoints
```
GET  /api/chats                 # Get all user chats
POST /api/chats/private         # Create/get private chat
POST /api/chats/group           # Create group chat
GET  /api/chats/:chatId         # Get chat details
PUT  /api/chats/:chatId         # Update group chat
DELETE /api/chats/:chatId       # Delete chat
POST /api/chats/:chatId/image   # Upload group image
POST /api/chats/:chatId/add-user    # Add user to group
POST /api/chats/:chatId/remove-user # Remove user from group
POST /api/chats/:chatId/leave   # Leave group chat
POST /api/chats/:chatId/read    # Mark chat as read
```

### Message Endpoints
```
GET  /api/messages/:chatId              # Get chat messages
POST /api/messages/:chatId              # Send message
GET  /api/messages/:chatId/search       # Search messages
PUT  /api/messages/:messageId           # Edit message
DELETE /api/messages/:messageId         # Delete message
POST /api/messages/:messageId/read      # Mark message as read
POST /api/messages/:messageId/forward   # Forward message
POST /api/messages/:messageId/react     # Add reaction
DELETE /api/messages/:messageId/react   # Remove reaction
```

## 🔌 Socket.io Events

### Client to Server Events
```javascript
'join-chat'           // Join a chat room
'leave-chat'          // Leave a chat room
'send-message'        // Send a message
'typing-start'        // Start typing indicator
'typing-stop'         // Stop typing indicator
'mark-message-read'   // Mark message as read
'add-reaction'        // Add reaction to message
'remove-reaction'     // Remove reaction from message
'user-online'         // Set user as online
'user-offline'        // Set user as offline
```

### Server to Client Events
```javascript
'new-message'         // New message received
'user-typing'         // User started typing
'user-stopped-typing' // User stopped typing
'message-read'        // Message was read
'reaction-added'      // Reaction added to message
'reaction-removed'    // Reaction removed from message
'user-online'         // User came online
'user-status-change'  // User status changed
'error'              // Error occurred
```

## 🗄️ Database Models

### User Model
```javascript
{
  username: String,      // Unique username
  email: String,         // Unique email
  password: String,      // Hashed password
  profilePic: String,    // Cloudinary URL
  isOnline: Boolean,     // Online status
  lastSeen: Date,        // Last activity timestamp
  bio: String,           // User bio
  // ... more fields
}
```

### Chat Model
```javascript
{
  chatName: String,      // Group chat name
  isGroupChat: Boolean,  // Chat type
  users: [ObjectId],     // Chat members
  latestMessage: ObjectId, // Latest message reference
  groupAdmin: ObjectId,  // Group admin (for groups)
  groupImage: String,    // Group image URL
  // ... more fields
}
```

### Message Model
```javascript
{
  sender: ObjectId,      // Message sender
  chat: ObjectId,        // Chat reference
  content: String,       // Message content
  messageType: String,   // 'text', 'image', 'file'
  mediaUrl: String,      // Media URL (if applicable)
  readBy: [{             // Read receipts
    user: ObjectId,
    readAt: Date
  }],
  reactions: [{          // Message reactions
    user: ObjectId,
    emoji: String,
    addedAt: Date
  }],
  // ... more fields
}
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Tokens expire in 7 days by default. Use the refresh token endpoint to get a new access token.

## 📸 File Uploads

File uploads are handled via Cloudinary:

- **Profile Pictures**: Max 5MB, images only
- **Group Images**: Max 5MB, images only  
- **Chat Media**: Max 50MB, images/videos/documents

## 🛡️ Security Features

- Password hashing with bcrypt
- JWT token authentication
- Rate limiting (100 requests/15min, 5 auth requests/15min)
- Input validation and sanitization
- CORS configuration
- Helmet security headers
- MongoDB injection protection

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your-production-secret-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CORS_ORIGINS=https://your-frontend-domain.com
```

### Deployment Platforms
- **Render**: Connect GitHub repo, set environment variables
- **Railway**: Deploy with railway CLI or GitHub integration
- **Heroku**: Use git deployment with Procfile
- **DigitalOcean**: Deploy on droplets or App Platform

## 🧪 Testing

Run health check:
```bash
curl http://localhost:5000/health
```

API documentation:
```bash
curl http://localhost:5000/api
```

## 📝 Example Usage

### Register User
```javascript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'johndoe',
    email: 'john@example.com',
    password: 'Password123'
  })
});
```

### Send Message via Socket
```javascript
socket.emit('send-message', {
  chatId: '60f7b3b3b3b3b3b3b3b3b3b3',
  content: 'Hello, World!',
  messageType: 'text'
});
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the API documentation at `/api`
- Review the environment setup in `.env.example`

---

Built with ❤️ using Node.js, Express.js, Socket.io, and MongoDB
