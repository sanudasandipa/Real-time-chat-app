# Real-time Chat Features Documentation

This document describes the comprehensive real-time chat features implemented in the chat application, including typing indicators, message delivery status, read receipts, and online presence.

## 🚀 Features Overview

### 1. **Typing Indicators**
- Real-time typing notifications when users are composing messages
- Shows username of typing users
- Smart timeout handling (stops after 3 seconds of inactivity)
- Group chat support (shows multiple users typing)

### 2. **Message Delivery Status (Double Ticks)**
- **Single Tick (✓)**: Message sent to server
- **Double Tick (✓✓)**: Message delivered to recipient(s)
- **Blue Double Tick (✓✓)**: Message read by recipient(s)
- Real-time status updates

### 3. **Read Receipts**
- Individual message read status
- Bulk read receipts when entering chat
- User profile information in read receipts
- Privacy-aware (only sender sees read status)

### 4. **Online/Offline Status**
- Real-time user presence indicators
- Green dot for online users
- Gray dot for offline users
- "Last seen" information
- Status changes broadcast to relevant chats

### 5. **Real-time Synchronization**
- Instant message delivery
- Message status synchronization across devices
- Connection state management
- Automatic reconnection handling

## 🔧 Technical Implementation

### Backend (Server-side)

#### Socket Events

**Message Events:**
```javascript
// Send message
socket.emit('send-message', {
  chatId: 'chat_id',
  content: 'Hello world',
  messageType: 'text'
});

// Mark message as read
socket.emit('mark-message-read', {
  messageId: 'message_id',
  chatId: 'chat_id'
});

// Mark multiple messages as read
socket.emit('mark-chat-messages-read', {
  chatId: 'chat_id',
  lastMessageId: 'last_message_id'
});
```

**Typing Events:**
```javascript
// Start typing
socket.emit('typing-start', { chatId: 'chat_id' });

// Stop typing
socket.emit('typing-stop', { chatId: 'chat_id' });
```

**Status Events:**
```javascript
// User online/offline events are handled automatically
socket.on('user-status-change', (data) => {
  console.log(`User ${data.userId} is ${data.isOnline ? 'online' : 'offline'}`);
});
```

#### Socket Listeners

**Message Status Updates:**
```javascript
// New message received
socket.on('new-message', (message) => {
  // Handle new message
});

// Message delivered
socket.on('message-delivered', (data) => {
  // Update delivery status
});

// Message read
socket.on('message-read', (data) => {
  // Update read status
});

// Bulk status updates
socket.on('messages-bulk-read', (data) => {
  // Handle multiple read receipts
});
```

**Typing Indicators:**
```javascript
// User started typing
socket.on('user-typing', (data) => {
  // Show typing indicator
});

// User stopped typing
socket.on('user-stopped-typing', (data) => {
  // Hide typing indicator
});
```

#### Database Schema

**Message Model Enhancements:**
```javascript
const messageSchema = new mongoose.Schema({
  // ... existing fields
  
  // Delivery status
  deliveredTo: [{
    user: { type: ObjectId, ref: 'User' },
    deliveredAt: { type: Date, default: Date.now }
  }],
  
  // Read receipts
  readBy: [{
    user: { type: ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }]
});
```

**User Model Enhancements:**
```javascript
const userSchema = new mongoose.Schema({
  // ... existing fields
  
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now }
});
```

### Frontend (Client-side)

#### React Component Integration

**ChatWindow Component:**
```typescript
// Message status rendering
const getMessageStatus = (message: Message) => {
  if (message.sender._id !== user?._id) return null;
  
  const otherUsers = chat.users.filter(u => u._id !== user?._id);
  const readCount = message.readBy?.filter(read => 
    otherUsers.some(u => u._id === read.user)
  ).length || 0;
  const deliveredCount = message.deliveredTo?.filter(delivery => 
    otherUsers.some(u => u._id === delivery.user)
  ).length || 0;
  
  if (readCount === otherUsers.length && otherUsers.length > 0) {
    return 'read';
  } else if (deliveredCount > 0) {
    return 'delivered';
  } else {
    return 'sent';
  }
};

// Typing indicator state
const [typingUsers, setTypingUsers] = useState<Array<{
  userId: string, 
  username: string
}>>([]);
```

**Socket Service:**
```typescript
class SocketService {
  // Message status methods
  markMessageRead(messageId: string, chatId: string) {
    this.socket?.emit('mark-message-read', { messageId, chatId });
  }
  
  markChatMessagesRead(chatId: string, lastMessageId: string) {
    this.socket?.emit('mark-chat-messages-read', { chatId, lastMessageId });
  }
  
  // Typing methods
  startTyping(chatId: string) {
    this.socket?.emit('typing-start', { chatId });
  }
  
  stopTyping(chatId: string) {
    this.socket?.emit('typing-stop', { chatId });
  }
}
```

