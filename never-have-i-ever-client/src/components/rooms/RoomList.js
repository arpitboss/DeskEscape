import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import RoomCard from './RoomCard';
import { AuthContext } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const RoomList = () => {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'public', 'private'
  const { currentUser } = useContext(AuthContext);
  const currentUserId = currentUser?._id;

  // Fetch rooms from API with filters
  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/rooms', {
        params: {
          status: 'waiting',
          type: filter !== 'all' ? filter : undefined,
        },
      });
      setRooms(response.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Failed to load rooms');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  const renderEmptyState = () => (
    <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="bg-indigo-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6">
        <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">No rooms available</h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">Looks like there aren't any game rooms available right now. Why not create one?</p>
      <Link
        to="/rooms/create"
        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 text-white rounded-lg shadow-md transition-all duration-200"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Create a Room
      </Link>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0 bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">Available Rooms</h2>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium border rounded-l-lg ${filter === 'all'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('public')}
              className={`px-4 py-2 text-sm font-medium border-t border-b border-r ${filter === 'public'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              Public
            </button>
            <button
              onClick={() => setFilter('private')}
              className={`px-4 py-2 text-sm font-medium border-t border-b border-r rounded-r-lg ${filter === 'private'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              Private
            </button>
          </div>

          <Link
            to="/rooms/create"
            className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 text-white rounded-lg shadow transition-all duration-200 font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Room
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : rooms.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {rooms.map(room => {
            const isHost = room.host?._id === currentUserId;
            const isUserInRoom = room.players.some(p => p.user._id === currentUserId);
            const canJoin = room.status === 'waiting' && room.players.length < room.maxPlayers && !isUserInRoom;
            return (
              <RoomCard
                key={room._id}
                room={room}
                currentUserId={currentUserId}
                isHost={isHost}
                canJoin={canJoin}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RoomList;
