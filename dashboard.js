// ฟังก์ชันโหลดและแสดงข้อมูลการลงเวลา
async function loadTimeRecords() {
    const loadingIndicator = document.querySelector('.loading-indicator');
    loadingIndicator.style.display = 'block';

    try {
        // ดึงข้อมูลพนักงานจาก Google Sheet
        const sheetsAPI = new GoogleSheetsAPI();
        const employees = await sheetsAPI.readEmployees();

        // ดึงข้อมูลการลงเวลา
        const response = await fetch(`${SCRIPT_URL}?action=getTimeRecords`, {
            method: 'GET'
        });
        const result = await response.json();

        // Populate employee filter
        const employeeSelect = document.getElementById('employeeFilter');
        const currentSelectedValue = employeeSelect.value; // เก็บค่าที่เลือกไว้
        employeeSelect.innerHTML = '<option value="">ทั้งหมด</option>';
        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = `${emp.id} - ${emp.name}`;
            employeeSelect.appendChild(option);
        });
        employeeSelect.value = currentSelectedValue; // คืนค่าที่เลือกไว้

        if (result.status === 'success') {
            const tbody = document.querySelector('#timeRecordsTable tbody');
            tbody.innerHTML = '';

            if (result.data.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = '<td colspan="6" class="text-center">ไม่มีข้อมูลการลงเวลา</td>';
                tbody.appendChild(tr);
                return;
            }

            // Filter records
            let filteredRecords = result.data;
            const dateFilter = document.getElementById('dateFilter').value;
            const employeeFilter = employeeSelect.value; // ใช้ค่าจาก select โดยตรง

            if (dateFilter) {
                const filterDate = new Date(dateFilter).toLocaleDateString('th-TH');
                filteredRecords = filteredRecords.filter(record => {
                    const recordDate = new Date(record.timestamp).toLocaleDateString('th-TH');
                    return recordDate === filterDate;
                });
            }
            if (employeeFilter) {
                filteredRecords = filteredRecords.filter(record => record.employeeId === employeeFilter);
            }

            // Sort records by date and time (oldest first for processing)
            filteredRecords.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            // สร้าง Map เก็บสถานะล่าสุดของแต่ละวันของแต่ละพนักงาน
            const employeeDailyStatus = new Map();

            filteredRecords.forEach(record => {
                const date = new Date(record.timestamp);
                const recordDate = date.toLocaleDateString('th-TH');
                
                // สร้าง key สำหรับแต่ละวันของแต่ละพนักงาน
                const dailyKey = `${record.employeeId}_${recordDate}`;
                
                // ดึงรายการสถานะของวันนี้สำหรับพนักงานคนนี้
                let dailyRecords = employeeDailyStatus.get(dailyKey) || [];
                
                // กำหนดสถานะให้สลับกันไป
                if (dailyRecords.length === 0) {
                    record.type = 'เข้างาน';
                } else {
                    // ดูสถานะล่าสุด และสลับให้ตรงข้าม
                    const lastStatus = dailyRecords[dailyRecords.length - 1];
                    record.type = lastStatus === 'เข้างาน' ? 'ออกงาน' : 'เข้างาน';
                }
                
                // เก็บสถานะลงใน array
                dailyRecords.push(record.type);
                employeeDailyStatus.set(dailyKey, dailyRecords);
            });

            // กลับลำดับการแสดงผลให้แสดงรายการใหม่ก่อน
            filteredRecords.reverse();

            // แสดงผลในตาราง
            filteredRecords.forEach(record => {
                const date = new Date(record.timestamp);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="วันที่">${date.toLocaleDateString('th-TH')}</td>
                    <td data-label="เวลา">${date.toLocaleTimeString('th-TH')}</td>
                    <td data-label="รหัสพนักงาน">${record.employeeId}</td>
                    <td data-label="ชื่อพนักงาน">${record.name}</td>
                    <td data-label="ตำแหน่ง">${record.position}</td>
                    <td data-label="">${record.type}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            throw new Error(result.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
        }
    } catch (error) {
        console.error('Error loading time records:', error);
        const tbody = document.querySelector('#timeRecordsTable tbody');
        tbody.innerHTML = `<tr><td colspan="6" class="text-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message}</td></tr>`;
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

// ฟังก์ชันส่งออกข้อมูลเป็น CSV
function exportToCSV() {
    const table = document.getElementById('timeRecordsTable');
    const rows = Array.from(table.querySelectorAll('tr'));
    
    if (rows.length <= 1) {
        alert('ไม่มีข้อมูลที่จะส่งออก');
        return;
    }

    const csvContent = rows.map(row => {
        return Array.from(row.cells)
            .map(cell => cell.textContent)
            .join(',');
    }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'time_records.csv';
    link.click();
}

// ฟังก์ชันล้างข้อมูล
async function clearDashboard() {
    try {
        // สร้าง Promise สำหรับ JSONP
        await new Promise((resolve, reject) => {
            try {
                // สร้าง callback function name แบบ unique
                const callbackName = 'jsonpCallback_' + Date.now();
                
                // สร้าง script element
                const script = document.createElement('script');
                script.src = `${SCRIPT_URL}?action=clearTimeRecords&callback=${callbackName}`;
                
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
                reject(error);
            }
        });

        alert('ล้างข้อมูลเรียบร้อยแล้ว');
        loadTimeRecords(); // โหลดข้อมูลใหม่หลังจากล้างข้อมูล
    } catch (error) {
        console.error('Error clearing dashboard:', error);
        alert('เกิดข้อผิดพลาดในการล้างข้อมูล: ' + error.message);
    }
}

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

// เพิ่ม Event Listeners
document.addEventListener('DOMContentLoaded', () => {
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

    // Initialize submenu toggle
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

    // โหลดข้อมูลเมื่อเปิดหน้า
    loadTimeRecords();

    // Event listeners สำหรับ filters
    document.getElementById('dateFilter').addEventListener('change', loadTimeRecords);
    document.getElementById('employeeFilter').addEventListener('change', loadTimeRecords);

    // Event listener สำหรับปุ่มล้างข้อมูล
    const clearBtn = document.getElementById('clearDashboardBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('คุณแน่ใจหรือไม่ที่จะล้างข้อมูลทั้งหมด?')) {
                clearDashboard();
            }
        });
    }
}); 