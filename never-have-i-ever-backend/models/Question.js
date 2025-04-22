const mongoose = require('mongoose');

const questionSchema = mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Please add question text'],
      unique: true
    },
    category: {
      type: String,
      default: 'general'
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    pointValue: {
      type: Number,
      default: 10
    },
    usageCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Question', questionSchema);