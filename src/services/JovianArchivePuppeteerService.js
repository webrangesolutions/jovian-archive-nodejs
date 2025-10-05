const puppeteer = require('puppeteer');
const logger = require('../utils/logger');

class JovianArchivePuppeteerService {
    constructor() {
        this.baseUrl = 'https://www.jovianarchive.com/Get_Your_Chart';
        this.maxRetries = 3;
        this.scrapingDelay = 3000; // 3 seconds delay
        this.browser = null;
        this.page = null;
        this.lastCapturedJson = null;
    }

    /**
     * Submit birth data and get chart information using Puppeteer
     */
    async submitBirthData(birthData) {
        try {
            logger.info('Starting birth data submission with Puppeteer', { birthData });

            // Launch browser
            await this.launchBrowser();
            
            // Navigate to the form page
            await this.navigateToForm();
            
            // Fill and submit the form
            const chartData = await this.fillAndSubmitForm(birthData);
            
            logger.info('Chart data extracted successfully', { dataKeys: Object.keys(chartData) });

            return {
                success: true,
                data: chartData,
            };
        } catch (error) {
            logger.error('Jovian Archive Puppeteer scraping failed', {
                error: error.message,
                birthData,
                stack: error.stack,
            });

            return {
                success: false,
                error: error.message,
            };
        } finally {
            await this.closeBrowser();
        }
    }

    /**
     * Launch Puppeteer browser with realistic settings
     */
    async launchBrowser() {
        logger.info('Launching Puppeteer browser');
        
        // Render.com compatible browser launch options
        const launchOptions = {
            headless: true, // Set to false for debugging
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--single-process', // Important for Render.com
                '--memory-pressure-off',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ],
            defaultViewport: {
                width: 1280, // Reduced for Render.com memory constraints
                height: 720,
            },
        };

        // Resolve executable path safely: prefer env var, else Puppeteer's bundled Chromium
        try {
            const candidatePath =
                process.env.PUPPETEER_EXECUTABLE_PATH ||
                (typeof puppeteer.executablePath === 'function' ? puppeteer.executablePath() : null);

            // Some platforms (like Render) may set a path that doesn't exist if Chromium wasn't downloaded
            if (candidatePath) {
                const fs = require('fs');
                if (fs.existsSync(candidatePath)) {
                    launchOptions.executablePath = candidatePath;
                    logger.info('Using Puppeteer executablePath', { executablePath: candidatePath });
                } else {
                    logger.warn('Configured Puppeteer executablePath not found, launching without explicit path', { executablePath: candidatePath });
                }
            }
        } catch (e) {
            // If detection fails, let Puppeteer decide without executablePath
            logger.warn('Failed to resolve Puppeteer executablePath, relying on default', { error: e.message });
        }
        
        this.browser = await puppeteer.launch(launchOptions);

        this.page = await this.browser.newPage();
        
        // Set realistic browser settings
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await this.page.setViewport({ width: 1280, height: 720 }); // Reduced for Render.com
        
