const mongoose = require('mongoose');
const User = require('./models/User');
const Chat = require('./models/Chat');
const Message = require('./models/Message');
require('dotenv').config();

// Sample data for seeding
const sampleUsers = [
  {
    username: 'alice',
    email: 'alice@example.com',
    password: 'Password123',
    bio: 'Software developer who loves coding and coffee ☕'
  },
  {
    username: 'bob',
    email: 'bob@example.com',
    password: 'Password123',
    bio: 'Designer with a passion for great UX 🎨'
  },
  {
    username: 'charlie',
    email: 'charlie@example.com',
    password: 'Password123',
    bio: 'Entrepreneur building the next big thing 🚀'
  }
];

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Clear existing data
    await User.deleteMany({});
    await Chat.deleteMany({});
    await Message.deleteMany({});
    console.log('🧹 Cleared existing data');

    // Create sample users
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = await User.create(userData);
      createdUsers.push(user);
      console.log(`👤 Created user: ${user.username}`);
    }

    // Create a sample group chat
    const groupChat = await Chat.create({
      chatName: 'Dev Team Chat',
      isGroupChat: true,
      users: createdUsers.map(user => user._id),
      groupAdmin: createdUsers[0]._id,
      groupDescription: 'A group for development discussions',
      readBy: createdUsers.map(user => ({
        user: user._id,
        readAt: new Date()
      })),
      userPermissions: createdUsers.map(user => ({
        user: user._id,
        role: user._id.equals(createdUsers[0]._id) ? 'admin' : 'member'
      }))
    });
    console.log(`💬 Created group chat: ${groupChat.chatName}`);

    // Create a sample private chat
    const privateChat = await Chat.create({
      isGroupChat: false,
      users: [createdUsers[0]._id, createdUsers[1]._id],
      readBy: [
        { user: createdUsers[0]._id, readAt: new Date() },
        { user: createdUsers[1]._id, readAt: new Date() }
      ]
    });
    console.log('💬 Created private chat between Alice and Bob');

    // Create sample messages
    const sampleMessages = [
      {
        sender: createdUsers[0]._id,
        chat: groupChat._id,
        content: 'Welcome to the dev team chat! 🎉',
        messageType: 'text'
      },
      {
        sender: createdUsers[1]._id,
        chat: groupChat._id,
        content: 'Thanks Alice! Excited to be here 😊',
        messageType: 'text'
      },
      {
        sender: createdUsers[2]._id,
        chat: groupChat._id,
        content: 'Looking forward to working with everyone!',
        messageType: 'text'
      },
      {
        sender: createdUsers[0]._id,
        chat: privateChat._id,
        content: 'Hey Bob, how\'s the new design coming along?',
        messageType: 'text'
      },
      {
        sender: createdUsers[1]._id,
        chat: privateChat._id,
        content: 'It\'s going great! I\'ll share some mockups soon 🎨',
        messageType: 'text'
      }
    ];

    for (const messageData of sampleMessages) {
      const message = await Message.create(messageData);
      
      // Update chat's latest message
      await Chat.findByIdAndUpdate(messageData.chat, {
        latestMessage: message._id
      });
      
      console.log(`💌 Created message in ${messageData.chat}`);
    }

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Sample Users Created:');
    createdUsers.forEach(user => {
      console.log(`  - ${user.username} (${user.email})`);
    });
    console.log('\n🔑 Default password for all users: Password123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
