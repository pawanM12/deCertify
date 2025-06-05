// backend/config/db.js
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables

const connectDB = async () => {
  try {
    // Connect to MongoDB using the URI from environment variables
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // useNewUrlParser: true, // Deprecated, no longer needed
      // useUnifiedTopology: true, // Deprecated, no longer needed
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;

