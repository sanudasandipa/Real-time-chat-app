const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');
const { sendSuccess, sendError, getPaginationData } = require('../utils/helpers');
const { extractPublicId, deleteFromCloudinary } = require('../utils/cloudinary');

// @desc    Get all chats for the current user
// @route   GET /api/chats
// @access  Private
const getChats = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const chats = await Chat.findUserChats(userId)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));    // Get unread message counts for each chat
    const chatData = await Promise.all(chats.map(async (chat) => {
      const chatObj = chat.toObject();
      
      // Add compatibility field for frontend
      chatObj.isGroup = chatObj.isGroupChat;
      
      // Get last read timestamp for current user
      const readEntry = chat.readBy.find(entry => entry.user.toString() === userId.toString());
      const lastReadAt = readEntry ? readEntry.readAt : new Date(0);
      
      // Get unread count
      const unreadCount = await Message.getUnreadCount(chat._id, userId, lastReadAt);
      
      // Get chat display info for current user
      if (!chat.isGroupChat && chat.users.length === 2) {
        const otherUser = chat.users.find(user => user._id.toString() !== userId.toString());
        chatObj.displayName = otherUser ? otherUser.username : 'Unknown User';
        chatObj.displayImage = otherUser ? otherUser.profilePic : '';
        chatObj.isOnline = otherUser ? otherUser.isOnline : false;
        chatObj.lastSeen = otherUser ? otherUser.lastSeen : null;
      } else {
        chatObj.displayName = chat.chatName;
        chatObj.displayImage = chat.groupImage;
        chatObj.isOnline = null; // Not applicable for groups
        chatObj.lastSeen = null;
      }
      
      chatObj.unreadCount = unreadCount;
      return chatObj;
    }));

    const totalChats = await Chat.countDocuments({
      users: { $in: [userId] },
      isActive: true
    });

    const pagination = getPaginationData(page, limit, totalChats);

    return sendSuccess(res, {
      chats: chatData,
      pagination
    }, 'Chats retrieved successfully');

  } catch (error) {
    console.error('Get chats error:', error);
    return sendError(res, 'Failed to retrieve chats', 500);
  }
};

// @desc    Create or get existing private chat
// @route   POST /api/chats/private
// @access  Private
const createOrGetPrivateChat = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return sendError(res, 'Cannot create chat with yourself', 400);
    }

    // Check if the other user exists
    const otherUser = await User.findById(userId).select('username email profilePic isOnline lastSeen');
    if (!otherUser) {
      return sendError(res, 'User not found', 404);
    }    // Find or create private chat
    const chat = await Chat.findOrCreatePrivateChat(currentUserId, userId);    console.log('💬 Chat created/found:', chat._id);

    // Format chat data
    const chatData = chat.toObject();
    chatData.isGroup = chatData.isGroupChat; // Add compatibility field
    chatData.displayName = otherUser.username;
    chatData.displayImage = otherUser.profilePic;
    chatData.isOnline = otherUser.isOnline;
    chatData.lastSeen = otherUser.lastSeen;

    // Get unread count
    const readEntry = chat.readBy.find(entry => entry.user.toString() === currentUserId.toString());
    const lastReadAt = readEntry ? readEntry.readAt : new Date(0);
    const unreadCount = await Message.getUnreadCount(chat._id, currentUserId, lastReadAt);
    chatData.unreadCount = unreadCount;

    console.log('📤 Sending chat data:', { chatId: chatData._id, displayName: chatData.displayName });

    // Emit real-time update for new chat creation
    const io = req.app.get('io');
    if (io) {
      // Notify current user
      io.to(`user_${currentUserId}`).emit('new-chat', chatData);
      
      // Notify other user
      const otherUserChatData = { ...chatData };
      otherUserChatData.displayName = req.user.username;
      otherUserChatData.displayImage = req.user.profilePic;
      io.to(`user_${userId}`).emit('new-chat', otherUserChatData);
    }

    return sendSuccess(res, { chat: chatData }, 'Private chat retrieved successfully');

  } catch (error) {
    console.error('Create private chat error:', error);
    return sendError(res, 'Failed to create private chat', 500);
  }
};

