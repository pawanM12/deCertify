// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const ipfsRoutes = require('./routes/ipfs');

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
// Enable CORS for all origins (adjust for production)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes); // Authentication routes
app.use('/api/users', userRoutes); // User-related routes (organizations, requests)
app.use('/api/ipfs', ipfsRoutes); // IPFS related routes

// Basic route for testing server
app.get('/', (req, res) => {
  res.send('deCertify Backend API is running...');
});

// Error handling middleware (optional, but good practice)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

