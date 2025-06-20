const socketIo = require('socket.io');
const { socketAuth } = require('./middlewares/authMiddleware');
const { generateChatRoomId, generateUserRoomId } = require('./utils/helpers');
const Chat = require('./models/Chat');
const Message = require('./models/Message');
const User = require('./models/User');

let io;

const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ["http://localhost:3000", "http://localhost:5173"],
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Socket authentication middleware
  io.use(socketAuth);

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.username} (${socket.user._id})`);

    // Join user to their personal room for private notifications
    const userRoom = generateUserRoomId(socket.user._id);
    socket.join(userRoom);

    // Set user as online
    updateUserOnlineStatus(socket.user._id, true);

    // Handle joining chat rooms
    socket.on('join-chat', async (chatId) => {
      try {
        // Verify user is member of the chat
        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }

        const isMember = chat.users.some(user => {
          const userId = user._id ? user._id.toString() : user.toString();
          return userId === socket.user._id.toString();
        });

        if (!isMember) {
          socket.emit('error', { message: 'Access denied to chat' });
          return;
        }

        const chatRoom = generateChatRoomId(chatId);
        socket.join(chatRoom);
        
        console.log(`📩 User ${socket.user.username} joined chat room: ${chatRoom}`);
        
        // Notify other users in the chat that user is online
        socket.to(chatRoom).emit('user-online', {
          userId: socket.user._id,
          username: socket.user.username,
          isOnline: true
        });

        socket.emit('joined-chat', { chatId, room: chatRoom });
      } catch (error) {
        console.error('Join chat error:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Handle leaving chat rooms
    socket.on('leave-chat', (chatId) => {
      const chatRoom = generateChatRoomId(chatId);
      socket.leave(chatRoom);
      
      console.log(`📤 User ${socket.user.username} left chat room: ${chatRoom}`);
      
      // Notify other users
      socket.to(chatRoom).emit('user-left-chat', {
        userId: socket.user._id,
        username: socket.user.username
      });
    });

    // Handle sending messages
    socket.on('send-message', async (data) => {
      try {
        const { chatId, content, messageType = 'text', replyTo, mentions } = data;

        // Verify user is member of the chat
        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }

        const isMember = chat.users.some(user => {
          const userId = user._id ? user._id.toString() : user.toString();
          return userId === socket.user._id.toString();
        });

        if (!isMember) {
          socket.emit('error', { message: 'Access denied to chat' });
          return;
        }

        // Create message
        const messageData = {
          sender: socket.user._id,
          chat: chatId,
          content: content.trim(),
          messageType,
          replyTo: replyTo || undefined,
          mentions: mentions || []
        };

        const message = await Message.create(messageData);
        
        // Populate message for broadcasting
        await message.populate('sender', 'username email profilePic isOnline');
        await message.populate('replyTo', 'content sender messageType');
        await message.populate('mentions', 'username email profilePic');

        // Update chat's latest message
        chat.latestMessage = message._id;
        await chat.save();

        // Broadcast message to chat room
        const chatRoom = generateChatRoomId(chatId);
        io.to(chatRoom).emit('new-message', message);

        // Send push notifications to offline users (would integrate with FCM/APNS)
        // notifyOfflineUsers(chat, message);

        console.log(`💬 Message sent in chat ${chatId} by ${socket.user.username}`);
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (data) => {
      const { chatId } = data;
      const chatRoom = generateChatRoomId(chatId);
      
      socket.to(chatRoom).emit('user-typing', {
        userId: socket.user._id,
        username: socket.user.username,
        chatId
      });

      console.log(`⌨️  ${socket.user.username} started typing in chat ${chatId}`);
    });

    socket.on('typing-stop', (data) => {
      const { chatId } = data;
      const chatRoom = generateChatRoomId(chatId);
      
      socket.to(chatRoom).emit('user-stopped-typing', {
        userId: socket.user._id,
        username: socket.user.username,
        chatId
      });

      console.log(`⌨️  ${socket.user.username} stopped typing in chat ${chatId}`);
    });

    // Handle message read receipts
    socket.on('mark-message-read', async (data) => {
      try {
        const { messageId, chatId } = data;

        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Don't mark own messages as read
        if (message.sender.toString() === socket.user._id.toString()) {
          return;
        }

        await message.markAsRead(socket.user._id);

        // Notify sender about read receipt
        const chatRoom = generateChatRoomId(chatId);
        socket.to(chatRoom).emit('message-read', {
          messageId,
          readBy: socket.user._id,
          readAt: new Date()
        });

        console.log(`✅ Message ${messageId} marked as read by ${socket.user.username}`);
      } catch (error) {
        console.error('Mark message read error:', error);
        socket.emit('error', { message: 'Failed to mark message as read' });
      }
    });

    // Handle message reactions
    socket.on('add-reaction', async (data) => {
      try {
        const { messageId, emoji, chatId } = data;

        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        await message.addReaction(socket.user._id, emoji);
        await message.populate('reactions.user', 'username email profilePic');

        // Broadcast reaction to chat room
        const chatRoom = generateChatRoomId(chatId);
        io.to(chatRoom).emit('reaction-added', {
          messageId,
          reaction: {
            user: {
              _id: socket.user._id,
              username: socket.user.username,
              profilePic: socket.user.profilePic
            },
            emoji,
            addedAt: new Date()
          }
        });

        console.log(`👍 Reaction ${emoji} added to message ${messageId} by ${socket.user.username}`);
      } catch (error) {
        console.error('Add reaction error:', error);
        socket.emit('error', { message: 'Failed to add reaction' });
      }
    });

    socket.on('remove-reaction', async (data) => {
      try {
        const { messageId, emoji, chatId } = data;

        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        await message.removeReaction(socket.user._id, emoji);

        // Broadcast reaction removal to chat room
        const chatRoom = generateChatRoomId(chatId);
        io.to(chatRoom).emit('reaction-removed', {
          messageId,
          userId: socket.user._id,
          emoji
        });

        console.log(`👎 Reaction ${emoji} removed from message ${messageId} by ${socket.user.username}`);
      } catch (error) {
        console.error('Remove reaction error:', error);
        socket.emit('error', { message: 'Failed to remove reaction' });
      }
    });

    // Handle user going offline
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.user.username} (${socket.user._id})`);
      
      // Set user as offline after a delay (to handle quick reconnections)
      setTimeout(() => {
        updateUserOnlineStatus(socket.user._id, false);
        
        // Notify all user's chats about offline status
        broadcastUserStatusChange(socket.user._id, false);
      }, 5000); // 5 second delay
    });

    // Handle explicit user going offline
    socket.on('user-offline', () => {
      updateUserOnlineStatus(socket.user._id, false);
      broadcastUserStatusChange(socket.user._id, false);
    });

    // Handle user coming online
    socket.on('user-online', () => {
      updateUserOnlineStatus(socket.user._id, true);
      broadcastUserStatusChange(socket.user._id, true);
    });

    // Handle call initiation (for future video/audio calls)
    socket.on('call-user', (data) => {
      const { to, signalData, from, name, callType } = data;
      const targetUserRoom = generateUserRoomId(to);
      
      io.to(targetUserRoom).emit('call-incoming', {
        signal: signalData,
        from,
        name,
        callType
      });
    });

    socket.on('answer-call', (data) => {
      const { to, signal } = data;
      const targetUserRoom = generateUserRoomId(to);
      
      io.to(targetUserRoom).emit('call-accepted', signal);
    });

    socket.on('reject-call', (data) => {
      const { to } = data;
      const targetUserRoom = generateUserRoomId(to);
      
      io.to(targetUserRoom).emit('call-rejected');
    });

    socket.on('end-call', (data) => {
      const { to } = data;
      const targetUserRoom = generateUserRoomId(to);
      
      io.to(targetUserRoom).emit('call-ended');
    });
  });

  return io;
};

