// Пароль для админки
const ADMIN_PASSWORD = "tenex_admin_secret";
const API_URL = '/api';

// Элементы DOM для авторизации
const passwordOverlay = document.getElementById('passwordOverlay');
const adminContent = document.getElementById('adminContent');
const adminPassword = document.getElementById('adminPassword');
const loginBtn = document.getElementById('loginBtn');
const passwordError = document.getElementById('passwordError');

// Проверка пароля
loginBtn.addEventListener('click', () => {
    if (adminPassword.value === ADMIN_PASSWORD) {
        passwordOverlay.style.display = 'none';
        adminContent.style.display = 'block';
        initAdminPanel();
    } else {
        passwordError.style.display = 'block';
        adminPassword.value = '';
    }
});

adminPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loginBtn.click();
    }
});

// Цвета
const colorOptions = [
    { name: "Красный", value: 0xe74c3c },
    { name: "Синий", value: 0x3498db },
    { name: "Желтый", value: 0xf1c40f },
    { name: "Зеленый", value: 0x2ecc71 },
    { name: "Фиолетовый", value: 0x9b59b6 },
    { name: "Оранжевый", value: 0xe67e22 },
    { name: "Бирюзовый", value: 0x1abc9c },
    { name: "Розовый", value: 0xe84393 }
];

let selectedColor = colorOptions[0].value;

// Данные
let children = [];

// Элементы DOM
const totalChildren = document.getElementById('totalChildren');
const availableChildren = document.getElementById('availableChildren');
const bookedChildren = document.getElementById('bookedChildren');
const childList = document.getElementById('childList');
const santasList = document.getElementById('santasList');
const adminName = document.getElementById('adminName');
const adminAge = document.getElementById('adminAge');
const adminGift = document.getElementById('adminGift');
const adminGiftLink = document.getElementById('adminGiftLink');
const colorPicker = document.getElementById('colorPicker');
const addChildBtn = document.getElementById('addChild');
const exportBtn = document.getElementById('exportBtn');
const clearDataBtn = document.getElementById('clearData');

const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// --- API ---

async function fetchChildren() {
    try {
        const response = await fetch(`${API_URL}/children`);
        if (!response.ok) throw new Error('Network response was not ok');
        children = await response.json();
        return children;
    } catch (error) {
        console.error('Ошибка загрузки детей:', error);
        return [];
    }
}

async function addChild(childData) {
    try {
        const response = await fetch(`${API_URL}/children`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(childData)
        });
        return await response.json();
    } catch (error) {
        console.error('Ошибка добавления:', error);
        throw error;
    }
}

async function deleteChildAPI(id) {
    try {
        await fetch(`${API_URL}/children/${id}`, { method: 'DELETE' });
    } catch (error) {
        console.error('Ошибка удаления:', error);
        throw error;
    }
}

// Update child via API (partial update)
async function updateChildAPI(id, updateData) {
    try {
        const response = await fetch(`${API_URL}/children/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Ошибка обновления:', error);
        throw error;
    }
}

function isValidURL(str) {
    try {
        const u = new URL(str);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

// --- Инициализация ---

async function initAdminPanel() {

    initColorPicker();
    await fetchChildren();
    updateStats();
    updateChildrenList();
    updateSantasList();
}

function initColorPicker() {
    colorPicker.innerHTML = '';
    colorOptions.forEach((color, index) => {
        const colorOption = document.createElement('div');
        colorOption.className = 'color-option';
        // Стили задаем здесь или в CSS
        colorOption.style.backgroundColor = `#${color.value.toString(16).padStart(6, '0')}`;
        colorOption.style.width = '30px';
        colorOption.style.height = '30px';
        colorOption.style.borderRadius = '50%';
        colorOption.style.cursor = 'pointer';
        colorOption.style.display = 'inline-block';
        colorOption.style.marginRight = '10px';
        colorOption.style.border = index === 0 ? '3px solid #333' : '3px solid transparent';
        
        colorOption.addEventListener('click', function() {
            Array.from(colorPicker.children).forEach(opt => opt.style.border = '3px solid transparent');
            this.style.border = '3px solid #333';
            selectedColor = color.value;
        });
        
        colorPicker.appendChild(colorOption);
    });
}

function updateStats() {
    const total = children.length;
    // На сервере поле называется 'reserved'
    const booked = children.filter(child => child.reserved).length;
    const available = total - booked;

    totalChildren.textContent = total;
    bookedChildren.textContent = booked;
    availableChildren.textContent = available;
}

