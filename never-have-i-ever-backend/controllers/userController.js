const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// @desc    Create a new user
// @route   POST /api/users
// @access  Public
const createUser = asyncHandler(async (req, res) => {
  const { name, avatar } = req.body;

  if (!name) {
    res.status(400);
    throw new Error('Please provide a name');
  }

  // Create user
  const user = await User.create({
    name,
    avatar: avatar || ''
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      avatar: user.avatar,
      points: user.points,
      stats: user.stats
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Public
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      avatar: user.avatar,
      points: user.points,
      stats: user.stats,
      joinedAt: user.createdAt
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user information
// @route   PUT /api/users/:id
// @access  Public
const updateUser = asyncHandler(async (req, res) => {
  const { name, avatar } = req.body;
  const user = await User.findById(req.params.id);

  if (user) {
    user.name = name || user.name;
    user.avatar = avatar || user.avatar;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      avatar: updatedUser.avatar
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

module.exports = {
  createUser,
  getUserById,
  updateUser
};