const express = require('express');
const router = express.Router();

// Import controllers
const {
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
} = require('../controllers/chatController');

// Import middlewares
const { protect, requireChatMembership } = require('../middlewares/authMiddleware');
const { groupImageUpload } = require('../utils/cloudinary');
const {
  validateChatCreation,
  validateChatUpdate,
  validateAddRemoveUser,
  validateMongoId,
  validatePagination
} = require('../middlewares/validationMiddleware');

// All routes require authentication
router.use(protect);

// Chat management routes
router.get('/', validatePagination, getChats);
router.post('/private', validateAddRemoveUser, createOrGetPrivateChat);
router.post('/group', validateChatCreation, createGroupChat);

// Individual chat routes
router.get('/:chatId', validateMongoId('chatId'), getChatDetails);
router.put('/:chatId', [validateMongoId('chatId'), validateChatUpdate], updateGroupChat);
router.delete('/:chatId', validateMongoId('chatId'), deleteChat);

// Group management routes
router.post('/:chatId/image', [validateMongoId('chatId'), groupImageUpload.single('groupImage')], uploadGroupImage);
router.post('/:chatId/add-user', [validateMongoId('chatId'), validateAddRemoveUser], addUserToGroup);
router.post('/:chatId/remove-user', [validateMongoId('chatId'), validateAddRemoveUser], removeUserFromGroup);
router.post('/:chatId/leave', validateMongoId('chatId'), leaveGroup);

// Chat actions
router.post('/:chatId/read', validateMongoId('chatId'), markChatAsRead);

module.exports = router;
