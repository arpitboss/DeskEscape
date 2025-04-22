const express = require('express');
const router = express.Router();
const { getRandomQuestions } = require('../controllers/gameController');

router.get('/', getRandomQuestions);

module.exports = router;