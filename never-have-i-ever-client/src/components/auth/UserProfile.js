import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { generateAvatarUrl } from '../../utils/helpers';

const UserProfile = () => {
  const { currentUser, updateUser, logout } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [userStats, setUserStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setAvatarUrl(currentUser.avatar);
      fetchUserDetails();
    } else {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const fetchUserDetails = async () => {
    try {
      const response = await api.get(`/users/${currentUser._id}`);
      setUserStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to load user details');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    
    setIsLoading(true);
    try {
      // Generate new avatar if name changed
      const newAvatar = name !== currentUser.name ? generateAvatarUrl(name) : currentUser.avatar;
      await updateUser(currentUser._id, { name, avatar: newAvatar });
      setAvatarUrl(newAvatar);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!currentUser) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center text-indigo-600">Your Profile</h1>
        
        <div className="flex items-center justify-center mb-6">
          <img 
            src={avatarUrl} 
            alt={currentUser.name}
            className="w-24 h-24 rounded-full border-4 border-indigo-100"
          />
        </div>
        
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Display Name
            </label>
            <input
              id="name"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Changing your name will also update your avatar</p>
          </div>
          
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
        
        {userStats && (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 text-gray-700">Your Stats</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-indigo-50 rounded-lg">
                <p className="text-2xl font-bold text-indigo-600">{userStats.gamesPlayed}</p>
                <p className="text-sm text-gray-600">Games Played</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{userStats.gamesWon}</p>
                <p className="text-sm text-gray-600">Games Won</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{userStats.totalPoints}</p>
                <p className="text-sm text-gray-600">Total Points</p>
              </div>
            </div>
          </div>
        )}
        
        <button
          onClick={handleLogout}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default UserProfile;