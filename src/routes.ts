import { createPlaywrightRouter } from "crawlee";
import { amazonHandler } from "./retailers/amazon.js";
import { ebayHandler } from "./retailers/ebay.js";
import { walmartHandler } from "./retailers/walmart.js";
import { verizonHandler } from "./retailers/verizon.js";
import { bestbuyHandler } from "./retailers/bestbuy.js";
import { ProductDatabase } from "./database.js";

// Initialize the database
const db = new ProductDatabase();

// Create a router to handle different retailers
export const router = createPlaywrightRouter();

// Default handler for unrecognized retailers
router.addDefaultHandler(async ({ request, log }) => {
    log.info(`Processing ${request.url} with default handler`);
    log.warning(`No specific handler found for retailer: ${request.userData.retailer}`);
});

// Register handlers for each retailer
router.addHandler('amazon', async (context) => {
    await amazonHandler(context, db);
});

router.addHandler('ebay', async (context) => {
    await ebayHandler(context, db);
});

router.addHandler('walmart', async (context) => {
    await walmartHandler(context, db);
});

router.addHandler('verizon', async (context) => {
    await verizonHandler(context, db);
});

router.addHandler('bestbuy', async (context) => {
    await bestbuyHandler(context, db);
});
