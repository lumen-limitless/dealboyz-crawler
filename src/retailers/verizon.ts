import { PlaywrightCrawlingContext } from "crawlee";
import { ProductDatabase, ProductPrice } from "../database.js";

export async function verizonHandler(
    { request, page, log }: PlaywrightCrawlingContext,
    db: ProductDatabase
): Promise<void> {
    const { sku, retailer } = request.userData;
    log.info(`Processing Verizon page for SKU: ${sku}`);
    
    try {
        // Wait for search results to load
        await page.waitForSelector('.NHaasTX', { timeout: 30000 }).catch(() => {
            log.debug('Search results not found, trying alternative selectors');
        });
        
        // Check if we have search results
        const noResults = await page.$('.noResults');
        if (noResults) {
            log.info(`No results found on Verizon for SKU: ${sku}`);
            return;
        }
        
        // Get the first product result
        const firstProduct = await page.$('.tile');
        if (!firstProduct) {
            log.info(`No valid product found on Verizon for SKU: ${sku}`);
            return;
        }
        
        // Extract product information
        const productUrl = await page.evaluate(el => {
            const link = el.querySelector('a');
            return link ? link.getAttribute('href') : null;
        }, firstProduct);
        
        if (!productUrl) {
            log.warning(`Could not extract product URL for SKU: ${sku}`);
            return;
        }
        
        // Navigate to the product page
        const fullUrl = productUrl.startsWith('http') ? productUrl : `https://www.verizon.com${productUrl}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
        
        // Wait for price information to load
        await page.waitForSelector('.price__amount', { timeout: 30000 }).catch(() => {
            log.debug('Price selector not found, trying alternative selectors');
        });
        
        // Extract product name
        const productName = await page.$eval('h1', el => el.textContent?.trim() || 'Unknown Product')
            .catch(() => 'Unknown Product');
        
        // Extract price
        const priceSelectors = [
            '.price__amount',
            '.price-display',
            'div[data-testid="accessorypriceid"]',
            '.device-installment-price'
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
            log.warning(`Could not extract price for Verizon product, SKU: ${sku}`);
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
        log.info(`Successfully extracted Verizon price for SKU ${sku}: $${price.toFixed(2)}`);
        
    } catch (error) {
        log.error(`Error processing Verizon page for SKU ${sku}:`, { error: String(error) });
    }
}
