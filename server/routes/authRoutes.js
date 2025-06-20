const express = require('express');
const router = express.Router();

// Import controllers
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  uploadProfilePicture,
  changePassword,
  refreshToken,
  deleteAccount,
  searchUsers
} = require('../controllers/authController');

// Import middlewares
const { protect } = require('../middlewares/authMiddleware');
const { profilePictureUpload } = require('../utils/cloudinary');
const {
  validateUserRegistration,
  validateUserLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validateSearch,
  validatePagination
} = require('../middlewares/validationMiddleware');

// Public routes
router.post('/register', validateUserRegistration, register);
router.post('/login', validateUserLogin, login);
router.post('/refresh', refreshToken);

// Protected routes
router.use(protect); // All routes below require authentication

router.post('/logout', logout);
router.get('/me', getMe);
router.put('/profile', validateProfileUpdate, updateProfile);
router.post('/profile-picture', profilePictureUpload.single('profilePic'), uploadProfilePicture);
router.put('/change-password', validatePasswordChange, changePassword);
router.delete('/account', deleteAccount);
router.get('/search', [validateSearch, validatePagination], searchUsers);

module.exports = router;
