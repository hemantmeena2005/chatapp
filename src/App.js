import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import './App.css';

// Use environment variable for server URL with fallback
const SOCKET_SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:10000';

// Configure Socket.IO with proper options
const socket = io(SOCKET_SERVER_URL, {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

function App() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [isJoined, setIsJoined] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    socket.on('message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    socket.on('userJoined', (data) => {
      setMessages(prev => [...prev, { text: `${data.username} joined the chat`, system: true }]);
    });

    socket.on('userLeft', (data) => {
      setMessages(prev => [...prev, { text: `${data.username} left the chat`, system: true }]);
    });

    socket.on('usersList', (usersList) => {
      setUsers(usersList);
    });

    socket.on('typing', (data) => {
      setTypingUsers(prev => ({ ...prev, [data.userId]: data.username }));
      setTimeout(() => {
        setTypingUsers(prev => {
          const newTypingUsers = { ...prev };
          delete newTypingUsers[data.userId];
          return newTypingUsers;
        });
      }, 3000);
    });

    socket.on('messageHistory', (history) => {
      setMessages(history);
    });

    return () => {
      socket.off('message');
      socket.off('userJoined');
      socket.off('userLeft');
      socket.off('usersList');
      socket.off('typing');
      socket.off('messageHistory');
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      socket.emit('join', username);
      setIsJoined(true);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      const messageData = {
        text: message,
        private: selectedUser ? true : false,
        recipient: selectedUser
      };
      socket.emit('message', messageData);
      setMessage('');
      setSelectedUser(null);
    }
  };

  const handleTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit('typing');
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping');
    }, 3000);
  };

  const addEmoji = (emoji) => {
    setMessage(prev => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  const generateAvatar = (username) => {
    if (!username) return {};
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3'];
    const color = colors[username.length % colors.length];
    return {
      backgroundColor: color,
      color: '#fff',
      padding: '8px',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      fontWeight: 'bold'
    };
  };

  if (!isJoined) {
    return (
      <div className="join-container">
        <h1>Join Chat</h1>
        <form onSubmit={handleJoin}>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <button type="submit">Join</button>
        </form>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Chat Room</h2>
        <div className="users-list">
          <h3>Online Users: {users.length}</h3>
          <ul>
            {users.map((user, index) => (
              <li 
                key={index}
                className={selectedUser === user ? 'selected' : ''}
                onClick={() => setSelectedUser(user)}
              >
                <div style={generateAvatar(user)}>
                  {user?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span>{user}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.system ? 'system' : msg.username === username ? 'sent' : 'received'}`}
          >
            {!msg.system && (
              <div className="message-header">
                <div style={generateAvatar(msg.username)}>
                  {msg.username?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span className="username">{msg.username}</span>
              </div>
            )}
            <span className="text">{msg.text}</span>
            {!msg.system && <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>}
          </div>
        ))}
        {Object.keys(typingUsers).length > 0 && (
          <div className="typing-indicator">
            {Object.values(typingUsers).join(', ')} is typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form className="message-form" onSubmit={handleSendMessage}>
        <div className="emoji-picker-container">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="emoji-button"
          >
            😊
          </button>
          {showEmojiPicker && (
            <div className="emoji-picker">
              <Picker data={data} onEmojiSelect={addEmoji} />
            </div>
          )}
        </div>
        <input
          type="text"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          placeholder={selectedUser ? `Private message to ${selectedUser}` : "Type a message..."}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default App;
