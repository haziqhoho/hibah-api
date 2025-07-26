const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/auth');
const { hibahSummary } = require('../controllers/reportsController');

router.get('/hibah-summary', apiKeyAuth, hibahSummary);

module.exports = router; 