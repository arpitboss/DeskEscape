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
    <div className="text-center py-12 bg-white rounded-lg shadow">
      <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <p className="text-gray-500 mb-4">No rooms available at the moment</p>
      <Link
        to="/rooms/create"
        className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Create a Room
      </Link>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Available Rooms</h2>

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium border border-gray-200 rounded-l-lg ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('public')}
              className={`px-4 py-2 text-sm font-medium border border-gray-200 ${filter === 'public' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Public
            </button>
            <button
              onClick={() => setFilter('private')}
              className={`px-4 py-2 text-sm font-medium border border-gray-200 rounded-r-lg ${filter === 'private' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Private
            </button>
          </div>

          <Link
            to="/rooms/create"
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow transition-colors"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
