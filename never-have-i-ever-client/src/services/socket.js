// src/services/socket.js
import { useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext';

export const useSocket = () => {
  const { socket } = useContext(SocketContext);
  
  const joinRoom = (roomId, userId) => {
    if (socket) {
      socket.emit('join-room', { roomId, userId });
    }
  };
  
  const leaveRoom = (roomId, userId) => {
    if (socket) {
      socket.emit('leave-room', { roomId, userId });
    }
  };
  
  const startGame = (roomId) => {
    if (socket) {
      socket.emit('start-game', { roomId });
    }
  };
  
  const submitAnswer = (roomId, userId, answer) => {
    if (socket) {
      socket.emit('submit-answer', { roomId, userId, answer });
    }
  };
  
  const nextRound = (roomId) => {
    if (socket) {
      socket.emit('next-round', { roomId });
    }
  };
  
  return {
    socket,
    joinRoom,
    leaveRoom,
    startGame,
    submitAnswer,
    nextRound
  };
};