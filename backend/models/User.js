// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    // Wallet address of the user, unique and required
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true, // Store wallet addresses in lowercase for consistency
    },
    // Name of the user (student or organization name)
    name: {
      type: String,
      required: true,
    },
    // Type of user: 'student' or 'organization'
    userType: {
      type: String,
      required: true,
      enum: ['student', 'organization'], // Enforce specific user types
    },
    // Optional: Password for traditional login (though we're emphasizing wallet login)
    // For this app, password might be less critical if wallet is the primary auth.
    // However, including it for completeness as per typical auth setups.
    password: {
      type: String,
      required: false, // Make optional if wallet is the sole authentication
    },
    // Optional: Email for notifications or contact
    email: {
      type: String,
      required: false,
      unique: false, // Not necessarily unique if multiple users share an email (e.g., org departments)
    },
    // Flag to indicate if the user has been registered on the blockchain
    isBlockchainRegistered: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

// Pre-save hook to hash the password before saving a new user
userSchema.pre('save', async function (next) {
  // Only hash the password if it's new or has been modified
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  // Generate a salt and hash the password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false; // No password set for this user
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;

