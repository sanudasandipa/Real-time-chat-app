const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const { validationResult } = require('express-validator');

// @desc    Get all users (for discovery)
// @route   GET /api/users
// @access  Private
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const users = await User.find({ 
      _id: { $ne: req.user.id } // Exclude current user
    })
    .select('-password -blockedUsers')
    .sort({ username: 1 })
    .skip(skip)
    .limit(limit);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total: await User.countDocuments({ _id: { $ne: req.user.id } })
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// @desc    Get user's friends
// @route   GET /api/friends
// @access  Private
const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends.user', 'username email profilePic isOnline lastSeen bio')
      .select('friends');

    const friends = user.friends.map(friend => ({
      ...friend.user.toObject(),
      addedAt: friend.addedAt
    }));

    res.json({
      success: true,
      data: friends
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch friends'
    });
  }
};

// @desc    Send friend request
// @route   POST /api/friends/request/:userId
// @access  Private
const sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const { message } = req.body;

    // Check if user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is trying to send request to themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send friend request to yourself'
      });
    }

    // Check if they are already friends
    const currentUser = await User.findById(req.user.id);
    const isAlreadyFriend = currentUser.friends.some(
      friend => friend.user.toString() === userId
    );

    if (isAlreadyFriend) {
      return res.status(400).json({
        success: false,
        message: 'You are already friends with this user'
      });
    }

    // Check if request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: req.user.id, receiver: userId },
        { sender: userId, receiver: req.user.id }
      ]
    });

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Friend request already exists'
        });
      }
      
      // If previous request was rejected, allow new request
      if (existingRequest.status === 'rejected') {
        existingRequest.status = 'pending';
        existingRequest.sender = req.user.id;
        existingRequest.receiver = userId;
        existingRequest.message = message || '';
        await existingRequest.save();
      }
    } else {
      // Create new friend request
      await FriendRequest.create({
        sender: req.user.id,
        receiver: userId,
        message: message || ''
      });
    }

    res.json({
      success: true,
      message: 'Friend request sent successfully'
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send friend request'
    });
  }
};

// @desc    Accept friend request
// @route   POST /api/friends/accept/:userId
// @access  Private
const acceptFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the friend request
    const friendRequest = await FriendRequest.findOne({
      sender: userId,
      receiver: req.user.id,
      status: 'pending'
    });

    if (!friendRequest) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    // Update friend request status
    friendRequest.status = 'accepted';
    await friendRequest.save();

    // Add each user to the other's friends list
    await User.findByIdAndUpdate(req.user.id, {
      $push: { friends: { user: userId } }
    });

    await User.findByIdAndUpdate(userId, {
      $push: { friends: { user: req.user.id } }
    });

    res.json({
      success: true,
      message: 'Friend request accepted'
    });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept friend request'
    });
  }
};

// @desc    Reject friend request
// @route   POST /api/friends/reject/:userId
// @access  Private
const rejectFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find and update the friend request
    const friendRequest = await FriendRequest.findOneAndUpdate(
      {
        sender: userId,
        receiver: req.user.id,
        status: 'pending'
      },
      { status: 'rejected' },
      { new: true }
    );

    if (!friendRequest) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    res.json({
      success: true,
      message: 'Friend request rejected'
    });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject friend request'
    });
  }
};

// @desc    Cancel friend request
// @route   POST /api/friends/cancel/:userId
// @access  Private
const cancelFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find and delete the friend request
    const friendRequest = await FriendRequest.findOneAndDelete({
      sender: req.user.id,
      receiver: userId,
      status: 'pending'
    });

    if (!friendRequest) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    res.json({
      success: true,
      message: 'Friend request cancelled'
    });
  } catch (error) {
    console.error('Cancel friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel friend request'
    });
  }
};

// @desc    Remove friend
// @route   DELETE /api/friends/:userId
// @access  Private
const removeFriend = async (req, res) => {
  try {
    const { userId } = req.params;

    // Remove from both users' friends lists
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { friends: { user: userId } }
    });

    await User.findByIdAndUpdate(userId, {
      $pull: { friends: { user: req.user.id } }
    });

    // Remove any friend requests between the users
    await FriendRequest.deleteMany({
      $or: [
        { sender: req.user.id, receiver: userId },
        { sender: userId, receiver: req.user.id }
      ]
    });

    res.json({
      success: true,
      message: 'Friend removed successfully'
    });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove friend'
    });
  }
};

// @desc    Get pending friend requests
// @route   GET /api/friends/pending
// @access  Private
const getPendingRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      receiver: req.user.id,
      status: 'pending'
    })
    .populate('sender', 'username email profilePic isOnline lastSeen bio')
    .sort({ createdAt: -1 });

    const pendingRequests = requests.map(request => ({
      ...request.sender.toObject(),
      requestId: request._id,
      message: request.message,
      requestedAt: request.createdAt
    }));

    res.json({
      success: true,
      data: pendingRequests
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending requests'
    });
  }
};

// @desc    Get sent friend requests
// @route   GET /api/friends/sent
// @access  Private
const getSentRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      sender: req.user.id,
      status: 'pending'
    })
    .populate('receiver', 'username email profilePic isOnline lastSeen bio')
    .sort({ createdAt: -1 });

    const sentRequests = requests.map(request => ({
      ...request.receiver.toObject(),
      requestId: request._id,
      message: request.message,
      sentAt: request.createdAt
    }));

    res.json({
      success: true,
      data: sentRequests
    });
  } catch (error) {
    console.error('Get sent requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sent requests'
    });
  }
};

module.exports = {
  getAllUsers,
  getFriends,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getPendingRequests,
  getSentRequests
};
