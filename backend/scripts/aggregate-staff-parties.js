// Script to aggregate parties by staff from vouchers
// This creates a mapping of which parties each staff member is responsible for
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Voucher from '../schemas/voucher.js';
import Employee from '../schemas/employee.js';
import VoucherParticipant from '../schemas/voucherparticipant.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tally-software';

async function aggregateStaffParties() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Get all vouchers
    const vouchers = await Voucher.find({}).lean();
    console.log(`Found ${vouchers.length} vouchers`);

    // Create a map: staffName -> Set of party names
    const staffPartiesMap = new Map();

    for (const voucher of vouchers) {
      const party = voucher.rawOriginal?.Party;
      const details = voucher.rawOriginal?.Details || [];

      if (!party) continue; // Skip vouchers without party

      // Find staff in details
      const staffEntries = details.filter(d => d.Staff);

      for (const entry of staffEntries) {
        const staffName = entry.Staff.trim();
        
        if (!staffPartiesMap.has(staffName)) {
          staffPartiesMap.set(staffName, new Set());
        }
        
        staffPartiesMap.get(staffName).add(party.trim());
      }
    }

    // Convert to sorted array format
    const staffPartiesArray = [];
    
    for (const [staffName, partiesSet] of staffPartiesMap.entries()) {
      const parties = Array.from(partiesSet).sort();
      
      staffPartiesArray.push({
        staffName,
        partiesCount: parties.length,
        parties
      });
    }

    // Sort by party count (descending)
    staffPartiesArray.sort((a, b) => b.partiesCount - a.partiesCount);

    console.log('\n=== Staff-Party Mapping ===\n');
    
    for (const item of staffPartiesArray) {
      console.log(`${item.staffName} (${item.partiesCount} parties)`);
      console.log('  Parties:', item.parties.slice(0, 5).join(', '), 
                  item.parties.length > 5 ? `... and ${item.parties.length - 5} more` : '');
      console.log('');
    }

    // Try to match with existing employees and update their metadata
    console.log('\n=== Updating Employee Records ===\n');
    
    let updatedCount = 0;
    let notFoundCount = 0;

    for (const item of staffPartiesArray) {
      const normalized = item.staffName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Try to find matching employee
      const employee = await Employee.findOne({ normalized });
      
      if (employee) {
        // Update employee with parties list
        await Employee.findByIdAndUpdate(employee._id, {
          $set: {
            'metadata.responsibleParties': item.parties,
            'metadata.partiesCount': item.partiesCount
          }
        });
        
        console.log(`✓ Updated: ${item.staffName} -> ${employee.name} (${item.partiesCount} parties)`);
        updatedCount++;
      } else {
        console.log(`✗ Not found in DB: ${item.staffName} (${item.partiesCount} parties)`);
        notFoundCount++;
      }
    }

    console.log(`\n✓ Updated ${updatedCount} employees`);
    console.log(`✗ ${notFoundCount} staff names not found in employee database`);

    return staffPartiesArray;

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  aggregateStaffParties()
    .then(() => {
      console.log('\n✓ Complete!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

export default aggregateStaffParties;
