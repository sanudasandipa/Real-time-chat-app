const express = require('express');
const {
  getAllUsers,
  getFriends,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getPendingRequests,
  getSentRequests
} = require('../controllers/friendsController');
const { protect } = require('../middlewares/authMiddleware');
const { body } = require('express-validator');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/users
// @desc    Get all users for discovery
// @access  Private
router.get('/users', getAllUsers);

// @route   GET /api/friends
// @desc    Get user's friends
// @access  Private
router.get('/friends', getFriends);

// @route   GET /api/friends/pending
// @desc    Get pending friend requests
// @access  Private
router.get('/friends/pending', getPendingRequests);

// @route   GET /api/friends/sent
// @desc    Get sent friend requests
// @access  Private
router.get('/friends/sent', getSentRequests);

// @route   POST /api/friends/request/:userId
// @desc    Send friend request
// @access  Private
router.post('/friends/request/:userId', [
  body('message')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Message cannot exceed 200 characters')
], sendFriendRequest);

// @route   POST /api/friends/accept/:userId
// @desc    Accept friend request
// @access  Private
router.post('/friends/accept/:userId', acceptFriendRequest);

// @route   POST /api/friends/reject/:userId
// @desc    Reject friend request
// @access  Private
router.post('/friends/reject/:userId', rejectFriendRequest);

// @route   POST /api/friends/cancel/:userId
// @desc    Cancel friend request
// @access  Private
router.post('/friends/cancel/:userId', cancelFriendRequest);

// @route   DELETE /api/friends/:userId
// @desc    Remove friend
// @access  Private
router.delete('/friends/:userId', removeFriend);

module.exports = router;
