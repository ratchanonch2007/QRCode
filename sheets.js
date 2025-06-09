class GoogleSheetsAPI {
    constructor() {
        this.baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;
    }

    // อ่านข้อมูลทั้งหมดจาก Sheet
    async readSheet(sheetName) {
        try {
            const response = await fetch(
                `${this.baseUrl}/values/${sheetName}?key=${API_KEY}`
            );
            const data = await response.json();
            
            if (!data.values || data.values.length <= 1) {
                return [];
            }

            const headers = data.values[0];
            return data.values.slice(1).map(row => {
                const item = {};
                headers.forEach((header, index) => {
                    item[header.toLowerCase()] = row[index] || '';
                });
                return item;
            });
        } catch (error) {
            console.error('Error reading from Google Sheets:', error);
            throw error;
        }
    }

    // เพิ่มข้อมูลใหม่ลงใน Sheet
    async appendRow(sheetName, values) {
        try {
            const response = await fetch(
                `${this.baseUrl}/values/${sheetName}:append?valueInputOption=RAW&key=${API_KEY}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        values: [values]
                    })
                }
            );
            return await response.json();
        } catch (error) {
            console.error('Error appending to Google Sheets:', error);
            throw error;
        }
    }

    // ลบแถวข้อมูล
    async deleteRow(sheetName, rowIndex) {
        try {
            const response = await fetch(
                `${this.baseUrl}:batchUpdate?key=${API_KEY}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        requests: [{
                            deleteDimension: {
                                range: {
                                    sheetId: sheetName,
                                    dimension: 'ROWS',
                                    startIndex: rowIndex,
                                    endIndex: rowIndex + 1
                                }
                            }
                        }]
                    })
                }
            );
            return await response.json();
        } catch (error) {
            console.error('Error deleting row from Google Sheets:', error);
            throw error;
        }
    }

    // อัพเดทข้อมูลในแถว
    async updateRow(sheetName, rowIndex, values) {
        try {
            const range = `${sheetName}!A${rowIndex}`;
            const response = await fetch(
                `${this.baseUrl}/values/${range}?valueInputOption=RAW&key=${API_KEY}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        values: [values]
                    })
                }
            );
            return await response.json();
        } catch (error) {
            console.error('Error updating Google Sheets:', error);
            throw error;
        }
    }

    // อ่านข้อมูลพนักงานทั้งหมด
    async readEmployees() {
        try {
            const response = await fetch(`${WEBAPP_URL}?action=getEmployees`);
            const result = await response.json();
            if (result.status === 'error') {
                throw new Error(result.message);
            }
            return result.data;
        } catch (error) {
            console.error('Error reading employees:', error);
            throw error;
        }
    }

    // เพิ่มพนักงานใหม่
    async addEmployee(employee) {
        return new Promise((resolve, reject) => {
            try {
                // สร้าง callback function name แบบ unique
                const callbackName = 'jsonpCallback_' + Date.now();
                
                // สร้าง script element
                const script = document.createElement('script');
                script.src = `${WEBAPP_URL}?action=addEmployee&callback=${callbackName}&data=${encodeURIComponent(JSON.stringify(employee))}`;
                
                // สร้าง callback function
                window[callbackName] = function(response) {
                    // ลบ script element
                    document.body.removeChild(script);
                    // ลบ callback function
                    delete window[callbackName];
                    
                    if (response.status === 'error') {
                        reject(new Error(response.message));
                    } else {
                        resolve(response);
                    }
                };
                
                // เพิ่ม script เข้าไปใน document
                document.body.appendChild(script);
                
                // ตั้ง timeout สำหรับกรณีที่ไม่ได้รับ response
                setTimeout(() => {
                    if (window[callbackName]) {
                        document.body.removeChild(script);
                        delete window[callbackName];
                        reject(new Error('Request timeout'));
                    }
                }, 10000); // timeout 10 วินาที
                
            } catch (error) {
                console.error('Error adding employee:', error);
                reject(error);
            }
        });
    }

    // ลบพนักงาน
    async deleteEmployee(employeeId) {
        return new Promise((resolve, reject) => {
            try {
                // สร้าง callback function name แบบ unique
                const callbackName = 'jsonpCallback_' + Date.now();
                
                // สร้าง script element
                const script = document.createElement('script');
                script.src = `${WEBAPP_URL}?action=deleteEmployee&employeeId=${employeeId}&callback=${callbackName}`;
                
                // สร้าง callback function
                window[callbackName] = function(response) {
                    // ลบ script element
                    document.body.removeChild(script);
                    // ลบ callback function
                    delete window[callbackName];
                    
                    if (response.status === 'error') {
                        reject(new Error(response.message));
                    } else {
                        resolve(response);
                    }
                };
                
                // เพิ่ม script เข้าไปใน document
                document.body.appendChild(script);
                
                // ตั้ง timeout สำหรับกรณีที่ไม่ได้รับ response
                setTimeout(() => {
                    if (window[callbackName]) {
                        document.body.removeChild(script);
                        delete window[callbackName];
                        reject(new Error('Request timeout'));
                    }
                }, 10000); // timeout 10 วินาที
                
            } catch (error) {
                console.error('Error deleting employee:', error);
                reject(error);
            }
        });
    }

    // บันทึกเวลาเข้า-ออก
    async addTimeRecord(record) {
        try {
            const response = await fetch(`${WEBAPP_URL}?action=addTimeRecord`, {
                method: 'POST',
                body: JSON.stringify(record)
            });
            const result = await response.json();
            if (result.status === 'error') {
                throw new Error(result.message);
            }
            return result;
        } catch (error) {
            console.error('Error adding time record:', error);
            throw error;
        }
    }

    // ดึงประวัติการลงเวลา
    async getTimeRecords() {
        try {
            const response = await fetch(`${WEBAPP_URL}?action=getTimeRecords`);
            const result = await response.json();
            if (result.status === 'error') {
                throw new Error(result.message);
            }
            return result.data;
        } catch (error) {
            console.error('Error reading time records:', error);
            throw error;
        }
    }
} 