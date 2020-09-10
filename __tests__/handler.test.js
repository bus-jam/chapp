const eventHandlers = require('../lib/handler.js')
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
        let users = {
            mockUser : 'test',
        }
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
        let users = {
            mockUser : 'test',
        }
        let socket = {
            emit: spy,
        }
        getUsersHandler(socket)
        expect(spy).toHaveBeenCalledWith('whispermenu', Object.keys(users))
    })
    it('should properly monitor users inputs for toxicity',  () => {
        const spy = jest.fn()
        let message = {
            message: 'fuck',
            username: 'test'
        }
        let socket = {
            emit : spy,
        }
        messageHandler(socket, message)
        expect(jest.fn).toHaveBeenCalledWith('toxic', {message: 'you said something bad', username: 'test'})
    })
    it('should properly let through non-toxic user inputs', () => {
        let message = {
            message: 'hello!',
            username: 'test'
        }
        let socket = {
            to : {

            }
        }
    })
    it('should handle whispers', () => {
        const spy = jest.spyOn(socket, 'to')
        console.log(spy)
        let message = {

        }
    })
})


