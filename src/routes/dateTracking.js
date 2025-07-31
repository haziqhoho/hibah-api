const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/auth');
const { 
  getRegistrationDates,
  getPaymentDates,
  getAkadDates,
  getSiaDates,
  getDeathPaymentDates
} = require('../controllers/dateTrackingController');

// Date tracking endpoints
router.get('/registration', apiKeyAuth, getRegistrationDates);
router.get('/payment', apiKeyAuth, getPaymentDates);
router.get('/akad', apiKeyAuth, getAkadDates);
router.get('/sia', apiKeyAuth, getSiaDates);
router.get('/death-payment', apiKeyAuth, getDeathPaymentDates);

module.exports = router; 