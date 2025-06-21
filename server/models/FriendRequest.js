const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  message: {
    type: String,
    maxlength: [200, 'Message cannot exceed 200 characters'],
    default: ''
  }
}, {
  timestamps: true
});

// Index for better query performance
friendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });
friendRequestSchema.index({ receiver: 1, status: 1 });
friendRequestSchema.index({ sender: 1, status: 1 });

// Prevent users from sending friend requests to themselves
friendRequestSchema.pre('save', function(next) {
  if (this.sender.toString() === this.receiver.toString()) {
    const error = new Error('Cannot send friend request to yourself');
    return next(error);
  }
  next();
});

module.exports = mongoose.model('FriendRequest', friendRequestSchema);
