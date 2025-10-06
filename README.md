# Human Design Chart API

A Node.js API service that generates Human Design charts using the Maia Mechanics API. This service provides a RESTful API to generate personalized Human Design charts based on birth data with comprehensive chart information and planetary activations.

## 🚀 Features

- **Human Design Chart Generation**: Generate complete Human Design charts with personality and design data
- **Direct API Integration**: Uses Maia Mechanics API for reliable, fast chart generation
- **No Captcha Required**: Direct API calls eliminate the need for captcha solving
- **Comprehensive Chart Data**: Extracts chart properties, planetary activations, centers, channels, and gates
- **Human-Readable Format**: Returns data with proper labels, planet names, and directional arrows
- **RESTful API**: Clean JSON API with proper error handling and validation
- **Multiple Endpoints**: Supports both POST and GET requests for chart generation
- **Fallback Support**: Puppeteer/axios/fetch fallbacks if Maia API fails
- **Security Features**: Rate limiting, CORS protection, helmet security headers, and input validation
- **Logging**: Comprehensive logging with Winston for debugging and monitoring
- **Production Ready**: Optimized for deployment on Render.com and other cloud platforms

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Internet connection (for Maia Mechanics API)
- Maia Mechanics API token (for primary functionality)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd jovian-archive-nodejs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # Maia Mechanics API Configuration
   MAIA_CALCULATOR_TOKEN=your_maia_mechanics_token_here
   MAIA_EV_PAYLOAD=optional_ev_payload_if_needed
   
   # Logging
   LOG_LEVEL=info
   LOG_FILE=./logs/app.log
   
   # Security
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

## 🚀 Running the Application

### Development Mode
```bash
npm start
```

### Development with Auto-reload
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

### Testing the API
```bash
# Run the included test script
node test-api.js

# Or test manually
curl http://localhost:3000/health
```

### Available Scripts
```bash
npm start          # Start the production server
npm run dev        # Start development server with auto-reload
npm test           # Run tests (Jest)
```

## ☁️ Deployment

### Render.com Deployment

1. **Connect your GitHub repository** to Render.com
2. **Create a new Web Service** with these settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: `Node`
   - **Node Version**: `18` or higher

3. **Environment Variables** (set in Render dashboard):
   ```env
   NODE_ENV=production
   PORT=10000
   LOG_LEVEL=info
   ```

4. **Render.com Specific Notes**:
   - The service is optimized for Render's free tier limitations
   - Puppeteer is configured with `--single-process` for memory efficiency
   - Viewport is reduced to 1280x720 to save memory
   - Automatic fallback to Axios if Puppeteer fails

### Other Platforms

For other deployment platforms (Heroku, Railway, etc.), ensure:
- Node.js 18+ is available
- Chrome/Chromium is installed (for Puppeteer)
- Sufficient memory allocation (512MB+ recommended)

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### 1. Generate Chart (POST)
Generate a Human Design chart from birth data.

**Endpoint:** `POST /api/generate-chart` or `POST /api/submit-birth-data`

**Request Body:**
```json
{
  "name": "John Smith",
  "day": 15,
  "month": 6,
  "year": 1990,
  "hour": 14,
  "minute": 30,
  "country": "Pakistan",
  "city": "Peshawar",
  "timezone_utc": false
}
```

**Field Descriptions:**
- `name` (string, required): Full name of the person
- `day` (number, required): Birth day (1-31)
- `month` (number, required): Birth month (1-12)
- `year` (number, required): Birth year (1900-2100)
- `hour` (number, required): Birth hour (0-23)
- `minute` (number, required): Birth minute (0-59)
- `country` (string, required): Birth country name
- `city` (string, required): Birth city name
- `timezone_utc` (boolean, required): Whether the time is in UTC (true) or local time (false)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Chart generated successfully using Maia Mechanics API",
  "data": {
    "birth_data": {
      "name": "John Smith",
      "date_local": "June 15, 1990, 2:30 PM PKT",
      "date_utc": "June 15, 1990, 9:30 AM UTC",
      "location": {
        "city": "Peshawar",
        "country": "Pakistan"
      }
    },
    "properties": {
      "type": "Manifestor",
      "strategy": "Inform",
      "signature": "Peace",
      "not_self_theme": "Anger",
      "authority": "Sacral",
      "definition": "Single",
      "incarnation_cross": "Cross 137",
      "profile": "2/4",
      "variable": "Variable 10"
    },
    "chart_data": {
      "centers": [1, 2, 0, 1, 1, 2, 2, 1, 1],
      "channels": [28, 11],
      "gates": ["1:2", "2:1", "6:0", "7:0", "11:1", "12:1", "13:0", "14:0", "15:0", "19:2", "20:1", "21:1", "33:1", "36:0", "38:2", "41:0", "53:1", "58:2", "61:2", "63:1"],
      "design_activations": [
        "Sun 12.2 ▲",
        "Earth 11.2 ▲",
        "Moon 63.3 ▲",
        "North Node 19.1 ▲",
        "South Node 33.1 ▲",
        "Mercury 20.6 ▲",
        "Venus 2.6 ▲",
        "Mars 21.2 ▲",
        "Jupiter 53.1 ▲",
        "Saturn 61.4 ▲",
        "Uranus 58.5 ▲",
        "Neptune 38.5 ▲",
        "Pluto 1.3 ▲"
      ],
      "personality_activations": [
        "Sun 36.4 ▲",
        "Earth 6.4 ▲",
        "Moon 14.2 ▲",
        "North Node 13.3 ▲",
        "South Node 7.3 ▲",
        "Mercury 36.2 ▲",
        "Venus 19.3 ▲",
        "Mars 41.3 ▲",
        "Jupiter 15.4 ▲",
        "Saturn 61.3 ▲",
        "Uranus 58.6 ▲",
        "Neptune 38.6 ▲",
        "Pluto 1.5 ▲"
      ]
    },
    "raw_data": { /* original Maia Mechanics API response */ }
  },
  "source": "maia_mechanics"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to generate chart",
  "error": "Error description"
}
```

#### 2. Generate Chart (GET)
Generate a Human Design chart using query parameters (useful for testing).

**Endpoint:** `GET /api/generate-chart` or `GET /api/submit-birth-data`

**Query Parameters:**
```
?name=John Smith&day=15&month=6&year=1990&hour=14&minute=30&country=Pakistan&city=Peshawar&timezone_utc=false
```

#### 3. Health Check (GET)
Check if the service is running.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "success": true,
  "message": "JovianArchive Scraper API is running",
  "timestamp": "2025-01-17T10:00:00.000Z",
  "version": "1.0.0"
}
```

