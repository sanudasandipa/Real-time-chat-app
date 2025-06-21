const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testProfileUpdate() {
  try {
    console.log('Testing profile update functionality...\n');

    // First, let's try to login with a test user
    console.log('1. Attempting login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'testuser3@example.com',
      password: 'password123'
    });

    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    console.log('✅ Login successful');
    console.log('Current user:', {
      username: user.username,
      email: user.email,
      bio: user.bio || 'Not set',
      phoneNumber: user.phoneNumber || 'Not set',
      location: user.location || 'Not set'
    });
    console.log('');

    // Test profile update
    console.log('2. Testing profile update...');
    const updateData = {
      username: user.username,
      bio: 'This is my updated bio!',
      phoneNumber: '+1234567890',
      location: 'New York, USA'
    };

    const updateResponse = await axios.put(`${API_BASE}/auth/profile`, updateData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Profile update successful');
    console.log('Updated user:', {
      username: updateResponse.data.data.user.username,
      email: updateResponse.data.data.user.email,
      bio: updateResponse.data.data.user.bio,
      phoneNumber: updateResponse.data.data.user.phoneNumber,
      location: updateResponse.data.data.user.location
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors);
    }
  }
}

testProfileUpdate();
