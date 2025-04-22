const express = require('express');
const router = express.Router();
const { 
  createRoom, 
  getPublicRooms, 
  getRoomById, 
  joinRoom, 
  leaveRoom, 
  startGame ,
  getRoomByPasscode
} = require('../controllers/roomController');

const { 
  submitAnswer, 
  nextRound
} = require('../controllers/gameController');

router.post('/', createRoom);
router.get('/', getPublicRooms);
router.get('/passcode/:passcode', getRoomByPasscode);
router.get('/:id', getRoomById);
router.post('/:id/join', joinRoom);
router.post('/:id/leave', leaveRoom);
router.post('/:id/start', startGame);

// Game play routes
router.post('/:id/answers', submitAnswer);
router.post('/:id/next-round', nextRound);

module.exports = router;