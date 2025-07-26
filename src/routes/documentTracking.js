const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/auth');
const { getDocumentTracking } = require('../controllers/documentTrackingController');

// Main document tracking endpoint
router.get('/', apiKeyAuth, getDocumentTracking);

module.exports = router; 