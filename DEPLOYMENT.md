# 🚀 Deployment Guide for Jovian Archive Scraper

## Render.com Deployment Checklist

### ✅ Pre-Deployment Steps

1. **Code is Ready**
   - [x] Puppeteer optimized for Render.com (`--single-process`, reduced viewport)
   - [x] Environment detection for Chrome path
   - [x] Fallback mechanisms (Puppeteer → Axios → node-fetch)
   - [x] Memory-efficient configuration

2. **Repository Setup**
   - [x] Code pushed to GitHub
   - [x] All dependencies in `package.json`
   - [x] `engines` field specifies Node.js 18+

### 🔧 Render.com Configuration

1. **Create New Web Service**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: `Node`
   - **Node Version**: `18` or higher

2. **Environment Variables**
   ```env
   NODE_ENV=production
   PORT=10000
   LOG_LEVEL=info
   ```

3. **Advanced Settings**
   - **Auto-Deploy**: Yes (from main branch)
   - **Health Check Path**: `/health`

### 🧪 Post-Deployment Testing

1. **Health Check**
   ```bash
   curl https://your-app.onrender.com/health
   ```

2. **Chart Generation Test**
   ```bash
   curl -X POST https://your-app.onrender.com/api/generate-chart \
     -H "Content-Type: application/json" \
     -d '{"name":"Test User","day":15,"month":6,"year":1990,"hour":14,"minute":30,"country":"Pakistan","city":"Peshawar","timezone_utc":false}'
   ```

### 🚨 Common Issues & Solutions

#### Issue: 500 Internal Server Error
**Causes:**
- Puppeteer memory issues on free tier
- Chrome/Chromium not found
- Network timeouts

**Solutions:**
- Service automatically falls back to Axios
- Check Render logs for specific errors
- Consider upgrading to paid tier for production

#### Issue: Cold Start Delays
**Cause:** Free tier containers sleep after inactivity

**Solution:** 
- First request may take 30-60 seconds
- Consider using a monitoring service to keep it warm

#### Issue: Memory Limit Exceeded
**Cause:** Free tier has 512MB limit

**Solutions:**
- Service is optimized for this limit
- Reduced viewport size (1280x720)
- Single-process mode for Puppeteer

### 📊 Monitoring

1. **Check Render Dashboard**
   - Monitor memory usage
   - Check deployment logs
   - Watch for error rates

2. **Health Monitoring**
   ```bash
   # Set up a simple health check
   curl -f https://your-app.onrender.com/health || echo "Service down"
   ```

### 🔄 Updates

1. **Code Changes**
   - Push to GitHub
   - Render auto-deploys from main branch
   - Monitor deployment logs

2. **Environment Changes**
   - Update variables in Render dashboard
   - Redeploy if needed

### 🎯 Production Recommendations

1. **Upgrade to Paid Tier**
   - More memory (1GB+)
   - No sleep mode
   - Better performance

2. **Add Monitoring**
   - Uptime monitoring
   - Error tracking
   - Performance metrics

3. **Rate Limiting**
   - Already implemented in the service
   - Consider additional limits for production

---

## 🎉 Your API is Live!

Once deployed, your Human Design Chart API will be available at:
`https://your-app.onrender.com/api/generate-chart`

**Example Usage:**
```javascript
const response = await fetch('https://your-app.onrender.com/api/generate-chart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
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

const chart = await response.json();
console.log(chart.data.chart_properties.type); // "Manifesting Generator"
```
