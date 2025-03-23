// For more information, see https://crawlee.dev/
import { PlaywrightCrawler } from 'crawlee';
import { ProductDatabase } from './database.js';
import { router } from './routes.js';
import { loadProducts, Product } from './productLoader.js';

// Initialize the database
const db = new ProductDatabase();

// Main function to run the crawler
async function main() {
  // Load products from configuration
  const products = await loadProducts();

  if (products.length === 0) {
    console.error('No products found to crawl. Please check your configuration.');
    return;
  }

  console.log(
    `Starting price crawler for ${products.length} products across multiple retailers...`,
  );

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

  // Generate URLs for each product and retailer
  const startUrls = [];

  for (const product of products) {
    const encodedTitle = encodeURIComponent(product.title);
    
    // Amazon
    startUrls.push({
      url: `https://www.amazon.com/s?k=${encodedTitle}`,
      userData: { retailer: 'amazon', label: 'amazon', upc: product.upc, title: product.title },
    });

    // eBay
    startUrls.push({
      url: `https://www.ebay.com/sch/i.html?_nkw=${encodedTitle}`,
      userData: { retailer: 'ebay', label: 'ebay', upc: product.upc, title: product.title },
    });

    // Walmart
    startUrls.push({
      url: `https://www.walmart.com/search?q=${encodedTitle}`,
      userData: { retailer: 'walmart', label: 'walmart', upc: product.upc, title: product.title },
    });

    // Verizon
    startUrls.push({
      url: `https://www.verizon.com/search/?q=${encodedTitle}`,
      userData: { retailer: 'verizon', label: 'verizon', upc: product.upc, title: product.title },
    });

    // Best Buy
    startUrls.push({
      url: `https://www.bestbuy.com/site/searchpage.jsp?st=${encodedTitle}`,
      userData: { retailer: 'bestbuy', label: 'bestbuy', upc: product.upc, title: product.title },
    });
  }

  // Run the crawler with the generated URLs
  await crawler.run(startUrls);

  // After crawling, analyze price discrepancies
  await analyzePriceDiscrepancies(db);

  console.log(
    'Crawling completed. Price discrepancies have been logged to the database.',
  );
}

// Function to analyze price discrepancies
async function analyzePriceDiscrepancies(db: ProductDatabase) {
  const upcs = await db.getUniqueUpcs();

  for (const upc of upcs) {
    const prices = await db.getPricesByUpc(upc);

    if (prices.length > 1) {
      // Calculate price statistics
      const priceValues = prices.map((p) => p.price);
      const minPrice = Math.min(...priceValues);
      const maxPrice = Math.max(...priceValues);
      const priceDiff = maxPrice - minPrice;
      const percentDiff = (priceDiff / minPrice) * 100;

      // Log significant price discrepancies (more than 5%)
      if (percentDiff > 5) {
        console.log(`Price discrepancy found for UPC ${upc}:`);
        prices.forEach((p) => {
          console.log(`  ${p.retailer}: $${p.price.toFixed(2)}`);
        });
        console.log(
          `  Difference: $${priceDiff.toFixed(2)} (${percentDiff.toFixed(2)}%)`,
        );

        // Log the discrepancy to the database
        await db.logDiscrepancy(upc, prices, priceDiff, percentDiff);
      }
    }
  }
}

// Run the main function
main()
  .then(() => console.log('Price crawler finished successfully'))
  .catch((error) => console.error('Error during crawling:', error));
