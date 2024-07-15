import { createPlaywrightRouter } from "crawlee";

export const router = createPlaywrightRouter();

router.addDefaultHandler(async ({ enqueueLinks, log }) => {
  log.info(`enqueueing new URLs`);

  // verizon products
  await enqueueLinks({
    globs: ["https://www.verizon.com/products/**"],
    label: "verizon-product",
  });

  // amazon products
  await enqueueLinks({
    globs: ["https://www.amazon.com/s?k=**"],
    label: "amazon-product",
  });
});

router.addHandler(
  "verizon-product",
  async ({ request, page, log, pushData, enqueueLinks }) => {
    await enqueueLinks({
      globs: ["https://www.verizon.com/products/**"],
      label: "product",
    });
    const title = await page.title();
    log.info(`${title}`, { url: request.loadedUrl });

    const price = await page.$eval(
      'div[data-testid="accessorypriceid"]',
      (el) => el.textContent,
    );

    // attempt to add the product to the cart
    await page.click('button[data-testid="cta-btn"]');

    await pushData({
      url: request.loadedUrl,
      title,
      price,
    });
  },
);

router.addHandler(
  "amazon-product",
  async ({ request, page, log, pushData, enqueueLinks }) => {
    await enqueueLinks({
      globs: ["https://www.amazon.com/s?k=**"],
      label: "product",
    });
    const title = await page.title();
    log.info(`${title}`, { url: request.loadedUrl });

    const price = await page.$eval(
      "span.a-price-whole",
      (el) => el.textContent,
    );

    await pushData({
      url: request.loadedUrl,
      title,
      price,
    });
  },
);
