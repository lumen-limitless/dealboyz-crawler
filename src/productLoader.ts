import { promises as fs } from "fs";
import path from "path";

export interface Product {
  title: string;
  upc: string;
}

// Function to load products from a configuration file
export async function loadProducts(): Promise<Product[]> {
  try {
    const configPath = path.join(process.cwd(), 'config', 'products.json');
    const data = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(data);
    
    if (Array.isArray(config.products)) {
      return config.products;
    } else {
      console.error('Invalid products configuration format. Expected an array of products.');
      return [];
    }
  } catch (error) {
    console.error('Error loading products:', error);
    
    // Return some default products for testing if the file doesn't exist
    return [
      {
        title: "Apple iPhone 13 Pro",
        upc: "190199380356"
      },
      {
        title: "Samsung Galaxy S21",
        upc: "887276559483"
      },
      {
        title: "Sony PlayStation 5",
        upc: "711719541028"
      },
      {
        title: "Xbox Series X",
        upc: "889842640809"
      },
      {
        title: "Apple Watch Series 7",
        upc: "194252058787"
      }
    ];
  }
}
