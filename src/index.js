const express = require('express')
const http = require('http') // core module
const path = require('path') // this is core node module, so no need to instal it
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app) // this code will be performed by express anyway behind  the scene, but we need it to refactore code
const io = socketio(server) // socket.io expecting to be call with raw http server. Even if express creates it behind the scene, we do not have acces to it, so thats why we have created the 'server 'variable

const port = process.env.PORT || 3000

const publicDirectoryPath = path.join(__dirname, '../public')
app.use(express.static(publicDirectoryPath))

// server (emit) -> client (receive) -- acknowledgement -- countUpdate
// client (emit) -> server (receive) --acknowledgement-- increment

// socket.emit, io.emit, socket.broadcast.emit
// io.to().emit, socket.broadcast.to().emit //only for certain room

io.on('connection', (socket) => { // this method runs some callback when new websocket conection to server is occuring
    console.log('new Websocket connection') // socket is an object, which contain information about connection. If we have 5 clients - func will run 5 times 

    socket.on('join', ({ username, room }, callback) => { // this mmethod could be only used on the server. Allowes to join the room
        const {error, user} = addUser({ id: socket.id, username, room })

        if(error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!')) // All arguments after event name will be available on client side socket.on() function (in this case it's an object)
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback) => { //we are listening an event from client
        const user = getUser(socket.id)
        
        let filter = new Filter({ regex: /\*|\.|$/gi })

        const newBadWords = ['хуй', 'пизда', 'пізда', 'сука', 'блять', 'їбати', 'гімно', 'підер', 'їбу']
        filter.addWords(...newBadWords)
        
        if(filter.isProfane(message)) {
            return callback('Your message contains profane words!')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message)) // this method in different from socket.emit and will emit the event to every currently available connection
        
        callback()
    })

    socket.on('disconnect', () => {
        const user =  removeUser(socket.id)

        if(user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)

        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })
})

server.listen(port, () => {
    console.log(`Server is up on port ${port}.`)
})
