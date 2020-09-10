require('@tensorflow/tfjs')
require('@tensorflow/tfjs-node')
const mongoose = require('mongoose');
const toxicity = require('@tensorflow-models/toxicity');

const Users = require('../model/user-model')

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

class eventHandlers {
    
    disconnectHandler = (socket) => {
        delete users[socket.username]
        console.log(users)
        socket.leave(socket.room)
        console.log('disconnected')
    }
    
    getUsersHandler = (socket) => {
        let userArray = Object.keys(users)
        socket.emit('whispermenu', userArray)
    }

    monitorForToxic = async (evt) => {
        let mod = false;
        const threshold = .9;
        const model = await toxicity.load(threshold, ['toxicity'])
        const predictions = await model.classify([evt.message])
        predictions.forEach(obj => {
            if(obj.results[0].match){
                mod = true;
            }
        })
        return mod
    }

    whisperHandler = async (socket, whisper) => {
        const  { username, message } = whisper;
        console.log('whisper', whisper)
        const target = users[username]
        if(!Object.keys(users).includes(username)){
            socket.emit('unavailable', {error: `User ${username} is not online`})
        } else {
            if(await this.monitorForToxic(whisper)){
                whisper.message = 'you said something bad';
                socket.emit('toxic', whisper)
            } else {
                socket.to(target.id).emit('whisper',{ message, username })
            }
        }
    }
    
    messageHandler = async (socket, message) => {
        console.log('message', message)
        if(await this.monitorForToxic(message)){
            message.message = 'you said something bad';
            socket.emit('toxic', message);
        } else {
            socket.to(socket.room).emit('message', message);
        }
    }

    joinHandler = (socket, room) => {
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
    
    validateUser = async (socket, user) => {
        if(await Users.authenticateBasic(user.username, user.password)){
            console.log('User connected.',users);
            if(users[user.username]){
                console.log(users)
                socket.emit('invalid-login', {error: 'that user is already connected'})
            } else {               
                this.signInHandler(user, socket);
            }
        } else {
            socket.emit('invalid-login', {error: 'Invalid username/password'});
        }
    }
    
    signInHandler = (user, socket) => {
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
    
    signUpHandler = (socket, user) => {
        Users.create(user).then(user => {
            console.log(`User created: ${user.username}`);
            this.signInHandler(user, socket);
        }).catch((err) => {
            console.error(err);
            socket.emit('invalid-login', {error: 'Username Unavailable'});
        })
    }
    
    helpHandler = (socket) => {
        let userCount = Object.keys(users).length
        socket.emit('printhelp', userCount)
    }

    getRoomsHandler = socket => {
        socket.emit('joinmenu', rooms)
    }
}
    
module.exports = {
    eventHandlers : new eventHandlers(),
}