const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// @desc    Get global leaderboard
// @route   GET /api/leaderboard
// @access  Public
const getLeaderboard = asyncHandler(async (req, res) => {
  const { timeFrame = 'day' } = req.query;

  let leaderboard;

  switch (timeFrame) {
    case 'day':
      // Get daily leaderboard
      leaderboard = await User.find({ dailyPoints: { $gt: 0 } })
        .select('name avatar dailyPoints')
        .sort({ dailyPoints: -1 })
        .limit(50);
      break;
      
    case 'week':
      // For week, we'll use the points field (which is more recent points)
      leaderboard = await User.find({ points: { $gt: 0 } })
        .select('name avatar points')
        .sort({ points: -1 })
        .limit(50);
      break;
      
    case 'all':
      // For all-time, use the stats.totalPoints field
      leaderboard = await User.find({ 'stats.totalPoints': { $gt: 0 } })
        .select('name avatar stats.totalPoints')
        .sort({ 'stats.totalPoints': -1 })
        .limit(50);
      break;
      
    default:
      leaderboard = await User.find({ dailyPoints: { $gt: 0 } })
        .select('name avatar dailyPoints')
        .sort({ dailyPoints: -1 })
        .limit(50);
  }

  res.json(leaderboard);
});

// @desc    Reset daily points (This would be called by a scheduler)
// @route   POST /api/leaderboard/reset-daily
// @access  Private/Admin (not exposed directly)
const resetDailyPoints = asyncHandler(async (req, res) => {
  await User.updateMany({}, { dailyPoints: 0, lastPointsReset: Date.now() });
  
  res.json({ message: 'Daily points reset successfully' });
});

module.exports = {
  getLeaderboard,
  resetDailyPoints
};