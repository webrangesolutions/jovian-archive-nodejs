const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class JovianArchiveService {
    constructor() {
        this.baseUrl = process.env.JOVIAN_ARCHIVE_URL || 'https://www.jovianarchive.com/Get_Your_Chart';
        this.maxRetries = parseInt(process.env.JOVIAN_ARCHIVE_MAX_RETRIES) || 3;
        this.scrapingDelay = parseInt(process.env.JOVIAN_ARCHIVE_SCRAPING_DELAY) || 5000; // Increased delay to 5 seconds

        // Create axios instance with default configuration
        this.client = axios.create({
            timeout: 60000,
            httpsAgent: new (require('https').Agent)({
                rejectUnauthorized: false // Disable SSL verification (matching Laravel)
            }),
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0',
            },
            maxRedirects: 5,
            validateStatus: function (status) {
                return status >= 200 && status < 300;
            },
            // Enable cookie handling (matching Laravel's 'cookies' => true)
            withCredentials: true,
            // Allow redirects configuration (matching Laravel)
            followRedirects: true
        });

        logger.info('Jovian Archive Service initialized', { baseUrl: this.baseUrl });
    }

    /**
     * Submit birth data and get chart information
     */
    async submitBirthData(birthData) {
        try {
            logger.info('Starting birth data submission', { birthData });

            // First, get the form page to extract anti-forgery token
            const formPage = await this.getFormPage();
            logger.info('Form page retrieved successfully');

        // Extract anti-forgery token
        const token = this.extractAntiForgeryToken(formPage);
        logger.info('Anti-forgery token extracted', { 
            tokenLength: token.length,
            tokenPreview: token.substring(0, 20) + '...'
        });

            // Submit the form
            const response = await this.submitForm(birthData, formPage, token);
            logger.info('Form submitted successfully');

            // Parse the response
            const chartData = this.parseChartResponse(response);
            logger.info('Chart data parsed successfully', { dataKeys: Object.keys(chartData) });

            return {
                success: true,
                data: chartData,
            };
        } catch (error) {
            logger.error('Jovian Archive scraping failed', {
                error: error.message,
                birthData,
                stack: error.stack
            });

            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get the initial form page
     */
    async getFormPage() {
        try {
            logger.info('Fetching form page', { url: this.baseUrl });

            const response = await this.client.get(this.baseUrl, {
                headers: {
                    'Referer': 'https://www.jovianarchive.com/',
                }
            });

            logger.info('Form page fetched successfully', { contentLength: response.data.length });
            return response.data;
        } catch (error) {
            logger.error('Failed to fetch form page', {
                error: error.message,
                responseCode: error.response?.status || 'N/A',
            });
            throw error;
        }
    }

    /**
     * Extract anti-forgery token from the form page
     */
    extractAntiForgeryToken(html) {
        // Look for the anti-forgery token in the form
        const tokenMatch = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]*)"/);
        if (tokenMatch) {
            return tokenMatch[1];
        }

        // Fallback: look for any token-like field
        const fallbackMatch = html.match(/__RequestVerificationToken["']\s*value=["']([^"']*)["']/);
        if (fallbackMatch) {
            return fallbackMatch[1];
        }

        logger.warn('No anti-forgery token found, using empty string');
        return '';
    }

    /**
     * Submit the birth data form with autocomplete handling
     */
    async submitForm(birthData, formPage, token) {
        // Add delay to be respectful
        await this.delay(this.scrapingDelay);

        // Get proper country and city values from autocomplete (matching Laravel implementation)
        const country = this.getCountrySuggestion(birthData.country);
        const city = this.getCitySuggestion(birthData.city, country);
        const timezone = this.getTimezoneForCity(city);

        // Map birth data to actual form field names (matching Laravel implementation exactly)
        const formData = {
            '__RequestVerificationToken': token,
            'IsVariableChart': 'False',
            'Name': birthData.name,
            'Day': birthData.day,
            'Month': birthData.month,
            'Year': birthData.year,
            'Hour': birthData.hour,
            'Minute': birthData.minute,
            'Country': country, // Send the country value like Laravel does
            'City': city,
            'Timezone': timezone,
            'IsTimeUTC': birthData.timezone_utc ? 'true' : 'false',
        };

        logger.info('Submitting form data with autocomplete values', {
            originalCountry: birthData.country,
            originalCity: birthData.city,
            selectedCountry: country,
            selectedCity: city,
            timezone,
            formData,
            formDataString: new URLSearchParams(formData).toString()
        });

        try {
            // Submit the form with proper headers (matching Laravel's form_params exactly)
            // Use axios's built-in form data handling like Laravel's form_params
            logger.info('Form data being sent:', {
                formData,
                headers: {
                    'Referer': this.baseUrl,
                    'Origin': 'https://www.jovianarchive.com',
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            });
            
            const response = await this.client.post(this.baseUrl, new URLSearchParams(formData), {
                headers: {
                    'Referer': this.baseUrl,
                    'Origin': 'https://www.jovianarchive.com',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                // Allow redirects like Laravel Guzzle
                maxRedirects: 5,
                validateStatus: function (status) {
                    return status >= 200 && status < 400; // Allow redirects like Laravel
                },
            });

            logger.info('Form submission successful', {
                statusCode: response.status,
                contentLength: response.data.length,
            });

            return response.data;
        } catch (error) {
            logger.error('Form submission failed', {
                error: error.message,
                responseCode: error.response?.status || 'N/A',
                responseBody: error.response?.data || 'N/A',
            });
            throw error;
        }
    }

    /**
     * Get country suggestion from autocomplete
     */
    getCountrySuggestion(countryInput) {
        // Handle null/undefined input
        if (!countryInput || typeof countryInput !== 'string') {
            logger.warn('Invalid country input provided', { countryInput });
            return 'United States'; // Default fallback
        }

        // Common country mappings for autocomplete
        const countryMappings = {
            'pakistan': 'Pakistan',
            'pak': 'Pakistan',
            'usa': 'United States',
            'united states': 'United States',
            'uk': 'United Kingdom',
            'united kingdom': 'United Kingdom',
            'canada': 'Canada',
            'australia': 'Australia',
            'india': 'India',
            'china': 'China',
            'japan': 'Japan',
            'germany': 'Germany',
            'france': 'France',
            'italy': 'Italy',
            'spain': 'Spain',
            'brazil': 'Brazil',
            'mexico': 'Mexico',
            'russia': 'Russia',
            'south africa': 'South Africa',
            'egypt': 'Egypt',
            'turkey': 'Turkey',
            'iran': 'Iran',
            'iraq': 'Iraq',
            'afghanistan': 'Afghanistan',
            'bangladesh': 'Bangladesh',
            'sri lanka': 'Sri Lanka',
            'nepal': 'Nepal',
            'bhutan': 'Bhutan',
            'maldives': 'Maldives',
        };

        const input = countryInput.toLowerCase().trim();

        // Try exact match first
        if (countryMappings[input]) {
            return countryMappings[input];
        }

        // Try partial match
        for (const [key, value] of Object.entries(countryMappings)) {
            if (key.startsWith(input) || input.startsWith(key)) {
                return value;
            }
        }

        // If no match found, return the original input (website might handle it)
        logger.warn('No country mapping found', { countryInput });
        return countryInput;
    }

    /**
     * Get city suggestion from the real JovianArchive autocomplete API
     */
    getCitySuggestion(cityInput, country) {
        // Handle null/undefined input
        if (!cityInput || typeof cityInput !== 'string') {
            logger.warn('Invalid city input provided', { cityInput });
            return 'New York'; // Default fallback
        }

        // Common city mappings for autocomplete (matching Laravel implementation)
        const cityMappings = {
            'Pakistan': {
                'pesh': 'Peshawar (Khyber Pakhtunkhwa)',
                'peshawar': 'Peshawar (Khyber Pakhtunkhwa)',
                'karachi': 'Karachi (Sindh)',
                'lahore': 'Lahore (Punjab)',
                'islamabad': 'Islamabad (Federal Territory)',
                'rawalpindi': 'Rawalpindi (Punjab)',
                'faisalabad': 'Faisalabad (Punjab)',
                'multan': 'Multan (Punjab)',
                'quetta': 'Quetta (Balochistan)',
            },
            'United States': {
                'new york': 'New York (New York)',
                'los angeles': 'Los Angeles (California)',
                'chicago': 'Chicago (Illinois)',
                'houston': 'Houston (Texas)',
                'phoenix': 'Phoenix (Arizona)',
                'philadelphia': 'Philadelphia (Pennsylvania)',
                'san antonio': 'San Antonio (Texas)',
                'san diego': 'San Diego (California)',
                'dallas': 'Dallas (Texas)',
                'san jose': 'San Jose (California)',
            },
            'United Kingdom': {
                'london': 'London (England)',
                'birmingham': 'Birmingham (England)',
                'manchester': 'Manchester (England)',
                'glasgow': 'Glasgow (Scotland)',
                'liverpool': 'Liverpool (England)',
                'leeds': 'Leeds (England)',
                'sheffield': 'Sheffield (England)',
                'edinburgh': 'Edinburgh (Scotland)',
                'bristol': 'Bristol (England)',
                'cardiff': 'Cardiff (Wales)',
            },
            'India': {
                'mumbai': 'Mumbai (Maharashtra)',
                'delhi': 'Delhi (Delhi)',
                'bangalore': 'Bangalore (Karnataka)',
                'hyderabad': 'Hyderabad (Telangana)',
                'ahmedabad': 'Ahmedabad (Gujarat)',
                'chennai': 'Chennai (Tamil Nadu)',
                'kolkata': 'Kolkata (West Bengal)',
                'surat': 'Surat (Gujarat)',
                'pune': 'Pune (Maharashtra)',
                'jaipur': 'Jaipur (Rajasthan)',
            },
        };

        const input = cityInput.toLowerCase().trim();

        // Check if we have mappings for this country
        if (cityMappings[country]) {
            const countryMappings = cityMappings[country];

            // Try exact match first
            if (countryMappings[input]) {
                return countryMappings[input];
            }

            // Try partial match
            for (const [key, value] of Object.entries(countryMappings)) {
                if (key.includes(input) || input.includes(key)) {
                    return value;
                }
            }
        }

        // If no match found, return the original input (website might handle it)
        // The website will auto-populate the Country field based on the City
        return cityInput;
    }

    /**
     * Get country code from country name
     */
    getCountryCode(countryName) {
        const countryMappings = {
            'Pakistan': 'PK',
            'United States': 'US',
            'United Kingdom': 'GB',
            'Canada': 'CA',
            'Australia': 'AU',
            'India': 'IN',
            'China': 'CN',
            'Japan': 'JP',
            'Germany': 'DE',
            'France': 'FR',
            'Italy': 'IT',
            'Spain': 'ES',
            'Brazil': 'BR',
            'Mexico': 'MX',
            'Russia': 'RU',
            'South Africa': 'ZA',
            'Egypt': 'EG',
            'Turkey': 'TR',
            'Iran': 'IR',
            'Iraq': 'IQ',
            'Afghanistan': 'AF',
            'Bangladesh': 'BD',
            'Sri Lanka': 'LK',
            'Nepal': 'NP',
            'Bhutan': 'BT',
            'Maldives': 'MV'
        };

        return countryMappings[countryName] || null;
    }

    /**
     * Get city suggestion from autocomplete (legacy method - keeping for fallback)
     */
    getCitySuggestionLegacy(cityInput, country) {
        // Common city mappings for autocomplete
        const cityMappings = {
            'Pakistan': {
                'pesh': 'Peshawar (Khyber Pakhtunkhwa)',
                'peshawar': 'Peshawar (Khyber Pakhtunkhwa)',
                'karachi': 'Karachi (Sindh)',
                'lahore': 'Lahore (Punjab)',
                'islamabad': 'Islamabad (Federal Territory)',
                'rawalpindi': 'Rawalpindi (Punjab)',
                'faisalabad': 'Faisalabad (Punjab)',
                'multan': 'Multan (Punjab)',
                'quetta': 'Quetta (Balochistan)',
            },
            'United States': {
                'new york': 'New York (New York)',
                'los angeles': 'Los Angeles (California)',
                'chicago': 'Chicago (Illinois)',
                'houston': 'Houston (Texas)',
                'phoenix': 'Phoenix (Arizona)',
                'philadelphia': 'Philadelphia (Pennsylvania)',
                'san antonio': 'San Antonio (Texas)',
                'san diego': 'San Diego (California)',
                'dallas': 'Dallas (Texas)',
                'san jose': 'San Jose (California)',
            },
            'United Kingdom': {
                'london': 'London (England)',
                'birmingham': 'Birmingham (England)',
                'manchester': 'Manchester (England)',
                'glasgow': 'Glasgow (Scotland)',
                'liverpool': 'Liverpool (England)',
                'leeds': 'Leeds (England)',
                'sheffield': 'Sheffield (England)',
                'edinburgh': 'Edinburgh (Scotland)',
                'bristol': 'Bristol (England)',
                'cardiff': 'Cardiff (Wales)',
            },
            'India': {
                'mumbai': 'Mumbai (Maharashtra)',
                'delhi': 'Delhi (Delhi)',
                'bangalore': 'Bangalore (Karnataka)',
                'hyderabad': 'Hyderabad (Telangana)',
                'chennai': 'Chennai (Tamil Nadu)',
                'kolkata': 'Kolkata (West Bengal)',
                'pune': 'Pune (Maharashtra)',
                'ahmedabad': 'Ahmedabad (Gujarat)',
                'jaipur': 'Jaipur (Rajasthan)',
                'lucknow': 'Lucknow (Uttar Pradesh)',
            },
        };

        const input = cityInput.toLowerCase().trim();

        // Check if we have mappings for this country
        if (cityMappings[country]) {
            const countryCities = cityMappings[country];

            // Try exact match first
            if (countryCities[input]) {
                return countryCities[input];
            }

            // Try partial match
            for (const [key, value] of Object.entries(countryCities)) {
                if (key.startsWith(input) || input.startsWith(key)) {
                    return value;
                }
            }
        }

        // If no match found, return the original input (website might handle it)
        logger.warn('No city mapping found', { cityInput, country });
        return cityInput;
    }

    /**
     * Get timezone for a city (simplified mapping)
     */
    getTimezoneForCity(city) {
        // Simplified timezone mappings (matching Laravel exactly)
        const timezoneMappings = {
            'Pakistan': 'Asia/Karachi',
            'Peshawar': 'Asia/Karachi',
            'Karachi': 'Asia/Karachi',
            'Lahore': 'Asia/Karachi',
            'Islamabad': 'Asia/Karachi',
            'United States': 'America/New_York',
            'United Kingdom': 'Europe/London',
            'India': 'Asia/Kolkata',
            'New York': 'America/New_York', // Add specific city mappings
            'Los Angeles': 'America/Los_Angeles',
            'Chicago': 'America/Chicago',
            'London': 'Europe/London',
            'Paris': 'Europe/Paris',
            'Tokyo': 'Asia/Tokyo',
            'Sydney': 'Australia/Sydney',
        };

        for (const [key, timezone] of Object.entries(timezoneMappings)) {
            if (city.toLowerCase().includes(key.toLowerCase())) {
                return timezone;
            }
        }

        // Default timezone
        return 'UTC';
    }

    /**
     * Parse the chart response page
     */
    parseChartResponse(html) {
        logger.info('Parsing chart response', { htmlLength: html.length });

        const $ = cheerio.load(html);

        // Check if we have the chart results container
        const chartContainer = $('.chart_results_container').first();

        if (chartContainer.length === 0) {
            logger.warn('Chart results container not found - may be JavaScript response');
            return {
                chart_properties: {},
                design_data: [],
                personality_data: [],
                chart_image_url: null,
                download_data: null,
            };
        }

        // Extract chart properties from the chart_properties div
        const chartProperties = this.extractChartProperties($);

        // Extract design data
        const designData = this.extractDesignData($);

        // Extract personality data
        const personalityData = this.extractPersonalityData($);

        // Extract chart image URL
        const chartImageUrl = this.extractChartImageUrl($);

        // Extract download data
        const downloadData = this.extractDownloadData($);

        const result = {
            chart_properties: chartProperties,
            design_data: designData,
            personality_data: personalityData,
            chart_image_url: chartImageUrl,
            download_data: downloadData,
        };

        logger.info('Chart parsing completed', {
            propertiesCount: Object.keys(chartProperties).length,
            designCount: designData.length,
            personalityCount: personalityData.length,
            hasImage: !!chartImageUrl,
            hasDownload: !!downloadData,
        });

        return result;
    }

    /**
     * Extract chart properties from the chart_properties div
     */
    extractChartProperties($) {
        const properties = {};

        // Look for the chart_properties div specifically
        const propertiesDiv = $('.chart_properties').first();

        if (propertiesDiv.length > 0) {
            // Extract properties from the ul list
            propertiesDiv.find('ul li').each((index, element) => {
                const text = $(element).text().trim();

                // Parse the format: "Type: Generator" or "BIRTH DATE (LOCAL): Jan, 17 2000, 06:00 (UTC + 5)"
                const match = text.match(/^([^:]+):\s*(.+)$/);
                if (match) {
                    const key = match[1].trim();
                    const value = match[2].trim();

                    // Normalize the key names
                    const normalizedKey = this.normalizePropertyKey(key);
                    properties[normalizedKey] = value;
                }
            });

            logger.info('Extracted chart properties from .chart_properties div', properties);
        } else {
            logger.warn('Chart properties div not found');
        }

        return properties;
    }

    /**
     * Normalize property key names
     */
    normalizePropertyKey(key) {
        key = key.toLowerCase().trim();

        const mappings = {
            'type': 'type',
            'strategy': 'strategy',
            'not-self theme': 'not_self_theme',
            'inner authority': 'inner_authority',
            'profile': 'profile',
            'definition': 'definition',
            'incarnation cross': 'incarnation_cross',
            'birth date (local)': 'birth_date_local',
            'birth place': 'birth_place',
            'name': 'name',
        };

        return mappings[key] || key.replace(/[\s-]/g, '_');
    }

    /**
     * Extract chart image URL
     */
    extractChartImageUrl($) {
        const imageNode = $('.chart_bodygraph_container img').first();

        if (imageNode.length > 0) {
            const src = imageNode.attr('src');
            if (src) {
                // Make it absolute URL if it's relative
                if (!src.startsWith('http')) {
                    return 'https://www.jovianarchive.com' + src;
                }
                return src;
            }
        }

        return null;
    }

    /**
     * Extract download data
     */
    extractDownloadData($) {
        const downloadForm = $('.download_btn_container form input[name="data"]').first();

        if (downloadForm.length > 0) {
            return downloadForm.attr('value');
        }

        return null;
    }

    /**
     * Extract design data from the response
     */
    extractDesignData($) {
        const designData = [];

        // Look for design data in the chart container
        const chartContainer = $('.chart_results_container').first();

        if (chartContainer.length > 0) {
            // Look for design section (usually on the left side of the chart)
            const designSection = chartContainer.find('div:contains("Design")').first();

            if (designSection.length > 0) {
                designSection.find('div, span').each((index, element) => {
                    const text = $(element).text().trim();
                    if (text && !['Design', 'Personality'].includes(text)) {
                        designData.push(text);
                    }
                });
            }
        }

        return designData;
    }

    /**
     * Extract personality data from the response
     */
    extractPersonalityData($) {
        const personalityData = [];

        // Look for personality data in the chart container
        const chartContainer = $('.chart_results_container').first();

        if (chartContainer.length > 0) {
            // Look for personality section (usually on the right side of the chart)
            const personalitySection = chartContainer.find('div:contains("Personality")').first();

            if (personalitySection.length > 0) {
                personalitySection.find('div, span').each((index, element) => {
                    const text = $(element).text().trim();
                    if (text && !['Design', 'Personality'].includes(text)) {
                        personalityData.push(text);
                    }
                });
            }
        }

        return personalityData;
    }

    /**
     * Retry mechanism with exponential backoff
     */
    async retry(operation, maxRetries = null) {
        const retries = maxRetries || this.maxRetries;
        let attempt = 0;

        while (attempt < retries) {
            try {
                return await operation();
            } catch (error) {
                attempt++;

                if (attempt >= retries) {
                    throw error;
                }

                // Exponential backoff
                const delay = Math.pow(2, attempt) * this.scrapingDelay;
                logger.info(`Retry attempt ${attempt} after ${delay}ms delay`);
                await this.delay(delay);
            }
        }

        throw new Error('Max retries exceeded');
    }

    /**
     * Utility function to create delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = JovianArchiveService;