# CoinGecko TWAP Calculator

Calculate Time-Weighted Average Price (TWAP) for cryptocurrencies using CoinGecko data.

## Features

- Calculate TWAP for any cryptocurrency available on CoinGecko
- View results as a bar chart visualization
- See data in a detailed table with percent changes
- Support for time periods from 1 to 60 days
- Searchable coin selector with over 5000 cryptocurrencies

## Usage

### Initial Setup

```bash
# Install dependencies
npm install

# Fetch coin data (needed for the selector dropdown)
npm run fetch-coins

# Start the server
npm start

# For development with auto-reload
npm run dev
```

Then open your browser and navigate to http://localhost:3000

### Web Application Usage

1. Search for a coin by name, symbol, or ID in the search box
2. Select the desired coin from the dropdown
3. Choose the number of days (1-60)
4. Click "Calculate TWAP"
5. View the results in the chart and table

### CLI Usage (Original)

```bash
# Install and link CLI tool
npm install
npm link

# Run the CLI command
coingecko-twap --id astroport --days 90
```

CLI Options:
- `--id`: CoinGecko asset ID (required)
- `--days`: Length of the TWAP in days (required)
- `--help`: Show help information
- `--version`: Show version number