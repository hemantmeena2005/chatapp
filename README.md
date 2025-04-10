# Real-time Chat Application

A full-stack real-time chat application built with Node.js, React, Socket.IO, and MongoDB.

## Features

- Real-time messaging
- Private messaging
- User avatars
- Emoji support
- Typing indicators
- Message persistence
- Online user list

## Tech Stack

- **Frontend:** React, Socket.IO-client
- **Backend:** Node.js, Express, Socket.IO
- **Database:** MongoDB

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd client
   npm install
   ```

3. Create a `.env` file in the root directory with:
   ```
   MONGODB_URI=your_mongodb_uri
   PORT=5001
   JWT_SECRET=your_jwt_secret
   ```

4. Start the backend:
   ```bash
   npm run dev
   ```

5. Start the frontend:
   ```bash
   cd client
   npm start
   ```

## Environment Variables

- `MONGODB_URI`: MongoDB connection string
- `PORT`: Server port (default: 5001)
- `JWT_SECRET`: Secret key for JWT
- `NODE_ENV`: Production/Development environment

## Deployment

- Backend: Render.com
- Frontend: Vercel
- Database: MongoDB Atlas 