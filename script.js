// Store employees in localStorage
let employees = JSON.parse(localStorage.getItem('employees')) || [];

// Handle form submission
document.getElementById('employeeForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const empId = document.getElementById('empId').value;
    const empName = document.getElementById('empName').value;
    const empPosition = document.getElementById('empPosition').value;

    // Check if employee ID already exists
    if (employees.some(emp => emp.id === empId)) {
        alert('รหัสพนักงานนี้มีอยู่ในระบบแล้ว');
        return;
    }

    // Create new employee object
    const employee = {
        id: empId,
        name: empName,
        position: empPosition,
        qrData: JSON.stringify({
            id: empId,
            name: empName,
            position: empPosition
        })
    };

    // Add to employees array
    employees.push(employee);
    
    // Save to localStorage
    localStorage.setItem('employees', JSON.stringify(employees));

    // Generate QR Code
    generateQRCode(employee.qrData);

    // Update employee table
    updateEmployeeTable();

    // Clear form
    this.reset();
});

// Generate QR Code
function generateQRCode(data) {
    const qrDiv = document.getElementById('qrcode');
    qrDiv.innerHTML = ''; // Clear previous QR code

    try {
        const qr = qrcode(0, 'L');
        qr.addData(data);
        qr.make();
        
        // Create QR code image
        const qrImage = qr.createImgTag(5);
        qrDiv.innerHTML = qrImage;

        // Show print and save buttons
        document.getElementById('printQR').style.display = 'block';
        document.getElementById('saveQR').style.display = 'block';

        // Scroll to QR section
        document.querySelector('.qr-section').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error generating QR code:', error);
        alert('เกิดข้อผิดพลาดในการสร้าง QR Code');
    }
}

// Save QR Code as image
function saveQRCode() {
    const qrImage = document.querySelector('#qrcode img');
    if (!qrImage) {
        alert('กรุณาสร้าง QR Code ก่อนบันทึก');
        return;
    }

    // Create a canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = qrImage.width;
    canvas.height = qrImage.height;
    
    // Draw image on canvas
    context.drawImage(qrImage, 0, 0);
    
    // Convert to data URL and trigger download
    const link = document.createElement('a');
    link.download = 'qr_code.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Delete employee
function deleteEmployee(employeeId) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบพนักงานคนนี้?')) {
        // Remove employee from array
        employees = employees.filter(emp => emp.id !== employeeId);
        
        // Update localStorage
        localStorage.setItem('employees', JSON.stringify(employees));
        
        // Remove related time records
        const timeRecords = JSON.parse(localStorage.getItem('timeRecords')) || [];
        const updatedRecords = timeRecords.filter(record => record.employeeId !== employeeId);
        localStorage.setItem('timeRecords', JSON.stringify(updatedRecords));
        
        // Update table
        updateEmployeeTable();
        
        // Clear QR code display
        const qrDiv = document.getElementById('qrcode');
        if (qrDiv) {
            qrDiv.innerHTML = '';
            document.getElementById('printQR').style.display = 'none';
            document.getElementById('saveQR').style.display = 'none';
        }
        
        alert('ลบพนักงานเรียบร้อยแล้ว');
    }
}

// Update employee table
function updateEmployeeTable() {
    const tbody = document.querySelector('#employeeTable tbody');
    tbody.innerHTML = '';

    employees.forEach(employee => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${employee.id}</td>
            <td>${employee.name}</td>
            <td>${employee.position}</td>
            <td>
                <button onclick="showQRCode('${encodeURIComponent(employee.qrData)}')" class="action-button">แสดง QR Code</button>
                <button onclick="deleteEmployee('${employee.id}')" class="action-button delete-button">ลบพนักงาน</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Show QR Code for specific employee
function showQRCode(data) {
    try {
        const decodedData = decodeURIComponent(data);
        generateQRCode(decodedData);
    } catch (error) {
        console.error('Error showing QR code:', error);
        alert('เกิดข้อผิดพลาดในการแสดง QR Code');
    }
}

// Print QR Code
document.getElementById('printQR').addEventListener('click', function() {
    const qrImage = document.querySelector('#qrcode img');
    if (!qrImage) {
        alert('ไม่พบ QR Code ที่จะพิมพ์');
        return;
    }

    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow.document.write('<html><head><title>Print QR Code</title>');
    printWindow.document.write('<style>body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(qrImage.outerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
});

// Initialize employee table
updateEmployeeTable(); 