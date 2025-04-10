#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// CoinGecko API endpoint for coins list
const COINS_LIST_URL = 'https://api.coingecko.com/api/v3/coins/list';
const COINS_MARKETS_URL = 'https://api.coingecko.com/api/v3/coins/markets';

/**
 * Fetch all coins from CoinGecko API
 */
async function fetchAllCoins() {
  try {
    console.log('Fetching all coins list from CoinGecko...');
    const response = await axios.get(COINS_LIST_URL);
    return response.data;
  } catch (error) {
    console.error('Error fetching coins list:', error.message);
    if (error.response && error.response.status === 429) {
      console.error('Rate limit exceeded. Please try again later.');
    }
    throw error;
  }
}

/**
 * Fetch coins market data with pagination to get market ranks
 */
async function fetchCoinsMarketData(page = 1, limit = 250) {
  try {
    console.log(`Fetching coins market data, page ${page}...`);
    const response = await axios.get(COINS_MARKETS_URL, {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: limit,
        page: page,
        sparkline: false
      }
    });
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching market data (page ${page}):`, error.message);
    if (error.response && error.response.status === 429) {
      console.error('Rate limit exceeded. Waiting longer before retry...');
      await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute delay
      return fetchCoinsMarketData(page, limit); // Retry
    }
    throw error;
  }
}

/**
 * Main function to fetch and save coin data
 */
async function main() {
  try {
    // Step 1: Fetch complete coins list
    const allCoins = await fetchAllCoins();
    console.log(`Found ${allCoins.length} coins in total`);
    
    // Step 2: Fetch market data to get rankings
    let marketData = [];
    let page = 1;
    let hasMoreData = true;
    const limit = 250; // Coins per page
    
    while (hasMoreData && page <= 20) { // Fetch up to 5000 coins (20 pages × 250 coins)
      const pageData = await fetchCoinsMarketData(page, limit);
      if (pageData.length === 0) {
        hasMoreData = false;
      } else {
        marketData = [...marketData, ...pageData];
        page++;
      }
    }
    
    console.log(`Fetched market data for ${marketData.length} coins`);
    
    // Step 3: Create a map of coin IDs to their market ranks
    const coinRanks = new Map();
    marketData.forEach(coin => {
      coinRanks.set(coin.id, {
        rank: coin.market_cap_rank || 9999, // Default high rank if not available
        symbol: coin.symbol,
        name: coin.name
      });
    });
    
    // Step 4: Create enhanced coins list with complete data
    const coinsWithData = allCoins.map(coin => {
      const marketInfo = coinRanks.get(coin.id) || { rank: 10000, symbol: coin.symbol, name: coin.name };
      return {
        id: coin.id,
        name: marketInfo.name || coin.name,
        symbol: marketInfo.symbol || coin.symbol,
        rank: marketInfo.rank
      };
    });
    
    // Step 5: Filter to include only highly ranked coins
    const highRankedCoins = coinsWithData.filter(coin => coin.rank && coin.rank <= 5000);
    
    // Sort by rank
    highRankedCoins.sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
    
    console.log(`Found ${highRankedCoins.length} coins with rank <= 5000`);
    
    // Step 6: Save to JSON file
    const dataDir = path.join(__dirname, 'public', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const filePath = path.join(dataDir, 'coins.json');
    fs.writeFileSync(filePath, JSON.stringify(highRankedCoins, null, 2));
    
    console.log(`Saved coin data to ${filePath}`);
    
    // Step 7: Generate JavaScript file with the data for direct inclusion
    const jsFilePath = path.join(dataDir, 'coins-data.js');
    fs.writeFileSync(
      jsFilePath,
      `// Auto-generated coins data from CoinGecko API\nconst COINS_DATA = ${JSON.stringify(highRankedCoins, null, 2)};\n`
    );
    
    console.log(`Saved JavaScript data to ${jsFilePath}`);
    
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// Run the script
main();