// src/components/leaderboard/Leaderboard.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Avatar from '../common/Avatar';
import { toast } from 'react-toastify';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeFrame, setTimeFrame] = useState('day');  // day, week, all
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    fetchLeaderboard();
  }, [timeFrame]);
  
  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/leaderboard', {
        params: { timeFrame }
      });
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Determine which points field to display based on timeFrame
  const getPointsField = (player) => {
    switch (timeFrame) {
      case 'day':
        return player.dailyPoints;
      case 'week':
        return player.points;
      case 'all':
        return player.stats?.totalPoints;
      default:
        return player.dailyPoints;
    }
  };
  
  const getTimeFrameLabel = () => {
    switch (timeFrame) {
      case 'day':
        return 'Daily';
      case 'week':
        return 'Weekly';
      case 'all':
        return 'All-Time';
      default:
        return 'Daily';
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Leaderboard</h1>
      
      <div className="mb-6">
        <div className="flex justify-center space-x-4">
          <button
            className={`px-4 py-2 rounded-md ${
              timeFrame === 'day'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800'
            }`}
            onClick={() => setTimeFrame('day')}
          >
            Daily
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              timeFrame === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800'
            }`}
            onClick={() => setTimeFrame('week')}
          >
            Weekly
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              timeFrame === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800'
            }`}
            onClick={() => setTimeFrame('all')}
          >
            All-Time
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center py-8">Loading leaderboard...</div>
      ) : leaderboard.length > 0 ? (
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Rank</th>
                <th className="px-4 py-2 text-left">Player</th>
                <th className="px-4 py-2 text-right">{getTimeFrameLabel()} Points</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((player, index) => (
                <tr key={player._id} className="border-t">
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <Avatar 
                        name={player.name}
                        url={player.avatar}
                        size={8}
                      />
                      <span className="ml-2">{player.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    {getPointsField(player)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-100 rounded">
          <p>No players on the leaderboard yet.</p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;