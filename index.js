'use strict';

// Libraries
require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http').createServer();
const io = require('socket.io')(http);
const Users = require('./user-model.js');
const port = 3002;
require('@tensorflow/tfjs')
require('@tensorflow/tfjs-node')
const toxicity = require('@tensorflow-models/toxicity');
const threshold = 0.9;
// const encrypt = require('socket.io-encrypt')

const mongooseOptions = {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
  };

// io.use(encrypt('test'));
// ------------------------------------------------------------
// Connections
io.on('connection', socket => {
    console.log('connected');
    
    // Basic Auth of Returning User
    socket.on('signin', user => {
        if(Users.authenticateBasic(user.username, user.password)){
            console.log('User connected.');
            socket.emit('connected', user.username);
        } else {
            socket.emit('invalid-login');
        }
    })
    
    // Add New User to DB
    socket.on('signup', user => {
        Users.create(user);
        console.log(`User created: ${user.username}`);
        socket.emit('connected', user.username);
    });

    // Filter for Inappropriate Language
    socket.on('message', evt => {
        let mod;
        console.log(evt);
        toxicity.load(threshold).then(model => {
            model.classify([evt.cmd]).then(predictions => {
                predictions.forEach(obj => {
                    if(obj.results[0].match){
                        mod = true;
                    }
                })
                if(mod){
                    evt.cmd = 'you said something bad';
                    socket.emit('toxic', evt);
                } else {
                    socket.broadcast.emit('message', evt);
                }
            })
        })

    })
})

io.on('disconnect', evt => {
    console.log('disconnected');
})

mongoose.connect(process.env.MONGODB_URI, mongooseOptions);

http.listen(port, () => {
    console.log(`listening on port: ${port}`)
})