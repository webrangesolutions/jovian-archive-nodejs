const axios = require('axios');
const logger = require('../utils/logger');

class MaiaMechanicsApiService {
    constructor() {
        this.baseUrl = process.env.MAIA_MECHANICS_API_URL || 'https://app.maiamechanics.com/api-v2/api/web-calculator/server-side-generation';
        this.calculatorToken = process.env.MAIA_CALCULATOR_TOKEN || '';
    }

    async submitBirthData(birthData) {
        try {
            if (!this.calculatorToken) {
                throw new Error('MAIA_CALCULATOR_TOKEN is not set');
            }

            const { name, email, day, month, year, hour, minute } = birthData;
            const countryName = birthData.country || '';
            const cityName = birthData.city || '';

            const countryCode = this.getCountryCode(countryName) || countryName;
            const timezone = this.getTimezoneForCity(cityName) || 'UTC';

            // Build ISO date/time strings
            const dateIso = new Date(Date.UTC(year, (month || 1) - 1, day || 1, 0, 0, 0, 0)).toISOString();
            const timeIso = new Date(Date.UTC(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0, 0)).toISOString();

            const payload = {
                docType: 'rave',
                data: {
                    verified: true,
                    userConsentGiven: false,
                    receiveChartByEmail: false,
                    type: 'rave',
                    city: { name: cityName, timezone, tz: timezone },
                    country: { id: countryCode, name: countryName, tz: timezone },
                    date: dateIso,
                    time: timeIso,
                    name: name || 'User',
                    email: email || 'user@example.com',
                },
                tzData: {
                    name: name || 'User',
                    country: countryCode,
                    city: cityName,
                    timezone,
                    timeInUtc: !!birthData.timezone_utc,
                    time: timeIso.replace(/\.\d{3}Z$/, 'Z'),
                },
            };

            // Optional evPayload support via env (if needed by API)
            if (process.env.MAIA_EV_PAYLOAD) {
                payload.data.evPayload = process.env.MAIA_EV_PAYLOAD;
            }

            logger.info('Calling Maia Mechanics API', { url: this.baseUrl });

            const response = await axios.post(this.baseUrl, payload, {
                timeout: 60000,
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'content-type': 'application/json',
                    'calculator-token': this.calculatorToken,
                    'origin': 'https://jovianarchive.com',
                    'referer': 'https://jovianarchive.com/',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
                },
                validateStatus: (s) => s >= 200 && s < 300,
            });

            const apiData = response.data || {};
            return { success: true, data: apiData };
        } catch (error) {
            logger.error('Maia Mechanics API call failed', {
                error: error.message,
                responseStatus: error.response?.status,
                responseData: (error.response?.data && typeof error.response.data === 'object') ? Object.keys(error.response.data) : String(error.response?.data || '' ).slice(0, 200),
            });
            return { success: false, error: error.message };
        }
    }

    getCountryCode(countryName) {
        const map = {
            'Pakistan': 'PK',
            'United States': 'US', 'USA': 'US', 'United States of America': 'US',
            'United Kingdom': 'GB', 'UK': 'GB', 'Great Britain': 'GB',
            'Canada': 'CA', 'Australia': 'AU', 'India': 'IN', 'China': 'CN', 'Japan': 'JP',
            'Germany': 'DE', 'France': 'FR', 'Italy': 'IT', 'Spain': 'ES', 'Brazil': 'BR',
            'Mexico': 'MX', 'Russia': 'RU', 'South Africa': 'ZA', 'Egypt': 'EG', 'Turkey': 'TR',
        };
        return map[countryName] || null;
    }

    getTimezoneForCity(city) {
        const tz = {
            'Peshawar': 'Asia/Karachi', 'Karachi': 'Asia/Karachi', 'Lahore': 'Asia/Karachi', 'Islamabad': 'Asia/Karachi',
            'New York': 'America/New_York', 'Los Angeles': 'America/Los_Angeles', 'Chicago': 'America/Chicago',
            'London': 'Europe/London', 'Paris': 'Europe/Paris', 'Tokyo': 'Asia/Tokyo', 'Sydney': 'Australia/Sydney',
        };
        for (const key of Object.keys(tz)) {
            if ((city || '').toLowerCase().includes(key.toLowerCase())) return tz[key];
        }
        return 'UTC';
    }
}

module.exports = MaiaMechanicsApiService;


