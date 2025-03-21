import { promises as fs } from "fs";
import path from "path";

// Function to load SKUs from a configuration file
export async function loadSkus(): Promise<string[]> {
    try {
        const configPath = path.join(process.cwd(), 'config', 'skus.json');
        const data = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(data);
        
        if (Array.isArray(config.skus)) {
            return config.skus;
        } else {
            console.error('Invalid SKUs configuration format. Expected an array of SKUs.');
            return [];
        }
    } catch (error) {
        console.error('Error loading SKUs:', error);
        
        // Return some default SKUs for testing if the file doesn't exist
        return [
            'B07ZPKBL7Y', // Example iPhone SKU
            'B09G9HD6PD', // Example Samsung Galaxy SKU
            'B08F7N8PDP', // Example Sony PlayStation 5 SKU
            'B08H75RTZ8', // Example Xbox Series X SKU
            'B09DFHJTF5'  // Example Apple Watch SKU
        ];
    }
}
