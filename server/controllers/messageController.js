const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { sendSuccess, sendError, getPaginationData } = require('../utils/helpers');
const { extractPublicId, deleteFromCloudinary, generateVideoThumbnail } = require('../utils/cloudinary');

// @desc    Get messages for a chat
// @route   GET /api/messages/:chatId
// @access  Private
const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;

    // Verify user is member of the chat (done by middleware, but double-check)
    const chat = req.chat || await Chat.findById(chatId);
    if (!chat) {
      return sendError(res, 'Chat not found', 404);
    }

    // Get messages with pagination
    const messages = await Message.getChatMessages(chatId, page, limit, userId);

    // Get total count for pagination
    const totalMessages = await Message.countDocuments({
      chat: chatId,
      isDeleted: false,
      deletedFor: { $ne: userId }
    });

    const pagination = getPaginationData(page, limit, totalMessages);

    // Reverse messages to show oldest first
    const reversedMessages = messages.reverse();

    return sendSuccess(res, {
      messages: reversedMessages,
      pagination
    }, 'Messages retrieved successfully');

  } catch (error) {
    console.error('Get messages error:', error);
    return sendError(res, 'Failed to retrieve messages', 500);
  }
};

// @desc    Send a message
// @route   POST /api/messages/:chatId
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, messageType = 'text', replyTo, mentions } = req.body;
    const userId = req.user._id;

    // Get chat (verified by middleware)
    const chat = req.chat || await Chat.findById(chatId);
    if (!chat) {
      return sendError(res, 'Chat not found', 404);
    }

    // Prepare message data
    const messageData = {
      sender: userId,
      chat: chatId,
      messageType
    };

    // Handle different message types
    if (messageType === 'text') {
      if (!content || content.trim() === '') {
        return sendError(res, 'Message content is required', 400);
      }
      messageData.content = content.trim();
    } else if (messageType === 'image' || messageType === 'file') {
      if (!req.file) {
        return sendError(res, 'Media file is required for this message type', 400);
      }
      
      messageData.mediaUrl = req.file.path;
      messageData.mediaType = req.file.mimetype;
      messageData.mediaSize = req.file.size;
      messageData.mediaName = req.file.originalname;
      
      // Add caption if provided
      if (content && content.trim()) {
        messageData.content = content.trim();
      }
    }

    // Handle reply
    if (replyTo) {
      const replyMessage = await Message.findById(replyTo);
      if (!replyMessage || replyMessage.chat.toString() !== chatId) {
        return sendError(res, 'Reply message not found or not in this chat', 400);
      }
      messageData.replyTo = replyTo;
    }

    // Handle mentions
    if (mentions && Array.isArray(mentions)) {
      // Verify mentioned users are in the chat
      const validMentions = mentions.filter(mentionId => 
        chat.users.some(user => user._id ? user._id.toString() === mentionId : user.toString() === mentionId)
      );
      messageData.mentions = validMentions;
    }

    // Create message
    const message = await Message.create(messageData);

    // Populate message for response
    await message.populate('sender', 'username email profilePic');
    await message.populate('replyTo', 'content sender messageType mediaUrl');
    await message.populate('mentions', 'username email profilePic');

    // Update chat's latest message
    chat.latestMessage = message._id;
    await chat.save();

    // Mark message as delivered to all chat members except sender
    const otherUsers = chat.users.filter(user => {
      const userId = user._id ? user._id.toString() : user.toString();
      return userId !== req.user._id.toString();
    });

    await Promise.all(otherUsers.map(async (user) => {
      const userId = user._id ? user._id : user;
      await message.markAsDelivered(userId);
    }));

    // Generate thumbnail for video files
    let thumbnail = null;
    if (messageType === 'file' && req.file && req.file.mimetype.startsWith('video/')) {
      thumbnail = generateVideoThumbnail(req.file.path);
    }

    // Prepare response data
    const responseData = message.toObject();
    if (thumbnail) {
      responseData.thumbnail = thumbnail;
    }

    return sendSuccess(res, { message: responseData }, 'Message sent successfully', 201);

  } catch (error) {
    console.error('Send message error:', error);
    return sendError(res, 'Failed to send message', 500);
  }
};