        // Set extra headers to look more like a real browser
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Cache-Control': 'max-age=0',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
        });

        logger.info('Browser launched successfully');
    }

    /**
     * Navigate to the form page
     */
    async navigateToForm() {
        logger.info('Navigating to form page', { url: this.baseUrl });
        
        await this.page.goto(this.baseUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });

        // Wait for the form to be loaded
        await this.page.waitForSelector('form', { timeout: 10000 });
        
        logger.info('Form page loaded successfully');

        // Try to solve hCaptcha if enabled (optional)
        try {
            await this.solveHCaptchaIfPresent();
        } catch (e) {
            logger.warn('hCaptcha solving skipped or failed', { error: e.message });
        }
    }

    /**
     * Fill and submit the form
     */
    async fillAndSubmitForm(birthData) {
        logger.info('Filling form with birth data', { birthData });

        // Get proper country and city values (matching Laravel implementation)
        const country = this.getCountrySuggestion(birthData.country);
        const city = this.getCitySuggestion(birthData.city, country);
        const timezone = this.getTimezoneForCity(city);

        logger.info('Using autocomplete values', {
            originalCountry: birthData.country,
            originalCity: birthData.city,
            selectedCountry: country,
            selectedCity: city,
            timezone,
        });
        
        // Wire up JSON capture for SPA/XHR-based flows
        this.lastCapturedJson = null;
        const responseListener = async (res) => {
            try {
                const ct = (res.headers()['content-type'] || '').toLowerCase();
                if (ct.includes('application/json')) {
                    const url = res.url();
                    const status = res.status();
                    if (status >= 200 && status < 400) {
                        const data = await res.json().catch(() => null);
                        if (data) {
                            this.lastCapturedJson = { url, data };
                            logger.info('Captured JSON response', { url, keys: Object.keys(data || {}) });
                        }
                    }
                }
            } catch (e) {
                // ignore
            }
        };
        this.page.on('response', responseListener);

        // Try legacy form first; if not present, use new layout fallback
        const legacyNameField = await this.page.$('input[name="Name"]');
        if (legacyNameField) {
            // Legacy form flow
            await this.page.type('input[name="Name"]', birthData.name);
            await this.page.type('input[name="Day"]', birthData.day.toString());
            
            // Handle month - there's a text input for month_name and hidden input for Month
            await this.page.type('input[id="month_name"]', birthData.month.toString());
            await this.page.evaluate((month) => {
                const target = document.querySelector('input[name="Month"]');
                if (target) target.value = month;
            }, birthData.month.toString());
            
            await this.page.type('input[name="Year"]', birthData.year.toString());
            await this.page.type('input[name="Hour"]', birthData.hour.toString());
            await this.page.type('input[name="Minute"]', birthData.minute.toString());
            
            // Handle country field with autocomplete dropdown
            // Clear the field first and type with proper capitalization
            await this.page.evaluate(() => {
                const el = document.querySelector('input[id="country_name"]');
                if (el) el.value = '';
            });
            await this.page.type('input[id="country_name"]', country);
            await this.delay(1500); // Wait longer for autocomplete dropdown to appear
            
            // Try to click on the country autocomplete dropdown option
            try {
                await this.page.waitForSelector('.ui-autocomplete .ui-menu-item', { timeout: 3000 });
                
                // Log available autocomplete options for debugging
                const countryOptions = await this.page.evaluate(() => {
                    const items = document.querySelectorAll('.ui-autocomplete .ui-menu-item');
                    return Array.from(items).map(item => item.textContent.trim());
                });
                logger.info('Available country autocomplete options', { countryOptions });
                
                // Try to find exact match first, then fallback to first option
                let selected = false;
                for (let i = 0; i < countryOptions.length; i++) {
                    if (countryOptions[i].toLowerCase().includes(country.toLowerCase())) {
                        await this.page.click(`.ui-autocomplete .ui-menu-item:nth-child(${i + 1})`);
                        logger.info(`Country autocomplete option selected: ${countryOptions[i]}`);
                        selected = true;
                        break;
                    }
                }
                
                if (!selected) {
                    await this.page.click('.ui-autocomplete .ui-menu-item:first-child');
                    logger.info('Country autocomplete first option selected');
                }
            } catch (error) {
                logger.warn('No country autocomplete dropdown found, using typed value');
                // Fallback: set the hidden field manually
                await this.page.evaluate((countryValue) => {
                    const el = document.querySelector('input[name="Country"]');
                    if (el) el.value = countryValue;
                }, country);
            }
            
            // Handle city field with autocomplete dropdown
            await this.page.evaluate(() => {
                const el = document.querySelector('input[name="City"]');
                if (el) el.value = '';
            });
            await this.page.type('input[name="City"]', city);
            await this.delay(1500); // Wait longer for autocomplete dropdown to appear
            
            // Try to click on the city autocomplete dropdown option
            try {
                await this.page.waitForSelector('.ui-autocomplete .ui-menu-item', { timeout: 3000 });
                
                // Log available autocomplete options for debugging
                const cityOptions = await this.page.evaluate(() => {
                    const items = document.querySelectorAll('.ui-autocomplete .ui-menu-item');
                    return Array.from(items).map(item => item.textContent.trim());
                });
                logger.info('Available city autocomplete options', { cityOptions });
                
                // Try to find exact match first, then fallback to first option
                let selected = false;
                for (let i = 0; i < cityOptions.length; i++) {
                    if (cityOptions[i].toLowerCase().includes(city.toLowerCase())) {
                        await this.page.click(`.ui-autocomplete .ui-menu-item:nth-child(${i + 1})`);
                        logger.info(`City autocomplete option selected: ${cityOptions[i]}`);
                        selected = true;
                        break;
                    }
                }
                
                if (!selected) {
                    await this.page.click('.ui-autocomplete .ui-menu-item:first-child');
                    logger.info('City autocomplete first option selected');
                }
            } catch (error) {
                logger.warn('No city autocomplete dropdown found, using typed value');
            }
            
            // Set timezone in hidden field
            await this.page.evaluate((tz) => {
                const el = document.querySelector('input[name="Timezone"]');
                if (el) el.value = tz;
            }, timezone);
            
            // Wait a bit for any autocomplete to work
            await this.delay(1000);
            
            // Handle timezone UTC checkbox
            if (birthData.timezone_utc) {
                try { await this.page.check('input[name="IsTimeUTC"][type="checkbox"]'); } catch (e) {}
            }
        } else {
            // New layout flow
            const success = await this.fillNewSiteForm(birthData, country, city, timezone);
            if (!success) {
                throw new Error('Unable to locate new site form fields');
            }
        }

        // Add delay to be respectful
        await this.delay(this.scrapingDelay);

        // Scroll to the submit button to make it more realistic
        await this.page.evaluate(() => {
            const submitButton = document.querySelector('.chart_form_bottom input[type="submit"]');
            if (submitButton) {
                submitButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        await this.delay(500);

        // Submit the form - try different submission methods
        logger.info('Submitting form');
        
        // Find the correct chart form (not the search form)
        const chartForm = await this.page.$('form[action="/Get_Your_Chart"]');
        if (!chartForm) {
            // Try alternative selectors for the chart form
            const forms = await this.page.$$('form');
            logger.info(`Found ${forms.length} forms on the page`);
            
            // Look for the form that contains our birth data fields
            let targetForm = null;
            for (let i = 0; i < forms.length; i++) {
                const hasNameField = await this.page.evaluate(form => {
                    // Legacy or new layout
                    return form.querySelector('input[name="Name"]') !== null ||
                           form.querySelector('input[placeholder="Name"]') !== null;
                }, forms[i]);
                
                if (hasNameField) {
                    targetForm = forms[i];
                    logger.info(`Found chart form at index ${i}`);
                    break;
                }
            }
            
            if (targetForm) {
                // Submit the specific chart form
                try {
                    await this.page.evaluate(form => form.submit && form.submit(), targetForm);
                    await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
                    logger.info('Chart form submitted programmatically');
                } catch (e) {
                    // If form submission didn't navigate (SPA), try clicking a button
                    const clicked = await this.page.evaluate(() => {
                        const candidates = Array.from(document.querySelectorAll('button, a, input[type="submit"], input[type="button"]'));
                        const btn = candidates.find(el => (el.textContent || el.value || '').toLowerCase().includes('create chart'));
                        if (btn) { btn.click(); return true; }
                        return false;
                    });
                    if (!clicked) {
                        logger.warn('Create Chart button not found during fallback submit');
                    }
                    await this.delay(5000);
                }
            } else {
                throw new Error('Could not find the chart form');
            }
        } else {
            // Submit the chart form directly
            await this.page.evaluate(form => form.submit(), chartForm);
            await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
            logger.info('Chart form submitted programmatically');
        }

        logger.info('Form submitted successfully');

        // Check the current URL after form submission
        const currentUrl = this.page.url();
        logger.info('Current URL after form submission', { currentUrl });
        
        if (currentUrl.includes('/Get_Your_Chart')) {
            // We're still on the form page, check for validation errors
            const validationErrors = await this.page.evaluate(() => {
                const errors = [];
                const errorElements = document.querySelectorAll('.field-validation-error, .validation-summary-errors, .error, [class*="error"]');
                errorElements.forEach(el => {
                    if (el.textContent.trim()) {
                        errors.push(el.textContent.trim());
                    }
                });
                return errors;
            });

            // Also check for any visible error messages
            const pageText = await this.page.evaluate(() => {
                return document.body.textContent;
            });

            logger.info('Form validation check', { 
                validationErrors, 
                pageContainsError: pageText.toLowerCase().includes('error'),
                pageContainsInvalid: pageText.toLowerCase().includes('invalid'),
                pageContainsRequired: pageText.toLowerCase().includes('required')
            });

            if (validationErrors.length > 0) {
                throw new Error(`Form validation failed: ${validationErrors.join(', ')}`);
            } else {
                // Let's try to continue parsing anyway - maybe the form was submitted successfully
                logger.warn('Form submission redirected back to form page, but no validation errors found. Continuing with parsing...');
            }
        } else if (currentUrl.includes('/Search')) {
            // Redirected to search page - this might be normal, let's continue parsing
            logger.info('Redirected to search page, continuing with parsing');
        }

        // Parse the response
        let chartData = null;
        if (this.lastCapturedJson) {
            chartData = this.transformCapturedJson(this.lastCapturedJson.data, birthData) || null;
        }
        if (!chartData) {
            chartData = await this.parseChartResponse();
        }

        // Cleanup listener
        this.page.off('response', responseListener);
        return chartData;
    }

    /**
     * Parse the chart response page
     */
    async parseChartResponse() {
        logger.info('Parsing chart response');

        // Wait for chart content to load
        try {
            await this.page.waitForSelector('.chart_results_container, .chart_properties, .error', { timeout: 10000 });
        } catch (error) {
            logger.warn('Chart container not found, checking for error page');
        }

        // Check if we got an error page
        const errorElement = await this.page.$('h1');
        if (errorElement) {
            const errorText = await this.page.evaluate(el => el.textContent, errorElement);
            if (errorText.includes('Oops') || errorText.includes('Something went wrong')) {
                throw new Error(`Chart generation failed: ${errorText}`);
            }
        }

        // Check if we're on the search page - this might mean the chart generation failed
        const currentUrl = this.page.url();
        if (currentUrl.includes('/Search')) {
            logger.warn('Redirected to search page - chart generation may have failed');
            // Return empty data but don't throw an error
            return {
                chart_properties: {},
                design_data: [],
                personality_data: [],
                chart_image_url: null,
                download_data: null,
            };
        }

        // Extract chart properties
        const chartProperties = await this.extractChartProperties();
        
        // Extract design data
        const designData = await this.extractDesignData();
        
        // Extract personality data
        const personalityData = await this.extractPersonalityData();
        
        // Extract chart image URL
        const chartImageUrl = await this.extractChartImageUrl();
        
        // Extract download data
        const downloadData = await this.extractDownloadData();

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
    async extractChartProperties() {
        const properties = await this.page.evaluate(() => {
            const propertiesDiv = document.querySelector('.chart_properties');
            if (!propertiesDiv) return {};

            const properties = {};
            const listItems = propertiesDiv.querySelectorAll('ul li');
            
            listItems.forEach(item => {
                const text = item.textContent.trim();
                if (text.includes(':')) {
                    const [key, value] = text.split(':').map(s => s.trim());
                    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    properties[normalizedKey] = value;
                }
            });

            return properties;
        });

        logger.info('Extracted chart properties', properties);
        return properties;
    }

    /**
     * Extract design data from the response
     */
    async extractDesignData() {
        const designData = await this.page.evaluate(() => {
            const chartContainer = document.querySelector('.chart_results_container');
            if (!chartContainer) return [];

            const designSection = Array.from(chartContainer.querySelectorAll('div')).find(div => 
                div.textContent.includes('Design')
            );

            if (!designSection) return [];

            const designElements = designSection.querySelectorAll('div, span');
            const designData = [];
            
            designElements.forEach(element => {
                const text = element.textContent.trim();
                if (text && text !== 'Design' && text !== 'Personality') {
                    designData.push(text);
                }
            });

            return designData;
        });

        return designData;
    }

    /**
     * Extract personality data from the response
     */
    async extractPersonalityData() {
        const personalityData = await this.page.evaluate(() => {
            const chartContainer = document.querySelector('.chart_results_container');
            if (!chartContainer) return [];

            const personalitySection = Array.from(chartContainer.querySelectorAll('div')).find(div => 
                div.textContent.includes('Personality')
            );

            if (!personalitySection) return [];

            const personalityElements = personalitySection.querySelectorAll('div, span');
            const personalityData = [];
            
            personalityElements.forEach(element => {
                const text = element.textContent.trim();
                if (text && text !== 'Design' && text !== 'Personality') {
                    personalityData.push(text);
                }
            });

            return personalityData;
        });

        return personalityData;
    }

    /**
     * Extract chart image URL
     */
    async extractChartImageUrl() {
        const imageUrl = await this.page.evaluate(() => {
            const imageElement = document.querySelector('.chart_bodygraph_container img');
            if (!imageElement) return null;

            const src = imageElement.src;
            if (src && !src.startsWith('http')) {
                return 'https://www.jovianarchive.com' + src;
            }
            return src;
        });

        return imageUrl;
    }

    /**
     * Extract download data
     */
    async extractDownloadData() {
        const downloadData = await this.page.evaluate(() => {
            const downloadForm = document.querySelector('.download_btn_container form input[name="data"]');
            return downloadForm ? downloadForm.value : null;
        });

        return downloadData;
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

        // If no match found, return the original input with proper capitalization
        logger.warn('No country mapping found for: ' + countryInput);
        return countryInput.charAt(0).toUpperCase() + countryInput.slice(1).toLowerCase();
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

        // If no match found, return the original input with proper capitalization
        logger.warn('No city mapping found for: ' + cityInput + ' in country: ' + country);
        return cityInput.charAt(0).toUpperCase() + cityInput.slice(1).toLowerCase();
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
     * Close the browser
     */
    async closeBrowser() {
        if (this.browser) {
            logger.info('Closing browser');
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }

    /**
     * Delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = JovianArchivePuppeteerService;

/**
 * Additional helpers appended to class via prototype to avoid large refactor
 */
JovianArchivePuppeteerService.prototype.fillNewSiteForm = async function (birthData, country, city, timezone) {
    const dateStr = `${String(birthData.day).padStart(2, '0')}/${String(birthData.month).padStart(2, '0')}/${birthData.year}`;
    const timeStr = `${String(birthData.hour).padStart(2, '0')}:${String(birthData.minute).padStart(2, '0')}`;

    const setInput = async (selectors, value) => {
        const frames = this.page.frames();
        for (const frame of frames) {
            const ok = await frame.evaluate(async ({ selectors, value }) => {
                const findDeep = (root, sel) => {
                    const direct = root.querySelector(sel);
                    if (direct) return direct;
                    const walk = (node) => {
                        const sr = node.shadowRoot;
                        if (sr) {
                            const hit = sr.querySelector(sel);
                            if (hit) return hit;
                            for (const child of sr.querySelectorAll('*')) {
                                const nested = findDeep(child, sel);
                                if (nested) return nested;
                            }
                        }
                        return null;
                    };
                    for (const el of root.querySelectorAll('*')) {
                        const res = walk(el);
                        if (res) return res;
                    }
                    return null;
                };
                for (const sel of selectors) {
                    const input = findDeep(document, sel);
                    if (input) {
                        input.focus && input.focus();
                        if ('value' in input) input.value = '';
                        input.dispatchEvent && input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.value = String(value);
                        input.dispatchEvent && input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent && input.dispatchEvent(new Event('change', { bubbles: true }));
                        input.blur && input.blur();
                        return true;
                    }
                }
                return false;
            }, { selectors, value }).catch(() => false);
            if (ok) { await this.delay(150); return true; }
        }
        return false;
    };

    const okName = await setInput([
        'input[placeholder="Name"]',
        'input[aria-label="Name"]',
        'input[name="name"]',
        'input[id*="name"]'
    ], birthData.name);

    const okEmail = await setInput([
        'input[placeholder="Email"]',
        'input[aria-label="Email"]',
        'input[type="email"]'
    ], (birthData.email && /@/.test(birthData.email))
        ? birthData.email
        : `${String(birthData.name || 'user').replace(/\s+/g, '.').toLowerCase()}@example.com`);

    const okDate = await setInput([
        'input[placeholder="DD/MM/YYYY"]',
        'input[type="date"]',
        'input[name*="date"]'
    ], dateStr);

    const okTime = await setInput([
        'input[placeholder="HH:mm"]',
        'input[type="time"]',
        'input[name*="time"]'
    ], timeStr);

    const okCountry = await setInput([
        'input[placeholder="Country"]',
        'input[aria-label="Country"]',
        'input[name*="country"]',
        'input[id*="country"]'
    ], country);

    // Try to accept the first suggestion if a dropdown appears
    try {
        await this.delay(400);
        await this.page.keyboard.press('ArrowDown');
        await this.page.keyboard.press('Enter');
    } catch (_) {}

    const okCity = await setInput([
        'input[placeholder="City"]',
        'input[aria-label="City"]',
        'input[name*="city"]',
        'input[id*="city"]'
    ], city);

    // Try to accept the first suggestion for city as well
    try {
        await this.delay(400);
        await this.page.keyboard.press('ArrowDown');
        await this.page.keyboard.press('Enter');
    } catch (_) {}

    const filledAny = okName || okEmail || okDate || okTime || okCountry || okCity;
    if (!filledAny) {
        logger.warn('New layout inputs not found via placeholder/labels');
        return false;
    }

    // Find and click Create Chart across frames
    let clicked = false;
    const frames = this.page.frames();
    for (const frame of frames) {
        const didClick = await frame.evaluate(async () => {
            const findDeepButton = () => {
                const matches = (el) => ['button','a','input'].includes((el.tagName||'').toLowerCase()) &&
                    ((el.textContent||'').toLowerCase().includes('create chart') || (el.value||'').toLowerCase().includes('create chart'));
                const stack = [document];
                while (stack.length) {
                    const root = stack.pop();
                    for (const el of root.querySelectorAll('button, a, input[type="submit"], input[type="button"]')) {
                        if (matches(el)) return el;
                    }
                    const all = root.querySelectorAll('*');
                    for (const el of all) {
                        if (el.shadowRoot) stack.push(el.shadowRoot);
                    }
                }
                return null;
            };
            const btn = findDeepButton();
            if (!btn) return false;
            const isDisabled = () => btn.disabled || btn.getAttribute('aria-disabled') === 'true' || btn.classList.contains('disabled');
            let tries = 20;
            while (tries-- > 0 && isDisabled()) {
                await new Promise(r => setTimeout(r, 200));
            }
            if (isDisabled()) { btn.disabled = false; btn.removeAttribute('aria-disabled'); }
            btn.scrollIntoView && btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            btn.click && btn.click();
            return true;
        }).catch(() => false);
        if (didClick) { clicked = true; break; }
    }

    // Wait for navigation or XHR completion
    try {
        await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    } catch (e) {
        await this.delay(5000);
    }

    // Best-effort timezone set
    await this.page.evaluate((tz) => {
        const el = document.querySelector('input[name="Timezone"], input[id*="timezone"], input[name*="timezone"]');
        if (el) el.value = tz;
    }, timezone);

    return true;
};

/**
 * Attempt to normalize captured JSON to our expected structure
 */
JovianArchivePuppeteerService.prototype.transformCapturedJson = function (json, birthData) {
    try {
        // Heuristics: look for property names related to chart content
        const asString = JSON.stringify(json).toLowerCase();
        const looksLikeChart = asString.includes('strategy') || asString.includes('authority') || asString.includes('profile');
        if (!looksLikeChart) return null;

        const out = {
            chart_properties: {},
            design_data: [],
            personality_data: [],
            chart_image_url: null,
            download_data: null,
        };

        // Try common locations
        const propsCandidates = [json.properties, json.chart_properties, json.result?.properties, json.data?.properties, json.data?.chart_properties];
        for (const cand of propsCandidates) {
            if (cand && typeof cand === 'object') {
                for (const [k, v] of Object.entries(cand)) {
                    out.chart_properties[String(k).toLowerCase().replace(/[^a-z0-9]/g, '_')] = String(v);
                }
                break;
            }
        }

        const imgCandidates = [json.image, json.chart_image_url, json.data?.image, json.data?.chart_image_url];
        for (const img of imgCandidates) {
            if (typeof img === 'string') {
                out.chart_image_url = img.startsWith('http') ? img : `https://www.jovianarchive.com${img}`;
                break;
            }
        }

        const dlCandidates = [json.download, json.download_data, json.data?.download, json.data?.download_data];
        for (const dl of dlCandidates) {
            if (typeof dl === 'string') { out.download_data = dl; break; }
        }

        return out;
    } catch (_) {
        return null;
    }
};

/**
 * Best-effort hCaptcha solver using 2Captcha (optional).
 * Requires env HCAPTCHA_API_KEY; optionally HCAPTCHA_SITEKEY to override.
 */
JovianArchivePuppeteerService.prototype.solveHCaptchaIfPresent = async function () {
    const apiKey = process.env.HCAPTCHA_API_KEY;
    if (!apiKey) {
        logger.info('HCAPTCHA_API_KEY not set; skipping captcha solving');
        return;
    }

    // Try to detect sitekey on page, else fallback to known/site env
    let sitekey = await this.page.evaluate(() => {
        const iframe = Array.from(document.querySelectorAll('iframe'))
            .find(f => (f.src || '').includes('hcaptcha.com')); 
        if (iframe) {
            const m = iframe.src.match(/sitekey=([^&]+)/);
            if (m) return decodeURIComponent(m[1]);
        }
        const widget = document.querySelector('[data-sitekey]');
        return widget ? widget.getAttribute('data-sitekey') : null;
    });
    if (!sitekey) {
        sitekey = process.env.HCAPTCHA_SITEKEY || 'f06e6c50-85a8-45c8-87d0-21a2b65856fe';
    }

    const pageUrl = this.baseUrl;
    logger.info('Attempting hCaptcha solve', { sitekey });

    const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
    const startUrl = `https://2captcha.com/in.php?key=${encodeURIComponent(apiKey)}&method=hcaptcha&json=1&sitekey=${encodeURIComponent(sitekey)}&pageurl=${encodeURIComponent(pageUrl)}`;
    const startRes = await fetch(startUrl).then(r => r.json());
    if (!startRes || startRes.status !== 1) {
        throw new Error('2Captcha start failed');
    }
    const requestId = startRes.request;

    // Poll for result
    const pollUrl = `https://2captcha.com/res.php?key=${encodeURIComponent(apiKey)}&action=get&json=1&id=${encodeURIComponent(requestId)}`;
    let token = null;
    for (let i = 0; i < 24; i++) { // up to ~60s
        await this.delay(2500);
        const res = await fetch(pollUrl).then(r => r.json());
        if (res.status === 1) { token = res.request; break; }
        if (res.request && res.request !== 'CAPCHA_NOT_READY') {
            logger.warn('2Captcha unexpected response', { request: res.request });
        }
    }
    if (!token) {
        throw new Error('2Captcha did not return a token in time');
    }

    await this.page.evaluate((captchaToken) => {
        // Common places hCaptcha stores responses
        const ta = document.querySelector('textarea[name="h-captcha-response"], textarea[id="g-recaptcha-response"]');
        if (ta) { ta.value = captchaToken; ta.dispatchEvent(new Event('change', { bubbles: true })); }
        if (window.hcaptcha && typeof window.hcaptcha.setResponse === 'function') {
            try { window.hcaptcha.setResponse(captchaToken); } catch (e) {}
        }
    }, token);

    logger.info('hCaptcha token injected');
};
