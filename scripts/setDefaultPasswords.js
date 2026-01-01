console.log('Starting password update script...');

const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json'); // adjust path if needed

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// List of users with default passwords
const usersPasswords = [
    { email: 'lumad000@mysbisd.org', password: 'lumade' },
    { email: 'leaus000@mysbisd.org', password: 'leaust' },    
];

async function updatePasswords() {
  for (const user of usersPasswords) {
    try {
      const userRecord = await admin.auth().getUserByEmail(user.email);
      await admin.auth().updateUser(userRecord.uid, {
        password: user.password,
      });
      console.log(`✅ Updated password for: ${user.email}`);
    } catch (error) {
      console.error(`❌ Error updating ${user.email}:`, error.message);
    }
  }
  console.log('🎉 All passwords updated!');
}

updatePasswords();
