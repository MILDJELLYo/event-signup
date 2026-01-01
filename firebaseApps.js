const admin = require('firebase-admin');

// Default app (existing service account)
const defaultApp = admin.initializeApp({
  credential: admin.credential.cert(require('./service-account.json')),
});

// Second app (new service key for Firestore / API)
const secondApp = admin.initializeApp({
  credential: admin.credential.cert(require('./servicekey.json')),
}, 'secondApp'); // must have a unique name

module.exports = { defaultApp, secondApp };