// @desc    Edit a message
// @route   PUT /api/messages/:messageId
// @access  Private
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId)
      .populate('sender', 'username email profilePic')
      .populate('chat');

    if (!message) {
      return sendError(res, 'Message not found', 404);
    }

    // Check if user is the sender
    if (message.sender._id.toString() !== userId.toString()) {
      return sendError(res, 'You can only edit your own messages', 403);
    }

    // Check if message can be edited (not media messages, not system messages)
    if (message.messageType !== 'text') {
      return sendError(res, 'Only text messages can be edited', 400);
    }

    // Check if message is too old to edit (24 hours limit)
    const now = new Date();
    const messageAge = now - message.createdAt;
    const maxEditAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (messageAge > maxEditAge) {
      return sendError(res, 'Message is too old to edit', 400);
    }

    // Update message
    await message.editContent(content);

    return sendSuccess(res, { message }, 'Message edited successfully');

  } catch (error) {
    console.error('Edit message error:', error);
    return sendError(res, 'Failed to edit message', 500);
  }
};

// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteFor = 'me' } = req.body; // 'me' or 'everyone'
    const userId = req.user._id;

    const message = await Message.findById(messageId)
      .populate('sender', 'username email profilePic')
      .populate('chat');

    if (!message) {
      return sendError(res, 'Message not found', 404);
    }

    // Check if user has permission to delete
    const isOwner = message.sender._id.toString() === userId.toString();
    const isGroupAdmin = message.chat.isGroupChat && message.chat.groupAdmin && message.chat.groupAdmin.toString() === userId.toString();

    if (!isOwner && !isGroupAdmin) {
      return sendError(res, 'You can only delete your own messages', 403);
    }

    if (deleteFor === 'everyone') {
      // Delete for everyone (only if owner or admin)
      if (!isOwner && !isGroupAdmin) {
        return sendError(res, 'You can only delete for everyone if you are the sender or group admin', 403);
      }

      // Delete media from Cloudinary if exists
      if (message.mediaUrl) {
        try {
          const publicId = extractPublicId(message.mediaUrl);
          if (publicId) {
            const resourceType = message.mediaType && message.mediaType.startsWith('video/') ? 'video' : 'image';
            await deleteFromCloudinary(publicId, resourceType);
          }
        } catch (error) {
          console.error('Error deleting media from Cloudinary:', error);
        }
      }

      await message.deleteCompletely();
    } else {
      // Delete for current user only
      await message.deleteForUsers([userId]);
    }

    return sendSuccess(res, { message }, 'Message deleted successfully');

  } catch (error) {
    console.error('Delete message error:', error);
    return sendError(res, 'Failed to delete message', 500);
  }
};

// @desc    Add reaction to a message
// @route   POST /api/messages/:messageId/react
// @access  Private
const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId)
      .populate('reactions.user', 'username email profilePic');

    if (!message) {
      return sendError(res, 'Message not found', 404);
    }

    // Verify user is member of the chat
    const chat = await Chat.findById(message.chat);
    const isMember = chat.users.some(user => {
      const chatUserId = user._id ? user._id.toString() : user.toString();
      return chatUserId === userId.toString();
    });

    if (!isMember) {
      return sendError(res, 'Access denied', 403);
    }

    // Add reaction
    await message.addReaction(userId, emoji);

    // Re-populate to get updated data
    await message.populate('reactions.user', 'username email profilePic');

    return sendSuccess(res, { message }, 'Reaction added successfully');

  } catch (error) {
    console.error('Add reaction error:', error);
    return sendError(res, 'Failed to add reaction', 500);
  }
};

// @desc    Remove reaction from a message
// @route   DELETE /api/messages/:messageId/react
// @access  Private
const removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId)
      .populate('reactions.user', 'username email profilePic');

    if (!message) {
      return sendError(res, 'Message not found', 404);
    }

    // Remove reaction
    await message.removeReaction(userId, emoji);

    // Re-populate to get updated data
    await message.populate('reactions.user', 'username email profilePic');

    return sendSuccess(res, { message }, 'Reaction removed successfully');

  } catch (error) {
    console.error('Remove reaction error:', error);
    return sendError(res, 'Failed to remove reaction', 500);
  }
};

