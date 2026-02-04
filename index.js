const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');


const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite default port
    methods: ["GET", "POST"]
  }
})

const rooms = {}

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id)

  socket.on('create-room', (roomId) => {
    rooms[roomId] = { users: [socket.id] }
    socket.join(roomId)
    console.log(`Room ${roomId} created by ${socket.id}`)
  })

  socket.on('join-room', (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId].users.push(socket.id)
      socket.join(roomId)
      
      // Notify existing users
      socket.to(roomId).emit('user-joined', socket.id)
      
      // Send existing users to the new user
      const otherUsers = rooms[roomId].users.filter(id => id !== socket.id)
      socket.emit('existing-users', otherUsers)
      
      console.log(`User ${socket.id} joined room ${roomId}`)
    } else {
      socket.emit('room-error', 'Room does not exist')
    }
  })

  socket.on('signal', ({ to, signal }) => {
    io.to(to).emit('signal', { from: socket.id, signal })
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
    
    // Remove user from all rooms
    for (const roomId in rooms) {
      const index = rooms[roomId].users.indexOf(socket.id)
      if (index !== -1) {
        rooms[roomId].users.splice(index, 1)
        io.to(roomId).emit('user-left', socket.id)
        
        // Clean up empty rooms
        if (rooms[roomId].users.length === 0) {
          delete rooms[roomId]
        }
      }
    }
  })
})

const PORT =  process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`)
})