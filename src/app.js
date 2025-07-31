const express = require('express');
require('dotenv').config();

const app = express();

app.use(express.json());

// Routes
const documentTrackingRoutes = require('./routes/documentTracking');
app.use('/document-tracking', documentTrackingRoutes);

const reportsRoutes = require('./routes/reports');
app.use('/reports', reportsRoutes);

const dateTrackingRoutes = require('./routes/dateTracking');
app.use('/date-tracking', dateTrackingRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'PTPTN API is running' });
});

module.exports = app; 