function updateChildrenList() {
    if (children.length === 0) {
        childList.innerHTML = '<p style="text-align:center; color: #777;">Нет добавленных детей</p>';
        return;
    }

    let html = '';
    // Сортируем: сначала свободные, потом занятые
    const sortedChildren = [...children].sort((a, b) => (a.reserved === b.reserved) ? 0 : a.reserved ? 1 : -1);

    sortedChildren.forEach(child => {
        const isBooked = !!child.reserved; // Приводим к boolean
        const colorHex = child.color ? `#${child.color.toString(16).padStart(6, '0')}` : '#cccccc';
        
        html += `
            <div class="child-item ${isBooked ? 'booked' : ''}">
                <div class="child-header">
                    <div class="child-info">
                        <h4 style="margin: 0 0 5px 0;">
                            <span style="display: inline-block; width: 15px; height: 15px; border-radius: 50%; background-color: ${colorHex}; margin-right: 8px;"></span>
                            ${child.child} (${child.age} лет)
                        </h4>
                        <p style="margin: 5px 0;"><strong>Подарок:</strong> ${child.gift}</p>
                        ${child.giftLink ? `<p style="margin: 5px 0;"><strong>Ссылка:</strong> <a href="${child.giftLink}" target="_blank">Открыть</a></p>` : ''}
                    </div>
                    <div class="status ${isBooked ? 'booked' : 'available'}">
                        ${isBooked ? 'Забронирован' : 'Свободен'}
                    </div>
                </div>

                ${isBooked && child.reserver ? `
                    <div class="santas-list">
                        <h5 style="margin: 5px 0;">Санта:</h5>
                        <div class="santa-item">
                            <!-- ВАЖНО: Используем child.reserver.name, так как сервер хранит полное имя -->
                            <p style="margin: 2px 0;"><strong>Имя:</strong> ${child.reserver.name}</p>
                            <p style="margin: 2px 0;"><strong>Тел:</strong> ${child.reserver.phone}</p>
                            <p style="margin: 2px 0;"><strong>Email:</strong> ${child.reserver.email}</p>
                        </div>
                    </div>
                ` : ''}

                <div class="actions" style="margin-top: 10px; text-align: right;">
                    <button class="btn btn-danger" onclick="deleteChild(${child.id})" style="padding: 5px 10px; font-size: 0.9em;">Удалить</button>
                </div>
            </div>
        `;
    });
    childList.innerHTML = html;
}

function updateSantasList() {
    const bookedChildren = children.filter(c => c.reserved && c.reserver);
    
    if (bookedChildren.length === 0) {
        santasList.innerHTML = '<p>Пока нет зарегистрированных Сант</p>';
        return;
    }
    
    let html = '';
    bookedChildren.forEach(child => {
        html += `
            <div class="child-item">
                <div class="child-header">
                    <div class="child-info">
                        <h4>${child.reserver.name}</h4>
                        <div class="santa-info">
                            <p><strong>Телефон:</strong> ${child.reserver.phone}</p>
                            <p><strong>Почта:</strong> ${child.reserver.email}</p>
                        </div>
                    </div>
                </div>
                <div style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 5px;">
                    <small>Для ребенка: <strong>${child.child}</strong> (${child.gift})</small>
                </div>
            </div>
        `;
    });
    
    santasList.innerHTML = html;
}

// Добавление
addChildBtn.addEventListener('click', async () => {
    const name = adminName.value.trim();
    const age = parseInt(adminAge.value);
    const gift = adminGift.value.trim();
    const giftLink = adminGiftLink.value.trim();
    
    if (name && age && gift) {
        // Формируем объект так, как ждет сервер (без лишних полей)
        const newChild = {
            child: name,      // Сервер использует поле 'child' для имени
            age: age,
            gift: gift,
            giftLink: giftLink,
            color: selectedColor,
            reserved: false   // Важно: начальный статус
        };
        
        try {
            await addChild(newChild);
            await fetchChildren();
            
            // Очистка формы
            adminName.value = '';
            adminAge.value = '';
            adminGift.value = '';
            adminGiftLink.value = '';
            
            updateStats();
            updateChildrenList();
            updateSantasList();
            
            alert('Ребенок успешно добавлен!');
        } catch (error) {
            alert('Ошибка при добавлении ребенка');
        }
    } else {
        alert('Заполните все обязательные поля!');
    }
});

// Глобальная функция для удаления (чтобы работала из onclick в HTML)
window.deleteChild = async function(id) {
    if (confirm('Удалить этого ребенка?')) {
        try {
            await deleteChildAPI(id);
            await fetchChildren();
            updateStats();
            updateChildrenList();
            updateSantasList();
        } catch (error) {
            alert('Ошибка при удалении ребенка');
        }
    }
};

// Экспорт
exportBtn.addEventListener('click', () => {
    const csv = convertToCSV(children);
    downloadCSV(csv, 'santa_data.csv');
});

function convertToCSV(data) {
    const headers = ['ID', 'Имя ребенка', 'Возраст', 'Подарок', 'Ссылка', 'Статус', 'Санта Имя', 'Санта Телефон', 'Санта Email'];
    const rows = [];
    
    data.forEach(child => {
        const isBooked = !!child.reserved;
        const santaName = (isBooked && child.reserver) ? child.reserver.name : '';
        const santaPhone = (isBooked && child.reserver) ? child.reserver.phone : '';
        const santaEmail = (isBooked && child.reserver) ? child.reserver.email : '';
        
        rows.push([
            child.id,
            child.child, // поле 'child'
            child.age,
            child.gift,
            child.giftLink || '',
            isBooked ? 'Забронирован' : 'Свободен',
            santaName,
            santaPhone,
            santaEmail
        ]);
    });
    
    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
}

function downloadCSV(csv, filename) {
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Очистка
clearDataBtn.addEventListener('click', async () => {
    if (confirm('ВНИМАНИЕ! Это удалит ВСЕ данные. Продолжить?')) {
        try {
            // Удаляем по одному, так как API массового удаления нет в server.js
            for (const child of children) {
                await deleteChildAPI(child.id);
            }
            await fetchChildren();
            updateStats();
            updateChildrenList();
            updateSantasList();
            alert('Все данные успешно удалены');
        } catch (error) {
            alert('Ошибка при очистке данных');
        }
    }
});

// Табы
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');
        
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tabId + 'Tab').classList.add('active');
    });
});


