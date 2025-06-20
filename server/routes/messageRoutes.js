const express = require('express');
const router = express.Router();

// Import controllers
const {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  markMessageAsRead,
  forwardMessage,
  searchMessages
} = require('../controllers/messageController');

// Import middlewares
const { protect, requireChatMembership } = require('../middlewares/authMiddleware');
const { chatMediaUpload } = require('../utils/cloudinary');
const {
  validateMessageSend,
  validateMessageUpdate,
  validateReaction,
  validateMongoId,
  validatePagination,
  validateSearch
} = require('../middlewares/validationMiddleware');

// All routes require authentication
router.use(protect);

// Chat messages routes (require chat membership)
router.get('/:chatId', [validateMongoId('chatId'), requireChatMembership, validatePagination], getMessages);
router.post('/:chatId', [validateMongoId('chatId'), requireChatMembership, chatMediaUpload.single('media'), validateMessageSend], sendMessage);
router.get('/:chatId/search', [validateMongoId('chatId'), requireChatMembership, validateSearch, validatePagination], searchMessages);

// Individual message routes
router.put('/:messageId', [validateMongoId('messageId'), validateMessageUpdate], editMessage);
router.delete('/:messageId', validateMongoId('messageId'), deleteMessage);
router.post('/:messageId/read', validateMongoId('messageId'), markMessageAsRead);
router.post('/:messageId/forward', validateMongoId('messageId'), forwardMessage);

// Message reactions
router.post('/:messageId/react', [validateMongoId('messageId'), validateReaction], addReaction);
router.delete('/:messageId/react', [validateMongoId('messageId'), validateReaction], removeReaction);

module.exports = router;
