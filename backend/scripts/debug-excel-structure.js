import ExcelJS from 'exceljs';

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile('backend/uploads/item included vouchers/MAR 2025.xlsx');
const sheet = workbook.worksheets[0];

console.log('First 20 rows of Excel:\n');
let rowIndex = 0;
sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
  if (rowIndex++ < 20) {
    const values = row.values.slice(1);
    console.log(`Row ${rowNumber}:`, values.map((v, i) => {
      if (v === null || v === undefined) return `[${i}]:null`;
      if (v instanceof Date) return `[${i}]:${v.toISOString().slice(0,10)}`;
      const str = String(v).slice(0, 40);
      return `[${i}]:${str}`;
    }).join(' | '));
  }
});
