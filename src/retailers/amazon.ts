import { PlaywrightCrawlingContext } from "crawlee";
import { ProductDatabase, ProductPrice } from "../database.js";

export async function amazonHandler(
    { request, page, log }: PlaywrightCrawlingContext,
    db: ProductDatabase
): Promise<void> {
    const { upc, retailer } = request.userData;
    log.info(`Processing Amazon page for UPC: ${upc}`);
    
    try {
        // Wait for product information to load
        await page.waitForSelector('.s-result-item', { timeout: 30000 });
        
        // Check if we have search results
        const noResults = await page.$$('.s-no-outline');
        if (noResults.length > 0) {
            log.info(`No results found on Amazon for UPC: ${upc}`);
            return;
        }
        
        // Get the first product result
        const firstProduct = await page.$('.s-result-item[data-asin]:not(.AdHolder)');
        if (!firstProduct) {
            log.info(`No valid product found on Amazon for UPC: ${upc}`);
            return;
        }
        
        // Extract product information
        const productUrl = await page.evaluate(el => {
            const link = el.querySelector('a.a-link-normal');
            return link ? link.getAttribute('href') : null;
        }, firstProduct);
        
        if (!productUrl) {
            log.warning(`Could not extract product URL for UPC: ${upc}`);
            return;
        }
        
        // Navigate to the product page
        const fullUrl = productUrl.startsWith('http') ? productUrl : `https://www.amazon.com${productUrl}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
        
        // Wait for price information to load
        await page.waitForSelector('#price', { timeout: 30000 }).catch(() => {
            log.debug('Price selector not found, trying alternative selectors');
        });
        
        // Extract product name
        const productName = await page.$eval('#productTitle', el => el.textContent?.trim() || 'Unknown Product')
            .catch(() => 'Unknown Product');
        
        // Extract price using various possible selectors
        const priceSelectors = [
            '#price_inside_buybox',
            '#priceblock_ourprice',
            '#priceblock_dealprice',
            '.a-price .a-offscreen',
            '.a-price'
        ];
        
        let priceText = null;
        for (const selector of priceSelectors) {
            try {
                priceText = await page.$eval(selector, el => {
                    // Handle different price element structures
                    if (el.classList.contains('a-price')) {
                        const offscreen = el.querySelector('.a-offscreen');
                        return offscreen ? offscreen.textContent : el.textContent;
                    }
                    return el.textContent;
                });
                
                if (priceText) break;
            } catch (e) {
                // Continue to next selector
            }
        }
        
        if (!priceText) {
            log.warning(`Could not extract price for Amazon product, UPC: ${upc}`);
            return;
        }
        
        // Parse the price
        const priceMatch = priceText.match(/\$?([0-9]+(?:\.[0-9]+)?)/);
        if (!priceMatch) {
            log.warning(`Could not parse price text: ${priceText} for UPC: ${upc}`);
            return;
        }
        
        const price = parseFloat(priceMatch[1]);
        
        // Save the product price to the database
        const productPrice: ProductPrice = {
            upc,
            retailer,
            price,
            currency: 'USD',
            productName,
            url: page.url(),
            timestamp: new Date()
        };
        
        await db.addPrice(productPrice);
        log.info(`Successfully extracted Amazon price for UPC ${upc}: $${price.toFixed(2)}`);
        
    } catch (error) {
        log.error(`Error processing Amazon page for UPC ${upc}:`, { error: String(error) });
    }
}
