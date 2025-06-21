const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/jwt');
const { sendSuccess, sendError, sanitizeUser } = require('../utils/helpers');
const { extractPublicId, deleteFromCloudinary } = require('../utils/cloudinary');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return sendError(res, 'User with this email already exists', 400);
      }
      if (existingUser.username === username) {
        return sendError(res, 'Username already taken', 400);
      }
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password
    });

    // Generate tokens
    const token = generateToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    // Set user as online
    user.isOnline = true;
    await user.save();

    const userData = sanitizeUser(user);

    return sendSuccess(res, {
      user: userData,
      token,
      refreshToken
    }, 'User registered successfully', 201);

  } catch (error) {
    console.error('Registration error:', error);
    return sendError(res, 'Registration failed', 500);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return sendError(res, 'Invalid email or password', 401);
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return sendError(res, 'Invalid email or password', 401);
    }

    // Generate tokens
    const token = generateToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    // Set user as online and update last seen
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const userData = sanitizeUser(user);

    return sendSuccess(res, {
      user: userData,
      token,
      refreshToken
    }, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    return sendError(res, 'Login failed', 500);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    const user = req.user;

    // Set user as offline and update last seen
    user.isOnline = false;
    user.lastSeen = new Date();
    await user.save();

    return sendSuccess(res, null, 'Logout successful');

  } catch (error) {
    console.error('Logout error:', error);
    return sendError(res, 'Logout failed', 500);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = req.user;
    const userData = sanitizeUser(user);

    return sendSuccess(res, { user: userData }, 'Profile retrieved successfully');

  } catch (error) {
    console.error('Get profile error:', error);
    return sendError(res, 'Failed to get profile', 500);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = req.user;
    const allowedUpdates = ['username', 'bio', 'phoneNumber', 'location', 'dateOfBirth'];
    const updates = {};

    // Filter allowed updates
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Check if username is being updated and is available
    if (updates.username && updates.username !== user.username) {
      const existingUser = await User.findOne({ username: updates.username });
      if (existingUser) {
        return sendError(res, 'Username already taken', 400);
      }
    }

    // Update user
    Object.keys(updates).forEach(key => {
      user[key] = updates[key];
    });

    await user.save();

    const userData = sanitizeUser(user);

    return sendSuccess(res, { user: userData }, 'Profile updated successfully');

  } catch (error) {
    console.error('Update profile error:', error);
    return sendError(res, 'Failed to update profile', 500);
  }
};

// @desc    Upload profile picture
// @route   POST /api/auth/profile-picture
// @access  Private
const uploadProfilePicture = async (req, res) => {
  try {
    console.log('Upload profile picture request received');
    console.log('User:', req.user ? req.user._id : 'No user');
    console.log('File:', req.file ? 'File present' : 'No file');
    console.log('Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET'
    });

    const user = req.user;

    if (!req.file) {
      console.log('No file provided in request');
      return sendError(res, 'No image file provided', 400);
    }

    console.log('File details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // Delete old profile picture if exists
    if (user.profilePic) {
      try {
        const publicId = extractPublicId(user.profilePic);
        if (publicId) {
          console.log('Deleting old profile picture:', publicId);
          await deleteFromCloudinary(publicId);
        }
      } catch (error) {
        console.error('Error deleting old profile picture:', error);
        // Continue with upload even if old image deletion fails
      }
    }

    // Update user with new profile picture URL
    console.log('Updating user profile picture URL:', req.file.path);
    user.profilePic = req.file.path;
    await user.save();

    const userData = sanitizeUser(user);

    return sendSuccess(res, { user: userData }, 'Profile picture uploaded successfully');

  } catch (error) {
    console.error('Profile picture upload error:', error);
    return sendError(res, 'Failed to upload profile picture', 500);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return sendError(res, 'Current password is incorrect', 400);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return sendSuccess(res, null, 'Password changed successfully');

  } catch (error) {
    console.error('Change password error:', error);
    return sendError(res, 'Failed to change password', 500);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendError(res, 'Refresh token is required', 400);
    }

    try {
      const { verifyToken } = require('../utils/jwt');
      const decoded = verifyToken(refreshToken);
      
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      // Generate new access token
      const newAccessToken = generateToken({ id: user._id });
      const newRefreshToken = generateRefreshToken({ id: user._id });

      return sendSuccess(res, {
        token: newAccessToken,
        refreshToken: newRefreshToken
      }, 'Token refreshed successfully');

    } catch (error) {
      return sendError(res, 'Invalid refresh token', 401);
    }

  } catch (error) {
    console.error('Refresh token error:', error);
    return sendError(res, 'Failed to refresh token', 500);
  }
};

// @desc    Delete user account
// @route   DELETE /api/auth/account
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const user = req.user;
    const { password } = req.body;

    if (!password) {
      return sendError(res, 'Password is required to delete account', 400);
    }

    // Verify password
    const userWithPassword = await User.findById(user._id).select('+password');
    const isPasswordValid = await userWithPassword.comparePassword(password);

    if (!isPasswordValid) {
      return sendError(res, 'Incorrect password', 400);
    }

    // Delete profile picture from Cloudinary
    if (user.profilePic) {
      try {
        const publicId = extractPublicId(user.profilePic);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      } catch (error) {
        console.error('Error deleting profile picture:', error);
      }
    }

    // TODO: Handle user deletion in chats and messages
    // For now, just mark user as deleted instead of hard delete
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.isOnline = false;
    await user.save();

    return sendSuccess(res, null, 'Account deleted successfully');

  } catch (error) {
    console.error('Delete account error:', error);
    return sendError(res, 'Failed to delete account', 500);
  }
};

// @desc    Search users
// @route   GET /api/auth/search
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const currentUserId = req.user._id;

    if (!q || q.trim() === '') {
      return sendError(res, 'Search query is required', 400);
    }

    const searchRegex = new RegExp(q.trim(), 'i');
    
    const users = await User.find({
      $and: [
        {
          $or: [
            { username: { $regex: searchRegex } },
            { email: { $regex: searchRegex } }
          ]
        },
        { _id: { $ne: currentUserId } }, // Exclude current user
        { isDeleted: { $ne: true } } // Exclude deleted users
      ]
    })
    .select('username email profilePic isOnline lastSeen bio')
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .sort({ username: 1 });

    const totalUsers = await User.countDocuments({
      $and: [
        {
          $or: [
            { username: { $regex: searchRegex } },
            { email: { $regex: searchRegex } }
          ]
        },
        { _id: { $ne: currentUserId } },
        { isDeleted: { $ne: true } }
      ]
    });

    return sendSuccess(res, {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / parseInt(limit)),
        totalUsers,
        hasNext: parseInt(page) < Math.ceil(totalUsers / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    }, 'Users found successfully');

  } catch (error) {
    console.error('Search users error:', error);
    return sendError(res, 'Failed to search users', 500);
  }
};

module.exports = {
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
};
