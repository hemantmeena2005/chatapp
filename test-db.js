const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully!');
    
    // Test a simple operation
    const testDoc = await mongoose.connection.db.admin().ping();
    console.log('✅ Database ping successful:', testDoc);
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('Full error:', error);
  }
}

testConnection(); 