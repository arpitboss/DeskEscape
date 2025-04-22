import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { generateAvatarUrl } from '../../utils/helpers';
import { toast } from 'react-toastify';

const CreateUser = () => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState('');
  const { currentUser, createUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // If user is already logged in, redirect to rooms
  useEffect(() => {
    if (currentUser) {
      navigate('/rooms');
    }
  }, [currentUser, navigate]);

  // Generate preview avatar when name changes
  useEffect(() => {
    if (name.trim()) {
      setPreviewAvatar(generateAvatarUrl(name));
    } else {
      setPreviewAvatar('');
    }
  }, [name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    
    setIsLoading(true);
    try {
      // Generate avatar URL based on name
      const avatar = generateAvatarUrl(name);
      
      // Create user
      await createUser({ name, avatar });
      toast.success('Welcome to Never Have I Ever!');
      navigate('/rooms');
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-128px)] px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2 text-center text-indigo-600">Never Have I Ever</h1>
        <p className="text-gray-600 text-center mb-6">The party game of embarrassing revelations</p>
        
        <div className="flex justify-center mb-6">
          {previewAvatar ? (
            <img 
              src={previewAvatar}
              alt="Your avatar" 
              className="w-24 h-24 rounded-full border-4 border-indigo-100"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              What should we call you?
            </label>
            <input
              id="name"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your nickname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              required
            />
            <p className="text-xs text-gray-500 mt-1">This name will be visible to other players</p>
          </div>
          
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </span>
            ) : "Let's Play!"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateUser;