/**
 * Utility functions for the Never Have I Ever game
 */

/**
 * Shuffles an array randomly
 * @param {Array} array - The array to shuffle
 * @returns {Array} - The shuffled array
 */
const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };
  
  /**
   * Formats a date to a readable string
   * @param {Date} date - The date to format
   * @returns {String} - The formatted date string
   */
  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  /**
   * Reset daily points for all users
   * Should be called by a scheduler (e.g., cron job) at midnight
   */
  const resetDailyPoints = async () => {
    try {
      const User = require('../models/User');
      await User.updateMany({}, { dailyPoints: 0, lastPointsReset: Date.now() });
      console.log('Daily points reset successfully');
    } catch (error) {
      console.error('Error resetting daily points:', error);
    }
  };
  
  module.exports = {
    shuffleArray,
    formatDate,
    resetDailyPoints
  };