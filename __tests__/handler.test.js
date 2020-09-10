const { disconnect } = require('mongoose');
const {eventHandlers, users} = require('../lib/handler.js')
const {
    disconnectHandler,
    getUsersHandler,
    whisperHandler,
    joinHandler,
    messageHandler,
    validateUser,
    signInHandler,
    signUpHandler,
    getRoomsHandler
} = eventHandlers

let EVENTS = {};

function emit(event, args) {
    EVENTS[event] && EVENTS[event].forEach(func => func(args))
}

function on(event, func) {
    if(EVENTS[event]){
        return EVENTS[event].push(func)
    }
    EVENTS[event] = [func]
}


describe('Test receiving data and parsing and sending data', () => {
    it('should handle disconnect properly', () => {
        const spy = jest.fn()
        users.mockUser = 'test'
        let socket = {
            username: 'mockUser',
            leave: spy,
            room: 'testRoom'
        }
        disconnectHandler(socket)
        expect(spy).toHaveBeenCalledWith('testRoom')
        expect(users.mockUser).toBeUndefined()
    })
    it('should handle getUsers appropriately', () => {
        const spy = jest.fn()
        users.mockUser = 'test'
        let socket = {
            emit: spy,
        }
        getUsersHandler(socket)
        expect(spy).toHaveBeenCalledWith('whispermenu', Object.keys(users))
    })
    it('should properly monitor users inputs for toxicity', async () => {
        const spy = jest.fn()
        let message = {
            message: 'bitch',
            username: 'test'
        }
        let socket = {
            emit : spy,
        }
        await messageHandler(socket, message)
        expect(spy).toBeDefined()
        expect(spy).toHaveBeenCalled()
        expect(spy).toHaveBeenCalledWith('toxic', {message: 'you said something bad', username: 'test'})
    })
    it.skip('should properly let through non-toxic user inputs', () => {
        let message = {
            message: 'hello!',
            username: 'test'
        }
        let socket = {
            to : {

            }
        }
    })
    it.skip('should handle whispers', () => {
        const spy = jest.spyOn(socket, 'to')
        console.log(spy)
        let message = {

        }
    })
})


