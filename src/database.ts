import { promises as fs } from "fs";
import path from "path";

// Define types for our data
export interface ProductPrice {
    sku: string;
    retailer: string;
    price: number;
    currency: string;
    productName: string;
    url: string;
    timestamp: Date;
}

export interface PriceDiscrepancy {
    sku: string;
    prices: ProductPrice[];
    priceDifference: number;
    percentageDifference: number;
    timestamp: Date;
}

// Simple file-based database for storing product prices and discrepancies
export class ProductDatabase {
    private dbDir: string;
    private pricesFile: string;
    private discrepanciesFile: string;
    private prices: ProductPrice[] = [];
    private discrepancies: PriceDiscrepancy[] = [];
    
    constructor() {
        this.dbDir = path.join(process.cwd(), 'storage', 'database');
        this.pricesFile = path.join(this.dbDir, 'prices.json');
        this.discrepanciesFile = path.join(this.dbDir, 'discrepancies.json');
        this.initDatabase();
    }
    
    // Initialize the database
    private async initDatabase() {
        try {
            // Create database directory if it doesn't exist
            await fs.mkdir(this.dbDir, { recursive: true });
            
            // Load existing data if available
            try {
                const pricesData = await fs.readFile(this.pricesFile, 'utf8');
                this.prices = JSON.parse(pricesData);
            } catch (error) {
                // File doesn't exist yet, initialize with empty array
                this.prices = [];
                await this.savePrices();
            }
            
            try {
                const discrepanciesData = await fs.readFile(this.discrepanciesFile, 'utf8');
                this.discrepancies = JSON.parse(discrepanciesData);
            } catch (error) {
                // File doesn't exist yet, initialize with empty array
                this.discrepancies = [];
                await this.saveDiscrepancies();
            }
        } catch (error) {
            console.error('Error initializing database:', error);
        }
    }
    
    // Save prices to file
    private async savePrices() {
        await fs.writeFile(this.pricesFile, JSON.stringify(this.prices, null, 2), 'utf8');
    }
    
    // Save discrepancies to file
    private async saveDiscrepancies() {
        await fs.writeFile(this.discrepanciesFile, JSON.stringify(this.discrepancies, null, 2), 'utf8');
    }
    
    // Add a new price record
    async addPrice(price: ProductPrice): Promise<void> {
        this.prices.push(price);
        await this.savePrices();
    }
    
    // Log a price discrepancy
    async logDiscrepancy(
        sku: string, 
        prices: ProductPrice[], 
        priceDifference: number, 
        percentageDifference: number
    ): Promise<void> {
        const discrepancy: PriceDiscrepancy = {
            sku,
            prices,
            priceDifference,
            percentageDifference,
            timestamp: new Date()
        };
        
        this.discrepancies.push(discrepancy);
        await this.saveDiscrepancies();
    }
    
    // Get all prices for a specific SKU
    async getPricesBySku(sku: string): Promise<ProductPrice[]> {
        return this.prices.filter(price => price.sku === sku);
    }
    
    // Get all unique SKUs in the database
    async getUniqueSkus(): Promise<string[]> {
        const skus = new Set<string>();
        this.prices.forEach(price => skus.add(price.sku));
        return Array.from(skus);
    }
    
    // Get all discrepancies
    async getDiscrepancies(): Promise<PriceDiscrepancy[]> {
        return this.discrepancies;
    }
    
    // Get discrepancies for a specific SKU
    async getDiscrepanciesBySku(sku: string): Promise<PriceDiscrepancy[]> {
        return this.discrepancies.filter(discrepancy => discrepancy.sku === sku);
    }
}
