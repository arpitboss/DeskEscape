// src/components/rooms/CreateRoom.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'react-toastify';

const CreateRoom = () => {
  const { currentUser } = useContext(AuthContext);
  const [roomData, setRoomData] = useState({
    name: '',
    type: 'public',
    maxPlayers: 8,
    maxRounds: 10,
    passcode: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setRoomData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!roomData.name.trim()) {
      toast.error('Please enter a room name');
      return;
    }
    
    if (roomData.type === 'private' && !roomData.passcode.trim()) {
      toast.error('Private rooms require a passcode');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await api.post('/rooms', {
        ...roomData,
        userId: currentUser._id
      });
      
      toast.success('Room created successfully');
      navigate(`/rooms/${response.data._id}`);
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error(error.response?.data?.message || 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-center text-indigo-600">Create Room</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Room Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter room name"
              value={roomData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Room Type
            </label>
            <div className="flex">
              <label className="mr-4">
                <input
                  type="radio"
                  name="type"
                  value="public"
                  checked={roomData.type === 'public'}
                  onChange={handleChange}
                  className="mr-2"
                />
                Public
              </label>
              <label>
                <input
                  type="radio"
                  name="type"
                  value="private"
                  checked={roomData.type === 'private'}
                  onChange={handleChange}
                  className="mr-2"
                />
                Private
              </label>
            </div>
          </div>
          
          {roomData.type === 'private' && (
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="passcode">
                Passcode
              </label>
              <input
                type="number"
                id="passcode"
                name="passcode"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter room passcode"
                value={roomData.passcode}
                onChange={handleChange}
                required
              />
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="maxPlayers">
                Max Players
              </label>
              <select
                id="maxPlayers"
                name="maxPlayers"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={roomData.maxPlayers}
                onChange={handleChange}
              >
                {[2, 4, 6, 8, 10, 12, 16, 20, 30].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="maxRounds">
                Rounds
              </label>
              <select
                id="maxRounds"
                name="maxRounds"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={roomData.maxRounds}
                onChange={handleChange}
              >
                {[5, 10, 15, 20].map(num => (
                  <option key={num} value={num}>{num}</option>   // arpit,daksh,shubham
                ))}
              </select>
            </div>
          </div>
          
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Room'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateRoom;