# Chatter - Real-Time Chat App Backend

## 🎯 Project Overview

**Chatter** is a comprehensive real-time chat application backend built with modern technologies. It provides a robust foundation for building WhatsApp-like chat applications with support for private messaging, group chats, media sharing, and real-time features.

### ✨ Key Features Implemented

#### 🔐 Authentication & User Management
- [x] User registration and login with JWT
- [x] Password hashing with bcrypt (12 salt rounds)
- [x] Profile management (username, bio, profile picture)
- [x] User search functionality
- [x] Online/offline status tracking
- [x] Account deletion with cleanup

#### 💬 Chat System
- [x] One-to-one private chats
- [x] Group chat creation and management
- [x] Add/remove members from groups
- [x] Group admin permissions
- [x] Chat deletion and archiving
- [x] Group image upload

#### 📨 Messaging
- [x] Real-time message sending via Socket.io
- [x] Text messages with emoji support
- [x] Image and file sharing via Cloudinary
- [x] Message editing (within 24 hours)
- [x] Message deletion (for self or everyone)
- [x] Message forwarding to multiple chats
- [x] Reply to messages
- [x] Message search within chats

#### 🔔 Real-time Features
- [x] Typing indicators ("User is typing...")
- [x] Read receipts (sent, delivered, read)
- [x] Online/offline status updates
- [x] Message reactions (emoji reactions)
- [x] Real-time notifications
- [x] User presence tracking

#### 🛡️ Security & Performance
- [x] Rate limiting (100 req/15min general, 5 auth/15min)
- [x] Input validation and sanitization
- [x] File upload validation and limits
- [x] CORS configuration
- [x] Helmet security headers
- [x] MongoDB injection protection
- [x] Error handling and logging

## 🏗️ Architecture

### Database Models

#### User Model
```javascript
{
  username: String (unique, 3-20 chars),
  email: String (unique, validated),
  password: String (hashed, min 6 chars),
  profilePic: String (Cloudinary URL),
  isOnline: Boolean,
  lastSeen: Date,
  bio: String (max 200 chars),
  phoneNumber: String,
  dateOfBirth: Date,
  isVerified: Boolean,
  blockedUsers: [ObjectId],
  friends: [{
    user: ObjectId,
    addedAt: Date
  }]
}
```

#### Chat Model
```javascript
{
  chatName: String (for groups, max 50 chars),
  isGroupChat: Boolean,
  users: [ObjectId] - Chat participants,
  latestMessage: ObjectId,
  groupAdmin: ObjectId,
  groupImage: String (Cloudinary URL),
  groupDescription: String (max 200 chars),
  readBy: [{
    user: ObjectId,
    readAt: Date,
    lastMessageRead: ObjectId
  }],
  userPermissions: [{
    user: ObjectId,
    role: String ('admin' | 'member'),
    canAddMembers: Boolean,
    canRemoveMembers: Boolean,
    canEditGroupInfo: Boolean
  }]
}
```

#### Message Model
```javascript
{
  sender: ObjectId,
  chat: ObjectId,
  content: String (max 1000 chars),
  messageType: String ('text' | 'image' | 'file' | 'system'),
  mediaUrl: String (Cloudinary URL),
  mediaType: String (MIME type),
  mediaSize: Number (bytes),
  mediaName: String (original filename),
  isEdited: Boolean,
  editedAt: Date,
  isDeleted: Boolean,
  deletedFor: [ObjectId] - Users who deleted it,
  readBy: [{
    user: ObjectId,
    readAt: Date
  }],
  deliveredTo: [{
    user: ObjectId,
    deliveredAt: Date
  }],
  replyTo: ObjectId (message reference),
  reactions: [{
    user: ObjectId,
    emoji: String,
    addedAt: Date
  }],
  mentions: [ObjectId],
  priority: String ('low' | 'normal' | 'high' | 'urgent')
}
```

### API Endpoints

#### Authentication (`/api/auth/`)
- `POST /register` - User registration
- `POST /login` - User login  
- `POST /logout` - User logout
- `GET /me` - Get current user profile
- `PUT /profile` - Update user profile
- `POST /profile-picture` - Upload profile picture
- `PUT /change-password` - Change password
- `POST /refresh` - Refresh JWT token
- `DELETE /account` - Delete user account
- `GET /search` - Search users

#### Chats (`/api/chats/`)
- `GET /` - Get all user chats
- `POST /private` - Create/get private chat
- `POST /group` - Create group chat
- `GET /:chatId` - Get chat details
- `PUT /:chatId` - Update group chat
- `DELETE /:chatId` -Delete chat
- `POST /:chatId/image` - Upload group image
- `POST /:chatId/add-user` - Add user to group
- `POST /:chatId/remove-user` - Remove user from group
- `POST /:chatId/leave` - Leave group chat
- `POST /:chatId/read` - Mark chat as read

