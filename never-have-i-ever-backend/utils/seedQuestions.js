const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Question = require('../models/Question');
const connectDB = require('../config/db');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Sample questions for the Never Have I Ever game
const questions = [
  {
    text: "Never have I ever stayed late at work to meet a deadline.",
    category: "work",
    difficulty: "easy"
  },
  {
    text: "Never have I ever taken a work call in an unusual location.",
    category: "work",
    difficulty: "medium"
  },
  {
    text: "Never have I ever organized a team lunch or coffee break.",
    category: "work", 
    difficulty: "easy"
  },
  {
    text: "Never have I ever surprised a coworker with a small appreciation gesture.",
    category: "work",
    difficulty: "medium"
  },
  {
    text: "Never have I ever taken part in a virtual escape room or online trivia session.",
    category: "activities",
    difficulty: "medium"
  },
  {
    text: "Never have I ever been part of a company-wide project that changed the way we work.",
    category: "work",
    difficulty: "hard"
  },
  {
    text: "Never have I ever accidentally sent a message to the wrong person.",
    category: "general",
    difficulty: "easy"
  },
  {
    text: "Never have I ever forgotten someone's name right after being introduced.",
    category: "social",
    difficulty: "easy"
  },
  {
    text: "Never have I ever pretended to know a celebrity or public figure I saw in person.",
    category: "social",
    difficulty: "medium"
  },
  {
    text: "Never have I ever taken a selfie in a museum or art gallery.",
    category: "activities",
    difficulty: "easy"
  },
  {
    text: "Never have I ever accidentally liked an old post when browsing someone's social media.",
    category: "social",
    difficulty: "easy"
  },
  {
    text: "Never have I ever pulled an all-nighter to finish a project.",
    category: "work",
    difficulty: "medium"
  },
  {
    text: "Never have I ever forgotten an important birthday.",
    category: "social",
    difficulty: "easy"
  },
  {
    text: "Never have I ever tried to learn a new language using an app.",
    category: "activities",
    difficulty: "medium"
  },
  {
    text: "Never have I ever gone camping.",
    category: "activities",
    difficulty: "easy"
  },
  {
    text: "Never have I ever traveled outside my country.",
    category: "travel",
    difficulty: "medium"
  },
  {
    text: "Never have I ever cooked a meal from scratch.",
    category: "activities",
    difficulty: "easy"
  },
  {
    text: "Never have I ever broken a bone.",
    category: "general",
    difficulty: "medium"
  },
  {
    text: "Never have I ever gone on a blind date.",
    category: "social",
    difficulty: "medium"
  },
  {
    text: "Never have I ever stayed in a fancy hotel.",
    category: "travel",
    difficulty: "medium"
  }
];

// Seed questions to database
const seedQuestions = async () => {
  try {
    // Clear existing questions first
    await Question.deleteMany({});
    
    // Insert new questions
    await Question.insertMany(questions);
    
    console.log('Questions successfully seeded to database!');
    process.exit(0);
  } catch (error) {
    console.error(`Error seeding questions: ${error.message}`);
    process.exit(1);
  }
};

seedQuestions();