#### CSS Styling

**Message Status Icons:**
```css
.message-status i.bi-check2 {
  color: var(--text-secondary); /* Single check - sent */
}

.message-status i.bi-check2-all.delivered {
  color: var(--text-secondary); /* Double check - delivered */
}

.message-status i.bi-check2-all.read {
  color: #4FC3F7; /* Double check blue - read */
}
```

**Typing Indicator Animation:**
```css
.typing-indicator span {
  width: 6px;
  height: 6px;
  background: var(--primary-color);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}
```

**Online Status Indicators:**
```css
.chat-avatar::after {
  content: '';
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--bg-secondary);
}

.chat-avatar.online::after {
  background: #4CAF50;
}

.chat-avatar.offline::after {
  background: var(--text-tertiary);
}
```

## 🔌 API Endpoints

### Message Status Endpoints

```http
# Mark message as delivered
PUT /api/messages/:messageId/delivered

# Mark message as read
PUT /api/messages/:messageId/read

# Get message status details
GET /api/messages/:messageId/status

# Get unread message count
GET /api/messages/:chatId/unread-count?lastReadAt=2024-01-01T00:00:00.000Z
```

## 🧪 Testing the Features

### Using the Test Script

1. **Setup:**
   ```bash
   node test-realtime-features.js
   ```

2. **Interactive Mode:**
   ```bash
   # Start interactive tester
   node test-realtime-features.js
   
   # Commands:
   /token your_auth_token_here
   /connect
   /join chat_id_here
   /msg Hello world!
   /typing
   /stop-typing
   /quit
   ```

3. **Demo Mode:**
   ```bash
   # Run automated demo (requires token setup)
   node test-realtime-features.js --demo
   ```

### Manual Testing Checklist

- [ ] **Typing Indicators**
  - [ ] Shows when user starts typing
  - [ ] Hides after 3 seconds of inactivity
  - [ ] Shows multiple users in group chats
  - [ ] Doesn't show for own typing

- [ ] **Message Delivery**
  - [ ] Single tick appears immediately
  - [ ] Double tick appears when delivered
  - [ ] Blue double tick appears when read
  - [ ] Status updates in real-time

- [ ] **Read Receipts**
  - [ ] Individual message read status
  - [ ] Bulk read when entering chat
  - [ ] Only sender sees read status
  - [ ] Shows reader's profile info

- [ ] **Online Status**
  - [ ] Green dot for online users
  - [ ] Status changes in real-time
  - [ ] Works in both private and group chats
  - [ ] Shows last seen for offline users

## 🔐 Privacy & Security

### Privacy Controls
- Read receipts only visible to message sender
- Online status respects user privacy settings
- Typing indicators are optional per chat

### Security Measures
- Authentication required for all socket connections
- Chat membership verification for all events
- Rate limiting on typing events
- Message validation and sanitization

## 📱 Mobile Considerations

- Touch-optimized typing indicators
- Efficient battery usage for real-time features
- Offline message queuing
- Background app state handling

## 🚀 Performance Optimizations

- Event debouncing for typing indicators
- Bulk read receipt processing
- Efficient socket room management
- Message pagination for large chats
- Smart reconnection strategies

## 🔧 Configuration

### Environment Variables
```env
# Socket.io settings
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000

# Real-time features
TYPING_TIMEOUT=3000
READ_RECEIPT_ENABLED=true
ONLINE_STATUS_ENABLED=true
```

### Feature Toggles
```javascript
const features = {
  typingIndicators: true,
  readReceipts: true,
  onlineStatus: true,
  messageDeliveryStatus: true,
  bulkReadReceipts: true
};
```

## 📈 Monitoring & Analytics

- Track message delivery rates
- Monitor typing indicator usage
- Analyze read receipt patterns
- User engagement metrics
- Connection stability monitoring

## 🛠️ Troubleshooting

### Common Issues

1. **Typing indicators not showing:**
   - Check socket connection
   - Verify chat membership
   - Check event listeners

2. **Message status not updating:**
   - Verify database permissions
   - Check socket room membership
   - Validate message IDs

3. **Online status incorrect:**
   - Check connection timeouts
   - Verify user authentication
   - Review status update logic

### Debug Commands
```javascript
// Enable socket.io debug logs
localStorage.debug = 'socket.io-client:socket';

// Monitor socket events
socket.onAny((event, ...args) => {
  console.log('Socket event:', event, args);
});
```

## 🔮 Future Enhancements

- Voice message status indicators
- File upload progress tracking
- Message translation status
- Cross-platform push notifications
- Advanced analytics dashboard
- Custom emoji reactions with status
- Message scheduling with delivery confirmation

---

*This documentation covers the comprehensive real-time chat features. For additional support or feature requests, please refer to the project repository.*
