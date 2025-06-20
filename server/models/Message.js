const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Message must have a sender']
  },
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: [true, 'Message must belong to a chat']
  },
  content: {
    type: String,
    trim: true,
    maxlength: [1000, 'Message content cannot exceed 1000 characters']
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  // For image/file messages
  mediaUrl: {
    type: String,
    default: ''
  },
  mediaType: {
    type: String, // 'image/jpeg', 'image/png', 'application/pdf', etc.
    default: ''
  },
  mediaSize: {
    type: Number, // File size in bytes
    default: 0
  },
  mediaName: {
    type: String, // Original filename
    default: ''
  },
  // Message status
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }], // Track who deleted the message for themselves
  // Read receipts
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Delivery status
  deliveredTo: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deliveredAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Reply to another message
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  // Forward information
  forwardedFrom: {
    originalSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    originalChat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat'
    },
    forwardedAt: {
      type: Date
    }
  },
  // Reactions (emoji reactions)
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Message priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  // Scheduled messages
  scheduledFor: {
    type: Date
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  // Disappearing messages
  expiresAt: {
    type: Date
  },
  // Mentions in group chats
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ 'readBy.user': 1 });
messageSchema.index({ 'deliveredTo.user': 1 });
messageSchema.index({ isDeleted: 1 });
messageSchema.index({ scheduledFor: 1 });
messageSchema.index({ expiresAt: 1 });

// Validate message content based on type
messageSchema.pre('save', function(next) {
  if (this.messageType === 'text' && (!this.content || this.content.trim() === '')) {
    const error = new Error('Text messages must have content');
    return next(error);
  }
  if ((this.messageType === 'image' || this.messageType === 'file') && !this.mediaUrl) {
    const error = new Error('Media messages must have a media URL');
    return next(error);
  }
  next();
});

// Method to mark message as read by a user
messageSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(read => read.user.equals(userId));
  if (!existingRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to mark message as delivered to a user
messageSchema.methods.markAsDelivered = function(userId) {
  const existingDelivery = this.deliveredTo.find(delivery => delivery.user.equals(userId));
  if (!existingDelivery) {
    this.deliveredTo.push({
      user: userId,
      deliveredAt: new Date()
    });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from same user
  this.reactions = this.reactions.filter(reaction => !reaction.user.equals(userId));
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji: emoji,
    addedAt: new Date()
  });
  
  return this.save();
};

// Method to remove reaction
messageSchema.methods.removeReaction = function(userId, emoji) {
  this.reactions = this.reactions.filter(reaction => 
    !(reaction.user.equals(userId) && reaction.emoji === emoji)
  );
  return this.save();
};

// Method to edit message content
messageSchema.methods.editContent = function(newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

// Method to delete message for specific users
messageSchema.methods.deleteForUsers = function(userIds) {
  if (Array.isArray(userIds)) {
    this.deletedFor = [...new Set([...this.deletedFor, ...userIds])];
  } else {
    if (!this.deletedFor.includes(userIds)) {
      this.deletedFor.push(userIds);
    }
  }
  return this.save();
};

// Method to delete message completely
messageSchema.methods.deleteCompletely = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = 'This message was deleted';
  this.mediaUrl = '';
  return this.save();
};

// Method to check if message is visible to user
messageSchema.methods.isVisibleToUser = function(userId) {
  if (this.isDeleted) return false;
  return !this.deletedFor.some(deletedUserId => deletedUserId.equals(userId));
};

// Method to get read status for message
messageSchema.methods.getReadStatus = function(chatUsers) {
  const readCount = this.readBy.length;
  const totalUsers = chatUsers.length - 1; // Exclude sender
  
  if (readCount === 0) return 'sent';
  if (readCount < totalUsers) return 'delivered';
  return 'read';
};

// Static method to get messages for a chat with pagination
messageSchema.statics.getChatMessages = function(chatId, page = 1, limit = 50, userId = null) {
  const skip = (page - 1) * limit;
  
  let query = {
    chat: chatId,
    isDeleted: false
  };

  // If userId provided, exclude messages deleted for this user
  if (userId) {
    query.deletedFor = { $ne: userId };
  }

  return this.find(query)
    .populate('sender', 'username email profilePic isOnline')
    .populate('replyTo', 'content sender messageType')
    .populate('forwardedFrom.originalSender', 'username email profilePic')
    .populate('reactions.user', 'username email profilePic')
    .populate('mentions', 'username email profilePic')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get unread message count for a user in a chat
messageSchema.statics.getUnreadCount = function(chatId, userId, lastReadAt) {
  return this.countDocuments({
    chat: chatId,
    sender: { $ne: userId },
    createdAt: { $gt: lastReadAt },
    isDeleted: false,
    deletedFor: { $ne: userId }
  });
};

// Virtual for checking if message has media
messageSchema.virtual('hasMedia').get(function() {
  return this.messageType === 'image' || this.messageType === 'file';
});

// Ensure virtual fields are serialized
messageSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Message', messageSchema);
