'use strict';

const http = require('http').createServer();
const io = require('socket.io')(http);
const port = 3002;
require('@tensorflow/tfjs')
require('@tensorflow/tfjs-node')
const toxicity = require('@tensorflow-models/toxicity');
const threshold = 0.9;
// const encrypt = require('socket.io-encrypt')

// io.use(encrypt('test'));

io.on('connection', socket => {
    console.log('connected');
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

http.listen(port, () => {
    console.log(`listening on port: ${port}`)
})