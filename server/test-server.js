console.log('Starting minimal test server...');

try {
  console.log('1. Testing express import...');
  const express = require('express');
  console.log('✅ Express imported successfully');

  console.log('2. Testing database connection...');
  require('dotenv').config();
  const connectDB = require('./utils/database');
  console.log('✅ Database utility imported');

  console.log('3. Testing app creation...');
  const app = express();
  console.log('✅ Express app created');

  console.log('4. Testing basic middleware...');
  app.use(express.json());
  console.log('✅ Basic middleware added');

  console.log('5. Testing basic route...');
  app.get('/test', (req, res) => {
    res.json({ message: 'Test successful' });
  });
  console.log('✅ Test route added');

  console.log('6. Starting server...');
  const PORT = 5001; // Use different port
  app.listen(PORT, () => {
    console.log(`✅ Test server running on port ${PORT}`);
  });

} catch (error) {
  console.error('❌ Error in test server:', error.message);
  console.error('Stack:', error.stack);
}
