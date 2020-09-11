const { registerCallbackConstructor } = require('@tensorflow/tfjs');
const { disconnect } = require('mongoose');
const {eventHandlers, users, rooms} = require('../lib/handler.js');
const { emit } = require('../model/user-model.js');
const {
    disconnectHandler,
    getUsersHandler,
    whisperHandler,
    joinHandler,
    messageHandler,
    validateUser,
    signInHandler,
    signUpHandler,
    getRoomsHandler,
    helpHandler
} = eventHandlers


class Socket {
    
    constructor(){
        this.room = 'general'
        this.username = 'mockUser'
        this.id = 'testId'
    }
    to = (target) => {
        return this       
    }
    emit = (...args) => jest.fn(...args)

    leave = jest.fn()
    join = jest.fn()

}
// let socket = {
//             username: 'mockUser',
//             leave: spy,
//             room: 'testRoom'
//         }

describe('Test receiving data and parsing and sending data', () => {
    it('should handle disconnect properly', () => {
        users.mockUser = 'test'
        let socket = new Socket()
        disconnectHandler(socket)
        expect(socket.leave).toHaveBeenCalledWith('general')
        expect(users.mockUser).toBeUndefined()
    })
    it('should handle getUsers appropriately', () => {
        users.mockUser = 'test'
        let socket = new Socket()
        const spy = jest.spyOn(socket, 'emit')
        // let socket = {
            //     emit: spy,
        // }
        getUsersHandler(socket)
        expect(spy).toHaveBeenCalledWith('whispermenu', Object.keys(users))
        delete users.mockUser
    })
    it('should properly monitor users inputs for toxicity', async () => {
        let message = {
            message: 'bitch',
            username: 'test'
        }
        let socket = new Socket()
        const spy = jest.spyOn(socket, 'emit')
        // let socket = {
        //     emit : spy,
        // }
        let result = await messageHandler(socket, message)
        expect(spy).toHaveBeenCalled()
        expect(spy).toHaveBeenCalledWith('toxic', {message: 'you said something bad', username: 'test'})
    })
    it('should properly let through non-toxic user inputs', async () => {
        
        let message = {
            message: 'hello!',
            username: 'test'
        }
        let socket = new Socket()
        // let socket = {
        //     to : emit(),
        //     emit: spy,
            
        // }
        const spy = jest.spyOn(socket, 'emit')
        let result = await messageHandler(socket, message)
        expect(spy).toHaveBeenCalledWith('message', message)
    })
    it('should handle whispers', async () => {
        const message = {
            message: 'hello!',
            username: 'mockUser'
        }
        let socket = new Socket()
        users.mockUser = 'testID'
        const spy = jest.spyOn(socket, 'emit')        
        let result = await whisperHandler(socket, message)
        expect(spy).toHaveBeenCalledWith('whisper', {message: message.message, username: 'mockUser'})
        delete users.mockUser
    })
    it('should join a room', () => {
        const socket = new Socket()
        const spy = jest.spyOn(socket, 'leave')
        joinHandler(socket, 'dev-talk')
        expect(spy).toHaveBeenCalled()
        expect(socket.room = 'dev-talk')
    })
    it('should sign in a user', () => {
        let user = {
            username : 'test',
        }
        const socket = new Socket()
        const spyOnEmit = jest.spyOn(socket, 'emit')
        const spyOnJoin = jest.spyOn(socket, 'join')
        signInHandler(user, socket)
        expect(spyOnEmit).toHaveBeenCalledWith('connected', user.username)
        expect(spyOnJoin).toHaveBeenCalledWith('lobby')
        delete users['test']
    })
    it('should handle printing help', () => {
        const socket = new Socket()
        const spy = jest.spyOn(socket, 'emit')
        users.mockUser = 'testID'
        helpHandler(socket)
        console.log(users)
        expect(spy).toHaveBeenCalledWith('printhelp', 1)
        delete users.mockUser

    })
    it('should handle printing rooms', () => {
        const socket = new Socket()
        const spy = jest.spyOn(socket, 'emit')
        getRoomsHandler(socket)
        expect(spy).toHaveBeenCalledWith('joinmenu', rooms)
    })
})


