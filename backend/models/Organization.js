// backend/models/Organization.js
const mongoose = require('mongoose');

const organizationSchema = mongoose.Schema(
  {
    // Reference to the User model, specifically for organizations
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User', // Links to the User model
      unique: true, // Ensures one-to-one relationship with a User document
    },
    // Organization-specific fields
    description: {
      type: String,
      required: false,
    },
    website: {
      type: String,
      required: false,
    },
    // Add other organization-specific fields as needed
    // e.g., contactPerson, address, etc.
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

const Organization = mongoose.model('Organization', organizationSchema);

module.exports = Organization;

