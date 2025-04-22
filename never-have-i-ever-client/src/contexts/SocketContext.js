import React, { createContext, useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { currentUser } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

  useEffect(() => {
    if (currentUser && currentUser._id) {
      const newSocket = io(SOCKET_URL, { transports: ['websocket'] });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        newSocket.emit('identify', currentUser._id);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [currentUser, SOCKET_URL]);

  // Wrapper methods for socket actions
  const joinRoom = (roomId, userId) => {
    if (socket) socket.emit('joinRoom', { roomId, userId });
  };

  const leaveRoom = (roomId, userId) => {
    if (socket) socket.emit('leaveRoom', { roomId, userId });
  };

  const startGame = (roomId) => {
    if (socket) socket.emit('startGame', { roomId });
  };

  const submitAnswer = (roomId, userId, answer) => {
    if (socket) socket.emit('submitAnswer', { roomId, userId, answer });
  };

  const nextRound = (roomId) => {
    if (socket) socket.emit('nextRound', { roomId });
  };

  const value = {
    socket,
    joinRoom,
    leaveRoom,
    startGame,
    submitAnswer,
    nextRound,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};