// @desc    Create group chat
// @route   POST /api/chats/group
// @access  Private
const createGroupChat = async (req, res) => {
  try {
    const { users, chatName, groupDescription } = req.body;
    const currentUserId = req.user._id;

    // Validate users array
    if (!Array.isArray(users) || users.length < 1) {
      return sendError(res, 'At least 2 users are required for a group chat', 400);
    }

    // Remove duplicates and ensure current user is included
    const uniqueUsers = [...new Set([currentUserId.toString(), ...users])];

    if (uniqueUsers.length < 2) {
      return sendError(res, 'At least 2 users are required for a group chat', 400);
    }

    // Verify all users exist
    const existingUsers = await User.find({ _id: { $in: uniqueUsers } }).select('_id');
    
    if (existingUsers.length !== uniqueUsers.length) {
      return sendError(res, 'One or more users not found', 404);
    }

    // Create group chat
    const chat = await Chat.create({
      chatName,
      isGroupChat: true,
      users: uniqueUsers,
      groupAdmin: currentUserId,
      groupDescription: groupDescription || '',
      readBy: uniqueUsers.map(userId => ({
        user: userId,
        readAt: new Date()
      })),
      userPermissions: uniqueUsers.map(userId => ({
        user: userId,
        role: userId.toString() === currentUserId.toString() ? 'admin' : 'member'
      }))
    });    // Populate the created chat
    await chat.populate('users', 'username email profilePic isOnline lastSeen');
    await chat.populate('groupAdmin', 'username email profilePic');

    const chatData = chat.toObject();
    chatData.isGroup = chatData.isGroupChat; // Add compatibility field    chatData.displayName = chat.chatName;
    chatData.displayImage = chat.groupImage;
    chatData.unreadCount = 0; // New chat, no unread messages

    // Emit real-time update for new group chat creation
    const io = req.app.get('io');
    if (io) {
      // Notify all users in the group
      uniqueUsers.forEach(userId => {
        io.to(`user_${userId}`).emit('new-chat', chatData);
      });
    }

    return sendSuccess(res, { chat: chatData }, 'Group chat created successfully', 201);

  } catch (error) {
    console.error('Create group chat error:', error);
    return sendError(res, 'Failed to create group chat', 500);
  }
};

// @desc    Get single chat details
// @route   GET /api/chats/:chatId
// @access  Private
const getChatDetails = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId)
      .populate('users', 'username email profilePic isOnline lastSeen bio')
      .populate('groupAdmin', 'username email profilePic')
      .populate('latestMessage');

    if (!chat) {
      return sendError(res, 'Chat not found', 404);
    }

    // Check if user is a member
    const isMember = chat.users.some(user => user._id.toString() === userId.toString());
    if (!isMember) {
      return sendError(res, 'Access denied', 403);
    }    // Format chat data
    const chatData = chat.toObject();
    chatData.isGroup = chatData.isGroupChat; // Add compatibility field
    
    if (!chat.isGroupChat && chat.users.length === 2) {
      const otherUser = chat.users.find(user => user._id.toString() !== userId.toString());
      chatData.displayName = otherUser ? otherUser.username : 'Unknown User';
      chatData.displayImage = otherUser ? otherUser.profilePic : '';
      chatData.isOnline = otherUser ? otherUser.isOnline : false;
      chatData.lastSeen = otherUser ? otherUser.lastSeen : null;
    } else {
      chatData.displayName = chat.chatName;
      chatData.displayImage = chat.groupImage;
    }

    return sendSuccess(res, { chat: chatData }, 'Chat details retrieved successfully');

  } catch (error) {
    console.error('Get chat details error:', error);
    return sendError(res, 'Failed to retrieve chat details', 500);
  }
};

// @desc    Update group chat
// @route   PUT /api/chats/:chatId
// @access  Private
const updateGroupChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { chatName, groupDescription } = req.body;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return sendError(res, 'Chat not found', 404);
    }

    if (!chat.isGroupChat) {
      return sendError(res, 'Cannot update private chat', 400);
    }

    // Check if user is admin or has permission
    const isAdmin = chat.isUserAdmin(userId);
    const userPermission = chat.userPermissions.find(perm => perm.user.toString() === userId.toString());
    const canEdit = isAdmin || (userPermission && userPermission.canEditGroupInfo);

    if (!canEdit) {
      return sendError(res, 'Permission denied. Only admins can update group info', 403);
    }

    // Update chat
    if (chatName !== undefined) chat.chatName = chatName;
    if (groupDescription !== undefined) chat.groupDescription = groupDescription;

    await chat.save();
    await chat.populate('users', 'username email profilePic isOnline lastSeen');
    await chat.populate('groupAdmin', 'username email profilePic');

    const chatData = chat.toObject();
    chatData.displayName = chat.chatName;
    chatData.displayImage = chat.groupImage;

    return sendSuccess(res, { chat: chatData }, 'Group chat updated successfully');

  } catch (error) {
    console.error('Update group chat error:', error);
    return sendError(res, 'Failed to update group chat', 500);
  }
};