## 🔧 Usage Examples

### cURL Examples

#### POST Request
```bash
curl -X POST http://localhost:3000/api/generate-chart \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "day": 15,
    "month": 6,
    "year": 1990,
    "hour": 14,
    "minute": 30,
    "country": "Pakistan",
    "city": "Peshawar",
    "timezone_utc": false
  }'
```

#### GET Request
```bash
curl "http://localhost:3000/api/generate-chart?name=John%20Smith&day=15&month=6&year=1990&hour=14&minute=30&country=Pakistan&city=Peshawar&timezone_utc=false"
```

### JavaScript/Node.js Example
```javascript
const axios = require('axios');

const generateChart = async () => {
  try {
    const response = await axios.post('http://localhost:3000/api/generate-chart', {
      name: 'John Smith',
      day: 15,
      month: 6,
      year: 1990,
      hour: 14,
      minute: 30,
      country: 'Pakistan',
      city: 'Peshawar',
      timezone_utc: false
    });
    
    console.log('Chart generated:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
};

generateChart();
```

### Python Example
```python
import requests
import json

def generate_chart():
    url = 'http://localhost:3000/api/generate-chart'
    data = {
        'name': 'John Smith',
        'day': 15,
        'month': 6,
        'year': 1990,
        'hour': 14,
        'minute': 30,
        'country': 'Pakistan',
        'city': 'Peshawar',
        'timezone_utc': False
    }
    
    response = requests.post(url, json=data)
    
    if response.status_code == 200:
        print('Chart generated:', response.json())
    else:
        print('Error:', response.json())

generate_chart()
```

## 🏗️ Architecture

### Service Architecture
The application uses a multi-layered architecture with fallback mechanisms:

1. **Primary**: `MaiaMechanicsApiService` - Direct API integration with Maia Mechanics
2. **Fallback 1**: `JovianArchivePuppeteerService` - Uses Puppeteer for headless browser automation
3. **Fallback 2**: `JovianArchiveService` - Uses Axios for HTTP requests
4. **Fallback 3**: `JovianArchiveFetchService` - Uses node-fetch for HTTP requests

### Directory Structure
```
jovian-archive-nodejs/
├── src/
│   ├── app.js                 # Main Express application
│   ├── controllers/
│   │   └── chartController.js # Chart generation controller
│   ├── middleware/
│   │   └── validation.js      # Request validation middleware
│   ├── routes/
│   │   └── chartRoutes.js     # API routes
│   ├── services/
│   │   ├── MaiaMechanicsApiService.js      # Maia Mechanics API integration
│   │   ├── JovianArchiveService.js        # Axios-based scraper (fallback)
│   │   ├── JovianArchivePuppeteerService.js # Puppeteer-based scraper (fallback)
│   │   └── JovianArchiveFetchService.js   # node-fetch-based scraper (fallback)
│   └── utils/
│       └── logger.js          # Winston logger configuration
├── logs/                      # Application logs
├── test-api.js               # API testing script
├── debug-*.js                # Debug scripts
├── package.json              # Dependencies and scripts
├── env.example               # Environment variables template
├── DEPLOYMENT.md             # Deployment guide
└── README.md                 # This file
```

## 🔍 Troubleshooting

### Common Issues

1. **500 Internal Server Error**
   - The service automatically tries multiple scraping methods
   - Check logs for detailed error information
   - Ensure internet connection is stable

