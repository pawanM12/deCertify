// backend/routes/auth.js
const express = require('express');
const { registerUser, loginUser, updateBlockchainStatus } = require('../controllers/authController');
const { protect } = require('../middleware/auth'); // Import the protect middleware

const router = express.Router();

// Route for user registration (student or organization)
router.post('/register', registerUser);

// Route for user login
router.post('/login', loginUser);

// Route to update a user's blockchain registration status (protected)
// This route will be called by the frontend after a successful blockchain registration transaction.
router.put('/update-blockchain-status/:id', protect, updateBlockchainStatus);

module.exports = router;

