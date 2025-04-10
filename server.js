const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const Message = require('./models/Message');
require('dotenv').config();

const app = express();

// Configure CORS
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-vercel-app-url.vercel.app'  // Replace with your Vercel app URL
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Connect to MongoDB
connectDB();

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));

// API Routes
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: -1 }).limit(50);
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store connected users
const users = {};

io.on('connection', async (socket) => {
  console.log('New client connected');

  // Handle user joining
  socket.on('join', async (username) => {
    users[socket.id] = username;
    io.emit('userJoined', { username, id: socket.id });
    io.emit('usersList', Object.values(users));

    // Send message history to the new user
    try {
      const messages = await Message.find().sort({ timestamp: -1 }).limit(50);
      socket.emit('messageHistory', messages.reverse());
    } catch (error) {
      console.error('Error fetching message history:', error);
    }
  });

  // Handle new messages
  socket.on('message', async (data) => {
    try {
      const messageData = {
        username: users[socket.id],
        text: data.text,
        timestamp: new Date(),
        private: data.private || false,
        recipient: data.recipient
      };

      // Save message to database
      const newMessage = new Message(messageData);
      await newMessage.save();

      if (data.private && data.recipient) {
        // Find the recipient's socket
        const recipientSocket = Object.entries(users).find(([id, name]) => name === data.recipient)?.[0];
        if (recipientSocket) {
          io.to(recipientSocket).emit('message', messageData);
          socket.emit('message', messageData);
        }
      } else {
        io.emit('message', messageData);
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  // Handle typing indicator
  socket.on('typing', () => {
    socket.broadcast.emit('typing', {
      userId: socket.id,
      username: users[socket.id]
    });
  });

  // Handle stop typing
  socket.on('stopTyping', () => {
    socket.broadcast.emit('stopTyping', {
      userId: socket.id
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const username = users[socket.id];
    delete users[socket.id];
    io.emit('userLeft', { username, id: socket.id });
    io.emit('usersList', Object.values(users));
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 