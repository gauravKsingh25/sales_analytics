/**
 * Check specific voucher ODIN/06683 
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

import Voucher from '../schemas/voucher.js';
import VoucherItem from '../schemas/voucheritem.js';

dotenv.config({ path: path.resolve('backend', '.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tally';

async function checkSpecific() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Check what JSON says
    const jsonPath = 'backend/uploads/item included vouchers/MAR 2025-with-items.json';
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const voucherInJson = jsonData.find(v => v.Voucher_Number === 'ODIN/06683');
    
    console.log('📋 What the JSON file says (ODIN/06683):\n');
    if (voucherInJson) {
      console.log(`   Items in JSON: ${voucherInJson.Items.length}`);
      voucherInJson.Items.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.description}`);
        console.log(`      Qty: ${item.qty}, Price: ₹${item.unitPrice}, Amount: ₹${item.amount}`);
      });
    }
    
    // Check what MongoDB has
    const voucher = await Voucher.findOne({ voucherNumber: 'ODIN/06683' });
    
    if (!voucher) {
      console.log('\n❌ Voucher ODIN/06683 not found in MongoDB');
      return;
    }
    
    console.log(`\n\n📊 What MongoDB has (ODIN/06683):\n`);
    console.log(`   Voucher ID: ${voucher._id}`);
    console.log(`   Date: ${voucher.date.toISOString().slice(0, 10)}`);
    console.log(`   Total: ₹${voucher.totalAmount}`);
    
    const items = await VoucherItem.find({ voucherId: voucher._id });
    console.log(`   Items in DB: ${items.length}\n`);
    
    items.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.description}`);
      console.log(`      Qty: ${item.qty}, Price: ₹${item.unitPrice}, Amount: ₹${item.amount}`);
    });
    
    console.log('\n🔍 Comparison:');
    console.log(`   JSON has ${voucherInJson?.Items.length || 0} items`);
    console.log(`   MongoDB has ${items.length} items`);
    
    if (items.length === 2 && voucherInJson?.Items.length === 4) {
      console.log('\n⚠️  The product items are NOT in MongoDB!');
      console.log('   Only GST account items are present.');
      console.log('   Need to delete existing items first and re-import.');
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

checkSpecific();