// @desc    Upload group image
// @route   POST /api/chats/:chatId/image
// @access  Private
const uploadGroupImage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    if (!req.file) {
      return sendError(res, 'No image file provided', 400);
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return sendError(res, 'Chat not found', 404);
    }

    if (!chat.isGroupChat) {
      return sendError(res, 'Cannot set image for private chat', 400);
    }

    // Check permissions
    const isAdmin = chat.isUserAdmin(userId);
    const userPermission = chat.userPermissions.find(perm => perm.user.toString() === userId.toString());
    const canEdit = isAdmin || (userPermission && userPermission.canEditGroupInfo);

    if (!canEdit) {
      return sendError(res, 'Permission denied', 403);
    }

    // Delete old group image if exists
    if (chat.groupImage) {
      try {
        const publicId = extractPublicId(chat.groupImage);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      } catch (error) {
        console.error('Error deleting old group image:', error);
      }
    }

    // Update group image
    chat.groupImage = req.file.path;
    await chat.save();

    await chat.populate('users', 'username email profilePic isOnline lastSeen');
    await chat.populate('groupAdmin', 'username email profilePic');

    const chatData = chat.toObject();
    chatData.displayName = chat.chatName;
    chatData.displayImage = chat.groupImage;

    return sendSuccess(res, { chat: chatData }, 'Group image updated successfully');

  } catch (error) {
    console.error('Upload group image error:', error);
    return sendError(res, 'Failed to upload group image', 500);
  }
};

// @desc    Add user to group chat
// @route   POST /api/chats/:chatId/add-user
// @access  Private
const addUserToGroup = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId: userToAdd } = req.body;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId).populate('users', 'username email profilePic');

    if (!chat) {
      return sendError(res, 'Chat not found', 404);
    }

    if (!chat.isGroupChat) {
      return sendError(res, 'Cannot add users to private chat', 400);
    }

    // Check permissions
    const isAdmin = chat.isUserAdmin(currentUserId);
    const userPermission = chat.userPermissions.find(perm => perm.user.toString() === currentUserId.toString());
    const canAdd = isAdmin || (userPermission && userPermission.canAddMembers);

    if (!canAdd) {
      return sendError(res, 'Permission denied', 403);
    }

    // Check if user exists
    const userToAddDoc = await User.findById(userToAdd).select('username email profilePic');
    if (!userToAddDoc) {
      return sendError(res, 'User to add not found', 404);
    }

    // Check if user is already in the chat
    if (chat.users.some(user => user._id.toString() === userToAdd)) {
      return sendError(res, 'User is already in the chat', 400);
    }

    // Add user to chat
    await chat.addUser(userToAdd);
    await chat.populate('users', 'username email profilePic isOnline lastSeen');

    // Create system message about user addition
    await Message.create({
      sender: currentUserId,
      chat: chatId,
      content: `${userToAddDoc.username} was added to the group`,
      messageType: 'system'
    });

    return sendSuccess(res, { 
      chat: chat,
      addedUser: userToAddDoc 
    }, 'User added to group successfully');

  } catch (error) {
    console.error('Add user to group error:', error);
    return sendError(res, 'Failed to add user to group', 500);
  }
};

// @desc    Remove user from group chat
// @route   POST /api/chats/:chatId/remove-user
// @access  Private
const removeUserFromGroup = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId: userToRemove } = req.body;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId).populate('users', 'username email profilePic');

    if (!chat) {
      return sendError(res, 'Chat not found', 404);
    }

    if (!chat.isGroupChat) {
      return sendError(res, 'Cannot remove users from private chat', 400);
    }

    // Get user to remove info before removal
    const userToRemoveDoc = chat.users.find(user => user._id.toString() === userToRemove);
    if (!userToRemoveDoc) {
      return sendError(res, 'User not found in chat', 404);
    }

    // Check if trying to remove admin
    if (chat.groupAdmin.toString() === userToRemove) {
      return sendError(res, 'Cannot remove group admin', 400);
    }

    // Check permissions (admin or user removing themselves)
    const isAdmin = chat.isUserAdmin(currentUserId);
    const userPermission = chat.userPermissions.find(perm => perm.user.toString() === currentUserId.toString());
    const canRemove = isAdmin || (userPermission && userPermission.canRemoveMembers) || (currentUserId.toString() === userToRemove);

    if (!canRemove) {
      return sendError(res, 'Permission denied', 403);
    }

    // Remove user from chat
    await chat.removeUser(userToRemove);
    await chat.populate('users', 'username email profilePic isOnline lastSeen');

    // Create system message about user removal
    const actionText = currentUserId.toString() === userToRemove ? 'left' : 'was removed from';
    await Message.create({
      sender: currentUserId,
      chat: chatId,
      content: `${userToRemoveDoc.username} ${actionText} the group`,
      messageType: 'system'
    });

    return sendSuccess(res, { 
      chat: chat,
      removedUser: userToRemoveDoc 
    }, 'User removed from group successfully');

  } catch (error) {
    console.error('Remove user from group error:', error);
    return sendError(res, 'Failed to remove user from group', 500);
  }
};

