const JovianArchiveService = require('../services/JovianArchiveService');
const logger = require('../utils/logger');

class ChartController {
    constructor() {
        this.jovianArchiveService = new JovianArchiveService();
    }

    /**
     * Submit birth data and generate Human Design chart
     */
    async submitBirthData(req, res) {
        try {
            const birthData = req.body;
            console.log("Raw request body:", req.body);
            console.log("Parsed birthData:", birthData);

            logger.info('Chart generation request received', { birthData });

            // Scrape chart data directly
            const result = await this.jovianArchiveService.submitBirthData(birthData);
            console.log("results sami", result);
            if (result.success) {
                // Check if we got actual chart data or just JavaScript
                const chartProperties = result.data.chart_properties || {};
                const designData = result.data.design_data || [];
                const personalityData = result.data.personality_data || [];
                const chartImageUrl = result.data.chart_image_url || null;
                const downloadData = result.data.download_data || null;

                // Check if the response contains actual chart data
                const hasChartData = Object.keys(chartProperties).length > 0 ||
                                   designData.length > 0 ||
                                   personalityData.length > 0;

                if (hasChartData) {
                    return res.status(200).json({
                        success: true,
                        message: 'Chart generated successfully',
                        data: {
                            birth_data: birthData,
                            chart_properties: chartProperties,
                            design_data: designData,
                            personality_data: personalityData,
                            chart_image_url: chartImageUrl,
                            download_data: downloadData,
                            generated_at: new Date().toISOString()
                        },
                    });
                } else {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to extract chart data from website response',
                        error: 'The website returned JavaScript code instead of chart data. This may indicate the website has changed its structure or is using anti-bot measures.',
                    });
                }
            } else {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to generate chart',
                    error: result.error,
                });
            }
        } catch (error) {
            logger.error('Chart generation failed', {
                error: error.message,
                requestData: req.body,
                stack: error.stack
            });

            return res.status(500).json({
                success: false,
                message: 'An error occurred while generating the chart',
                error: error.message,
            });
        }
    }

    /**
     * Submit birth data via GET request with query parameters
     * This is for easier testing and integration
     */
    async submitBirthDataGet(req, res) {
        try {
            const birthData = {
                name: req.query.name,
                day: parseInt(req.query.day) || 0,
                month: parseInt(req.query.month) || 0,
                year: parseInt(req.query.year) || 0,
                hour: parseInt(req.query.hour) || 0,
                minute: parseInt(req.query.minute) || 0,
                country: req.query.country,
                city: req.query.city,
                timezone_utc: req.query.timezone_utc === 'true',
            };

            // Validation removed for testing

            logger.info('Chart generation request received (GET)', { birthData });

            // Scrape chart data directly
            const result = await this.jovianArchiveService.submitBirthData(birthData);

            if (result.success) {
                // Check if we got actual chart data or just JavaScript
                const chartProperties = result.data.chart_properties || {};
                const designData = result.data.design_data || [];
                const personalityData = result.data.personality_data || [];
                const chartImageUrl = result.data.chart_image_url || null;
                const downloadData = result.data.download_data || null;

                // Check if the response contains actual chart data
                const hasChartData = Object.keys(chartProperties).length > 0 ||
                                   designData.length > 0 ||
                                   personalityData.length > 0;

                if (hasChartData) {
                    return res.status(200).json({
                        success: true,
                        message: 'Chart generated successfully',
                        data: {
                            birth_data: birthData,
                            chart_properties: chartProperties,
                            design_data: designData,
                            personality_data: personalityData,
                            chart_image_url: chartImageUrl,
                            download_data: downloadData,
                            generated_at: new Date().toISOString()
                        },
                    });
                } else {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to extract chart data from website response',
                        error: 'The website returned JavaScript code instead of chart data. This may indicate the website has changed its structure or is using anti-bot measures.',
                    });
                }
            } else {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to generate chart',
                    error: result.error,
                });
            }
        } catch (error) {
            logger.error('Chart generation failed (GET)', {
                error: error.message,
                requestData: req.query,
                stack: error.stack
            });

            return res.status(500).json({
                success: false,
                message: 'An error occurred while generating the chart',
                error: error.message,
            });
        }
    }
}

module.exports = ChartController;
