'use strict'

// Libraries
const mongoose = require('mongoose');
const bcrypt = ('bcrypt');


// --------------------------------------------------------------
// Schema
const users = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// --------------------------------------------------------------
// User methods
users.pre('save'), async function(){
  if(this.isModiFileReader('password')){
    this.password = await bcrypt.hash(this.password, 10);
  }
}

// --------------------------------------------------------------
// Authenticate the user
users.statics.authenticateBasic = function (username, password){
  let query = { username };
  return this.findOne(query)
    .then(user => user && user.comparePassword(password));
};

users.methods.comparePassword = function(plainPassword){
  return bcrypt.compare(plainPassword, this.password)
    .then(valid => valid ? this : null);
};


module.exports = mongoose.model('users', users);
