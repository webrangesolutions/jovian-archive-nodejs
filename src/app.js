require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const chartRoutes = require('./routes/chartRoutes');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com'] // Replace with your production domain
        : true, // Allow all origins in development
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 50, // limit each IP to 50 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api', chartRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'JovianArchive Scraper API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Root endpoint with API documentation
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'JovianArchive Human Design Chart Scraper API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            generate_chart_post: 'POST /api/generate-chart',
            generate_chart_get: 'GET /api/generate-chart',
            submit_birth_data_post: 'POST /api/submit-birth-data',
            submit_birth_data_get: 'GET /api/submit-birth-data'
        },
        example_request: {
            method: 'POST',
            url: '/api/generate-chart',
            body: {
                name: 'John Doe',
                day: 15,
                month: 6,
                year: 1990,
                hour: 14,
                minute: 30,
                country: 'Pakistan',
                city: 'Peshawar',
                timezone_utc: false
            }
        },
        example_response: {
            success: true,
            message: 'Chart generated successfully',
            data: {
                birth_data: { /* birth data */ },
                chart_properties: {
                    type: 'Generator',
                    strategy: 'To Respond',
                    not_self_theme: 'Frustration',
                    inner_authority: 'Sacral',
                    profile: '1/3',
                    definition: 'Single Definition',
                    incarnation_cross: 'Right Angle Cross of the Sphinx'
                },
                design_data: [ /* design data array */ ],
                personality_data: [ /* personality data array */ ],
                chart_image_url: 'https://www.jovianarchive.com/chart-image-url',
                download_data: 'base64-encoded-chart-data',
                generated_at: '2025-01-17T10:00:00.000Z'
            }
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl,
        available_endpoints: [
            'GET /',
            'GET /health',
            'POST /api/generate-chart',
            'GET /api/generate-chart',
            'POST /api/submit-birth-data',
            'GET /api/submit-birth-data'
        ]
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    });

    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    logger.info(`JovianArchive Scraper API server started`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

module.exports = app;
