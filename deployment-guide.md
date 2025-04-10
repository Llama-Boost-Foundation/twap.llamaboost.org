# Deployment Guide

This application can be deployed as a set of static files to any web server. Here's how to set it up.

## Option 1: Static File Deployment

The simplest deployment method is to serve the application as static files on any web server:

1. **Prepare the files**:
   ```bash
   # Install dependencies
   npm install
   
   # Fetch cryptocurrency data
   npm run fetch-coins
   
   # Create a deployment directory
   mkdir -p deploy
   
   # Copy static files
   cp -r public/* deploy/
   ```

2. **Upload to your web server**:
   - Copy all files from the `deploy` directory to your web server's public directory
   - Common locations include `/var/www/html`, `/usr/share/nginx/html`, or your hosting provider's designated directory

3. **Configure your web server**:
   - For Apache, ensure `.htaccess` allows directory browsing
   - For Nginx, configure your site to serve static files
   - For shared hosting, simply upload to the public_html directory

The application doesn't require any server-side processing after initial setup, as all API calls are made directly from the client to CoinGecko's API.

## Option 2: GitHub Pages

This app can be easily deployed on GitHub Pages:

1. **Create a GitHub repository** for your project
2. **Run the fetch-coins script** to generate the coin data
3. **Push the public directory** to the repository
4. **Enable GitHub Pages** in your repository settings, selecting the main branch and `/` (root) as the source

## Option 3: Netlify/Vercel/Cloudflare Pages

These platforms make deployment even easier:

1. **Connect your repository** to your chosen platform
2. **Set the build command**: `npm install && npm run fetch-coins`
3. **Set the publish directory**: `public`

The platform will automatically build and deploy your site whenever you push changes.

## Important Notes

1. **CoinGecko API Limits**: The free tier of the CoinGecko API has rate limits. If your application receives high traffic, users might encounter rate limiting errors. Consider implementing caching or upgrading to a paid API plan.

2. **Updating Coin Data**: Cryptocurrency data changes over time. To keep the coin list updated, you should periodically run the `fetch-coins` script and redeploy the application.

3. **CORS Considerations**: The application relies on browser-side API calls to CoinGecko. If CoinGecko changes their CORS policy, you might need to implement a server-side proxy.

4. **Mobile Optimization**: The application is responsive but may benefit from additional optimizations for very small screens.