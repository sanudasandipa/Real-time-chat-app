const mongoose = require('mongoose');
const User = require('./models/User');
const Chat = require('./models/Chat');
const Message = require('./models/Message');
require('dotenv').config();

const sanudaUsers = [
  {
    username: 'sanuda',
    email: 'sanuda@example.com',
    password: 'Password123',
    bio: 'First test user for real-time chat testing 🚀'
  },
  {
    username: 'sanuda2',
    email: 'sanuda2@example.com',
    password: 'Password123',
    bio: 'Second test user for real-time chat testing 💬'
  }
];

const createSanudaUsers = async () => {
  try {
    console.log('🌱 Creating Sanuda users...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Create sanuda users
    const createdUsers = [];
    for (const userData of sanudaUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [
          { username: userData.username },
          { email: userData.email }
        ]
      });

      if (existingUser) {
        console.log(`⚠️  User ${userData.username} already exists, skipping...`);
        createdUsers.push(existingUser);
        continue;
      }

      const user = await User.create(userData);
      createdUsers.push(user);
      console.log(`👤 Created user: ${user.username}`);
    }

    // Create a private chat between sanuda and sanuda2 if they both exist
    if (createdUsers.length >= 2) {
      const existingChat = await Chat.findOne({
        isGroupChat: false,
        users: { $all: [createdUsers[0]._id, createdUsers[1]._id] }
      });

      if (!existingChat) {
        const privateChat = await Chat.create({
          isGroupChat: false,
          users: [createdUsers[0]._id, createdUsers[1]._id],
          readBy: [
            { user: createdUsers[0]._id, readAt: new Date() },
            { user: createdUsers[1]._id, readAt: new Date() }
          ]
        });
        console.log(`💬 Created private chat between ${createdUsers[0].username} and ${createdUsers[1].username}`);

        // Add some initial messages
        const sampleMessages = [
          {
            sender: createdUsers[0]._id,
            chat: privateChat._id,
            content: 'Hey there! This is our test chat for real-time messaging 👋',
            messageType: 'text'
          },
          {
            sender: createdUsers[1]._id,
            chat: privateChat._id,
            content: 'Hello! Ready to test the real-time features? 🚀',
            messageType: 'text'
          }
        ];

        for (const messageData of sampleMessages) {
          const message = await Message.create(messageData);
          
          // Update chat's latest message
          await Chat.findByIdAndUpdate(messageData.chat, {
            latestMessage: message._id
          });
          
          console.log(`💌 Created initial message: ${messageData.content.substring(0, 30)}...`);
        }
      } else {
        console.log(`💬 Chat between ${createdUsers[0].username} and ${createdUsers[1].username} already exists`);
      }
    }

    console.log('✅ Sanuda users setup completed successfully!');
    console.log('\n📋 Created Users:');
    createdUsers.forEach(user => {
      console.log(`  - ${user.username} (${user.email})`);
    });
    console.log('\n🔑 Default password for all users: Password123');

  } catch (error) {
    console.error('❌ Error creating sanuda users:', error);
  } finally {
    console.log('🔒 Database connection closed');
    mongoose.connection.close();
  }
};

createSanudaUsers();
