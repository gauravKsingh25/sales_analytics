import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('Starting test seed...');
console.log('MongoDB URI:', process.env.MONGO_URI ? 'Found' : 'NOT FOUND');

const run = async () => {
  try {
    console.log('\n1. Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected!');

    console.log('\n2. Reading JSON file...');
    const jsonPath = path.join(__dirname, '../uploads/credit notes/credit note 1-4-24 to 31-3-25.json');
    console.log('   Path:', jsonPath);
    console.log('   Exists:', fs.existsSync(jsonPath));
    
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log('✓ Loaded', data.length, 'credit notes');
    
    console.log('\n3. Sample credit note:');
    console.log(JSON.stringify(data[0], null, 2));
    
    console.log('\n✓ Test complete!');
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
};

run();
