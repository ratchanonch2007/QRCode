// Google Sheets Config
const SHEET_ID = 'YOUR_SHEET_ID'; // ต้องนำ ID จาก URL ของ Google Sheets มาใส่
const API_KEY = 'YOUR_API_KEY'; // ต้องสร้าง API Key จาก Google Cloud Console

// Google Apps Script Web App URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwrmzwLJsBJZc_6Fc6SGDqOXvf8lvFcbkC3p2fUoIvCmblmkycoeEAoDwH1tGz3-xK9Iw/exec';

// URL ของ Google Apps Script Web App
const WEBAPP_URL = SCRIPT_URL;

// ชื่อ Sheets (tabs) ที่ใช้เก็บข้อมูล
const SHEETS = {
    EMPLOYEES: 'Employees',
    TIME_RECORDS: 'TimeRecords'
};

// Column names in Sheets
const COLUMNS = {
    EMPLOYEES: ['ID', 'Name', 'Position', 'QRData'],
    TIME_RECORDS: ['Timestamp', 'EmployeeID', 'Name', 'Position', 'Type']
}; 