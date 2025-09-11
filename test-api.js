const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_DATA = {
    name: 'Test User',
    day: 15,
    month: 6,
    year: 1990,
    hour: 14,
    minute: 30,
    country: 'Pakistan',
    city: 'Peshawar',
    timezone_utc: false
};

async function testAPI() {
    console.log('🚀 Starting JovianArchive API Tests...\n');

    try {
        // Test 1: Health Check
        console.log('1. Testing Health Check...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health Check:', healthResponse.data);
        console.log('');

        // Test 2: Root Endpoint
        console.log('2. Testing Root Endpoint...');
        const rootResponse = await axios.get(`${BASE_URL}/`);
        console.log('✅ Root Endpoint:', rootResponse.data.message);
        console.log('Available endpoints:', Object.keys(rootResponse.data.endpoints));
        console.log('');

        // Test 3: Generate Chart (POST)
        console.log('3. Testing Chart Generation (POST)...');
        console.log('Request data:', TEST_DATA);

        const startTime = Date.now();
        const chartResponse = await axios.post(`${BASE_URL}/api/generate-chart`, TEST_DATA, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 120000 // 2 minutes timeout
        });
        const endTime = Date.now();

        console.log('✅ Chart Generation (POST):');
        console.log(`⏱️  Response time: ${(endTime - startTime) / 1000}s`);
        console.log('Success:', chartResponse.data.success);
        console.log('Message:', chartResponse.data.message);

        if (chartResponse.data.success && chartResponse.data.data) {
            const data = chartResponse.data.data;
            console.log('Chart Properties:');
            Object.entries(data.chart_properties || {}).forEach(([key, value]) => {
                console.log(`  ${key}: ${value}`);
            });
            console.log(`Design Data: ${data.design_data?.length || 0} items`);
            console.log(`Personality Data: ${data.personality_data?.length || 0} items`);
            console.log(`Chart Image URL: ${data.chart_image_url ? 'Available' : 'Not available'}`);
            console.log(`Download Data: ${data.download_data ? 'Available' : 'Not available'}`);
        }
        console.log('');

        // Test 4: Generate Chart (GET)
        console.log('4. Testing Chart Generation (GET)...');
        const queryParams = new URLSearchParams({
            name: TEST_DATA.name,
            day: TEST_DATA.day.toString(),
            month: TEST_DATA.month.toString(),
            year: TEST_DATA.year.toString(),
            hour: TEST_DATA.hour.toString(),
            minute: TEST_DATA.minute.toString(),
            country: TEST_DATA.country,
            city: TEST_DATA.city,
            timezone_utc: TEST_DATA.timezone_utc.toString()
        });

        const getStartTime = Date.now();
        const getChartResponse = await axios.get(`${BASE_URL}/api/generate-chart?${queryParams}`, {
            timeout: 120000 // 2 minutes timeout
        });
        const getEndTime = Date.now();

        console.log('✅ Chart Generation (GET):');
        console.log(`⏱️  Response time: ${(getEndTime - getStartTime) / 1000}s`);
        console.log('Success:', getChartResponse.data.success);
        console.log('Message:', getChartResponse.data.message);
        console.log('');

        // Test 5: Error Handling
        console.log('5. Testing Error Handling...');
        try {
            await axios.post(`${BASE_URL}/api/generate-chart`, {
                name: 'Test',
                // Missing required fields
            });
        } catch (error) {
            if (error.response && error.response.status === 422) {
                console.log('✅ Validation Error Handling:', error.response.data.message);
            } else {
                console.log('❌ Unexpected error:', error.message);
            }
        }
        console.log('');

        console.log('🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        process.exit(1);
    }
}

// Run tests
if (require.main === module) {
    testAPI();
}

module.exports = testAPI;
