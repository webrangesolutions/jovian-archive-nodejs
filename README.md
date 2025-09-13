# Jovian Archive Human Design Chart Scraper

A Node.js API service that generates Human Design charts by scraping data from the Jovian Archive website. This service provides a RESTful API to generate personalized Human Design charts based on birth data.

## 🚀 Features

- **Human Design Chart Generation**: Generate complete Human Design charts with personality and design data
- **Multiple Scraping Methods**: Uses Puppeteer (primary), Axios (fallback), and node-fetch (secondary fallback)
- **Anti-Bot Detection Bypass**: Successfully bypasses website anti-bot measures using headless browser automation
- **Comprehensive Chart Data**: Extracts chart properties, design data, personality data, chart images, and download data
- **RESTful API**: Clean JSON API with proper error handling and validation
- **Logging**: Comprehensive logging with Winston for debugging and monitoring

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Internet connection (for scraping Jovian Archive)

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
   PORT=3000
   NODE_ENV=development
   LOG_LEVEL=info
   ```

## 🚀 Running the Application

### Development Mode
```bash
npm start
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

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

**Endpoint:** `POST /api/generate-chart`

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
  "message": "Chart generated successfully",
  "data": {
    "birth_data": {
      "name": "John Smith",
      "day": 15,
      "month": 6,
      "year": 1990,
      "hour": 14,
      "minute": 30,
      "country": "Pakistan",
      "city": "Peshawar",
      "timezone_utc": false
    },
    "chart_properties": {
      "type": "Manifesting Generator",
      "strategy": "To Respond",
      "not_self_theme": "Frustration",
      "inner_authority": "Sacral",
      "profile": "2 / 4",
      "definition": "Single Definition",
      "incarnation_cross": "Right Angle Cross of Eden (12/11 | 36/6)",
      "birth_date__local_": "Jun, 15 1990, 14",
      "birth_place": "Peshawar (Khyber Pakhtunkhwa),Pakistan",
      "name": "John Smith"
    },
    "design_data": [
      "Share: DOWNLOAD",
      "Share:",
      "DOWNLOAD"
    ],
    "personality_data": [],
    "chart_image_url": "https://www.jovianarchive.com/content/charts/627810390000000000_.png",
    "download_data": "eyJOYW1lIjoiSm9obiBTbWl0aCI...",
    "generated_at": "2025-09-12T09:01:47.416Z"
  }
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

#### 2. Health Check (GET)
Check if the service is running.

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-12T09:01:47.416Z",
  "service": "jovian-archive-scraper"
}
```

## 🔧 Usage Examples

### cURL Example
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

1. **Primary**: `JovianArchivePuppeteerService` - Uses Puppeteer for headless browser automation
2. **Fallback 1**: `JovianArchiveService` - Uses Axios for HTTP requests
3. **Fallback 2**: `JovianArchiveFetchService` - Uses node-fetch for HTTP requests

### Directory Structure
```
src/
├── app.js                 # Main Express application
├── controllers/
│   └── chartController.js # Chart generation controller
├── middleware/
│   └── validation.js      # Request validation middleware
├── routes/
│   └── chartRoutes.js     # API routes
├── services/
│   ├── JovianArchiveService.js        # Axios-based scraper
│   ├── JovianArchivePuppeteerService.js # Puppeteer-based scraper
│   └── JovianArchiveFetchService.js   # node-fetch-based scraper
└── utils/
    └── logger.js          # Winston logger configuration
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

### Manual Testing
Use the provided test script:
```bash
node test-api.js
```

### API Testing
Test the health endpoint:
```bash
curl http://localhost:3000/api/health
```

## 📊 Response Data Structure

### Chart Properties
The `chart_properties` object contains:
- `type`: Human Design type (Generator, Manifesting Generator, Projector, etc.)
- `strategy`: Life strategy
- `not_self_theme`: Not-self theme
- `inner_authority`: Inner authority
- `profile`: Profile (e.g., "2 / 4")
- `definition`: Definition type
- `incarnation_cross`: Incarnation cross
- `birth_date__local_`: Formatted birth date
- `birth_place`: Birth location
- `name`: Person's name

### Chart Image
The `chart_image_url` provides a direct link to the generated chart image.

### Download Data
The `download_data` field contains base64-encoded data for downloading the chart.

## 🔒 Security Considerations

- The service respects the target website's terms of service
- Implements proper delays between requests
- Uses realistic browser headers and behavior
- Includes proper error handling and logging

## 📝 License

This project is for educational and personal use. Please respect the Jovian Archive website's terms of service and robots.txt file.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs for error details
3. Create an issue in the repository

---

**Note**: This service is designed to work with the Jovian Archive website. Please ensure you comply with their terms of service and use the service responsibly.