// @desc    Leave group chat
// @route   POST /api/chats/:chatId/leave
// @access  Private
const leaveGroup = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId).populate('users', 'username email profilePic');

    if (!chat) {
      return sendError(res, 'Chat not found', 404);
    }

    if (!chat.isGroupChat) {
      return sendError(res, 'Cannot leave private chat', 400);
    }

    // Check if user is in the chat
    const userInChat = chat.users.find(user => user._id.toString() === userId.toString());
    if (!userInChat) {
      return sendError(res, 'You are not a member of this chat', 400);
    }

    // If user is admin, transfer admin rights or delete group if only member
    if (chat.groupAdmin.toString() === userId.toString()) {
      if (chat.users.length === 1) {
        // Only member left, delete the chat
        await Chat.findByIdAndDelete(chatId);
        return sendSuccess(res, null, 'Group deleted successfully');
      } else {
        // Transfer admin to another user (first user in the list)
        const newAdmin = chat.users.find(user => user._id.toString() !== userId.toString());
        chat.groupAdmin = newAdmin._id;
        
        // Update permissions
        const newAdminPermission = chat.userPermissions.find(perm => perm.user.toString() === newAdmin._id.toString());
        if (newAdminPermission) {
          newAdminPermission.role = 'admin';
          newAdminPermission.canAddMembers = true;
          newAdminPermission.canRemoveMembers = true;
          newAdminPermission.canEditGroupInfo = true;
        }
      }
    }

    // Remove user from chat
    await chat.removeUser(userId);

    // Create system message
    await Message.create({
      sender: userId,
      chat: chatId,
      content: `${userInChat.username} left the group`,
      messageType: 'system'
    });

    return sendSuccess(res, null, 'Left group successfully');

  } catch (error) {
    console.error('Leave group error:', error);
    return sendError(res, 'Failed to leave group', 500);
  }
};

// @desc    Mark chat as read
// @route   POST /api/chats/:chatId/read
// @access  Private
const markChatAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    const { messageId } = req.body; // Optional: specific message to mark as read up to

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return sendError(res, 'Chat not found', 404);
    }

    // Check if user is a member
    const isMember = chat.users.some(user => user._id.toString() === userId.toString());
    if (!isMember) {
      return sendError(res, 'Access denied', 403);
    }

    // Mark chat as read
    await chat.markAsRead(userId, messageId);

    return sendSuccess(res, null, 'Chat marked as read');

  } catch (error) {
    console.error('Mark chat as read error:', error);
    return sendError(res, 'Failed to mark chat as read', 500);
  }
};

// @desc    Delete chat
// @route   DELETE /api/chats/:chatId
// @access  Private
const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return sendError(res, 'Chat not found', 404);
    }

    // For private chats, allow any member to delete
    // For group chats, only admin can delete
    if (chat.isGroupChat) {
      const isAdmin = chat.isUserAdmin(userId);
      if (!isAdmin) {
        return sendError(res, 'Only group admin can delete group chat', 403);
      }
    } else {
      const isMember = chat.users.some(user => user._id.toString() === userId.toString());
      if (!isMember) {
        return sendError(res, 'Access denied', 403);
      }
    }

    // Delete group image if exists
    if (chat.groupImage) {
      try {
        const publicId = extractPublicId(chat.groupImage);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      } catch (error) {
        console.error('Error deleting group image:', error);
      }
    }

    // Mark chat as inactive instead of hard delete (to preserve message history)
    chat.isActive = false;
    await chat.save();

    return sendSuccess(res, null, 'Chat deleted successfully');

  } catch (error) {
    console.error('Delete chat error:', error);
    return sendError(res, 'Failed to delete chat', 500);
  }
};

module.exports = {
  getChats,
  createOrGetPrivateChat,
  createGroupChat,
  getChatDetails,
  updateGroupChat,
  uploadGroupImage,
  addUserToGroup,
  removeUserFromGroup,
  leaveGroup,
  markChatAsRead,
  deleteChat
};
