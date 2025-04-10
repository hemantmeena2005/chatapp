const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Message Schema
const messageSchema = new mongoose.Schema({
  content: String,
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Middleware
app.use(cors());
app.use(express.json());

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Load previous messages
  Message.find().sort({ timestamp: -1 }).limit(50)
    .then(messages => {
      socket.emit('previous-messages', messages.reverse());
    })
    .catch(err => console.error('Error loading messages:', err));

  // Handle new messages
  socket.on('send-message', async (message) => {
    try {
      const newMessage = new Message({ content: message });
      await newMessage.save();
      io.emit('receive-message', newMessage);
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// API Routes
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: -1 }).limit(50);
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const newMessage = new Message({ content: req.body.content });
    await newMessage.save();
    io.emit('receive-message', newMessage);
    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: 'Error saving message' });
  }
});

// For Vercel, we need to export the app
module.exports = app;

// Only start the server if we're running directly (not on Vercel)
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} 