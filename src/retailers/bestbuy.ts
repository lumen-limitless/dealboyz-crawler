import { PlaywrightCrawlingContext } from "crawlee";
import { ProductDatabase, ProductPrice } from "../database.js";

export async function bestbuyHandler(
    { request, page, log }: PlaywrightCrawlingContext,
    db: ProductDatabase
): Promise<void> {
    const { sku, retailer } = request.userData;
    log.info(`Processing Best Buy page for SKU: ${sku}`);
    
    try {
        // Wait for search results to load
        await page.waitForSelector('.sku-item', { timeout: 30000 }).catch(() => {
            log.debug('Search results not found, trying alternative selectors');
        });
        
        // Check if we have search results
        const noResults = await page.$('.no-results');
        if (noResults) {
            log.info(`No results found on Best Buy for SKU: ${sku}`);
            return;
        }
        
        // Get the first product result
        const firstProduct = await page.$('.sku-item');
        if (!firstProduct) {
            log.info(`No valid product found on Best Buy for SKU: ${sku}`);
            return;
        }
        
        // Extract product information
        const productUrl = await page.evaluate(el => {
            const link = el.querySelector('.sku-header a');
            return link ? link.getAttribute('href') : null;
        }, firstProduct);
        
        if (!productUrl) {
            log.warning(`Could not extract product URL for SKU: ${sku}`);
            return;
        }
        
        // Navigate to the product page
        const fullUrl = productUrl.startsWith('http') ? productUrl : `https://www.bestbuy.com${productUrl}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
        
        // Wait for price information to load
        await page.waitForSelector('.priceView-customer-price', { timeout: 30000 }).catch(() => {
            log.debug('Price selector not found, trying alternative selectors');
        });
        
        // Extract product name
        const productName = await page.$eval('.sku-title h1', el => el.textContent?.trim() || 'Unknown Product')
            .catch(() => 'Unknown Product');
        
        // Extract price
        const priceSelectors = [
            '.priceView-customer-price span',
            '.priceView-purchase-price',
            '.pb-hero-price span'
        ];
        
        let priceText = null;
        for (const selector of priceSelectors) {
            try {
                priceText = await page.$eval(selector, el => el.textContent?.trim());
                if (priceText) break;
            } catch (e) {
                // Continue to next selector
            }
        }
        
        if (!priceText) {
            log.warning(`Could not extract price for Best Buy product, SKU: ${sku}`);
            return;
        }
        
        // Parse the price
        const priceMatch = priceText.match(/\$?([0-9]+(?:\.[0-9]+)?)/);
        if (!priceMatch) {
            log.warning(`Could not parse price text: ${priceText} for SKU: ${sku}`);
            return;
        }
        
        const price = parseFloat(priceMatch[1]);
        
        // Save the product price to the database
        const productPrice: ProductPrice = {
            sku,
            retailer,
            price,
            currency: 'USD',
            productName,
            url: page.url(),
            timestamp: new Date()
        };
        
        await db.addPrice(productPrice);
        log.info(`Successfully extracted Best Buy price for SKU ${sku}: $${price.toFixed(2)}`);
        
    } catch (error) {
        log.error(`Error processing Best Buy page for SKU ${sku}:`, error);
    }
}