// @desc    Mark message as read
// @route   POST /api/messages/:messageId/read
// @access  Private
const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return sendError(res, 'Message not found', 404);
    }

    // Don't mark own messages as read
    if (message.sender.toString() === userId.toString()) {
      return sendSuccess(res, null, 'Cannot mark own message as read');
    }

    // Verify user is member of the chat
    const chat = await Chat.findById(message.chat);
    const isMember = chat.users.some(user => {
      const chatUserId = user._id ? user._id.toString() : user.toString();
      return chatUserId === userId.toString();
    });

    if (!isMember) {
      return sendError(res, 'Access denied', 403);
    }

    // Mark message as read
    await message.markAsRead(userId);

    return sendSuccess(res, null, 'Message marked as read');

  } catch (error) {
    console.error('Mark message as read error:', error);
    return sendError(res, 'Failed to mark message as read', 500);
  }
};

// @desc    Forward a message
// @route   POST /api/messages/:messageId/forward
// @access  Private
const forwardMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { chatIds } = req.body; // Array of chat IDs to forward to
    const userId = req.user._id;

    if (!Array.isArray(chatIds) || chatIds.length === 0) {
      return sendError(res, 'At least one chat ID is required', 400);
    }

    const originalMessage = await Message.findById(messageId)
      .populate('sender', 'username email profilePic');

    if (!originalMessage) {
      return sendError(res, 'Message not found', 404);
    }

    // Verify user has access to the original message
    const originalChat = await Chat.findById(originalMessage.chat);
    const hasAccess = originalChat.users.some(user => {
      const chatUserId = user._id ? user._id.toString() : user.toString();
      return chatUserId === userId.toString();
    });

    if (!hasAccess) {
      return sendError(res, 'Access denied to original message', 403);
    }

    // Verify user is member of all target chats
    const targetChats = await Chat.find({ 
      _id: { $in: chatIds },
      users: { $in: [userId] }
    });

    if (targetChats.length !== chatIds.length) {
      return sendError(res, 'Access denied to one or more target chats', 403);
    }

    // Create forwarded messages
    const forwardedMessages = await Promise.all(
      chatIds.map(async (chatId) => {
        const forwardedMessage = await Message.create({
          sender: userId,
          chat: chatId,
          content: originalMessage.content,
          messageType: originalMessage.messageType,
          mediaUrl: originalMessage.mediaUrl,
          mediaType: originalMessage.mediaType,
          mediaSize: originalMessage.mediaSize,
          mediaName: originalMessage.mediaName,
          forwardedFrom: {
            originalSender: originalMessage.sender._id,
            originalChat: originalMessage.chat,
            forwardedAt: new Date()
          }
        });

        // Update chat's latest message
        await Chat.findByIdAndUpdate(chatId, { latestMessage: forwardedMessage._id });

        return forwardedMessage;
      })
    );

    return sendSuccess(res, { 
      forwardedMessages: forwardedMessages.length,
      messages: forwardedMessages 
    }, 'Message forwarded successfully');

  } catch (error) {
    console.error('Forward message error:', error);
    return sendError(res, 'Failed to forward message', 500);
  }
};

// @desc    Search messages in a chat
// @route   GET /api/messages/:chatId/search
// @access  Private
const searchMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { q, page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    if (!q || q.trim() === '') {
      return sendError(res, 'Search query is required', 400);
    }

    // Verify user is member of the chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return sendError(res, 'Chat not found', 404);
    }

    const isMember = chat.users.some(user => {
      const chatUserId = user._id ? user._id.toString() : user.toString();
      return chatUserId === userId.toString();
    });

    if (!isMember) {
      return sendError(res, 'Access denied', 403);
    }

    const searchRegex = new RegExp(q.trim(), 'i');

    const messages = await Message.find({
      chat: chatId,
      content: { $regex: searchRegex },
      isDeleted: false,
      deletedFor: { $ne: userId }
    })
    .populate('sender', 'username email profilePic')
    .populate('replyTo', 'content sender')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    const totalMessages = await Message.countDocuments({
      chat: chatId,
      content: { $regex: searchRegex },
      isDeleted: false,
      deletedFor: { $ne: userId }
    });

    const pagination = getPaginationData(page, limit, totalMessages);

    return sendSuccess(res, {
      messages,
      pagination
    }, 'Messages found successfully');

  } catch (error) {
    console.error('Search messages error:', error);
    return sendError(res, 'Failed to search messages', 500);
  }
};

module.exports = {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  markMessageAsRead,
  forwardMessage,
  searchMessages
};
