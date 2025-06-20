console.log('Testing complete server startup...');

async function testServer() {
  try {
    console.log('1. Loading dependencies...');
    const express = require('express');
    const http = require('http');
    require('dotenv').config();
    
    console.log('2. Testing database connection...');
    const connectDB = require('./utils/database');
    await connectDB();
    console.log('✅ Database connected successfully');
    
    console.log('3. Creating Express app...');
    const app = express();
    const server = http.createServer(app);
    
    console.log('4. Setting up basic middleware...');
    app.use(express.json());
    
    console.log('5. Adding test route...');
    app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
      });
    });
    
    console.log('6. Starting server...');
    const PORT = 5002;
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log('🔗 Test with: curl http://localhost:5002/health');
    });
    
  } catch (error) {
    console.error('❌ Server startup error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testServer();
