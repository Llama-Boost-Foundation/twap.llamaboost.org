document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('twapForm');
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const resultsEl = document.getElementById('results');
    const chartEl = document.getElementById('chart');
    const dailyChartEl = document.getElementById('dailyChart');
    const tableBody = document.querySelector('#twapTable tbody');
    
    // Coin search elements
    const coinSearchInput = document.getElementById('coinSearch');
    const coinDropdown = document.getElementById('coinDropdown');
    const coinIdInput = document.getElementById('coinId');
    const selectedCoinEl = document.getElementById('selectedCoin');
    const selectedCoinNameEl = document.getElementById('selectedCoinName');
    const selectedCoinSymbolEl = document.getElementById('selectedCoinSymbol');
    const clearCoinBtn = document.getElementById('clearCoin');
    
    // Initialize coins dropdown functionality
    initCoinSearch();
    
    // Create a function to fetch data and render results
    async function fetchDataAndRender(coinId, days) {
        // Validate inputs
        if (!coinId) {
            showError('Please select a coin');
            return;
        }
        
        if (isNaN(days) || days < 1 || days > 60) {
            showError('Days must be between 1 and 60');
            return;
        }
        
        // Reset UI
        clearResults();
        showLoading();
        
        try {
            // Fetch data from CoinGecko
            const data = await fetchTwapData(coinId, days);
            renderResults(data);
        } catch (error) {
            showError(error.message || 'Failed to fetch data. Please try again.');
        }
    }

    // Listen for submit event (still useful as a fallback)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get input values
        const coinId = coinIdInput.value.trim();
        const days = parseInt(document.getElementById('days').value);
        
        fetchDataAndRender(coinId, days);
    });
    
    // Also listen for changes to the days input
    document.getElementById('days').addEventListener('change', function() {
        const coinId = coinIdInput.value.trim();
        if (coinId) {
            const days = parseInt(this.value);
            fetchDataAndRender(coinId, days);
        }
    });
    
    function initCoinSearch() {
        // Check if we have coin data
        if (typeof COINS_DATA === 'undefined') {
            console.error('Coins data not loaded');
            coinSearchInput.placeholder = "Enter coin ID (e.g., bitcoin)";
            
            // Fallback mode - allow direct entry of coin ID
            coinSearchInput.addEventListener('input', function() {
                coinIdInput.value = this.value.trim().toLowerCase();
            });
            
            // Show selected coin as you type
            coinSearchInput.addEventListener('change', function() {
                if (this.value.trim()) {
                    selectedCoinNameEl.textContent = "Custom coin";
                    selectedCoinSymbolEl.textContent = this.value.trim().toUpperCase();
                    selectedCoinEl.classList.remove('hidden');
                } else {
                    selectedCoinEl.classList.add('hidden');
                }
            });
            
            return;
        }
        
        // Filter coins as user types
        coinSearchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            
            if (query.length < 2) {
                coinDropdown.classList.add('hidden');
                return;
            }
            
            const filteredCoins = COINS_DATA.filter(coin => {
                return (
                    coin.id.toLowerCase().includes(query) ||
                    coin.name.toLowerCase().includes(query) ||
                    coin.symbol.toLowerCase().includes(query)
                );
            }).slice(0, 20); // Limit to 20 results
            
            renderCoinDropdown(filteredCoins);
        });
        
        // Hide dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!coinSearchInput.contains(e.target) && !coinDropdown.contains(e.target)) {
                coinDropdown.classList.add('hidden');
            }
        });
        
        // Show dropdown when focusing on search
        coinSearchInput.addEventListener('focus', function() {
            if (this.value.length >= 2) {
                coinDropdown.classList.remove('hidden');
            }
        });
        
        // Clear selected coin
        clearCoinBtn.addEventListener('click', function() {
            clearSelectedCoin();
        });
    }
    
    function renderCoinDropdown(coins) {
        if (coins.length === 0) {
            coinDropdown.innerHTML = '<div class="dropdown-item">No matching coins found</div>';
        } else {
            coinDropdown.innerHTML = coins.map(coin => `
                <div class="dropdown-item" data-id="${coin.id}" data-name="${coin.name}" data-symbol="${coin.symbol}">
                    <span class="symbol">${coin.symbol.toUpperCase()}</span>
                    <span class="name">${coin.name}</span>
                    <span class="id">(${coin.id})</span>
                    ${coin.rank ? `<span class="rank">#${coin.rank}</span>` : ''}
                </div>
            `).join('');
            
            // Add click handlers to dropdown items
            document.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    const name = this.getAttribute('data-name');
                    const symbol = this.getAttribute('data-symbol');
                    
                    selectCoin(id, name, symbol);
                    coinDropdown.classList.add('hidden');
                });
            });
        }
        
        coinDropdown.classList.remove('hidden');
    }
    
    function selectCoin(id, name, symbol) {
        coinIdInput.value = id;
        selectedCoinNameEl.textContent = name;
        selectedCoinSymbolEl.textContent = symbol.toUpperCase();
        selectedCoinEl.classList.remove('hidden');
        coinSearchInput.value = '';
        
        // Auto fetch data when coin is selected
        const days = parseInt(document.getElementById('days').value);
        if (!isNaN(days) && days >= 1 && days <= 60) {
            fetchDataAndRender(id, days);
        }
    }
    
    function clearSelectedCoin() {
        coinIdInput.value = '';
        selectedCoinEl.classList.add('hidden');
        coinSearchInput.value = '';
        coinSearchInput.focus();
    }
    
    async function fetchTwapData(coinId, days) {
        const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('CoinGecko API rate limit exceeded. Please try again later.');
            }
            throw new Error(`Error fetching data: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Store raw price data for daily chart
        window.rawPriceData = data.prices;
        
        return calculateTwap(data.prices, days);
    }
    
    function calculateTwap(allPrices, days) {
        const twapResults = [];
        const now = Date.now();
        
        for (let period = days; period >= 1; period--) {
            // Filter data for the current period (last 'period' days)
            const periodStart = now - (period * 24 * 60 * 60 * 1000);
            const prices = allPrices.filter(pricePoint => pricePoint[0] >= periodStart);
            
            // Calculate TWAP - Time Weighted Average Price
            let twap = 0;
            let totalTimeWeight = 0;
            
            for (let i = 0; i < prices.length - 1; i++) {
                const currentPrice = prices[i][1];
                const currentTimestamp = prices[i][0];
                const nextTimestamp = prices[i + 1][0];
                const timeWeight = nextTimestamp - currentTimestamp;
                
                twap += currentPrice * timeWeight;
                totalTimeWeight += timeWeight;
            }
            
            // Handle the last price point if needed
            if (prices.length > 0) {
                const lastPrice = prices[prices.length - 1][1];
                if (prices.length > 1) {
                    const lastInterval = prices[prices.length - 1][0] - prices[prices.length - 2][0];
                    twap += lastPrice * lastInterval;
                    totalTimeWeight += lastInterval;
                }
            }
            
            if (totalTimeWeight > 0) {
                twap = twap / totalTimeWeight;
            } else {
                twap = 0; // Default to 0 if no data available
            }
            
            twapResults.push({
                days: period,
                price: twap
            });
        }
        
        return twapResults;
    }
    
    function renderResults(data) {
        // Hide loading, show results
        hideLoading();
        resultsEl.classList.remove('hidden');
        
        // Update the heading with current dateformat "Friday, 11. April 2025"
        const twapDateHeading = document.getElementById('twapDateHeading');
        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).replace(/(\d+)(?=\s\w+\s\d+)/, '$1.');
        twapDateHeading.textContent = `TWAP on ${formattedDate}`;
        
        // Also update the table heading with the date
        const tableDateHeading = document.getElementById('tableDateHeading');
        tableDateHeading.textContent = `TWAP Table for ${formattedDate}`;
        
        // Clear previous results
        chartEl.innerHTML = '';
        dailyChartEl.innerHTML = '';
        tableBody.innerHTML = '';
        
        // Render TWAP chart
        renderChart(data);
        
        // Render daily price chart
        renderDailyChart();
        
        // Render table
        renderTable(data);
    }
    
    function renderChart(data) {
        const maxPrice = Math.max(...data.map(r => r.price));
        const chartHeight = chartEl.clientHeight - 100; // Add more space for labels at top and bottom
        
        // Create chart container
        const chartContainer = document.createElement('div');
        chartContainer.style.display = 'flex';
        chartContainer.style.flexDirection = 'column';
        chartContainer.style.height = '100%';
        
        // Create chart
        const chart = document.createElement('div');
        chart.style.height = '100%';
        chart.style.display = 'flex';
        chart.style.alignItems = 'flex-end';
        chart.style.justifyContent = 'center';
        chart.style.paddingBottom = '50px'; // Space for labels
        chart.style.paddingTop = '30px'; // Add space at the top for labels
        chart.style.position = 'relative';
        
        // Add bars for each data point
        data.forEach((result, index) => {
            const barHeight = (result.price / maxPrice) * chartHeight;
            
            const barContainer = document.createElement('div');
            barContainer.style.height = '100%';
            barContainer.style.display = 'flex';
            barContainer.style.flexDirection = 'column';
            barContainer.style.justifyContent = 'flex-end';
            barContainer.style.alignItems = 'center';
            barContainer.style.width = `${100 / data.length}%`;
            barContainer.style.maxWidth = '40px';
            barContainer.style.position = 'relative';
            
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.style.height = `${barHeight}px`;
            bar.style.width = '80%';
            bar.style.minWidth = '10px';
            bar.style.position = 'relative';
            bar.style.overflow = 'hidden';
            bar.title = `${result.days} day(s): $${result.price.toFixed(6)}`;
            
            // Add price inside the bar
            const priceInBar = document.createElement('div');
            priceInBar.style.position = 'absolute';
            priceInBar.style.top = '50%';
            priceInBar.style.left = '50%';
            priceInBar.style.width = '200%';
            priceInBar.style.transform = 'translate(-50%, 0) rotate(-90deg)';
            priceInBar.style.transformOrigin = 'center';
            priceInBar.style.fontSize = '11px';
            priceInBar.style.fontWeight = 'bold';
            priceInBar.style.textAlign = 'center';
            priceInBar.style.whiteSpace = 'nowrap';
            priceInBar.style.color = '#000'; // Black text
            
            // Format price based on its value
            let formattedPrice;
            if (result.price >= 1) {
                formattedPrice = `$${result.price.toFixed(2)}`;
            } else if (result.price >= 0.01) {
                formattedPrice = `$${result.price.toFixed(4)}`;
            } else {
                formattedPrice = `$${result.price.toFixed(6)}`;
            }
            
            priceInBar.textContent = formattedPrice;
            
            bar.appendChild(priceInBar);
            
            // Add percentage label at top of bar
            const percentLabel = document.createElement('div');
            percentLabel.style.position = 'absolute';
            percentLabel.style.top = `calc(100% - ${barHeight}px - 30px)`;
            percentLabel.style.fontSize = '11px';
            percentLabel.style.fontWeight = 'bold';
            percentLabel.style.textAlign = 'center';
            percentLabel.style.width = '100%';
            
            // Calculate percentage change if not the last item
            if (index < data.length - 1) {
                const currentPrice = result.price;
                const nextPrice = data[index + 1].price;
                
                if (currentPrice !== 0) {
                    const percentChange = ((nextPrice - currentPrice) / currentPrice) * 100;
                    percentLabel.textContent = `${percentChange.toFixed(1)}%`;
                    
                    // Add color based on change direction
                    if (percentChange > 0) {
                        percentLabel.style.color = '#27ae60';
                    } else if (percentChange < 0) {
                        percentLabel.style.color = '#e74c3c';
                    }
                } else {
                    percentLabel.textContent = '-';
                }
            } else {
                percentLabel.textContent = '-';
            }
            
            // Add day number label at bottom
            const dayLabel = document.createElement('div');
            dayLabel.className = 'chart-label';
            dayLabel.textContent = result.days;
            dayLabel.style.position = 'absolute';
            dayLabel.style.bottom = '-35px';
            dayLabel.style.width = '100%';
            dayLabel.style.textAlign = 'center';
            
            barContainer.appendChild(bar);
            barContainer.appendChild(percentLabel);
            barContainer.appendChild(dayLabel);
            chart.appendChild(barContainer);
        });
        
        // Add x-axis label
        const xAxisLabel = document.createElement('div');
        xAxisLabel.textContent = 'X-axis: Days';
        xAxisLabel.style.textAlign = 'center';
        xAxisLabel.style.marginTop = '20px';
        xAxisLabel.style.marginBottom = '10px';
        xAxisLabel.style.fontWeight = 'bold';
        xAxisLabel.style.fontSize = '12px';
        
        chartContainer.appendChild(chart);
        chartContainer.appendChild(xAxisLabel);
        chartEl.appendChild(chartContainer);
    }
    

    function renderTable(data) {
        // Create a copy of data array and reverse it for the table
        // This will put 1-day data at the top
        const reversedData = [...data].reverse();
        
        reversedData.forEach((result, index) => {
            const row = document.createElement('tr');
            
            // Days column
            const daysCell = document.createElement('td');
            daysCell.textContent = result.days;
            row.appendChild(daysCell);
            
            // TWAP Price column
            const priceCell = document.createElement('td');
            priceCell.textContent = `$${result.price.toFixed(6)}`;
            row.appendChild(priceCell);
            
            // Percent change column
            const changeCell = document.createElement('td');
            if (index < reversedData.length - 1) {
                const currentPrice = result.price;
                const nextPrice = reversedData[index + 1].price;
                
                if (currentPrice === 0) {
                    changeCell.textContent = '-';
                } else {
                    // Note: Since we reversed the data, the percent change calculation
                    // is now in the opposite direction compared to the chart
                    const percentChange = ((nextPrice - currentPrice) / currentPrice) * 100;
                    changeCell.textContent = `${percentChange.toFixed(2)}%`;
                    
                    // Add color based on change direction
                    if (percentChange > 0) {
                        changeCell.style.color = '#27ae60';
                    } else if (percentChange < 0) {
                        changeCell.style.color = '#e74c3c';
                    }
                }
            } else {
                changeCell.textContent = '-';
            }
            row.appendChild(changeCell);
            
            tableBody.appendChild(row);
        });
    }
    
    function showLoading() {
        loadingEl.classList.remove('hidden');
        errorEl.classList.add('hidden');
        resultsEl.classList.add('hidden');
    }
    
    function hideLoading() {
        loadingEl.classList.add('hidden');
    }
    
    function showError(message) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
        loadingEl.classList.add('hidden');
    }
    
    function clearResults() {
        errorEl.classList.add('hidden');
        resultsEl.classList.add('hidden');
        chartEl.innerHTML = '';
        dailyChartEl.innerHTML = '';
        tableBody.innerHTML = '';
    }
    
    // Function to render the daily average price chart
    function renderDailyChart() {
        if (!window.rawPriceData || !window.rawPriceData.length) return;
        
        // Group price data by day
        const dailyPrices = {};
        const dayMilliseconds = 24 * 60 * 60 * 1000;
        
        window.rawPriceData.forEach(pricePoint => {
            const timestamp = pricePoint[0];
            const price = pricePoint[1];
            const dayTimestamp = Math.floor(timestamp / dayMilliseconds) * dayMilliseconds;
            
            if (!dailyPrices[dayTimestamp]) {
                dailyPrices[dayTimestamp] = {
                    sum: 0,
                    count: 0,
                    date: new Date(dayTimestamp)
                };
            }
            
            dailyPrices[dayTimestamp].sum += price;
            dailyPrices[dayTimestamp].count += 1;
        });
        
        // Calculate averages and format data
        const dailyAvgData = Object.entries(dailyPrices).map(([timestamp, data]) => {
            return {
                timestamp: parseInt(timestamp),
                date: data.date,
                price: data.sum / data.count
            };
        });
        
        // Sort by timestamp (oldest first)
        dailyAvgData.sort((a, b) => a.timestamp - b.timestamp);
        
        // Get max price for scaling
        const maxPrice = Math.max(...dailyAvgData.map(d => d.price));
        const chartHeight = dailyChartEl.clientHeight - 60; // Leave space for labels
        
        // Create chart container
        const chartContainer = document.createElement('div');
        chartContainer.style.display = 'flex';
        chartContainer.style.flexDirection = 'column';
        chartContainer.style.height = '100%';
        
        // Create chart header with title
        const chartHeader = document.createElement('div');
        chartHeader.style.textAlign = 'center';
        chartHeader.style.marginBottom = '10px';
        chartHeader.style.fontWeight = 'bold';
        chartHeader.style.fontSize = '14px';
        chartHeader.textContent = 'Daily Average Prices';
        
        // Create chart
        const chart = document.createElement('div');
        chart.style.height = '100%';
        chart.style.display = 'flex';
        chart.style.alignItems = 'flex-end';
        chart.style.justifyContent = 'center';
        chart.style.paddingBottom = '50px'; // Space for labels
        chart.style.paddingTop = '30px'; // Add space at the top for labels
        chart.style.position = 'relative';
        
        // Add bars for each data point
        dailyAvgData.forEach((data, index) => {
            const barHeight = (data.price / maxPrice) * chartHeight;
            
            const barContainer = document.createElement('div');
            barContainer.style.height = '100%';
            barContainer.style.display = 'flex';
            barContainer.style.flexDirection = 'column';
            barContainer.style.justifyContent = 'flex-end';
            barContainer.style.alignItems = 'center';
            barContainer.style.width = `${100 / dailyAvgData.length}%`;
            barContainer.style.maxWidth = '40px';
            barContainer.style.position = 'relative';
            
            const bar = document.createElement('div');
            bar.className = 'daily-chart-bar';
            bar.style.height = `${barHeight}px`;
            bar.style.width = '80%';
            bar.style.minWidth = '10px';
            bar.style.position = 'relative';
            bar.style.overflow = 'hidden';
            
            // Format date in MM/DD format
            const dateStr = data.date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
            bar.title = `${dateStr}: $${data.price.toFixed(6)}`;
            
            // Add price inside the bar
            const priceInBar = document.createElement('div');
            priceInBar.style.position = 'absolute';
            priceInBar.style.top = '50%';
            priceInBar.style.left = '50%';
            priceInBar.style.width = '200%';
            priceInBar.style.transform = 'translate(-50%, 0) rotate(-90deg)';
            priceInBar.style.transformOrigin = 'center';
            priceInBar.style.fontSize = '11px';
            priceInBar.style.fontWeight = 'bold';
            priceInBar.style.textAlign = 'center';
            priceInBar.style.whiteSpace = 'nowrap';
            priceInBar.style.color = '#000'; // Black text
            
            // Format price based on its value
            let formattedPrice;
            if (data.price >= 1) {
                formattedPrice = `$${data.price.toFixed(2)}`;
            } else if (data.price >= 0.01) {
                formattedPrice = `$${data.price.toFixed(4)}`;
            } else {
                formattedPrice = `$${data.price.toFixed(6)}`;
            }
            
            priceInBar.textContent = formattedPrice;
            bar.appendChild(priceInBar);
            
            // Add date label at bottom
            const dateLabel = document.createElement('div');
            dateLabel.style.position = 'absolute';
            dateLabel.style.bottom = '-35px';
            dateLabel.style.width = '100%';
            dateLabel.style.textAlign = 'center';
            dateLabel.style.fontSize = '11px';
            dateLabel.textContent = dateStr;
            
            barContainer.appendChild(bar);
            barContainer.appendChild(dateLabel);
            chart.appendChild(barContainer);
        });
        
        // Add x-axis label
        const xAxisLabel = document.createElement('div');
        xAxisLabel.textContent = 'Date (MM/DD)';
        xAxisLabel.style.textAlign = 'center';
        xAxisLabel.style.marginTop = '20px';
        xAxisLabel.style.marginBottom = '10px';
        xAxisLabel.style.fontWeight = 'bold';
        xAxisLabel.style.fontSize = '12px';
        
        chartContainer.appendChild(chartHeader);
        chartContainer.appendChild(chart);
        chartContainer.appendChild(xAxisLabel);
        dailyChartEl.appendChild(chartContainer);
    }
});