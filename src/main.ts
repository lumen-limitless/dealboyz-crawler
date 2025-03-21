// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, Dataset } from "crawlee";
import { router } from "./routes.js";
import { ProductDatabase } from "./database.js";
import { loadSkus } from "./skuLoader.js";

// Initialize the database
const db = new ProductDatabase();

// Main function to run the crawler
async function main() {
    // Load SKUs from configuration
    const skus = await loadSkus();
    
    if (skus.length === 0) {
        console.error('No SKUs found to crawl. Please check your configuration.');
        return;
    }
    
    console.log(`Starting price crawler for ${skus.length} SKUs across multiple retailers...`);
    
    // Create the crawler
    const crawler = new PlaywrightCrawler({
        // Use the router to handle different websites
        requestHandler: router,
        
        // Additional configuration
        headless: true,
        maxRequestsPerCrawl: 1000,
        maxRequestRetries: 3,
        
        // Respect websites' robots.txt and add delays to avoid being blocked
        navigationTimeoutSecs: 120,
        useSessionPool: true,
        persistCookiesPerSession: true,
    });
    
    // Generate URLs for each SKU and retailer
    const startUrls = [];
    
    for (const sku of skus) {
        // Amazon
        startUrls.push({
            url: `https://www.amazon.com/s?k=${sku}`,
            userData: { retailer: 'amazon', sku }
        });
        
        // eBay
        startUrls.push({
            url: `https://www.ebay.com/sch/i.html?_nkw=${sku}`,
            userData: { retailer: 'ebay', sku }
        });
        
        // Walmart
        startUrls.push({
            url: `https://www.walmart.com/search?q=${sku}`,
            userData: { retailer: 'walmart', sku }
        });
        
        // Verizon
        startUrls.push({
            url: `https://www.verizon.com/search/?q=${sku}`,
            userData: { retailer: 'verizon', sku }
        });
        
        // Best Buy
        startUrls.push({
            url: `https://www.bestbuy.com/site/searchpage.jsp?st=${sku}`,
            userData: { retailer: 'bestbuy', sku }
        });
    }
    
    // Run the crawler with the generated URLs
    await crawler.run(startUrls);
    
    // After crawling, analyze price discrepancies
    await analyzePriceDiscrepancies(db);
    
    console.log('Crawling completed. Price discrepancies have been logged to the database.');
}

// Function to analyze price discrepancies
async function analyzePriceDiscrepancies(db: ProductDatabase) {
    const skus = await db.getUniqueSkus();
    
    for (const sku of skus) {
        const prices = await db.getPricesBySku(sku);
        
        if (prices.length > 1) {
            // Calculate price statistics
            const priceValues = prices.map(p => p.price);
            const minPrice = Math.min(...priceValues);
            const maxPrice = Math.max(...priceValues);
            const priceDiff = maxPrice - minPrice;
            const percentDiff = (priceDiff / minPrice) * 100;
            
            // Log significant price discrepancies (more than 5%)
            if (percentDiff > 5) {
                console.log(`Price discrepancy found for SKU ${sku}:`);
                prices.forEach(p => {
                    console.log(`  ${p.retailer}: $${p.price.toFixed(2)}`);
                });
                console.log(`  Difference: $${priceDiff.toFixed(2)} (${percentDiff.toFixed(2)}%)`);
                
                // Log the discrepancy to the database
                await db.logDiscrepancy(sku, prices, priceDiff, percentDiff);
            }
        }
    }
}

// Run the main function
main()
    .then(() => console.log('Price crawler finished successfully'))
    .catch((error) => console.error('Error during crawling:', error));
