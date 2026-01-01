const admin = require("firebase-admin");
const fs = require("fs");
const csv = require("csv-parser");

admin.initializeApp({
  credential: admin.credential.cert(require("../service-account.json"))
});

const db = admin.firestore();

fs.createReadStream("users.csv")
  .pipe(csv())
  .on("data", async (row) => {
    try {
      const user = await admin.auth().createUser({
        email: row.email,
        password: "Password"
      });

      await db.collection("users").doc(user.uid).set({
        email: row.email,
        name: row.name,
        role: row.role,
        committee: row.committee
      });

      console.log("Created:", row.email);
    } catch (err) {
      console.error("Error:", row.email, err.message);
    }
  });
