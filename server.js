const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const Message = require('./models/Message');
require('dotenv').config();

const app = express();

// Configure CORS - accept all origins in development
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

// Connect to MongoDB
connectDB();

// API Routes
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: -1 }).limit(50);
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files only in production and if they exist
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, 'client/build');
  if (require('fs').existsSync(buildPath)) {
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  }
}

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
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

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 