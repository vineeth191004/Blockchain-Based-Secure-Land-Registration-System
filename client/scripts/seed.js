const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function seed() {
  const uri = 'mongodb://localhost:27017/eland-records';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db('eland-records');

    const hashedPortalPassword = await bcrypt.hash('portal123', 10);
    const hashedOfficialPassword = await bcrypt.hash('clerk123', 10);

    // 1. Seed User Portal
    const userPortal = {
      username: 'user_portal',
      email: 'user_portal@test.com',
      password: hashedPortalPassword,
      firstName: 'Test',
      lastName: 'User',
      phone: '9876543210',
      aadhar: '123456789012',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'Male',
      address: '123 Test Street, Hyderabad',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('users').updateOne(
      { username: 'user_portal' },
      { $set: userPortal },
      { upsert: true }
    );

    // 2. Seed Officials
    const officials = [
      {
        username: 'clerk1',
        email: 'clerk1@test.com',
        designation: 'clerk',
        department: 'Registration',
        officeId: 'REG-OFF-001',
        firstName: 'Clerk',
        lastName: 'One',
        phone: '9000000001'
      },
      {
        username: 'super1',
        email: 'super1@test.com',
        designation: 'superintendent',
        department: 'Registration',
        officeId: 'REG-OFF-002',
        firstName: 'Super',
        lastName: 'Intendent',
        phone: '9000000004'
      },
      {
        username: 'po1',
        email: 'po1@test.com',
        designation: 'project_officer',
        department: 'Registration',
        officeId: 'REG-OFF-003',
        firstName: 'Project',
        lastName: 'Officer',
        phone: '9000000005'
      },
      {
        username: 'mro1',
        email: 'mro1@test.com',
        designation: 'mro',
        department: 'Revenue',
        officeId: 'REV-OFF-002',
        firstName: 'Mandal',
        lastName: 'Officer',
        phone: '9000000002'
      },
      {
        username: 'survey1',
        email: 'survey1@test.com',
        designation: 'surveyor',
        department: 'Survey',
        officeId: 'SUR-OFF-003',
        firstName: 'Land',
        lastName: 'Surveyor',
        phone: '9000000003'
      },
      {
        username: 'ri1',
        email: 'ri1@test.com',
        designation: 'revenue_inspector',
        department: 'Revenue',
        officeId: 'REV-OFF-004',
        firstName: 'Revenue',
        lastName: 'Inspector',
        phone: '9000000006'
      },
      {
        username: 'vro1',
        email: 'vro1@test.com',
        designation: 'vro',
        department: 'Revenue',
        officeId: 'REV-OFF-005',
        firstName: 'Village',
        lastName: 'Officer',
        phone: '9000000007'
      },
      {
        username: 'rdo1',
        email: 'rdo1@test.com',
        designation: 'revenue_dept_officer',
        department: 'Revenue',
        officeId: 'REV-OFF-006',
        firstName: 'Dept',
        lastName: 'Officer',
        phone: '9000000008'
      },
      {
        username: 'jc1',
        email: 'jc1@test.com',
        designation: 'joint_collector',
        department: 'Collectorate',
        officeId: 'COL-OFF-001',
        firstName: 'Joint',
        lastName: 'Collector',
        phone: '9000000009'
      },
      {
        username: 'dc1',
        email: 'dc1@test.com',
        designation: 'district_collector',
        department: 'Collectorate',
        officeId: 'COL-OFF-002',
        firstName: 'District',
        lastName: 'Collector',
        phone: '9000000100'
      },
      {
        username: 'mw1',
        email: 'mw1@test.com',
        designation: 'ministry_welfare',
        department: 'Ministry',
        officeId: 'MIN-OFF-001',
        firstName: 'Welfare',
        lastName: 'Minister',
        phone: '9000000101'
      }
    ];

    const officialHashedPassword = await bcrypt.hash('portal123', 10); // Using portal123 as requested or keeping common

    for (const off of officials) {
      await db.collection('officials').updateOne(
        { username: off.username },
        { $set: {
          ...off,
          password: officialHashedPassword,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        } },
        { upsert: true }
      );
    }

    console.log('Test users and officials seeded successfully');
    console.log('All officials password: portal123');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await client.close();
  }
}

seed();
