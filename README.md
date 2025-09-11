# JovianArchive Human Design Chart Scraper - Node.js API

A Node.js API service that scrapes Human Design charts from JovianArchive website. This is a simplified API-only version that accepts birth data and returns generated chart information without database storage or frontend UI.

## 🌟 Features

- **Direct Chart Generation** - Generate Human Design charts via API endpoints
- **Web Scraping** - Intelligent scraping of JovianArchive website
- **Anti-forgery Handling** - Automatic token extraction and form submission
- **Location Mapping** - Smart country and city autocomplete mapping
- **Rate Limiting** - Built-in protection against abuse
- **Comprehensive Logging** - Detailed logging for debugging
- **Error Handling** - Robust error handling and retry mechanisms

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn

### Installation

1. **Clone or download the project**
```bash
cd jovian-archive-nodejs
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp env.example .env
```

4. **Start the application**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3000`

## 📖 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### 1. Generate Chart (POST)

**POST** `/api/generate-chart`

Generate a Human Design chart from birth data.

**Request Body:**
```json
{
    "name": "John Doe",
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
- `name` (required): Full name of the person
- `day` (required): Birth day (1-31)
- `month` (required): Birth month (1-12)
- `year` (required): Birth year (1900-2100)
- `hour` (required): Birth hour (0-23)
- `minute` (required): Birth minute (0-59)
- `country` (required): Birth country name
- `city` (required): Birth city name
- `timezone_utc` (optional): Whether birth time is already in UTC (default: false)

**Success Response (200):**
```json
{
    "success": true,
    "message": "Chart generated successfully",
    "data": {
        "birth_data": {
            "name": "John Doe",
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
            "type": "Generator",
            "strategy": "To Respond",
            "not_self_theme": "Frustration",
            "inner_authority": "Sacral",
            "profile": "1/3",
            "definition": "Single Definition",
            "incarnation_cross": "Right Angle Cross of the Sphinx",
            "birth_date_local": "Jun, 15 1990, 14:30 (UTC + 5)",
            "birth_place": "Peshawar, Pakistan"
        },
        "design_data": ["Design data array"],
        "personality_data": ["Personality data array"],
        "chart_image_url": "https://www.jovianarchive.com/chart-image-url",
        "download_data": "base64-encoded-chart-data",
        "generated_at": "2025-01-17T10:00:00.000Z"
    }
}
```

#### 2. Generate Chart (GET)

**GET** `/api/generate-chart`

Generate chart using query parameters (useful for testing).

**Query Parameters:**
- `name` (required): Full name
- `day` (required): Birth day
- `month` (required): Birth month
- `year` (required): Birth year
- `hour` (required): Birth hour
- `minute` (required): Birth minute
- `country` (required): Birth country
- `city` (required): Birth city
- `timezone_utc` (optional): Whether birth time is in UTC

**Example:**
```
GET /api/generate-chart?name=John%20Doe&day=15&month=6&year=1990&hour=14&minute=30&country=Pakistan&city=Peshawar&timezone_utc=false
```

#### 3. Alternative Endpoints

- **POST** `/api/submit-birth-data` - Same as `/api/generate-chart`
- **GET** `/api/submit-birth-data` - Same as GET `/api/generate-chart`

#### 4. Health Check

**GET** `/health`

Check if the API is running.

**Response:**
```json
{
    "success": true,
    "message": "JovianArchive Scraper API is running",
    "timestamp": "2025-01-17T10:00:00.000Z",
    "version": "1.0.0"
}
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with these variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JovianArchive Configuration
JOVIAN_ARCHIVE_URL=https://www.jovianarchive.com/Get_Your_Chart
JOVIAN_ARCHIVE_MAX_RETRIES=3
JOVIAN_ARCHIVE_SCRAPING_DELAY=2000
JOVIAN_ARCHIVE_RATE_LIMIT_PER_MINUTE=10

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
```

### Configuration Options

- **PORT**: Server port (default: 3000)
- **NODE_ENV**: Environment (development/production)
- **JOVIAN_ARCHIVE_URL**: JovianArchive form URL
- **JOVIAN_ARCHIVE_MAX_RETRIES**: Maximum retry attempts
- **JOVIAN_ARCHIVE_SCRAPING_DELAY**: Delay between requests (ms)
- **LOG_LEVEL**: Logging level (error/warn/info/debug)
- **RATE_LIMIT_MAX_REQUESTS**: Max requests per IP per window

## 🧪 Testing

### cURL Examples

#### Generate Chart (POST)
```bash
curl -X POST http://localhost:3000/api/generate-chart \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "day": 22,
    "month": 3,
    "year": 1985,
    "hour": 9,
    "minute": 15,
    "country": "United Kingdom",
    "city": "London",
    "timezone_utc": false
  }'
```

#### Generate Chart (GET)
```bash
curl "http://localhost:3000/api/generate-chart?name=John%20Doe&day=15&month=6&year=1990&hour=14&minute=30&country=Pakistan&city=Peshawar&timezone_utc=false"
```

#### Health Check
```bash
curl http://localhost:3000/health
```

### JavaScript Examples

#### Generate Chart
```javascript
const response = await fetch('http://localhost:3000/api/generate-chart', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    body: JSON.stringify({
        name: 'John Doe',
        day: 15,
        month: 6,
        year: 1990,
        hour: 14,
        minute: 30,
        country: 'Pakistan',
        city: 'Peshawar',
        timezone_utc: false
    })
});

const result = await response.json();
console.log(result);
```

## 📊 Error Handling

### Error Types

1. **Validation Errors (422)**: Invalid input data
2. **Server Errors (500)**: Scraping failures, network issues
3. **Rate Limiting (429)**: Too many requests

### Error Response Format

```json
{
    "success": false,
    "message": "Error message describing what went wrong",
    "error": "Detailed error information",
    "errors": {
        "field_name": ["Validation error message"]
    }
}
```

## 🔧 Technical Details

### Web Scraping Implementation

The service implements sophisticated web scraping:

1. **Form Page Retrieval**: Gets the initial form page
2. **Token Extraction**: Extracts anti-forgery tokens
3. **Form Submission**: Submits birth data with proper headers
4. **Data Parsing**: Extracts chart information from HTML response
5. **Error Recovery**: Handles failures with retry mechanisms

### Supported Locations

The service includes comprehensive location mapping for:

- **Countries**: Pakistan, USA, UK, Canada, Australia, India, China, Japan, Germany, France, Italy, Spain, Brazil, Mexico, Russia, and many more
- **Cities**: Major cities in each country with proper autocomplete formatting

### Rate Limiting

- **50 requests per 15 minutes** per IP address
- **2-second delay** between scraping requests
- **Maximum 3 retries** on failure
- **Exponential backoff** on retries

## 🚀 Deployment

### Production Considerations

1. **Environment Variables**: Set all required environment variables
2. **Logging**: Configure proper logging levels
3. **SSL**: Use HTTPS in production
4. **Rate Limiting**: Adjust rate limits based on usage
5. **Monitoring**: Set up monitoring and alerting

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

EXPOSE 3000

CMD ["npm", "start"]
```

### PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Start the application
pm2 start src/app.js --name "jovian-archive-api"

# Save PM2 configuration
pm2 save
pm2 startup
```

## 📝 API Examples

### Complete Example

```bash
# 1. Check if API is running
curl http://localhost:3000/health

# 2. Generate a chart
curl -X POST http://localhost:3000/api/generate-chart \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "day": 1,
    "month": 1,
    "year": 2000,
    "hour": 12,
    "minute": 0,
    "country": "Pakistan",
    "city": "Karachi",
    "timezone_utc": false
  }'

# 3. Generate chart via GET (for testing)
curl "http://localhost:3000/api/generate-chart?name=Test%20User&day=1&month=1&year=2000&hour=12&minute=0&country=Pakistan&city=Karachi&timezone_utc=false"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

1. Check the logs in the `logs/` directory
2. Verify your environment configuration
3. Test with the provided examples
4. Check the JovianArchive website for any changes

---

**JovianArchive Human Design Chart Scraper API** - Generate charts with precision and reliability. 🌟
