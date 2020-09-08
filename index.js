'use strict';

// TODO: deploy

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
// 
// ------------------------------------------------------------
// Connections
const monitorForToxic = (evt, socket) => {
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
}

const signInHandler = (user, socket) => {
    socket.username = user.username
    console.log('we are in signinhandler')
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
    console.log(room);
    if(rooms.includes(socket.room)){
        socket.leave(socket.room);
        socket.room = room;
        socket.join(socket.room);
        socket.emit('joined', socket.room);
        socket.to(socket.room).broadcast.emit('message',{cmd:` joined ${room}`, username: socket.username});
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
        // TODO: add exception if someone tries to sign-in with a username that is already logged in
        if(await Users.authenticateBasic(user.username, user.password)){
            console.log('User connected.');
            if(users[user.username]){
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
    
    // Filter for Inappropriate Language
    // TODO: Monitor Whispers as well 
    
    socket.on('message', evt => {
        monitorForToxic(evt, socket);
    })
    
    socket.on('whisper', (data) => {
        const  { user, message } = data;
        console.log(data)
        const target = users[user]
        
        // TODO: add exception if user is not currently online
        if(!Object.keys(users).includes(target)){
            socket.emit('unavailable')
        } else {
            socket.to(target.id).emit('whisper',{ message, user: socket.username })
        }
        
    })
    
    socket.on('join', (room) => {
        joinHandler(room, socket);
    })
    socket.on('getrooms', () => {
        socket.emit('sendrooms', rooms)
    })

    
    //TODO: write code to send all connected users to front end
    socket.on('getusers', () => {
        let userArray = Object.keys(users);
        socket.emit('sendusers', userArray)
    })

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