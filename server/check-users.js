const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    const users = await User.find().select('username email');
    console.log('Users in database:');
    users.forEach(user => {
      console.log(`- ${user.username} (${user.email})`);
    });

    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

checkUsers();
