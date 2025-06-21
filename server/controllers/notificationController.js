const Notification = require('../models/Notification');
const { sendSuccess, sendError, getPaginationData } = require('../utils/helpers');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const userId = req.user._id;

    const filter = { recipient: userId };
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .populate('sender', 'username profilePic')
      .populate('data.chatId', 'chatName isGroupChat')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalNotifications = await Notification.countDocuments(filter);
    const pagination = getPaginationData(page, limit, totalNotifications);

    // Get unread count
    const unreadCount = await Notification.getUnreadCount(userId);

    return sendSuccess(res, {
      notifications,
      pagination,
      unreadCount
    }, 'Notifications retrieved successfully');

  } catch (error) {
    console.error('Get notifications error:', error);
    return sendError(res, 'Failed to retrieve notifications', 500);
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/notifications/read
// @access  Private
const markNotificationsAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body; // Array of notification IDs or empty for all
    const userId = req.user._id;

    await Notification.markAsRead(userId, notificationIds || []);

    // Get updated unread count
    const unreadCount = await Notification.getUnreadCount(userId);

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('notifications-read', {
        notificationIds: notificationIds || [],
        unreadCount
      });
    }

    return sendSuccess(res, { unreadCount }, 'Notifications marked as read');

  } catch (error) {
    console.error('Mark notifications as read error:', error);
    return sendError(res, 'Failed to mark notifications as read', 500);
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const unreadCount = await Notification.getUnreadCount(userId);

    return sendSuccess(res, { unreadCount }, 'Unread count retrieved successfully');

  } catch (error) {
    console.error('Get unread count error:', error);
    return sendError(res, 'Failed to get unread count', 500);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({ _id: id, recipient: userId });
    if (!notification) {
      return sendError(res, 'Notification not found', 404);
    }

    await notification.deleteOne();

    // Get updated unread count
    const unreadCount = await Notification.getUnreadCount(userId);

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('notification-deleted', {
        notificationId: id,
        unreadCount
      });
    }

    return sendSuccess(res, { unreadCount }, 'Notification deleted successfully');

  } catch (error) {
    console.error('Delete notification error:', error);
    return sendError(res, 'Failed to delete notification', 500);
  }
};

// @desc    Clear all notifications
// @route   DELETE /api/notifications
// @access  Private
const clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.deleteMany({ recipient: userId });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('notifications-cleared');
    }

    return sendSuccess(res, {}, 'All notifications cleared successfully');

  } catch (error) {
    console.error('Clear all notifications error:', error);
    return sendError(res, 'Failed to clear notifications', 500);
  }
};

// Utility function to create and send notification
const createAndSendNotification = async (notificationData, io) => {
  try {
    const notification = await Notification.createNotification(notificationData);
    
    // Send real-time notification
    if (io) {
      io.to(`user_${notification.recipient}`).emit('new-notification', notification);
    }
    
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
  }
};

module.exports = {
  getNotifications,
  markNotificationsAsRead,
  getUnreadCount,
  deleteNotification,
  clearAllNotifications,
  createAndSendNotification
};
