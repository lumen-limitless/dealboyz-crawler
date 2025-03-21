import { PlaywrightCrawlingContext } from "crawlee";
import { ProductDatabase, ProductPrice } from "../database.js";

export async function ebayHandler(
    { request, page, log }: PlaywrightCrawlingContext,
    db: ProductDatabase
): Promise<void> {
    const { sku, retailer } = request.userData;
    log.info(`Processing eBay page for SKU: ${sku}`);
    
    try {
        // Wait for search results to load
        await page.waitForSelector('.s-item', { timeout: 30000 });
        
        // Check if we have search results
        const noResults = await page.$('.srp-save-null-search__heading');
        if (noResults) {
            log.info(`No results found on eBay for SKU: ${sku}`);
            return;
        }
        
        // Get the first product result (skip the first one as it's usually a sponsored item)
        const products = await page.$$('.s-item');
        const firstProduct = products.length > 1 ? products[1] : products[0];
        
        if (!firstProduct) {
            log.info(`No valid product found on eBay for SKU: ${sku}`);
            return;
        }
        
        // Extract product information
        const productUrl = await page.evaluate(el => {
            const link = el.querySelector('.s-item__link');
            return link ? link.getAttribute('href') : null;
        }, firstProduct);
        
        if (!productUrl) {
            log.warning(`Could not extract product URL for SKU: ${sku}`);
            return;
        }
        
        // Navigate to the product page
        await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
        
        // Wait for price information to load
        await page.waitForSelector('.x-price-primary', { timeout: 30000 }).catch(() => {
            log.debug('Price selector not found, trying alternative selectors');
        });
        
        // Extract product name
        const productName = await page.$eval('h1.x-item-title__mainTitle', el => el.textContent?.trim() || 'Unknown Product')
            .catch(() => 'Unknown Product');
        
        // Extract price
        const priceSelectors = [
            '.x-price-primary',
            '.x-bin-price__content',
            '.x-price'
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
            log.warning(`Could not extract price for eBay product, SKU: ${sku}`);
            return;
        }
        
        // Parse the price
        const priceMatch = priceText.match(/US\s*\$([0-9]+(?:\.[0-9]+)?)/);
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
        log.info(`Successfully extracted eBay price for SKU ${sku}: $${price.toFixed(2)}`);
        
    } catch (error) {
        log.error(`Error processing eBay page for SKU ${sku}:`, { error: String(error) });
    }
}
