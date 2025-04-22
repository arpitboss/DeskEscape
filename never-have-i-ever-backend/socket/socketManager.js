const { 
  handleJoinRoom, 
  handleLeaveRoom, 
  handleStartGame, 
  handleSubmitAnswer,
  handleNextRound
} = require('./gameHandlers');

// Socket.io manager
const socketManager = (io) => {
  // Store active user connections
  const connections = new Map();

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // When a user identifies themselves
    socket.on('identify', (userId) => {
      if (userId) {
        connections.set(socket.id, { userId });
        console.log(`User ${userId} identified as ${socket.id}`);
      }
    });

    // When a user joins a room
    socket.on('join-room', async (data) => {
      await handleJoinRoom(io, socket, data);
    });

    // When a user leaves a room
    socket.on('leave-room', async (data) => {
      await handleLeaveRoom(io, socket, data);
    });

    // When host starts the game
    socket.on('start-game', async (data) => {
      await handleStartGame(io, socket, data);
    });

    // When a user submits an answer
    socket.on('submit-answer', async (data) => {
      await handleSubmitAnswer(io, socket, data);
    });

    // When host advances to next round
    socket.on('next-round', async (data) => {
      await handleNextRound(io, socket, data);
    });

    // When a user disconnects
    socket.on('disconnect', async () => {
      const userData = connections.get(socket.id);
      if (userData && userData.userId) {
        // Handle any cleanup needed when a user disconnects
        console.log(`User disconnected: ${userData.userId}`);
      }
      connections.delete(socket.id);
    });
  });
};

module.exports = socketManager;