const mongoose = require('mongoose');
const Message = require('./models/Message');
const Chat = require('./models/Chat');
const User = require('./models/User');
require('dotenv').config();

async function checkMessages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Check total messages
    const totalMessages = await Message.countDocuments();
    console.log(`Total messages in database: ${totalMessages}`);

    // Check recent messages
    const recentMessages = await Message.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('sender', 'username')
      .populate('chat');

    console.log('\nRecent messages:');
    if (recentMessages.length === 0) {
      console.log('No messages found in database');
    } else {
      recentMessages.forEach(msg => {
        console.log(`${msg.sender?.username || 'Unknown'}: ${msg.content} (Chat: ${msg.chat?._id || 'Unknown'})`);
      });
    }

    // Check chats
    const totalChats = await Chat.countDocuments();
    console.log(`\nTotal chats in database: ${totalChats}`);

    // Check users
    const totalUsers = await User.countDocuments();
    console.log(`Total users in database: ${totalUsers}`);

    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

checkMessages();
