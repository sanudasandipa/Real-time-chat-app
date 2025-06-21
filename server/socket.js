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
  io.use(socketAuth);  io.on('connection', async (socket) => {
    console.log(`✅ User connected: ${socket.user.username} (${socket.user._id})`);

    // Join user to their personal room for private notifications
    const userRoom = generateUserRoomId(socket.user._id);
    socket.join(userRoom);
    
    console.log(`📱 User ${socket.user.username} joined personal room: ${userRoom}`);

    // Set user as online
    updateUserOnlineStatus(socket.user._id, true);

    // Mark undelivered messages as delivered when user comes online
    await markPendingMessagesAsDelivered(socket.user._id);

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
    });    // Handle sending messages
    socket.on('send-message', async (data) => {
      try {
        const { chatId, content, messageType = 'text', replyTo, mentions } = data;

        // Verify user is member of the chat
        const chat = await Chat.findById(chatId).populate('users', '_id username isOnline');
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

        // Get chat room
        const chatRoom = generateChatRoomId(chatId);

        // Mark message as delivered to online users automatically
        const onlineUsers = chat.users.filter(user => 
          user.isOnline && user._id.toString() !== socket.user._id.toString()
        );

        for (const user of onlineUsers) {
          await message.markAsDelivered(user._id);
        }

        // Populate delivery status
        await message.populate('deliveredTo.user', 'username');
        await message.populate('readBy.user', 'username');        // Broadcast message to chat room
        io.to(chatRoom).emit('new-message', message);

        // Update chat list for all users in the chat
        const updatedChat = await Chat.findById(chatId)
          .populate('users', 'username email profilePic isOnline lastSeen')
          .populate('latestMessage')
          .populate('groupAdmin', 'username email profilePic');

        // Broadcast chat update to all users
        chat.users.forEach(user => {
          const userId = user._id.toString();
          const chatData = updatedChat.toObject();
          chatData.isGroup = chatData.isGroupChat;
          
          if (!updatedChat.isGroupChat && updatedChat.users.length === 2) {
            const otherUser = updatedChat.users.find(u => u._id.toString() !== userId);
            chatData.displayName = otherUser ? otherUser.username : 'Unknown User';
            chatData.displayImage = otherUser ? otherUser.profilePic : '';
            chatData.isOnline = otherUser ? otherUser.isOnline : false;
            chatData.lastSeen = otherUser ? otherUser.lastSeen : null;
          } else {
            chatData.displayName = updatedChat.chatName;
            chatData.displayImage = updatedChat.groupImage;
          }
          
          io.to(`user_${userId}`).emit('chat-updated', chatData);
        });

        // Send delivery confirmations to sender
        socket.emit('message-delivered', {
          messageId: message._id,
          deliveredTo: message.deliveredTo
        });

        // Send push notifications to offline users
        const offlineUsers = chat.users.filter(user => 
          !user.isOnline && user._id.toString() !== socket.user._id.toString()
        );
        if (offlineUsers.length > 0) {
          notifyOfflineUsers(offlineUsers, message);
        }

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
    });    // Handle message read receipts
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

        // Mark as delivered first if not already
        await message.markAsDelivered(socket.user._id);
        
        // Mark as read
        await message.markAsRead(socket.user._id);

        // Populate read status
        await message.populate('readBy.user', 'username profilePic');

        // Notify sender about read receipt
        const chatRoom = generateChatRoomId(chatId);
        socket.to(chatRoom).emit('message-read', {
          messageId,
          readBy: {
            user: socket.user._id,
            username: socket.user.username,
            profilePic: socket.user.profilePic,
            readAt: new Date()
          }
        });

        // Send updated read status to all chat members
        io.to(chatRoom).emit('message-status-updated', {
          messageId,
          readBy: message.readBy,
          deliveredTo: message.deliveredTo
        });

        console.log(`✅ Message ${messageId} marked as read by ${socket.user.username}`);
      } catch (error) {
        console.error('Mark message read error:', error);
        socket.emit('error', { message: 'Failed to mark message as read' });
      }
    });

    // Handle marking multiple messages as read (when user enters chat)
    socket.on('mark-chat-messages-read', async (data) => {
      try {
        const { chatId, lastMessageId } = data;

        // Find all unread messages up to lastMessageId
        const unreadMessages = await Message.find({
          chat: chatId,
          sender: { $ne: socket.user._id },
          _id: { $lte: lastMessageId },
          'readBy.user': { $ne: socket.user._id }
        });

        const chatRoom = generateChatRoomId(chatId);
        const readUpdates = [];

        for (const message of unreadMessages) {
          await message.markAsDelivered(socket.user._id);
          await message.markAsRead(socket.user._id);
          
          readUpdates.push({
            messageId: message._id,
            readBy: {
              user: socket.user._id,
              username: socket.user.username,
              profilePic: socket.user.profilePic,
              readAt: new Date()
            }
          });
        }

        // Notify other users about bulk read receipts
        if (readUpdates.length > 0) {
          socket.to(chatRoom).emit('messages-bulk-read', {
            readUpdates,
            readByUser: {
              _id: socket.user._id,
              username: socket.user.username,
              profilePic: socket.user.profilePic
            }
          });
        }

        console.log(`✅ ${unreadMessages.length} messages marked as read by ${socket.user.username} in chat ${chatId}`);
      } catch (error) {
        console.error('Mark chat messages read error:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
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

// Helper function to mark pending messages as delivered when user comes online
const markPendingMessagesAsDelivered = async (userId) => {
  try {
    // Find user's chats
    const userChats = await Chat.find({ users: { $in: [userId] } });
    
    for (const chat of userChats) {
      // Find undelivered messages for this user in this chat
      const undeliveredMessages = await Message.find({
        chat: chat._id,
        sender: { $ne: userId },
        'deliveredTo.user': { $ne: userId },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Only last 7 days
      });

      const chatRoom = generateChatRoomId(chat._id);
      const deliveryUpdates = [];

      for (const message of undeliveredMessages) {
        await message.markAsDelivered(userId);
        deliveryUpdates.push({
          messageId: message._id,
          deliveredTo: {
            user: userId,
            deliveredAt: new Date()
          }
        });
      }

      // Notify chat room about delivery updates
      if (deliveryUpdates.length > 0) {
        io.to(chatRoom).emit('messages-bulk-delivered', {
          deliveryUpdates,
          deliveredToUser: userId
        });
      }
    }
  } catch (error) {
    console.error('Mark pending messages as delivered error:', error);
  }
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
const notifyOfflineUsers = async (offlineUsers, message) => {
  try {
    // Here you would integrate with FCM/APNS to send push notifications
    console.log(`📱 Would send push notifications to ${offlineUsers.length} offline users for message: ${message.content?.substring(0, 50)}...`);
    
    // For each offline user, you could:
    // 1. Store notification in database
    // 2. Send push notification via FCM/APNS
    // 3. Send email notification if enabled
    
    // Example notification payload:
    // {
    //   title: message.sender.username,
    //   body: message.content,
    //   data: {
    //     chatId: message.chat,
    //     messageId: message._id,
    //     type: 'new_message'
    //   }
    // }
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
