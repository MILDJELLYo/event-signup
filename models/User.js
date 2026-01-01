const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  name: String,

  password: String,

  role: {
    type: String,
    enum: ["super_admin", "admin", "staff", "student", "viewer"],
    default: "student"
  },

  mustChangePassword: {
    type: Boolean,
    default: true
  },

  passwordResetToken: String,
  passwordResetExpires: Date
});

module.exports = mongoose.model("User", userSchema);
