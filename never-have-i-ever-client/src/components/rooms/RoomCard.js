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
    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 border border-gray-100 flex flex-col h-full">
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-gray-800 truncate flex-1" title={room.name}>
            {room.name}
          </h3>
          <div className="flex flex-col gap-1">
            <span className={`px-2 py-1 text-xs rounded-full font-medium ${room.type === 'public'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}>
              {room.type}
            </span>
            <span className={`px-2 py-1 text-xs rounded-full font-medium ${room.status === 'waiting'
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-amber-100 text-amber-700 border border-amber-200'
              }`}>
              {room.status === 'waiting' ? 'Waiting' : 'Playing'}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-gray-700 flex items-center">
            <svg className="w-4 h-4 mr-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {room.host?.name || 'Anonymous'}
          </div>
          <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
            <svg className="w-4 h-4 mr-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="font-medium">{room.players.length}/{room.maxPlayers}</span>
          </div>
        </div>

        <div className="flex -space-x-2 overflow-hidden mb-4" title="Players in room">
          {room.players.slice(0, 5).map(player => (
            <Avatar key={player.user._id} user={player.user} size="small" className="ring-2 ring-white" />
          ))}
          {room.players.length > 5 && (
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 ring-2 ring-white text-xs font-medium text-indigo-700">
              +{room.players.length - 5}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <strong>{room.maxRounds}</strong> rounds
          </span>
          {room.createdAt && (
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {new Date(room.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      <div className="px-5 pb-5 mt-auto">
        {isHost ? (
          <Link
            to={`/rooms/${room._id}/edit`}
            className="w-full inline-flex justify-center items-center px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-medium rounded-lg shadow-sm transition-all duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Manage Room
          </Link>
        ) : canJoin && room.status === 'waiting' && !isRoomFull ? (
          <button
            onClick={handleJoinRoom}
            className="w-full inline-flex justify-center items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            {room.type === 'private' ? 'Enter Passcode' : 'Join Room'}
          </button>
        ) : isUserInRoom ? (
          <Link
            to={`/rooms/${room._id}`}
            className="w-full inline-flex justify-center items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-sm font-medium rounded-lg shadow-sm transition-all duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            Rejoin Room
          </Link>
        ) : room.status !== 'waiting' ? (
          <Link
            to={`/rooms/${room._id}`}
            className="w-full inline-flex justify-center items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm transition-all duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Game
          </Link>
        ) : (
          <button
            disabled
            className="w-full inline-flex justify-center items-center px-4 py-2 bg-gray-200 text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Room Full
          </button>
        )}
      </div>
    </div>
  );
};

export default RoomCard;
