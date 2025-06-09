const sheetsAPI = new GoogleSheetsAPI();

// Handle form submission
document.getElementById('employeeForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const empId = document.getElementById('empId').value;
    const empName = document.getElementById('empName').value;
    const empPosition = document.getElementById('empPosition').value;

    try {
        // Create employee object
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

        // Add employee using API
        await sheetsAPI.addEmployee(employee);

        // Clear form
        this.reset();

        // Show success message
        alert('บันทึกข้อมูลพนักงานเรียบร้อยแล้ว');

        // Redirect to employee list page
        window.location.href = 'employee-list.html';
    } catch (error) {
        console.error('Error adding employee:', error);
        alert(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    }
});

// Initialize menu toggle and submenu
document.addEventListener('DOMContentLoaded', function() {
    // Menu toggle functionality
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    
    menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });

    // Close sidebar when clicking outside
    document.addEventListener('click', function(e) {
        if (sidebar.classList.contains('active') && 
            !sidebar.contains(e.target) && 
            !menuToggle.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });

    // Submenu toggle functionality
    const submenuToggles = document.querySelectorAll('.submenu-toggle');
    submenuToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            const submenu = this.nextElementSibling;
            const icon = this.querySelector('.submenu-icon');
            
            // Close other submenus
            submenuToggles.forEach(otherToggle => {
                if (otherToggle !== this) {
                    const otherSubmenu = otherToggle.nextElementSibling;
                    const otherIcon = otherToggle.querySelector('.submenu-icon');
                    otherSubmenu.classList.remove('show');
                    otherIcon.classList.remove('rotate');
                }
            });

            submenu.classList.toggle('show');
            icon.classList.toggle('rotate');
        });
    });

    // Initialize current time display
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
});

// Update current time
function updateCurrentTime() {
    const currentTimeElement = document.getElementById('currentTime');
    if (currentTimeElement) {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        currentTimeElement.textContent = now.toLocaleString('th-TH', options);
    }
}

// ฟังก์ชันล้างข้อมูลในแดชบอร์ด
function clearDashboard() {
    const tableContainer = document.getElementById('timeRecordsTable');
    tableContainer.innerHTML = `
        <table class="table table-striped">
            <thead class="thead-dark">
                <tr>
                    <th>เวลา</th>
                    <th>รหัสพนักงาน</th>
                    <th>ชื่อ-นามสกุล</th>
                    <th>ตำแหน่ง</th>
                    <th>ประเภท</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    `;
}

// เพิ่ม Event Listener สำหรับปุ่มล้างข้อมูล
document.addEventListener('DOMContentLoaded', () => {
    // เริ่มต้นสแกนเนอร์
    startScanner();

    // เพิ่ม event listener สำหรับปุ่มล้างข้อมูล
    const clearBtn = document.getElementById('clearDashboardBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('คุณแน่ใจหรือไม่ที่จะล้างข้อมูลในแดชบอร์ด?')) {
                clearDashboard();
            }
        });
    }
});

// ฟังก์ชันโหลดข้อมูลการลงเวลาจาก Google Sheets
async function loadTimeRecords() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getTimeRecords`, {
            method: 'GET'
        });
        const result = await response.json();

        if (result.status === 'success') {
            const tableContainer = document.getElementById('timeRecordsTable');
            if (result.data.length === 0) {
                tableContainer.innerHTML = '<p class="text-center">ไม่มีข้อมูลการลงเวลา</p>';
                return;
            }

            let html = `
                <table class="table table-striped">
                    <thead class="thead-dark">
                        <tr>
                            <th>เวลา</th>
                            <th>รหัสพนักงาน</th>
                            <th>ชื่อ-นามสกุล</th>
                            <th>ตำแหน่ง</th>
                            <th>ประเภท</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            // เรียงข้อมูลจากใหม่ไปเก่า
            result.data.reverse().forEach(record => {
                html += `
                    <tr>
                        <td>${record.timestamp}</td>
                        <td>${record.employeeId}</td>
                        <td>${record.name}</td>
                        <td>${record.position}</td>
                        <td>${record.type}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;
            tableContainer.innerHTML = html;
        } else {
            throw new Error(result.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
        }
    } catch (error) {
        console.error('Error loading time records:', error);
        document.getElementById('timeRecordsTable').innerHTML = 
            `<div class="alert alert-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message}</div>`;
    }
}

// ฟังก์ชันสำหรับการสแกน QR Code
function onScanSuccess(decodedText) {
    try {
        const data = JSON.parse(decodedText);
        // เพิ่มข้อมูลลงในตารางก่อน
        addToLocalDashboard(data);
        // แล้วค่อยบันทึกลง Google Sheets
        saveTimeRecord(data);
    } catch (error) {
        console.error('Error parsing QR code data:', error);
        alert('QR Code ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }
}

// ฟังก์ชันเพิ่มข้อมูลลงในตารางแดชบอร์ด
function addToLocalDashboard(data) {
    const tableContainer = document.getElementById('timeRecordsTable');
    let table = tableContainer.querySelector('table');
    
    // ถ้ายังไม่มีตาราง ให้สร้างใหม่
    if (!table) {
        table = document.createElement('table');
        table.className = 'table table-striped';
        table.innerHTML = `
            <thead class="thead-dark">
                <tr>
                    <th>เวลา</th>
                    <th>รหัสพนักงาน</th>
                    <th>ชื่อ-นามสกุล</th>
                    <th>ตำแหน่ง</th>
                    <th>ประเภท</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        tableContainer.innerHTML = '';
        tableContainer.appendChild(table);
    }

    // เพิ่มข้อมูลใหม่ลงในตาราง
    const tbody = table.querySelector('tbody');
    const row = document.createElement('tr');
    const timestamp = new Date().toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    row.innerHTML = `
        <td>${timestamp}</td>
        <td>${data.employeeId}</td>
        <td>${data.name}</td>
        <td>${data.position}</td>
        <td>${data.type}</td>
    `;

    // เพิ่มแถวใหม่ไว้บนสุด
    tbody.insertBefore(row, tbody.firstChild);
}

// ฟังก์ชันบันทึกเวลา
async function saveTimeRecord(data) {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=addTimeRecord`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            console.log('บันทึกข้อมูลลง Google Sheets สำเร็จ');
        } else {
            console.warn('ไม่สามารถบันทึกข้อมูลลง Google Sheets:', result.message);
        }
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
    }
}

// โหลดข้อมูลเมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
    // เริ่มต้นสแกนเนอร์
    startScanner();
}); 