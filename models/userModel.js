const mongoose = require('mongoose');
const { default: validator } = require("validator");
const bcrypt = require('bcryptjs');
const crypto = require('crypto');


// Define the schema for the User model
const userSchema = new mongoose.Schema({
  // User's name
  name: {
    type: String,
    required: [true, 'Please tell us your name!'],
  },
  // User's email
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email"],
    unique: true,
  },
  // User's password
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false, // Password won't be included in query results
  },
  // Confirm password
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      // Custom validation to check if password and passwordConfirm match
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords are not the same!",
    },
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  // Timestamp of password change
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,

});

// COMPARING PASSWORDS
userSchema.methods.passwordMatching = async function (enteredPassword, userPassword) {
  return await bcrypt.compare(enteredPassword, userPassword);
};

// PASSWORD CHANGE CHECK
userSchema.methods.changedPasswordAfter = function (tokenIssuedAt) {
  if (this.passwordChangedAt) {
    // Convert passwordChangedAt timestamp to seconds
    const changedTimestamp = this.passwordChangedAt.getTime() / 1000;
    return tokenIssuedAt < changedTimestamp;
  }
  return false;
};

//PASSWORD CHANGE CHECKER
userSchema.methods.changedPasswordAfter = function (tokenIssuedAt) {
  if (this.passwordChangedAt) {
    // Convert passwordChangedAt timestamp to seconds
    const changedTimestamp = this.passwordChangedAt.getTime() / 1000;
    return tokenIssuedAt < changedTimestamp;
  }
  return false;
};

// HASH PASSWORD before saving the user
userSchema.pre('save', async function (next) {
  // Check if the password field has been modified
  if (!this.isModified('password')) return next();

  try {
    // Generate a salt with a cost factor of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);

    // Set passwordConfirm to undefined as it's no longer needed
    this.passwordConfirm = undefined;

    // Update passwordChangedAt if it's not a new user
    if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;

    next();
  } catch (error) {
    return next(error);
  }
});

//PASSWORD RESET TOKEN GENERATOR
userSchema.methods.createPasswordResetToken = function () {
  // Generate a random reset token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash the token and set it on the user
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set an expiration time for the token (10 minutes)
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // Return the unhashed token for use in the email
  return resetToken;
};

// Create the User model
const User = mongoose.model('User', userSchema);

// Export the User model
module.exports = User;
