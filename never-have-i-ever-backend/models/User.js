const mongoose = require('mongoose');

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true
    },
    avatar: {
      type: String,
      default: ''
    },
    points: {
      type: Number,
      default: 100 // Starting points
    },
    stats: {
      gamesPlayed: {
        type: Number,
        default: 0
      },
      gamesWon: {
        type: Number,
        default: 0
      },
      totalPoints: {
        type: Number,
        default: 0
      }
    },
    dailyPoints: {
      type: Number,
      default: 0
    },
    lastPointsReset: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);