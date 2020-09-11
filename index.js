'use strict';

// External Libraries
require('dotenv').config();
// require('@tensorflow/tfjs')
// require('@tensorflow/tfjs-node')
const mongoose = require('mongoose');
// const toxicity = require('@tensorflow-models/toxicity');
const http = require('http').createServer();
const io = require('socket.io')(http);
const { eventHandlers } = require('./lib/handler.js')
const {
    disconnectHandler,
    getUsersHandler,
    whisperHandler,
    joinHandler,
    messageHandler,
    validateUser,
    signUpHandler,
    getRoomsHandler,
    helpHandler
} = eventHandlers


const port = process.env.PORT;

const mongooseOptions = {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
};

// TODO: maybe add ways to alter some things about the server through the server console (add rooms, ban people, etc.)
// ------------------------------------------------------------
// Connections

// TODO: Add note re: /help command for reference on first signing in

io.on('connection', socket => {
    console.log('connected');
    
    // Basic Auth of Returning User
    socket.on('signin', async user => {
        validateUser(socket, user)
    })
    
    // Add New User to DB
    socket.on('signup', user => {
        signUpHandler(socket, user)
    });

    socket.on('help', () => {
        helpHandler(socket)
    })
        
    socket.on('message', async message => {
        messageHandler(socket, message)        
    })
    
    socket.on('whisper', async whisper => {
        whisperHandler(socket, whisper)     
    })
    
    socket.on('join', (room) => {
        joinHandler(socket, room);
    })

    socket.on('getrooms', () => {
        getRoomsHandler(socket)
    })

    socket.on('getusers', () => {
        getUsersHandler(socket)
    })

    socket.on('disconnect', () => {
        disconnectHandler(socket)
    })
})


mongoose.connect(process.env.MONGODB_URI, mongooseOptions).then( () => {
    http.listen(port, () => {
        console.log(`listening on port: ${port}`)
    })
}).catch(err => {
    console.log(err)
})
