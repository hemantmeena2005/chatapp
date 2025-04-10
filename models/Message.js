const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  private: {
    type: Boolean,
    default: false
  },
  recipient: {
    type: String,
    default: null
  },
  system: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Message', messageSchema); 