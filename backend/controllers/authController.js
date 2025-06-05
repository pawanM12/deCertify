// backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Organization = require('../models/Organization'); // Import Organization model

// Helper function to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '1h', // Token expires in 1 hour
  });
};

// @desc    Register a new user (student or organization)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { walletAddress, name, userType, password, email } = req.body;

  // Validate input fields
  if (!walletAddress || !name || !userType) {
    return res.status(400).json({ message: 'Please enter all required fields: walletAddress, name, userType' });
  }

  // Check if userType is valid
  if (!['student', 'organization'].includes(userType)) {
    return res.status(400).json({ message: 'Invalid userType. Must be "student" or "organization".' });
  }

  try {
    // Check if user already exists by wallet address
    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });

    if (user) {
      return res.status(400).json({ message: 'User with this wallet address already exists.' });
    }

    // Create new user
    user = await User.create({
      walletAddress: walletAddress.toLowerCase(),
      name,
      userType,
      password, // Password will be hashed by the pre-save hook in User model
      email,
      isBlockchainRegistered: false, // Initially false, set to true after blockchain registration
    });

    if (user) {
      // If organization, create an Organization document
      if (userType === 'organization') {
        const organization = await Organization.create({
          user: user._id, // Link to the newly created user
          description: '', // Default empty description
          website: '', // Default empty website
        });
        if (!organization) {
          // If organization creation fails, consider rolling back user creation or logging error
          await User.deleteOne({ _id: user._id }); // Rollback user creation
          return res.status(500).json({ message: 'Failed to create organization profile.' });
        }
      }

      // Respond with user details and a token
      res.status(201).json({
        _id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        userType: user.userType,
        email: user.email,
        isBlockchainRegistered: user.isBlockchainRegistered,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { walletAddress, password } = req.body;

  // Validate input
  if (!walletAddress) {
    return res.status(400).json({ message: 'Please enter wallet address.' });
  }

  try {
    // Find user by wallet address
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });

    // Check if user exists and password matches (if password is provided)
    if (user && (password ? await user.matchPassword(password) : true)) {
      // If password is not required (e.g., wallet-only login),
      // or if password matches, proceed.
      res.json({
        _id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        userType: user.userType,
        email: user.email,
        isBlockchainRegistered: user.isBlockchainRegistered,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid wallet address or password.' });
    }
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// @desc    Update user's blockchain registration status
// @route   PUT /api/auth/update-blockchain-status/:id
// @access  Private (Admin or self-update, for this app, self-update by frontend after tx)
const updateBlockchainStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.isBlockchainRegistered = true; // Set to true after successful blockchain registration
    await user.save();

    res.json({ message: 'Blockchain registration status updated successfully.', user });
  } catch (error) {
    console.error('Error updating blockchain status:', error);
    res.status(500).json({ message: 'Server error updating blockchain status.' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  updateBlockchainStatus,
};

