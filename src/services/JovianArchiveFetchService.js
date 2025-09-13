const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { URLSearchParams } = require('url');
const logger = require('../utils/logger');

class JovianArchiveFetchService {
    constructor() {
        this.baseUrl = 'https://www.jovianarchive.com/Get_Your_Chart';
        this.maxRetries = 3;
        this.scrapingDelay = 3000; // 3 seconds delay
    }

    /**
     * Submit birth data and get chart information using node-fetch
     */
    async submitBirthData(birthData) {
        try {
            logger.info('Starting birth data submission with node-fetch', { birthData });

            // Fetch the form page to get the anti-forgery token
            const formPage = await this.fetchFormPage();
            
            // Extract the anti-forgery token
            const token = this.extractAntiForgeryToken(formPage);
            if (!token) {
                throw new Error('Could not extract anti-forgery token from form page');
            }

            // Submit the form with the birth data
            const chartData = await this.submitForm(birthData, token);
            
            logger.info('Chart data extracted successfully', { dataKeys: Object.keys(chartData) });

            return {
                success: true,
                data: chartData,
            };
        } catch (error) {
            logger.error('Jovian Archive node-fetch scraping failed', {
                error: error.message,
                birthData,
                stack: error.stack,
            });

            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Fetch the form page to get the anti-forgery token
     */
    async fetchFormPage() {
        logger.info('Fetching form page', { url: this.baseUrl });

        const response = await fetch(this.baseUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'max-age=0',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
            },
            timeout: 30000,
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch form page: ${response.status} ${response.statusText}`);
        }

        const content = await response.text();
        logger.info('Form page fetched successfully', { contentLength: content.length });

        return content;
    }

    /**
     * Extract anti-forgery token from the form page
     */
    extractAntiForgeryToken(html) {
        const tokenMatch = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);
        if (tokenMatch) {
            const token = tokenMatch[1];
            logger.info('Anti-forgery token extracted', { 
                tokenLength: token.length, 
                tokenPreview: token.substring(0, 20) + '...' 
            });
            return token;
        }
        return null;
    }

    /**
     * Submit the form with birth data
     */
    async submitForm(birthData, token) {
        // Get proper country and city values from autocomplete (matching Laravel implementation)
        const country = this.getCountrySuggestion(birthData.country);
        const city = this.getCitySuggestion(birthData.city, country);
        const timezone = this.getTimezoneForCity(city);

        logger.info('Submitting form data with autocomplete values', {
            originalCountry: birthData.country,
            originalCity: birthData.city,
            selectedCountry: country,
            selectedCity: city,
            timezone,
        });

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

        const formDataString = new URLSearchParams(formData).toString();
        
        logger.info('Form data being sent', {
            formData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': 'https://www.jovianarchive.com',
                'Referer': this.baseUrl,
            },
        });

        // Add delay to be respectful
        await this.delay(this.scrapingDelay);

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': 'https://www.jovianarchive.com',
                'Referer': this.baseUrl,
                'Cache-Control': 'max-age=0',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-User': '?1',
            },
            body: formDataString,
            timeout: 30000,
            redirect: 'follow', // Follow redirects like Laravel
        });

        logger.info('Form submission response', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
        });

        if (!response.ok) {
            const responseBody = await response.text();
            logger.error('Form submission failed', {
                error: `Request failed with status code ${response.status}`,
                responseBody: responseBody.substring(0, 1000) + '...',
                responseCode: response.status,
            });
            throw new Error(`Request failed with status code ${response.status}`);
        }

        const responseBody = await response.text();
        logger.info('Form submission successful', { responseLength: responseBody.length });

        // Parse the response
        return this.parseChartResponse(responseBody);
    }

    /**
     * Parse the chart response
     */
    parseChartResponse(html) {
        logger.info('Parsing chart response');

        // Check if we got an error page
        if (html.includes('Oops, we have a problem') || html.includes('Something went wrong')) {
            throw new Error('Chart generation failed: Server error page returned');
        }

        // Extract chart properties
        const chartProperties = this.extractChartProperties(html);
        
        // Extract design data
        const designData = this.extractDesignData(html);
        
        // Extract personality data
        const personalityData = this.extractPersonalityData(html);
        
        // Extract chart image URL
        const chartImageUrl = this.extractChartImageUrl(html);
        
        // Extract download data
        const downloadData = this.extractDownloadData(html);

        const result = {
            chart_properties: chartProperties,
            design_data: designData,
            personality_data: personalityData,
            chart_image_url: chartImageUrl,
            download_data: downloadData,
        };

        logger.info('Chart parsing completed', {
            properties_count: Object.keys(chartProperties).length,
            design_count: designData.length,
            personality_count: personalityData.length,
            has_image: !!chartImageUrl,
            has_download: !!downloadData,
        });

        return result;
    }

    /**
     * Extract chart properties from the chart_properties div
     */
    extractChartProperties(html) {
        const propertiesDivMatch = html.match(/<div[^>]*class="[^"]*chart_properties[^"]*"[^>]*>(.*?)<\/div>/s);
        if (!propertiesDivMatch) {
            logger.warn('Chart properties div not found');
            return {};
        }

        const propertiesDiv = propertiesDivMatch[1];
        const properties = {};
        
        // Extract list items
        const listItemMatches = propertiesDiv.match(/<li[^>]*>(.*?)<\/li>/gs);
        if (listItemMatches) {
            listItemMatches.forEach(item => {
                const text = item.replace(/<[^>]*>/g, '').trim();
                if (text.includes(':')) {
                    const [key, value] = text.split(':').map(s => s.trim());
                    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    properties[normalizedKey] = value;
                }
            });
        }

        logger.info('Extracted chart properties', properties);
        return properties;
    }

    /**
     * Extract design data from the response
     */
    extractDesignData(html) {
        const chartContainerMatch = html.match(/<div[^>]*class="[^"]*chart_results_container[^"]*"[^>]*>(.*?)<\/div>/s);
        if (!chartContainerMatch) {
            return [];
        }

        const chartContainer = chartContainerMatch[1];
        const designData = [];
        
        // Look for design-related content
        const designMatches = chartContainer.match(/<div[^>]*>.*?Design.*?<\/div>/gs);
        if (designMatches) {
            designMatches.forEach(match => {
                const text = match.replace(/<[^>]*>/g, '').trim();
                if (text && text !== 'Design' && text !== 'Personality') {
                    designData.push(text);
                }
            });
        }

        return designData;
    }

    /**
     * Extract personality data from the response
     */
    extractPersonalityData(html) {
        const chartContainerMatch = html.match(/<div[^>]*class="[^"]*chart_results_container[^"]*"[^>]*>(.*?)<\/div>/s);
        if (!chartContainerMatch) {
            return [];
        }

        const chartContainer = chartContainerMatch[1];
        const personalityData = [];
        
        // Look for personality-related content
        const personalityMatches = chartContainer.match(/<div[^>]*>.*?Personality.*?<\/div>/gs);
        if (personalityMatches) {
            personalityMatches.forEach(match => {
                const text = match.replace(/<[^>]*>/g, '').trim();
                if (text && text !== 'Design' && text !== 'Personality') {
                    personalityData.push(text);
                }
            });
        }

        return personalityData;
    }

    /**
     * Extract chart image URL
     */
    extractChartImageUrl(html) {
        const imageMatch = html.match(/<img[^>]*class="[^"]*chart_bodygraph_container[^"]*"[^>]*src="([^"]+)"/);
        if (!imageMatch) {
            return null;
        }

        const src = imageMatch[1];
        if (src && !src.startsWith('http')) {
            return 'https://www.jovianarchive.com' + src;
        }
        return src;
    }

    /**
     * Extract download data
     */
    extractDownloadData(html) {
        const downloadMatch = html.match(/<input[^>]*name="data"[^>]*value="([^"]+)"/);
        return downloadMatch ? downloadMatch[1] : null;
    }

    /**
     * Get country suggestion from autocomplete (matching Laravel implementation)
     */
    getCountrySuggestion(countryInput) {
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

        // If no match found, return the original input
        logger.warn('No country mapping found for: ' + countryInput);
        return countryInput;
    }

    /**
     * Get city suggestion from autocomplete (matching Laravel implementation)
     */
    getCitySuggestion(cityInput, country) {
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

        // If no match found, return the original input
        logger.warn('No city mapping found for: ' + cityInput + ' in country: ' + country);
        return cityInput;
    }

    /**
     * Get timezone for a city (simplified mapping)
     */
    getTimezoneForCity(city) {
        const timezoneMappings = {
            'Pakistan': 'Asia/Karachi',
            'Peshawar': 'Asia/Karachi',
            'Karachi': 'Asia/Karachi',
            'Lahore': 'Asia/Karachi',
            'Islamabad': 'Asia/Karachi',
            'United States': 'America/New_York',
            'United Kingdom': 'Europe/London',
            'India': 'Asia/Kolkata',
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
     * Delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = JovianArchiveFetchService;
