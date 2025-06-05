// backend/models/CertificateRequest.js
const mongoose = require('mongoose');

const certificateRequestSchema = mongoose.Schema(
  {
    // Reference to the student who made the request
    student: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User', // Links to the User model (student type)
    },
    // Reference to the organization the request is for
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User', // Links to the User model (organization type)
    },
    // Status of the request: pending, accepted, rejected, issued
    status: {
      type: String,
      required: true,
      enum: ['pending', 'accepted', 'rejected', 'issued'],
      default: 'pending',
    },
    // Optional issuance amount requested by the organization
    // Stored as String to preserve BigInt precision from frontend (Wei value)
    issuanceAmount: {
      type: String,
      required: false,
      default: '0', // Default to '0' as a string
    },
    // Remarks from the organization (e.g., for rejection)
    remarks: {
      type: String,
      required: false,
    },
    // IPFS hash of the certified document once issued (final embedded PDF)
    ipfsHash: {
      type: String,
      required: false,
    },
    // Optional verification charge set by the organization
    // This is from the smart contract, so it will be a BigInt. Stored as String.
    verificationCharge: {
      type: String,
      required: false,
      default: '0', // Default to '0' as a string
    },
    // Timestamp for when the certificate was issued (if applicable)
    issuedAt: {
      type: Date,
      required: false,
    },
    // New fields for student credential details
    usn: {
      type: String,
      required: false, // Set to true if USN is always mandatory
    },
    yearOfGraduation: {
      type: Number, // Store as a Number
      required: false,
    },
    certificateType: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

const CertificateRequest = mongoose.model('CertificateRequest', certificateRequestSchema);

module.exports = CertificateRequest;

