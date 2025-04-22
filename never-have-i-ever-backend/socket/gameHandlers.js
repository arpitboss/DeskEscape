const Room = require('../models/Room');
const User = require('../models/User');
const Question = require('../models/Question');

// Handle a user joining a room
const handleJoinRoom = async (io, socket, data) => {
  try {
    const { roomId, userId } = data;
    
    // Join the socket room
    socket.join(roomId);
    
    // Get room data
    const room = await Room.findById(roomId)
      .populate('players.user', 'name avatar')
      .populate('host', 'name avatar');
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    // Get user data
    const user = await User.findById(userId).select('name avatar');
    
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }
    
    // Emit event to all users in the room
    io.to(roomId).emit('player-joined', { user, roomId });
    
    // Send room data to the newly joined user
    socket.emit('room-data', room);
    
  } catch (error) {
    console.error('Error in handleJoinRoom:', error);
    socket.emit('error', { message: error.message });
  }
};

// Handle a user leaving a room
const handleLeaveRoom = async (io, socket, data) => {
  try {
    const { roomId, userId } = data;
    
    // Leave the socket room
    socket.leave(roomId);
    
    // Get room and check if it still exists
    const room = await Room.findById(roomId);
    
    if (room) {
      // Emit event to all users in the room
      io.to(roomId).emit('player-left', { userId, roomId });
      
      // If the room was deleted (no players left), notify others
      const playerCount = room.players.filter(p => p.user.toString() !== userId).length;
      if (playerCount === 0) {
        io.to(roomId).emit('room-closed');
      }
    }
    
  } catch (error) {
    console.error('Error in handleLeaveRoom:', error);
    socket.emit('error', { message: error.message });
  }
};

// Handle host starting the game
const handleStartGame = async (io, socket, data) => {
  try {
    const { roomId } = data;
    
    // Get room data
    const room = await Room.findById(roomId)
      .populate('currentQuestion')
      .populate('players.user', 'name avatar');
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Set the question start time when game is starting
    room.questionStartTime = Date.now();
     
    // Initialize player streaks to 0
    for (let i = 0; i < room.players.length; i++) {
      room.players[i].answerStreak = 0;
    }
    
    await room.save();
    
    // Get updated room after save
    const updatedRoom = await Room.findById(roomId)
      .populate('currentQuestion')
      .populate('players.user', 'name avatar');
    
    // Emit game started event to all players
    io.to(roomId).emit('game-started', {
      roomId,
      currentRound: updatedRoom.currentRound,
       currentQuestion: updatedRoom.currentQuestion,
       players: updatedRoom.players,
       questionStartTime: updatedRoom.questionStartTime
    });
    io.to(roomId).emit('question-timer-started', {
      questionStartTime: updatedRoom.questionStartTime
    });
  } catch (error) {
    console.error('Error in handleStartGame:', error);
    socket.emit('error', { message: error.message });
  }
};

