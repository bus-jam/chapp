'use strict'

// Libraries
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

// --------------------------------------------------------------
// Schema
const users = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
})

// --------------------------------------------------------------
// User methods
users.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10)
  }
})

// --------------------------------------------------------------
// Authenticate the user
users.statics.authenticateBasic = async function (username, password) {
  const query = { username }
  const data = await this.findOne(query)
  if (data) {
    const valid = await data.comparePassword(password)
    return valid
  } else {
    return false
  }

  // .then(async user  => {
  //   console.log( user && await user.comparePassword(password)) ;
  //   const response = user && await user.comparePassword(password);
  //   return response;
  // });
}

users.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password)
  // .then(valid => {
  //   console.log(valid);
  //   return valid ? this : null
  // });
}

module.exports = mongoose.model('users', users)
