'use strict';

// External Libraries
require('dotenv').config();
require('@tensorflow/tfjs')
require('@tensorflow/tfjs-node')
const mongoose = require('mongoose');
const toxicity = require('@tensorflow-models/toxicity');
const http = require('http').createServer();
const io = require('socket.io')(http);

// tensorflow toxicity threshold
// const threshold = 0.9; 

const Users = require('./model/user-model.js');
const port = process.env.PORT;
const rooms = [
    'general',
    'dev-talk', 
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
// TODO: modularize callbacks into a separate file
// TODO: maybe add ways to alter some things about the server through the server console (add rooms, ban people, etc.)
// ------------------------------------------------------------
// Connections
const monitorForToxic = (evt, socket) => { // TODO: make this more single-responsibility, ie. not handling the emit, just checking toxicity levels, so we can put it in whisper, also
    let mod;
    const threshold = .9;
    toxicity.load(threshold, ['toxicity']).then(model => {
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
                socket.to(socket.room).emit('message', evt);
            }
        })
    })
}

// TODO: Add note re: /help command for reference on first signing in
const signInHandler = (user, socket) => {
    socket.username = user.username
    socket.emit('connected', user.username);
    socket.room = 'lobby';
    socket.join(socket.room)
    users[socket.username] = {
        username: socket.username,
        id: socket.id,
    }
    console.log(users)
}

const joinHandler = (room, socket) => {
    if(rooms.includes(socket.room)){
        socket.leave(socket.room);
        socket.room = room;
        socket.join(socket.room);
        socket.emit('joined', socket.room);
        socket.to(socket.room).emit('message',{cmd:` joined ${room}`, username: socket.username});
    } else {
        socket.emit('invalid room', {error: 'there is no room by that name. Type /join with no arguments to get a list of rooms you can join.'})
    }
}

const signupHandler = (user, socket) => {
    Users.create(user).then(user => {
        console.log(`User created: ${user.username}`);
        signInHandler(user, socket);
    }).catch((err) => {
        console.error(err);
        socket.emit('invalid-login', {error: 'Username Unavailable'});
    })
}

io.on('connection', socket => {
    console.log('connected');
    
    // Basic Auth of Returning User
    socket.on('signin', async user => {
        if(await Users.authenticateBasic(user.username, user.password)){
            console.log('User connected.',users);
            if(users[user.username]){
                console.log(users)
                socket.emit('invalid-login', {error: 'that user is already connected'})
            } else {
                console.log('i am here')                
                signInHandler(user, socket);
            }
        } else {
            socket.emit('invalid-login', {error: 'Invalid username/password'});
        }
    })
    
    // Add New User to DB
    socket.on('signup', user => {
        signupHandler(user, socket)
    });
    
    
    socket.on('message', evt => {
        console.log('message', evt)
        monitorForToxic(evt, socket);
    })
    
    // TODO: Monitor Whispers for inappropriate language 
    socket.on('whisper', (data) => {
        const  { user, whisper } = data;
        console.log('data', data)
        const target = users[user]
        if(!Object.keys(users).includes(user)){
            socket.emit('unavailable', {error: `User ${user} is not online`});
        } else {
            socket.to(target.id).emit('whisper',{ message:whisper, user: socket.username })
        }        
    })
    
    socket.on('join', (room) => {
        joinHandler(room, socket);
    })
    socket.on('getrooms', () => {
        socket.emit('joinmenu', rooms)
    })

    
    socket.on('getusers', () => {
        let userArray = Object.keys(users);
        socket.emit('whispermenu', userArray)
    })

    socket.on('disconnect', () => {
        delete users[socket.username];
        console.log(users)
        socket.leave(socket.room)
        console.log('disconnected')
    })
})



mongoose.connect(process.env.MONGODB_URI, mongooseOptions).then( () => {
    http.listen(port, () => {
        console.log(`listening on port: ${port}`)
    })
}).catch(err => {
    console.log(err)
})
