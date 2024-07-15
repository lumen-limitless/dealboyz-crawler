// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, ProxyConfiguration, Sitemap } from "crawlee";

import { router } from "./routes.js";

const startUrls = [
  "https://www.verizon.com",
  // 'https://walmart.com',
  // 'https://ebay.com',
  // 'https://bestbuy.com',
  // 'https://target.com',
  // 'https://homedepot.com',
  // 'https://lowes.com',
  // 'https://costco.com',
  // 'https://kroger.com',
  // 'https://walgreens.com',
  // 'https://cvs.com',
];

const crawler = new PlaywrightCrawler({
  // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
  requestHandler: router,
  // Comment this option to scrape the full website.
  // maxRequestsPerCrawl: 20,

  headless: true,
});

await crawler.run(startUrls);
