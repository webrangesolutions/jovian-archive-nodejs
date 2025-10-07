const JovianArchiveService = require('../services/JovianArchiveService');
const JovianArchivePuppeteerService = require('../services/JovianArchivePuppeteerService');
const JovianArchiveFetchService = require('../services/JovianArchiveFetchService');
const MaiaMechanicsApiService = require('../services/MaiaMechanicsApiService');
const logger = require('../utils/logger');

class ChartController {
    constructor() {
        this.jovianArchiveService = new JovianArchiveService();
        this.jovianArchivePuppeteerService = new JovianArchivePuppeteerService();
        this.jovianArchiveFetchService = new JovianArchiveFetchService();
        this.maiaMechanicsApiService = new MaiaMechanicsApiService();
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

            // Try Maia Mechanics API first (no captcha, server-side)
            try {
                const maia = await this.maiaMechanicsApiService.submitBirthData(birthData);
                if (maia.success && maia.data && (maia.data.chart || maia.data.meta)) {
                    // Transform to readable format
                    const readableData = this.transformToReadableFormat(maia.data, birthData);
                    return res.status(200).json({
                        success: true,
                        message: 'Chart generated successfully using Maia Mechanics API',
                        data: readableData,
                        source: 'maia_mechanics'
                    });
                } else {
                    logger.warn('Maia Mechanics API returned unsuccessful response', { 
                        success: maia.success, 
                        hasData: !!maia.data,
                        dataKeys: maia.data ? Object.keys(maia.data) : []
                    });
                }
            } catch (e) {
                logger.error('Maia Mechanics API failed, falling back to other methods', { 
                    error: e.message,
                    stack: e.stack?.substring(0, 200)
                });
            }

            // Try Puppeteer service first (more reliable)
            const result = await this.jovianArchivePuppeteerService.submitBirthData(birthData);
            console.log("Puppeteer results:", result);
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
                // Fallback to axios service if Puppeteer fails
                logger.warn('Puppeteer service failed, trying axios fallback', { error: result.error });
                const fallbackResult = await this.jovianArchiveService.submitBirthData(birthData);
                console.log("Axios fallback results:", fallbackResult);
                
                if (fallbackResult.success) {
                    const chartProperties = fallbackResult.data.chart_properties || {};
                    const designData = fallbackResult.data.design_data || [];
                    const personalityData = fallbackResult.data.personality_data || [];
                    const chartImageUrl = fallbackResult.data.chart_image_url || null;
                    const downloadData = fallbackResult.data.download_data || null;

                    const hasChartData = Object.keys(chartProperties).length > 0 ||
                                         designData.length > 0 ||
                                         personalityData.length > 0;

                    if (hasChartData) {
                        return res.status(200).json({
                            success: true,
                            message: 'Chart generated successfully using axios fallback',
                            data: {
                                birth_data: birthData,
                                chart_properties: chartProperties,
                                design_data: designData,
                                personality_data: personalityData,
                                chart_image_url: chartImageUrl,
                                download_data: downloadData,
                                generated_at: new Date().toISOString()
                            }
                        });
                    }
                }

                {
                    // Try fetch service as second fallback
                    logger.warn('Axios fallback also failed, trying fetch service', { 
                        puppeteerError: result.error, 
                        axiosError: fallbackResult.error
                    });
                    const fetchResult = await this.jovianArchiveFetchService.submitBirthData(birthData);
                    console.log("Fetch service results:", fetchResult);
                    
                    if (fetchResult.success) {
                        const chartProperties = fetchResult.data.chart_properties || {};
                        const designData = fetchResult.data.design_data || [];
                        const personalityData = fetchResult.data.personality_data || [];
                        const chartImageUrl = fetchResult.data.chart_image_url || null;
                        const downloadData = fetchResult.data.download_data || null;

                        const hasChartData = Object.keys(chartProperties).length > 0 ||
                                             designData.length > 0 ||
                                             personalityData.length > 0;

                        if (hasChartData) {
                            return res.status(200).json({
                                success: true,
                                message: 'Chart generated successfully using fetch service',
                                data: {
                                    birth_data: birthData,
                                    chart_properties: chartProperties,
                                    design_data: designData,
                                    personality_data: personalityData,
                                    chart_image_url: chartImageUrl,
                                    download_data: downloadData,
                                    generated_at: new Date().toISOString()
                                }
                            });
                        }
                    } else {
                        return res.status(500).json({
                            success: false,
                            message: 'Failed to generate chart with all three methods (Puppeteer, axios, and fetch)',
                            error: result.error,
                            fallbackError: fallbackResult.error,
                            fetchError: fetchResult.error
                        });
                    }
                }
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
                email: req.query.email,
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

            // Try Maia Mechanics API first (GET)
            try {
                const maia = await this.maiaMechanicsApiService.submitBirthData(birthData);
                if (maia.success && maia.data && (maia.data.chart || maia.data.meta)) {
                    // Transform to readable format
                    const readableData = this.transformToReadableFormat(maia.data, birthData);
                    return res.status(200).json({
                        success: true,
                        message: 'Chart generated successfully using Maia Mechanics API',
                        data: readableData,
                        source: 'maia_mechanics'
                    });
                } else {
                    logger.warn('Maia Mechanics API returned unsuccessful response (GET)', { 
                        success: maia.success, 
                        hasData: !!maia.data,
                        dataKeys: maia.data ? Object.keys(maia.data) : []
                    });
                }
            } catch (e) {
                logger.error('Maia Mechanics API failed (GET), falling back to other methods', { 
                    error: e.message,
                    stack: e.stack?.substring(0, 200)
                });
            }

            // Try Puppeteer service first (more reliable)
            const result = await this.jovianArchivePuppeteerService.submitBirthData(birthData);

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
                // Fallback to axios service if Puppeteer fails (match POST logic)
                logger.warn('Puppeteer service failed (GET), trying axios fallback', { error: result.error });
                const fallbackResult = await this.jovianArchiveService.submitBirthData(birthData);

                if (fallbackResult.success) {
                    const chartProperties = fallbackResult.data.chart_properties || {};
                    const designData = fallbackResult.data.design_data || [];
                    const personalityData = fallbackResult.data.personality_data || [];
                    const chartImageUrl = fallbackResult.data.chart_image_url || null;
                    const downloadData = fallbackResult.data.download_data || null;

                    return res.status(200).json({
                        success: true,
                        message: 'Chart generated successfully using axios fallback',
                        data: {
                            birth_data: birthData,
                            chart_properties: chartProperties,
                            design_data: designData,
                            personality_data: personalityData,
                            chart_image_url: chartImageUrl,
                            download_data: downloadData,
                            generated_at: new Date().toISOString()
                        }
                    });
                }

                // Try fetch service as second fallback
                logger.warn('Axios fallback (GET) also failed, trying fetch service', {
                    puppeteerError: result.error,
                    axiosError: fallbackResult.error
                });
                const fetchResult = await this.jovianArchiveFetchService.submitBirthData(birthData);

                if (fetchResult.success) {
                    const chartProperties = fetchResult.data.chart_properties || {};
                    const designData = fetchResult.data.design_data || [];
                    const personalityData = fetchResult.data.personality_data || [];
                    const chartImageUrl = fetchResult.data.chart_image_url || null;
                    const downloadData = fetchResult.data.download_data || null;

                    return res.status(200).json({
                        success: true,
                        message: 'Chart generated successfully using fetch service',
                        data: {
                            birth_data: birthData,
                            chart_properties: chartProperties,
                            design_data: designData,
                            personality_data: personalityData,
                            chart_image_url: chartImageUrl,
                            download_data: downloadData,
                            generated_at: new Date().toISOString()
                        }
                    });
                }

                return res.status(500).json({
                    success: false,
                    message: 'Failed to generate chart with all three methods (Puppeteer, axios, and fetch)',
                    error: result.error,
                    fallbackError: fallbackResult.error,
                    fetchError: fetchResult.error
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

    /**
     * Transform Maia Mechanics API data to readable format
     */
    transformToReadableFormat(apiData, birthData) {
        const chart = apiData.chart || {};
        const meta = apiData.meta || {};
        const birthDataMeta = meta.birthData || {};

        // Type mappings
        const typeMap = {
            0: 'Generator',
            1: 'Manifestor', 
            2: 'Projector',
            3: 'Reflector',
            4: 'Manifesting Generator'
        };

        // Strategy mappings by type
        const strategyMap = {
            0: 'Wait to Respond',
            1: 'Inform',
            2: 'Wait for Invitation', 
            3: 'Wait a Lunar Cycle',
            4: 'Wait to Respond'
        };

        // Not-Self Theme mappings by type
        const notSelfThemeMap = {
            0: 'Frustration',
            1: 'Anger',
            2: 'Bitterness',
            3: 'Disappointment',
            4: 'Frustration'
        };

        // Authority mappings
        const authorityMap = {
            0: 'None/Environmental',
            1: 'Sacral',
            2: 'Emotional Solar Plexus',
            3: 'Splenic',
            4: 'Ego',
            5: 'Self-Projected',
            6: 'Lunar'
        };

        // Definition mappings
        const definitionMap = {
            0: 'Single',
            1: 'Split', 
            2: 'Triple Split',
            3: 'Quadruple Split'
        };

        // Profile formatting
        const formatProfile = (profile) => {
            if (typeof profile === 'number') {
                const first = Math.floor(profile / 10);
                const second = profile % 10;
                return `${first}/${second}`;
            }
            return profile;
        };

        // Format time
        const formatTime = (timeStr) => {
            if (!timeStr) return null;
            try {
                const date = new Date(timeStr);
                return date.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short'
                });
            } catch (e) {
                return timeStr;
            }
        };

        // Planet mappings
        const planetMap = {
            0: 'Sun',
            1: 'Earth', 
            2: 'Moon',
            3: 'North Node',
            4: 'South Node',
            5: 'Mercury',
            6: 'Venus',
            7: 'Mars',
            8: 'Jupiter',
            9: 'Saturn',
            10: 'Uranus',
            11: 'Neptune',
            12: 'Pluto'
        };

        // Extract planetary activations with planet names and arrows
        const extractPlanetaryActivations = (planets) => {
            if (!Array.isArray(planets)) return { design: [], personality: [] };
            
            const design = [];
            const personality = [];
            
            planets.forEach(planet => {
                const gateLine = `${planet.gate}.${planet.line}`;
                const planetName = planetMap[planet.id] || `Planet ${planet.id}`;
                const arrow = planet.baseAlignment === 2 ? '▼' : '▲';
                const activation = planet.activation === 1 ? 'Design' : 'Personality';
                
                const formatted = `${planetName} ${gateLine} ${arrow}`;
                
                if (activation === 'Design') {
                    design.push(formatted);
                } else {
                    personality.push(formatted);
                }
            });
            
            return { design, personality };
        };

        const planetaryActivations = extractPlanetaryActivations(chart.planets || []);

        return {
            birth_data: {
                name: birthData.name || meta.name || 'Unknown',
                date_local: formatTime(birthDataMeta.time?.local),
                date_utc: formatTime(birthDataMeta.time?.utc),
                location: {
                    city: birthData.city || birthDataMeta.location?.city,
                    country: birthData.country || birthDataMeta.location?.country
                }
            },
            properties: {
                type: typeMap[chart.type] || 'Unknown',
                strategy: strategyMap[chart.type] || 'Unknown',
                signature: chart.type === 0 || chart.type === 4 ? 'Satisfaction' : 
                          chart.type === 1 ? 'Peace' :
                          chart.type === 2 ? 'Success' : 'Surprise',
                not_self_theme: notSelfThemeMap[chart.type] || 'Unknown',
                authority: authorityMap[chart.authority] || 'Unknown',
                definition: definitionMap[chart.definition] || 'Unknown',
                incarnation_cross: `Cross ${chart.cross}`,
                profile: formatProfile(chart.profile),
                variable: chart.variable ? `Variable ${chart.variable}` : 'Unknown'
            },
            chart_data: {
                centers: chart.centers || [],
                channels: chart.channels || [],
                gates: (chart.gates || []).map(g => `${g.gate}:${g.mode}`),
                design_activations: planetaryActivations.design,
                personality_activations: planetaryActivations.personality
            },
            raw_data: apiData // Keep original for advanced use
        };
    }
}

module.exports = ChartController;
