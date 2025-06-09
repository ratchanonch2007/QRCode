// ฟังก์ชันสำหรับรับค่า POST request
function doPost(e) {
    try {
        let requestData;
        if (e.postData && e.postData.contents) {
            requestData = JSON.parse(e.postData.contents);
        } else {
            requestData = e.parameter;
        }

        const action = requestData.action;
        const sheet = SpreadsheetApp.getActiveSpreadsheet();
        
        let result;
        switch(action) {
            case 'addEmployee':
                result = addEmployee(sheet, requestData);
                break;
            case 'deleteEmployee':
                result = deleteEmployee(sheet, requestData.employeeId);
                break;
            case 'addTimeRecord':
                result = addTimeRecord(sheet, requestData);
                break;
            case 'clearTimeRecords':
                result = clearTimeRecords(sheet);
                break;
            default:
                throw new Error('Invalid action');
        }

        return ContentService.createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            status: 'error',
            message: error.toString()
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
}

// ฟังก์ชันสำหรับรับค่า GET request
function doGet(e) {
    try {
        const action = e.parameter.action;
        const callback = e.parameter.callback;
        const sheet = SpreadsheetApp.getActiveSpreadsheet();
        
        let result;
        switch(action) {
            case 'getEmployees':
                result = getEmployees(sheet);
                break;
            case 'getTimeRecords':
                result = getTimeRecords(sheet);
                break;
            case 'addTimeRecord':
                const timeData = JSON.parse(e.parameter.data);
                result = addTimeRecord(sheet, timeData);
                break;
            case 'deleteEmployee':
                const deleteData = JSON.parse(e.parameter.data);
                result = deleteEmployee(sheet, deleteData.employeeId);
                break;
            case 'clearTimeRecords':
                result = clearTimeRecords(sheet);
                break;
            default:
                throw new Error('Invalid action');
        }

        const jsonResponse = JSON.stringify(result);
        
        if (callback) {
            return ContentService.createTextOutput(callback + '(' + jsonResponse + ')')
                .setMimeType(ContentService.MimeType.JAVASCRIPT);
        } else {
            return ContentService.createTextOutput(jsonResponse)
                .setMimeType(ContentService.MimeType.JSON);
        }
    } catch (error) {
        const errorResponse = JSON.stringify({
            status: 'error',
            message: error.toString()
        });
        
        if (e.parameter.callback) {
            return ContentService.createTextOutput(e.parameter.callback + '(' + errorResponse + ')')
                .setMimeType(ContentService.MimeType.JAVASCRIPT);
        } else {
            return ContentService.createTextOutput(errorResponse)
                .setMimeType(ContentService.MimeType.JSON);
        }
    }
}

// เพิ่มพนักงานใหม่
function addEmployee(sheet, data) {
    try {
        let employeesSheet = sheet.getSheetByName('Employees');
        if (!employeesSheet) {
            employeesSheet = sheet.insertSheet('Employees');
            employeesSheet.appendRow(['EmployeeID', 'Name', 'Position', 'CheckInQR', 'CheckOutQR']);
        }

        // ตรวจสอบว่ามีพนักงานคนนี้อยู่แล้วหรือไม่
        const employees = employeesSheet.getDataRange().getValues();
        const isDuplicate = employees.some(row => row[0] === data.id);
        if (isDuplicate) {
            return {
                status: 'error',
                message: 'รหัสพนักงานนี้มีอยู่ในระบบแล้ว'
            };
        }

        // สร้าง QR Code สำหรับเข้างาน
        const checkInQRData = JSON.stringify({
            employeeId: data.id,
            name: data.name,
            position: data.position,
            type: 'check-in'
        });

        // สร้าง QR Code สำหรับออกงาน
        const checkOutQRData = JSON.stringify({
            employeeId: data.id,
            name: data.name,
            position: data.position,
            type: 'check-out'
        });

        employeesSheet.appendRow([data.id, data.name, data.position, checkInQRData, checkOutQRData]);

        // จัดรูปแบบตาราง
        const lastRow = employeesSheet.getLastRow();
        const range = employeesSheet.getRange(lastRow, 1, 1, 5);
        range.setHorizontalAlignment("center");
        range.setVerticalAlignment("middle");

        return {
            status: 'success',
            message: 'เพิ่มพนักงานเรียบร้อยแล้ว',
            checkInQRData: checkInQRData,
            checkOutQRData: checkOutQRData
        };
    } catch (error) {
        return {
            status: 'error',
            message: error.message || 'เกิดข้อผิดพลาดในการเพิ่มพนักงาน'
        };
    }
}

// ลบพนักงาน
function deleteEmployee(sheet, employeeId) {
    try {
        const employeesSheet = sheet.getSheetByName('Employees');
        if (!employeesSheet) {
            throw new Error('ไม่พบข้อมูลพนักงาน');
        }

        // Log the received employeeId
        Logger.log('Received employeeId: ' + employeeId);
        Logger.log('Type of employeeId: ' + typeof employeeId);

        const data = employeesSheet.getDataRange().getValues();
        
        // Log all employee IDs for comparison
        data.forEach((row, index) => {
            Logger.log(`Row ${index}: ID=${row[0]}, Type=${typeof row[0]}`);
        });

        for (let i = data.length - 1; i >= 0; i--) {
            // Convert both to string for comparison
            const sheetId = String(data[i][0]).trim();
            const targetId = String(employeeId).trim();
            
            Logger.log(`Comparing: sheet="${sheetId}" (${typeof sheetId}) with target="${targetId}" (${typeof targetId})`);
            
            if (sheetId === targetId) {
                employeesSheet.deleteRow(i + 1);
                return {
                    status: 'success',
                    message: 'ลบพนักงานเรียบร้อยแล้ว'
                };
            }
        }

        throw new Error('ไม่พบรหัสพนักงานนี้');
    } catch (error) {
        return {
            status: 'error',
            message: error.message || 'เกิดข้อผิดพลาดในการลบพนักงาน'
        };
    }
}

// ดึงข้อมูลพนักงานทั้งหมด
function getEmployees(sheet) {
    try {
        const employeesSheet = sheet.getSheetByName('Employees');
        if (!employeesSheet) {
            return {
                status: 'success',
                data: []
            };
        }

        const data = employeesSheet.getDataRange().getValues();
        const headers = data[0];
        const employees = data.slice(1).map(row => ({
            id: row[0],
            name: row[1],
            position: row[2],
            qrCode: row[3]
        }));

        return {
            status: 'success',
            data: employees
        };
    } catch (error) {
        return {
            status: 'error',
            message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน'
        };
    }
}

// เพิ่มการบันทึกเวลา
function addTimeRecord(sheet, data) {
    try {
        let timeRecordsSheet = sheet.getSheetByName('TimeRecords');
        if (!timeRecordsSheet) {
            timeRecordsSheet = sheet.insertSheet('TimeRecords');
            timeRecordsSheet.appendRow(['Timestamp', 'EmployeeID', 'Name', 'Position', 'Type']);
            
            // Format header
            const headerRange = timeRecordsSheet.getRange(1, 1, 1, 5);
            headerRange.setBackground("#4a4a4a");
            headerRange.setFontColor("white");
            headerRange.setFontWeight("bold");
            
            // Set column widths
            timeRecordsSheet.setColumnWidth(1, 150);
            timeRecordsSheet.setColumnWidth(2, 100);
            timeRecordsSheet.setColumnWidth(3, 150);
            timeRecordsSheet.setColumnWidth(4, 150);
            timeRecordsSheet.setColumnWidth(5, 100);
        }

        const now = new Date();
        const today = Utilities.formatDate(now, "Asia/Bangkok", "dd/MM/yyyy");
        const timestamp = Utilities.formatDate(now, "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");

        // ดึงข้อมูลการลงเวลาทั้งหมด
        const records = timeRecordsSheet.getDataRange().getValues();
        
        // ตรวจสอบว่าวันนี้เคยลงเวลามาแล้วหรือไม่
        const todayRecords = records.filter(record => {
            if (typeof record[0] === 'string') {
                const recordDate = record[0].split(' ')[0]; // แยกเอาเฉพาะวันที่
                return recordDate === today && record[1] === data.employeeId;
            } else if (record[0] instanceof Date) {
                const recordDate = Utilities.formatDate(record[0], "Asia/Bangkok", "dd/MM/yyyy");
                return recordDate === today && record[1] === data.employeeId;
            }
            return false;
        });

        // กำหนดประเภทการลงเวลา
        let recordType;
        if (todayRecords.length === 0) {
            recordType = 'เข้างาน';
        } else {
            // เช็คประเภทการลงเวลาล่าสุดของวันนี้
            const lastRecord = todayRecords[todayRecords.length - 1];
            recordType = lastRecord[4] === 'เข้างาน' ? 'ออกงาน' : 'เข้างาน';
        }
        
        timeRecordsSheet.appendRow([
            timestamp,
            data.employeeId,
            data.name,
            data.position,
            recordType
        ]);

        // Format new row
        const lastRow = timeRecordsSheet.getLastRow();
        const range = timeRecordsSheet.getRange(lastRow, 1, 1, 5);
        range.setHorizontalAlignment("center");
        range.setVerticalAlignment("middle");

        return {
            status: 'success',
            message: `บันทึกเวลา${recordType}เรียบร้อยแล้ว`
        };
    } catch (error) {
        return {
            status: 'error',
            message: error.toString()
        };
    }
}

// ดึงข้อมูลการลงเวลา
function getTimeRecords(sheet) {
    try {
        const timeRecordsSheet = sheet.getSheetByName('TimeRecords');
        if (!timeRecordsSheet) {
            return {
                status: 'success',
                data: []
            };
        }

        const data = timeRecordsSheet.getDataRange().getValues();
        const headers = data[0];
        const records = data.slice(1).map(row => ({
            timestamp: row[0],
            employeeId: row[1],
            name: row[2],
            position: row[3],
            type: row[4]
        }));

        return {
            status: 'success',
            data: records
        };
    } catch (error) {
        return {
            status: 'error',
            message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลการลงเวลา'
        };
    }
}

// ล้างข้อมูลการลงเวลา
function clearTimeRecords(sheet) {
    try {
        const timeRecordsSheet = sheet.getSheetByName('TimeRecords');
        if (!timeRecordsSheet) {
            return {
                status: 'success',
                message: 'ไม่มีข้อมูลที่ต้องล้าง'
            };
        }

        const lastRow = timeRecordsSheet.getLastRow();
        if (lastRow > 1) {
            timeRecordsSheet.deleteRows(2, lastRow - 1);
        }

        return {
            status: 'success',
            message: 'ล้างข้อมูลเรียบร้อยแล้ว'
        };
    } catch (error) {
        return {
            status: 'error',
            message: error.message || 'เกิดข้อผิดพลาดในการล้างข้อมูล'
        };
    }
}