#### Messages (`/api/messages/`)
- `GET /:chatId` - Get chat messages (paginated)
- `POST /:chatId` - Send message
- `GET /:chatId/search` - Search messages in chat
- `PUT /:messageId` - Edit message
- `DELETE /:messageId` - Delete message
- `POST /:messageId/read` - Mark message as read
- `POST /:messageId/forward` - Forward message
- `POST /:messageId/react` - Add reaction
- `DELETE /:messageId/react` - Remove reaction

### Socket.io Events

#### Client → Server
- `join-chat` - Join chat room
- `leave-chat` - Leave chat room
- `send-message` - Send message in real-time
- `typing-start` - Start typing indicator
- `typing-stop` - Stop typing indicator
- `mark-message-read` - Mark message as read
- `add-reaction` - Add emoji reaction
- `remove-reaction` - Remove emoji reaction

#### Server → Client
- `new-message` - New message received
- `user-typing` - User started typing
- `user-stopped-typing` - User stopped typing
- `message-read` - Message was read
- `reaction-added` - Reaction added to message
- `reaction-removed` - Reaction removed
- `user-online` - User came online
- `user-status-change` - User status changed

## 🚀 Getting Started

### Prerequisites
```bash
# Required
Node.js 14+
MongoDB (local or Atlas)
Cloudinary account

# Optional
Redis (for sessions/caching - future enhancement)
```

### Quick Setup
```bash
# 1. Clone and navigate
git clone <repo-url>
cd Real-time-chat-app/server

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Update .env with your values

# 4. Seed database (optional)
npm run seed

# 5. Start development server
npm run dev
```

### Production Deployment

#### Environment Variables
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=your-super-secure-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CORS_ORIGINS=https://your-domain.com
```

#### Deployment Platforms
- **Render**: Auto-deploy from GitHub
- **Railway**: Simple CLI deployment
- **Heroku**: Git-based deployment
- **DigitalOcean**: App Platform or Droplets

## 📊 Performance & Scaling

### Current Optimizations
- Database indexing on frequently queried fields
- Pagination for large datasets
- File upload limits and validation
- Rate limiting to prevent abuse
- Connection pooling for MongoDB
- Efficient Socket.io room management

### Future Enhancements
- Redis for session management and caching
- Message queue for background tasks
- CDN for static file delivery
- Database sharding for large scale
- Microservices architecture
- Push notifications (FCM/APNS)

## 🧪 Testing

### Manual Testing
```bash
# Health check
curl http://localhost:5000/health

# API documentation
curl http://localhost:5000/api

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"Password123"}'
```

### Socket.io Testing
Use a Socket.io client tester or browser console:
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'your-jwt-token' }
});

socket.on('connect', () => {
  console.log('Connected to server');
  socket.emit('join-chat', 'chat-id-here');
});
```

## 🔧 Configuration Options

### File Upload Limits
- Profile pictures: 5MB, images only
- Group images: 5MB, images only
- Chat media: 50MB, images/videos/documents

### Rate Limiting
- General API: 100 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes
- Configurable via environment variables

### JWT Configuration
- Default expiry: 7 days
- Refresh token support
- Configurable secret and expiry

## 🛡️ Security Considerations

### Implemented
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ JWT authentication with refresh tokens
- ✅ Input validation and sanitization
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Helmet security headers
- ✅ File upload validation
- ✅ MongoDB injection protection

### Recommended for Production
- [ ] HTTPS/TLS termination
- [ ] API key management
- [ ] Audit logging
- [ ] Intrusion detection
- [ ] Regular security updates
- [ ] Vulnerability scanning

## 📈 Monitoring & Logging

### Current Logging
- Console logging for development
- Error tracking and stack traces
- Socket.io connection logging
- API request logging with Morgan

### Production Recommendations
- Winston for structured logging
- Log aggregation (ELK stack, Splunk)
- APM tools (New Relic, DataDog)
- Health checks and uptime monitoring
- Performance metrics collection

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Follow code style conventions
4. Add tests for new features
5. Update documentation
6. Submit pull request

### Code Style
- ESLint configuration
- Prettier for formatting
- Consistent error handling
- Comprehensive commenting
- RESTful API design

## 📚 Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Socket.io Documentation](https://socket.io/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Cloudinary API Reference](https://cloudinary.com/documentation)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

---

This backend provides a solid foundation for building modern chat applications. It's production-ready with proper security, error handling, and scalability considerations. The codebase is well-structured and documented for easy maintenance and extension.