// Helper function to update user online status
const updateUserOnlineStatus = async (userId, isOnline) => {
  try {
    await User.findByIdAndUpdate(userId, {
      isOnline,
      lastSeen: new Date()
    });
  } catch (error) {
    console.error('Update user online status error:', error);
  }
};

// Helper function to broadcast user status change to all their chats
const broadcastUserStatusChange = async (userId, isOnline) => {
  try {
    // Find all chats where user is a member
    const userChats = await Chat.find({ users: { $in: [userId] } });
    
    // Broadcast to all chat rooms
    userChats.forEach(chat => {
      const chatRoom = generateChatRoomId(chat._id);
      io.to(chatRoom).emit('user-status-change', {
        userId,
        isOnline,
        lastSeen: new Date()
      });
    });
  } catch (error) {
    console.error('Broadcast user status change error:', error);
  }
};

// Helper function for push notifications (placeholder)
const notifyOfflineUsers = async (chat, message) => {
  try {
    // Get offline users in the chat
    const offlineUsers = await User.find({
      _id: { $in: chat.users },
      isOnline: false
    });

    // Here you would integrate with FCM/APNS to send push notifications
    console.log(`📱 Would send push notifications to ${offlineUsers.length} offline users`);
  } catch (error) {
    console.error('Notify offline users error:', error);
  }
};

// Function to get IO instance
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIO
};
