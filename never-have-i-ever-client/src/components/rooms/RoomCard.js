import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '../common/Avatar';
import api from '../../services/api';
import { toast } from 'react-toastify';

const RoomCard = ({ room, currentUserId, isHost, canJoin }) => {
  const navigate = useNavigate();
  const isUserInRoom = room.players.some(player => player.user._id === currentUserId);
  const isRoomFull = room.players.length >= room.maxPlayers;

  const handleJoinRoom = async () => {
    if (!currentUserId) {
      toast.error('You must be logged in to join a room');
      navigate('/login');
      return;
    }

    try {
      if (room.type === 'private') {
        navigate(`/rooms/join`);
      } else {
        await api.post(`/rooms/${room._id}/join`, {
          userId: currentUserId
        });
        navigate(`/rooms/${room._id}`);
      }
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error(error.response?.data?.message || 'Failed to join room');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-indigo-600 truncate" title={room.name}>
            {room.name}
          </h3>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-0.5 text-xs rounded-full ${room.type === 'public' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
              {room.type}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${room.status === 'waiting' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {room.status === 'waiting' ? 'Waiting' : 'Playing'}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center mb-3">
          <div className="text-sm text-gray-700">
            <span className="mr-1 text-gray-500">Host:</span>
            {room.host?.name || room.name}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            {room.players.length}/{room.maxPlayers}
          </div>
        </div>

        <div className="flex -space-x-2 overflow-hidden mb-4" title="Players in room">
          {room.players.slice(0, 5).map(player => (
            <Avatar key={player.user._id} user={player.user} size="small" className="ring-2 ring-white" />
          ))}
          {room.players.length > 5 && (
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 ring-2 ring-white text-xs">
              +{room.players.length - 5}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
          <span><strong>{room.maxRounds}</strong> rounds</span>
          {room.createdAt && (
            <span>Created {new Date(room.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </div>

        <div className="flex space-x-2">
          {isHost ? (
            <Link
              to={`/rooms/${room._id}/edit`}
              className="flex-1 inline-flex justify-center items-center px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-md"
            >
              Manage
            </Link>
          ) : canJoin && room.status === 'waiting' && !isRoomFull ? (
            <button
              onClick={handleJoinRoom}
              className="flex-1 inline-flex justify-center items-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md"
            >
              {room.type === 'private' ? 'Enter Passcode' : 'Join Room'}
            </button>
          ) : isUserInRoom ? (
            <Link
              to={`/rooms/${room._id}`}
              className="flex-1 inline-flex justify-center items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md"
            >
              Rejoin Room
            </Link>
          ) : room.status !== 'waiting' ? (
            <Link
              to={`/rooms/${room._id}`}
              className="flex-1 inline-flex justify-center items-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md"
            >
              View Game
            </Link>
          ) : (
            <button
              disabled
              className="flex-1 inline-flex justify-center items-center px-3 py-2 bg-gray-300 text-gray-500 text-sm font-medium rounded-md cursor-not-allowed"
            >
              Room Full
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
