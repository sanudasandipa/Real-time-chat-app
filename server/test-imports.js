console.log('Testing main server imports step by step...');

try {
  console.log('1. Testing basic requires...');
  const express = require('express');
  const http = require('http');
  const cors = require('cors');
  const helmet = require('helmet');
  const morgan = require('morgan');
  const rateLimit = require('express-rate-limit');
  const path = require('path');
  console.log('✅ Basic modules imported');

  console.log('2. Testing dotenv...');
  require('dotenv').config();
  console.log('✅ Environment variables loaded');

  console.log('3. Testing database connection...');
  const connectDB = require('./utils/database');
  console.log('✅ Database utility imported');

  console.log('4. Testing socket.io...');
  const { initializeSocket } = require('./socket');
  console.log('✅ Socket.io utility imported');

  console.log('5. Testing middleware imports...');
  const { errorHandler, notFound } = require('./middlewares/errorMiddleware');
  console.log('✅ Error middleware imported');

  console.log('6. Testing route imports...');
  const authRoutes = require('./routes/authRoutes');
  console.log('✅ Auth routes imported');
  
  const chatRoutes = require('./routes/chatRoutes');
  console.log('✅ Chat routes imported');
  
  const messageRoutes = require('./routes/messageRoutes');
  console.log('✅ Message routes imported');

  console.log('✅ All imports successful!');

} catch (error) {
  console.error('❌ Import error:', error.message);
  console.error('Stack:', error.stack);
}
