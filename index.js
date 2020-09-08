'use strict';

// TODO: deploy

// External Libraries
require('dotenv').config();
require('@tensorflow/tfjs')
require('@tensorflow/tfjs-node')
const mongoose = require('mongoose');
const toxicity = require('@tensorflow-models/toxicity');
const io = require('socket.io')(http);

// tensorflow toxicity threshold
// const threshold = 0.9; 

const http = require('http').createServer();
const Users = require('./user-model.js');
const port = process.env.PORT;
const rooms = [
    'general',
    'dev-talk',
    'other stuff',
    'join test',
    'lobby'
];

const mongooseOptions = {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
  };
const users = {};

// TODO: lots of refactoring to make things single-responsibility
// TODO: normalize objects being passed into listeners, normalize parameters
// ------------------------------------------------------------
// Connections
io.on('connection', socket => {
    console.log('connected');
    
    // Basic Auth of Returning User
    socket.on('signin', async user => {
        // TODO: add exception if someone tries to sign-in with a username that is already logged in
        if(await Users.authenticateBasic(user.username, user.password)){
            console.log('User connected.');
            socket.username = user.username;
            socket.emit('connected', user.username);
            users[socket.username] = {
                username: socket.username,
                id: socket.id,
            }
            socket.room = 'lobby';
            console.log(users)

        } else {
            socket.emit('invalid-login', {error: 'Invalid username/password'});
        }
    })
    
    // Add New User to DB
    socket.on('signup', user => {
        Users.create(user).then(user => {
            console.log(`User created: ${user.username}`);
            socket.emit('connected', user.username);
            socket.room = 'lobby';
            users[socket.username] = {
                username: socket.username,
                id: socket.id,
            }
            console.log(users)
        }).catch((err) => {
            console.error(err);
            socket.emit('invalid-login', {error: 'Username Unavailable'});
        })
    });

    // Filter for Inappropriate Language
    // TODO: Monitor Whispers as well => convert the content to a function we can call in several places
    socket.on('message', (evt) => {
        let mod;
        console.log(evt);
        const threshold = .9;
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
                    socket.to(socket.room).broadcast.emit('message', evt);
                }
            })
        })
    })
    
    socket.on('whisper', (data) => {
        // TODO: add exception if user is not currently online
        const  { user, message } = data;
        console.log(data)
        const target = users[user]
        socket.to(target.id).emit('whisper',{ message, user: socket.username })
    })
    
    socket.on('join', (room) => {
        console.log(room);
        socket.leave(socket.room);
        socket.room = room;
        if(rooms.includes(socket.room)){
            socket.join(socket.room);
            socket.emit('joined', socket.room);
            socket.to(socket.room).broadcast.emit('message',{cmd:` joined ${room}`, username: socket.username});
        } else {
            socket.emit('invalid room', {error: 'there is no room by that name'})
        }
    });
})
socket.on('getrooms', () =>{
    // TODO: write code to emit all rooms to client(s)
})

io.on('disconnect', evt => {
    delete users[evt];
    socket.leave(socket.room);
    console.log('disconnected');
})

mongoose.connect(process.env.MONGODB_URI, mongooseOptions);

http.listen(port, () => {
    console.log(`listening on port: ${port}`)
})