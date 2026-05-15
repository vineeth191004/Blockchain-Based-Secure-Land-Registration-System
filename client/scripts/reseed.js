const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function seed() {
  const uri = 'mongodb://localhost:27017/eland-records';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db('eland-records');

    const hashedPassword = await bcrypt.hash('portal123', 10);

    const user = {
      username: 'user_portal',
      email: 'user_portal@test.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      phone: '9876543210',
      aadhar: '123456789012',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'Male',
      address: '123 Test Street, Test City',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('users').updateOne(
      { username: 'user_portal' },
      { $set: user },
      { upsert: true }
    );

    console.log('Test user updated with all required fields successfully');
    console.log('Username: user_portal');
    console.log('Password: portal123');
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
