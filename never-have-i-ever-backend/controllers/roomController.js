const asyncHandler = require('express-async-handler');
const Room = require('../models/Room');
const User = require('../models/User');
const Question = require('../models/Question');
const mongoose = require('mongoose');

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Public
const createRoom = asyncHandler(async (req, res) => {
  const { name, type, maxPlayers, maxRounds, passcode, userId } = req.body;

  // Validate required fields
  if (!name || !type || !maxPlayers || !maxRounds || !userId) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  // Check if private room has passcode
  if (type === 'private' && !passcode) {
    res.status(400);
    throw new Error('Private rooms require a passcode');
  }

  // Verify user exists
  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Create room
  const room = await Room.create({
    name,
    type,
    passcode: type === 'private' ? passcode : undefined,
    host: userId,
    maxPlayers: parseInt(maxPlayers),
    maxRounds: parseInt(maxRounds),
    players: [{ user: userId, points: 0, isReady: true }]
  });

  // Get random questions for the room
  const questions = await Question.aggregate([
    { $sample: { size: parseInt(maxRounds) } }
  ]);

  room.questions = questions.map(q => q._id);
  await room.save();

  res.status(201).json({
    _id: room._id,
    name: room.name,
    type: room.type,
    maxPlayers: room.maxPlayers,
    maxRounds: room.maxRounds,
    status: room.status
  });
});

// // @desc    Get all public rooms in waiting state
// // @route   GET /api/rooms
// // @access  Public
// const getPublicRooms = asyncHandler(async (req, res) => {
//   const { status } = req.query;
  
//   const filter = { type: 'public' };
//   if (status) {
//     filter.status = status;
//   }

//   const rooms = await Room.find(filter)
//     .select('name maxPlayers players status')
//     .populate('players.user', 'name avatar');

//   res.json(rooms);
// });

// @desc    Get rooms (supports both public & private)
// @access  Public
// @route   GET /api/rooms
const getPublicRooms = asyncHandler(async (req, res) => {
  const { status, type } = req.query;
  const filter = {};
  // If they passed a type filter, use it; otherwise return all
  if (type) filter.type = type;
  if (status) filter.status = status;
  const rooms = await Room.find(filter)
    .select('name type maxPlayers players status')
    .populate('players.user', 'name avatar');
  res.json(rooms);
});

// @desc    Get room by ID
// @route   GET /api/rooms/:id
// @access  Public
const getRoomById = asyncHandler(async (req, res) => {

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid room ID');
  }
  const room = await Room.findById(req.params.id)
    .populate('players.user', 'name avatar')
    .populate('host', 'name avatar')
    .populate('currentQuestion', 'text category');

  if (room) {
    // Don't send passcode back
    const roomData = room.toObject();
    delete roomData.passcode;
    
    res.json(roomData);
  } else {
    res.status(404);
    throw new Error('Room not found');
  }
});

// @desc    Join a room
// @route   POST /api/rooms/:id/join
// @access  Public
const joinRoom = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid room ID');
  }
  
  const roomId = req.params.id;
  console.log(req.body)
  const { userId, passcode} = req.body || {};
  console.log('joinRoom userId:', userId, 'passcode:', passcode);

  // Validate required fields
  if (!userId) {
    res.status(400);
    throw new Error('Please provide userId');
  }

  // Verify user exists
  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Find and verify room
  const room = await Room.findById(roomId);
  if (!room) {
    res.status(404);
    throw new Error('Room not found');
  }

  // Check if room is full
  if (room.players.length >= room.maxPlayers) {
    res.status(400);
    throw new Error('Room is full');
  }

  // Check if room is in waiting state
  if (room.status !== 'waiting') {
    res.status(400);
    throw new Error('Cannot join a room that has already started');
  }

  // Verify passcode for private rooms
  if (room.type === 'private') {
    if (!passcode || passcode !== room.passcode) {
      res.status(401);
      throw new Error('Invalid passcode');
    }
  }

  // Check if user is already in the room
  const isPlayerInRoom = room.players.some(player => 
    player.user.toString() === userId
  );

  if (isPlayerInRoom) {
    res.status(400);
    throw new Error('You are already in this room');
  }

  // Add player to room
  room.players.push({ user: userId, points: 0, isReady: false });
  await room.save();

  res.status(200).json({ message: 'Joined room successfully' });
});

// @desc    Get a private room by its passcode
// @route   GET /api/rooms/passcode/:passcode
// @access  Public
const getRoomByPasscode = asyncHandler(async (req, res) => {
  const { passcode } = req.params;

  // Find the private room with that passcode
  const room = await Room.findOne({ type: 'private', passcode })
    .populate('players.user', 'name avatar')
    .populate('host', 'name avatar');

  if (!room) {
    res.status(404);
    throw new Error('Invalid passcode');
  }

  // Strip the passcode off the response
  const data = room.toObject();
  delete data.passcode;

  res.json(data);
});


// @desc    Leave a room
// @route   POST /api/rooms/:id/leave
// @access  Public
const leaveRoom = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid room ID');
  }
  
  const { userId } = req.body;
  const roomId = req.params.id;

  // Validate required fields
  if (!userId) {
    res.status(400);
    throw new Error('Please provide userId');
  }

  // Find room
  const room = await Room.findById(roomId);
  if (!room) {
    res.status(404);
    throw new Error('Room not found');
  }

  // Check if user is in the room
  const playerIndex = room.players.findIndex(
    player => player.user.toString() === userId
  );

  if (playerIndex === -1) {
    res.status(400);
    throw new Error('You are not in this room');
  }

  // Remove player from room
  room.players.splice(playerIndex, 1);

  // If the host leaves, assign a new host or close the room
  if (room.host.toString() === userId) {
    if (room.players.length > 0) {
      room.host = room.players[0].user;
    } else {
      // If no players left, delete the room
      await Room.deleteOne({ _id: roomId });
      return res.json({ message: 'Room closed as there are no players left' });
    }
  }

  await room.save();

  res.json({ message: 'Left room successfully' });
});

// @desc    Start a game
// @route   POST /api/rooms/:id/start
// @access  Public
const startGame = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid room ID');
  }
  
  const { userId } = req.body;
  const roomId = req.params.id;

  // Validate required fields
  if (!userId) {
    res.status(400);
    throw new Error('Please provide userId');
  }

  // Find room
  const room = await Room.findById(roomId);
  if (!room) {
    res.status(404);
    throw new Error('Room not found');
  }

  // Only host can start the game
  if (room.host.toString() !== userId) {
    res.status(403);
    throw new Error('Only the host can start the game');
  }

  // Check if the room has at least 2 players
  if (room.players.length < 2) {
    res.status(400);
    throw new Error('Need at least 2 players to start');
  }

  // Start the game
  room.status = 'playing';
  room.currentRound = 1;
  
  // Set the first question
  if (room.questions.length > 0) {
    room.currentQuestion = room.questions[0];
  }

  await room.save();

  res.json({ message: 'Game started successfully' });
});

module.exports = {
  createRoom,
  getPublicRooms,
  getRoomById,
  joinRoom,
  leaveRoom,
  startGame,
  getRoomByPasscode
};