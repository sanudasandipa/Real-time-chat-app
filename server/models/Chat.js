const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  chatName: {
    type: String,
    trim: true,
    maxlength: [50, 'Chat name cannot exceed 50 characters']
  },
  isGroupChat: {
    type: Boolean,
    default: false
  },
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  latestMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  groupAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  groupImage: {
    type: String,
    default: ''
  },
  groupDescription: {
    type: String,
    maxlength: [200, 'Group description cannot exceed 200 characters'],
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // For read receipts - track when each user last read the chat
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    },
    lastMessageRead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    }
  }],
  // Chat settings
  settings: {
    muteNotifications: {
      type: Boolean,
      default: false
    },
    disappearingMessages: {
      enabled: {
        type: Boolean,
        default: false
      },
      duration: {
        type: Number, // in hours
        default: 24
      }
    },
    allowMediaSharing: {
      type: Boolean,
      default: true
    }
  },
  // For group chats - track user permissions
  userPermissions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    canAddMembers: {
      type: Boolean,
      default: false
    },
    canRemoveMembers: {
      type: Boolean,
      default: false
    },
    canEditGroupInfo: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
chatSchema.index({ users: 1 });
chatSchema.index({ isGroupChat: 1 });
chatSchema.index({ latestMessage: 1 });
chatSchema.index({ updatedAt: -1 });

// Validate that group chats have a name
chatSchema.pre('save', function(next) {
  if (this.isGroupChat && !this.chatName) {
    const error = new Error('Group chats must have a name');
    return next(error);
  }
  next();
});

// Validate minimum users for different chat types
chatSchema.pre('save', function(next) {
  if (this.isGroupChat && this.users.length < 2) {
    const error = new Error('Group chats must have at least 2 users');
    return next(error);
  }
  if (!this.isGroupChat && this.users.length !== 2) {
    const error = new Error('Private chats must have exactly 2 users');
    return next(error);
  }
  next();
});

// Method to add user to chat
chatSchema.methods.addUser = function(userId) {
  if (!this.users.includes(userId)) {
    this.users.push(userId);
    // Add user to readBy array
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
  }
  return this.save();
};

// Method to remove user from chat
chatSchema.methods.removeUser = function(userId) {
  this.users = this.users.filter(user => !user.equals(userId));
  this.readBy = this.readBy.filter(read => !read.user.equals(userId));
  this.userPermissions = this.userPermissions.filter(perm => !perm.user.equals(userId));
  return this.save();
};

// Method to update read status for a user
chatSchema.methods.markAsRead = function(userId, messageId = null) {
  const readEntry = this.readBy.find(read => read.user.equals(userId));
  if (readEntry) {
    readEntry.readAt = new Date();
    if (messageId) {
      readEntry.lastMessageRead = messageId;
    }
  } else {
    this.readBy.push({
      user: userId,
      readAt: new Date(),
      lastMessageRead: messageId
    });
  }
  return this.save();
};

// Method to check if user is admin
chatSchema.methods.isUserAdmin = function(userId) {
  return this.groupAdmin && this.groupAdmin.equals(userId);
};

// Method to get chat display name for a specific user
chatSchema.methods.getChatDisplayName = function(currentUserId) {
  if (this.isGroupChat) {
    return this.chatName;
  } else {
    // For private chats, return the other user's name
    const otherUser = this.users.find(user => !user._id.equals(currentUserId));
    return otherUser ? otherUser.username : 'Unknown User';
  }
};

// Virtual to get unread message count for a user
chatSchema.methods.getUnreadCount = function(userId) {
  const readEntry = this.readBy.find(read => read.user.equals(userId));
  if (!readEntry) return 0;
  
  // This would need to be calculated with a separate query to Message model
  // Return timestamp for now, actual count would be calculated in controller
  return readEntry.readAt;
};

// Static method to find chats for a user
chatSchema.statics.findUserChats = function(userId) {
  return this.find({
    users: { $in: [userId] },
    isActive: true
  })
  .populate('users', 'username email profilePic isOnline lastSeen')
  .populate('latestMessage')
  .populate('groupAdmin', 'username email profilePic')
  .sort({ updatedAt: -1 });
};

// Static method to find or create private chat between two users
chatSchema.statics.findOrCreatePrivateChat = async function(user1Id, user2Id) {
  let chat = await this.findOne({
    isGroupChat: false,
    users: { $all: [user1Id, user2Id] }
  }).populate('users', 'username email profilePic isOnline lastSeen');

  if (!chat) {
    chat = await this.create({
      users: [user1Id, user2Id],
      isGroupChat: false,
      readBy: [
        { user: user1Id, readAt: new Date() },
        { user: user2Id, readAt: new Date() }
      ]
    });
    await chat.populate('users', 'username email profilePic isOnline lastSeen');
  }

  return chat;
};

module.exports = mongoose.model('Chat', chatSchema);
