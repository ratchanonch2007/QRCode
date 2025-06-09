const sheetsAPI = new GoogleSheetsAPI();
let employees = [];

// Generate QR Code
function generateQRCode(data) {
    const qrDiv = document.getElementById('qrcode');
    qrDiv.innerHTML = ''; // Clear previous QR code

    try {
        console.log('Generating QR code with data:', data); // Debug log
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
async function deleteEmployee(employeeId) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบพนักงานคนนี้?')) {
        try {
            // Show loading indicator
            const loadingIndicator = document.querySelector('.loading-indicator');
            loadingIndicator.style.display = 'block';

            // สร้าง Promise สำหรับ JSONP
            const result = await new Promise((resolve, reject) => {
                try {
                    // สร้าง callback function name แบบ unique
                    const callbackName = 'jsonpCallback_' + Date.now();
                    
                    // สร้าง script element
                    const script = document.createElement('script');
                    script.src = `${SCRIPT_URL}?action=deleteEmployee&data=${JSON.stringify({employeeId: employeeId})}&callback=${callbackName}`;
                    
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
            
            if (result.status === 'error') {
                throw new Error(result.message);
            }
            
            // Reload employees list using JSONP
            employees = await new Promise((resolve, reject) => {
                const callbackName = 'jsonpCallback_' + Date.now();
                const script = document.createElement('script');
                script.src = `${SCRIPT_URL}?action=getEmployees&callback=${callbackName}`;
                
                window[callbackName] = function(response) {
                    document.body.removeChild(script);
                    delete window[callbackName];
                    if (response.status === 'error') {
                        reject(new Error(response.message));
                    } else {
                        resolve(response.data);
                    }
                };
                
                document.body.appendChild(script);
            });
            
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
        } catch (error) {
            console.error('Error deleting employee:', error);
            alert(error.message || 'เกิดข้อผิดพลาดในการลบข้อมูล กรุณาลองใหม่อีกครั้ง');
        } finally {
            // Hide loading indicator
            const loadingIndicator = document.querySelector('.loading-indicator');
            loadingIndicator.style.display = 'none';
        }
    }
}

// Update employee table
function updateEmployeeTable() {
    const tbody = document.querySelector('#employeeTable tbody');
    tbody.innerHTML = '';

    if (!employees || employees.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="4" class="text-center">ไม่มีข้อมูลพนักงาน</td>';
        tbody.appendChild(tr);
        return;
    }

    employees.forEach(employee => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="รหัสพนักงาน">${employee.id}</td>
            <td data-label="ชื่อ-นามสกุล">${employee.name}</td>
            <td data-label="ตำแหน่ง">${employee.position}</td>
            <td data-label="">
                <button onclick="showQRCode('${employee.id}', '${employee.name}', '${employee.position}')" class="action-button">
                    <i class="fas fa-qrcode"></i>
                    QR CODE
                </button>
                <button onclick="deleteEmployee('${employee.id}')" class="action-button delete-button">
                    <i class="fas fa-trash"></i>
                    ลบพนักงาน
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Show QR Code for specific employee
function showQRCode(id, name, position) {
    try {
        // สร้างข้อมูลสำหรับ QR Code
        const qrData = {
            employeeId: id,
            name: name,
            position: position,
            type: 'check'
        };
        console.log('QR Data:', qrData); // Debug log
        generateQRCode(JSON.stringify(qrData));
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

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
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

    // Show loading indicator
    const loadingIndicator = document.querySelector('.loading-indicator');
    loadingIndicator.style.display = 'block';

    try {
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

        // Load employees from API
        employees = await sheetsAPI.readEmployees();
        console.log('Loaded employees:', employees); // Debug log
        
        // Initialize employee table
        updateEmployeeTable();
    } catch (error) {
        console.error('Error initializing page:', error);
        alert(error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณารีเฟรชหน้าเว็บ');
    } finally {
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
    }
}); 