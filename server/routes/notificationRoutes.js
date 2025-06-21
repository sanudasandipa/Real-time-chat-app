const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  getNotifications,
  markNotificationsAsRead,
  getUnreadCount,
  deleteNotification,
  clearAllNotifications
} = require('../controllers/notificationController');

// All notification routes require authentication
router.use(protect);

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', getNotifications);

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', getUnreadCount);

// @route   PUT /api/notifications/read
// @desc    Mark notifications as read
// @access  Private
router.put('/read', markNotificationsAsRead);

// @route   DELETE /api/notifications/:id
// @desc    Delete specific notification
// @access  Private
router.delete('/:id', deleteNotification);

// @route   DELETE /api/notifications
// @desc    Clear all notifications
// @access  Private
router.delete('/', clearAllNotifications);

module.exports = router;