2. **Form Validation Errors**
   - Ensure all required fields are provided
   - Check that date/time values are valid
   - Verify country and city names are spelled correctly

3. **Puppeteer Issues**
   - Ensure sufficient system resources
   - Check if headless browser can launch
   - Verify Chrome/Chromium is available

4. **Render.com Specific Issues**
   - **Memory Limit**: Free tier has 512MB limit - service is optimized for this
   - **Cold Starts**: First request may take longer due to browser initialization
   - **Timeout**: Requests may timeout on free tier - consider upgrading for production
   - **Chrome Path**: Service automatically detects Render environment and uses correct Chrome path

### Logging
The application uses Winston for comprehensive logging. Logs include:
- Request/response information
- Scraping progress
- Error details
- Performance metrics

Log level can be configured in the `.env` file:
```env
LOG_LEVEL=info  # debug, info, warn, error
```

## 🧪 Testing

### Automated Testing
Use the provided test script:
```bash
node test-api.js
```

This script will test:
- Health check endpoint
- Root endpoint with API documentation
- Chart generation via POST request
- Chart generation via GET request
- Error handling

### Manual API Testing
Test individual endpoints:
```bash
# Health check
curl http://localhost:3000/health

# Root endpoint with API info
curl http://localhost:3000/

# Chart generation (POST)
curl -X POST http://localhost:3000/api/generate-chart \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","day":15,"month":6,"year":1990,"hour":14,"minute":30,"country":"Pakistan","city":"Peshawar","timezone_utc":false}'
```

## 📊 Response Data Structure

### Birth Data
The `birth_data` object contains:
- `name`: Person's name
- `date_local`: Formatted local birth date and time
- `date_utc`: Formatted UTC birth date and time
- `location`: Birth location with city and country

### Properties
The `properties` object contains:
- `type`: Human Design type (Generator, Manifestor, Projector, Reflector, Manifesting Generator)
- `strategy`: Life strategy (Wait to Respond, Inform, Wait for Invitation, etc.)
- `signature`: Signature (Satisfaction, Peace, Success, Surprise)
- `not_self_theme`: Not-self theme (Frustration, Anger, Bitterness, Disappointment)
- `authority`: Inner authority (Sacral, Emotional Solar Plexus, Splenic, etc.)
- `definition`: Definition type (Single, Split, Triple Split, Quadruple Split)
- `incarnation_cross`: Incarnation cross (e.g., "Cross 137")
- `profile`: Profile (e.g., "2/4")
- `variable`: Variable information

### Chart Data
The `chart_data` object contains:
- `centers`: Array of center states (0=undefined, 1=defined, 2=defined)
- `channels`: Array of defined channels
- `gates`: Array of gates with modes (e.g., "1:2", "2:1")
- `design_activations`: Array of design planetary activations with planet names and arrows
- `personality_activations`: Array of personality planetary activations with planet names and arrows

### Raw Data
The `raw_data` field contains the original Maia Mechanics API response for advanced use.

## 🔒 Security Considerations

- **Rate Limiting**: Built-in rate limiting to prevent abuse (50 requests per 15 minutes by default)
- **CORS Protection**: Configurable CORS settings for production environments
- **Security Headers**: Helmet.js provides security headers
- **Input Validation**: Joi validation for request data
- **Error Handling**: Comprehensive error handling without exposing sensitive information
- **API Integration**: Uses official Maia Mechanics API for reliable data access
- **Terms of Service**: The service complies with Maia Mechanics API terms of service
- **Fallback Mechanisms**: Graceful fallback to website scraping if API fails

## 📦 Dependencies

### Core Dependencies
- **express**: Web framework for Node.js
- **axios**: HTTP client for Maia Mechanics API and fallback requests
- **puppeteer**: Headless Chrome automation for fallback scraping
- **node-fetch**: Lightweight HTTP client (fallback)
- **cheerio**: Server-side jQuery implementation for HTML parsing
- **winston**: Logging library
- **joi**: Object schema validation
- **helmet**: Security middleware
- **cors**: Cross-Origin Resource Sharing middleware
- **morgan**: HTTP request logger
- **compression**: Gzip compression middleware
- **express-rate-limit**: Rate limiting middleware

### Development Dependencies
- **nodemon**: Development server with auto-reload
- **jest**: Testing framework

## 📝 License

This project is for educational and personal use. Please respect the Maia Mechanics API terms of service and use the service responsibly.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
1. **Check the troubleshooting section** above for common solutions
2. **Review the logs** in the `logs/` directory for detailed error information
3. **Run the test script** (`node test-api.js`) to verify functionality
4. **Check the deployment guide** (`DEPLOYMENT.md`) for deployment-specific issues
5. **Create an issue** in the repository with:
   - Error logs
   - Request/response data (without sensitive information)
   - Environment details (Node.js version, OS, etc.)

---

**Note**: This service is designed to work with the Maia Mechanics API for Human Design chart generation. Please ensure you comply with their terms of service and use the service responsibly.
