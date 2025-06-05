// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes, ensuring only authenticated users can access them
const protect = async (req, res, next) => {
  let token;

  // Check if the authorization header exists and starts with 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract the token from the header
      token = req.headers.authorization.split(' ')[1];

      // Verify the token using the JWT secret
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find the user by the ID in the decoded token and attach it to the request object
      // Exclude the password field for security
      req.user = await User.findById(decoded.id).select('-password');

      // Proceed to the next middleware or route handler
      next();
    } catch (error) {
      console.error('Not authorized, token failed:', error.message);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  // If no token is found
  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };

