const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please add a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    // Incremented on logout or password reset to revoke all previously issued JWTs immediately
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

/**
 * Mongoose pre-save hook that hashes the user's password with bcrypt
 * whenever the password field has been created or modified.
 */
userSchema.pre('save', async function hashPasswordBeforeSave() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Compares a plaintext candidate password against the stored bcrypt hash.
 * @param {string} enteredPassword - Plaintext password supplied by the user.
 * @returns {Promise<boolean>} True if the passwords match.
 */
userSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
