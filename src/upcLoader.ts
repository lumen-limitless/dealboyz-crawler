import { promises as fs } from 'fs';
import path from 'path';

// Function to load UPCs from a configuration file
export async function loadUpcs(): Promise<string[]> {
  try {
    const configPath = path.join(process.cwd(), 'config', 'upcs.json');
    const data = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(data);

    if (Array.isArray(config.upcs)) {
      return config.upcs;
    } else {
      console.error(
        'Invalid UPCs configuration format. Expected an array of UPCs.',
      );
      return [];
    }
  } catch (error) {
    console.error('Error loading UPCs:', error);

    // Return some default UPCs for testing if the file doesn't exist
    return ['194253416982'];
  }
}
