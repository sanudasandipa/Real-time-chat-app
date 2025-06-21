const axios = require('axios');

async function testMessageAPI() {
  const BASE_URL = 'http://localhost:5000/api';
  
  try {
    console.log('Testing message API...');
      // First, let's try to login to get a token
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'sanuda@example.com',
      password: 'Password123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('Login successful, got token');
    
    // Set up headers with token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Get user's chats
    const chatsResponse = await axios.get(`${BASE_URL}/chats`, { headers });
    console.log('Chats response:', JSON.stringify(chatsResponse.data.data.chats, null, 2));
    
    if (chatsResponse.data.data.chats.length > 0) {
      const chatId = chatsResponse.data.data.chats[0]._id;
      console.log(`Testing messages for chat ID: ${chatId}`);
      
      // Get messages for the first chat
      const messagesResponse = await axios.get(`${BASE_URL}/messages/${chatId}`, { headers });
      console.log('Messages response:', JSON.stringify(messagesResponse.data, null, 2));
      
      if (messagesResponse.data.data.messages.length > 0) {
        console.log(`Found ${messagesResponse.data.data.messages.length} messages in chat`);
        messagesResponse.data.data.messages.forEach((msg, index) => {
          console.log(`Message ${index + 1}: ${msg.sender.username}: ${msg.content}`);
        });
      } else {
        console.log('No messages found in chat');
      }
    } else {
      console.log('No chats found for user');
    }
    
  } catch (error) {
    console.error('Error testing API:', error.response?.data || error.message);
  }
}

testMessageAPI();