// Handle a user submitting an answer
const handleSubmitAnswer = async (io, socket, data) => {
  try {
    const { roomId, userId, answer } = data;

    const timestamp = Date.now();
    
    // Get room data
    const room = await Room.findById(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    // Get user data
    const user = await User.findById(userId);
    
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }
    
    // Emit event to all users that a player has answered
    // Calculate response time in seconds
    const questionStartTime = room.questionStartTime || timestamp;
    const responseTimeSeconds = (timestamp - questionStartTime) / 1000;
    
    // Calculate speed bonus based on response time
    let speedBonus = 0;
    if (responseTimeSeconds < 5) {
      speedBonus = 3;  // Fast response bonus
    } else if (responseTimeSeconds <= 15) {
      speedBonus = 1;  // Medium speed bonus
    }
    
    // Find the player in the room
    const playerIndex = room.players.findIndex(
      player => player.user.toString() === userId
    );
    
    // Check if player is in the room
    if (playerIndex === -1) {
      socket.emit('error', { message: 'Player not found in this room' });
      return;
    }
    
    // Check if this player already answered this question in this round
    const existingAnswer = room.answers.find(
      a => a.user.toString() === userId && 
           a.question.toString() === room.currentQuestion.toString() &&
           a.round === room.currentRound
    );
    
    if (existingAnswer) {
      socket.emit('error', { message: 'You have already answered this question' });
      return;
    }
    
    // Add the answer with timing information
    room.answers.push({
      user: userId,
      question: room.currentQuestion,
      answer: answer,
      round: room.currentRound,
      answeredAt: new Date(timestamp),
      responseTimeSeconds: responseTimeSeconds
    });
    
    // Update player's streak
    room.players[playerIndex].answerStreak = 
      (room.players[playerIndex].answerStreak || 0) + 1;
    
    // Save the updated room
    await room.save();
    
    // Emit event to all users that a player has answered with response time info
    io.to(roomId).emit('player-answered', { 
      userId, 
      roomId,
      responseTime: responseTimeSeconds,
      speedBonus: speedBonus
    });
    
    // Check if all players have answered
    const currentRoundAnswers = room.answers.filter(
      a => a.question.toString() === room.currentQuestion.toString() && 
           a.round === room.currentRound
    );
    
    if (currentRoundAnswers.length === room.players.length) {
      // Calculate results
      const yesAnswers = currentRoundAnswers.filter(a => a.answer === true);
      const noAnswers = currentRoundAnswers.filter(a => a.answer === false);
      
      // Get the updated room with player points
      const updatedRoom = await Room.findById(roomId)
        .populate('players.user', 'name avatar')
        .populate('currentQuestion');

        const answerDetails = currentRoundAnswers.map(a => ({
          userId: a.user,
          answer: a.answer,
          responseTime: a.responseTimeSeconds,
          speedBonus: a.responseTimeSeconds < 5 ? 3 : 
                     (a.responseTimeSeconds <= 15 ? 1 : 0),
          streak: updatedRoom.players.find(p => p.user.toString() === a.user.toString())?.answerStreak || 0
        }));
      
      // Emit event that all players have answered
      io.to(roomId).emit('all-players-answered', {
        yesCount: yesAnswers.length,
        noCount: noAnswers.length,
        players: updatedRoom.players,
        answers: answerDetails,
         // Add additional summary stats for the round
         roundStats: {
           fastestAnswer: Math.min(...currentRoundAnswers.map(a => a.responseTimeSeconds)),
           averageResponseTime: currentRoundAnswers.reduce((acc, a) => acc + a.responseTimeSeconds, 0) / 
                               currentRoundAnswers.length,
           totalSpeedBonuses: answerDetails.reduce((acc, a) => acc + a.speedBonus, 0)
         }
      });
    }
    
  } catch (error) {
    console.error('Error in handleSubmitAnswer:', error);
    socket.emit('error', { message: error.message });
  }
};

// Handle host advancing to the next round
const handleNextRound = async (io, socket, data) => {
  try {
    const { roomId } = data;
    
    // Get updated room data
    const room = await Room.findById(roomId)
      .populate('currentQuestion')
      .populate('players.user', 'name avatar');
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (room.status === 'completed') {
      // Game is over, emit game ended event
      io.to(roomId).emit('game-ended', {
        roomId,
        players: room.players,
        winner: room.players.reduce((prev, current) => 
          (prev.points > current.points) ? prev : current
        )
      });
      
      // Update leaderboard
      io.emit('leaderboard-updated');
      
    } else {
      // Game continues, emit new round started event
      io.to(roomId).emit('round-started', {
        roomId,
        currentRound: room.currentRound,
        currentQuestion: room.currentQuestion,
        players: room.players
      });
    }
    
  } catch (error) {
    console.error('Error in handleNextRound:', error);
    socket.emit('error', { message: error.message });
  }
};

module.exports = {
  handleJoinRoom,
  handleLeaveRoom,
  handleStartGame,
  handleSubmitAnswer,
  handleNextRound
};