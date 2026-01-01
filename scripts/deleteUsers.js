const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function deleteAllUsersFast() {
  try {
    let listUsersResult = await admin.auth().listUsers(1000);
    while (listUsersResult.users.length > 0) {
      const uids = listUsersResult.users.map(user => user.uid);
      const deleteResult = await admin.auth().deleteUsers(uids);
      console.log(`Deleted ${deleteResult.successCount} users.`);

      if (listUsersResult.pageToken) {
        listUsersResult = await admin.auth().listUsers(1000, listUsersResult.pageToken);
      } else {
        break;
      }
    }
    console.log('All users deleted!');
  } catch (error) {
    console.error('Error deleting users:', error);
  }
}

deleteAllUsersFast();
