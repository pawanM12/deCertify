// backend/routes/ipfs.js
const express = require('express');
const router = express.Router();
const multer = require('multer'); // For handling file uploads
const { protect } = require('../middleware/auth'); // Assuming you have auth middleware
const ipfsController = require('../controllers/ipfsController'); // Import the controller

// Configure Multer for file uploads (in-memory storage for buffers)
const upload = multer({ storage: multer.memoryStorage() });

// @route   POST /api/ipfs/upload-document/:requestId
// @desc    Uploads a document to IPFS, embeds QR code, and updates request status
// @access  Private (Organization only)
router.post('/upload-document/:requestId', protect, upload.single('document'), ipfsController.uploadDocument);

module.exports = router;

