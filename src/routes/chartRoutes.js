const express = require('express');
const ChartController = require('../controllers/chartController');
const { validateBirthData, validateQueryParams } = require('../middleware/validation');

const router = express.Router();
const chartController = new ChartController();

// Main chart generation endpoint
router.post('/generate-chart', (req, res) => {
    chartController.submitBirthData(req, res);
});

// Alternative POST endpoint
router.post('/submit-birth-data', (req, res) => {
    chartController.submitBirthData(req, res);
});

// GET endpoint for easier testing
router.get('/generate-chart', (req, res) => {
    chartController.submitBirthDataGet(req, res);
});

// Alternative GET endpoint
router.get('/submit-birth-data', (req, res) => {
    chartController.submitBirthDataGet(req, res);
});

module.exports = router;
