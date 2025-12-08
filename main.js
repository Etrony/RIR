// API URL
const API_URL = 'http://localhost:3000/api';

// Данные детей
let children = [];
let currentChildIndex = 0;
let currentReservedChildId = null;

// Элементы DOM
const christmasBall = document.getElementById('christmasBall');
const childName = document.getElementById('childName');
const childAge = document.getElementById('childAge');
const childGift = document.getElementById('childGift');
const giftLinkContainer = document.getElementById('giftLinkContainer');
const giftLink = document.getElementById('giftLink');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const counter = document.getElementById('counter');
const selectBtn = document.getElementById('selectBtn');
const formOverlay = document.getElementById('formOverlay');
const closeForm = document.getElementById('closeForm');
const santaForm = document.getElementById('santaForm');
const santaFields = document.getElementById('santaFields');
const selectedChildName = document.getElementById('selectedChildName');
const addSantaBtn = document.getElementById('addSanta');

// API функции
async function fetchChildren() {
    try {
        const response = await fetch(`${API_URL}/children`);
        children = await response.json();
        if (children.length > 0) {
            updateBallDisplay();
        }
        return children;
    } catch (error) {
        console.error('Ошибка загрузки детей:', error);
        alert('Ошибка загрузки данных. Убедитесь, что сервер запущен (npm start или node server.js).');
        return [];
    }
}

async function reserveChild(childId, reserverData) {
    try {
        const response = await fetch(`${API_URL}/reserve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                childId: childId,
                reserver: reserverData
            })
        });
        return await response.json();
    } catch (error) {
        console.error('Ошибка бронирования:', error);
        throw error;
    }
}

// Снег
function createSnow() {
    const snowContainer = document.getElementById('snow');
    for (let i = 0; i < 50; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.style.left = Math.random() * 100 + 'vw';
        snowflake.style.width = Math.random() * 5 + 3 + 'px';
        snowflake.style.height = snowflake.style.width;
        snowflake.style.animationDuration = Math.random() * 3 + 2 + 's';
        snowflake.style.animationDelay = Math.random() * 5 + 's';
        snowContainer.appendChild(snowflake);
    }
}

// Обновление отображения шара
function updateBallDisplay() {
    if (children.length === 0) {
        childName.textContent = 'Нет доступных детей';
        childAge.textContent = '';
        childGift.textContent = 'Пожалуйста, добавьте детей через админку';
        counter.textContent = '0/0';
        giftLinkContainer.style.display = 'none';
        selectBtn.disabled = true;
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    const child = children[currentChildIndex];
    childName.textContent = child.name || child.child;
    childAge.textContent = child.age;
    childGift.textContent = child.gift;
    counter.textContent = `${currentChildIndex + 1}/${children.length}`;

    // Обновляем ссылку на подарок
    if (child.giftLink && child.giftLink.trim() !== '') {
        giftLink.href = child.giftLink;
        giftLinkContainer.style.display = 'block';
    } else {
        giftLinkContainer.style.display = 'none';
    }

    christmasBall.classList.remove('booked', 'reserved');
    
    const isBooked = child.reserved || child.booked;
    
    if (isBooked) {
        christmasBall.classList.add('booked');
        selectBtn.disabled = true;
        selectBtn.textContent = "Забронировано";
    } else {
        selectBtn.disabled = false;
        selectBtn.textContent = "Выбрать";
    }

    prevBtn.disabled = currentChildIndex === 0;
    nextBtn.disabled = currentChildIndex === children.length - 1;
}

// Навигация
prevBtn.addEventListener('click', () => {
    if (currentChildIndex > 0) {
        currentChildIndex--;
        updateBallDisplay();
    }
});

nextBtn.addEventListener('click', () => {
    if (currentChildIndex < children.length - 1) {
        currentChildIndex++;
        updateBallDisplay();
    }
});

// Добавление полей для Санты
function addSantaField(index = 0) {
    const santaField = document.createElement('div');
    santaField.className = 'santa-field';
    santaField.innerHTML = `
        <h4>
            Санта ${index + 1}
            ${index > 0 ? '<button type="button" class="remove-santa">Удалить</button>' : ''}
        </h4>
        <div class="form-group">
            <label for="fio${index}">ФИО:</label>
            <input type="text" id="fio${index}" required>
        </div>
        <div class="form-group">
            <label for="phone${index}">Телефон:</label>
            <input type="tel" id="phone${index}" required>
        </div>
        <div class="form-group">
            <label for="email${index}">Почта:</label>
            <input type="email" id="email${index}" required>
        </div>
    `;
    
    santaFields.appendChild(santaField);
    
    // Обработчик удаления
    const removeBtn = santaField.querySelector('.remove-santa');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            santaField.remove();
            updateRemoveButtons();
        });
    }
}

// Обновление кнопок удаления
function updateRemoveButtons() {
    const fields = santaFields.querySelectorAll('.santa-field');
    fields.forEach((field, index) => {
        const header = field.querySelector('h4');
        if (index === 0) {
            header.innerHTML = 'Санта 1';
        } else {
            header.innerHTML = `Санта ${index + 1}<button type="button" class="remove-santa">Удалить</button>`;
            const removeBtn = header.querySelector('.remove-santa');
            removeBtn.addEventListener('click', () => {
                field.remove();
                updateRemoveButtons();
            });
        }
    });
}

// Добавление новой Санты
addSantaBtn.addEventListener('click', () => {
    const fieldCount = santaFields.querySelectorAll('.santa-field').length;
    addSantaField(fieldCount);
});

// Открытие формы
selectBtn.addEventListener('click', () => {
    const child = children[currentChildIndex];
    
    const isBooked = child.reserved || child.booked;
    
    if (!isBooked) {
        currentReservedChildId = child.id;
        
        // Настраиваем форму
        selectedChildName.textContent = child.name || child.child;
        santaFields.innerHTML = '';
        addSantaField();
        
        formOverlay.style.display = 'flex';
    }
});

// Закрытие формы
closeForm.addEventListener('click', () => {
    currentReservedChildId = null;
    formOverlay.style.display = 'none';
    fetchChildren(); // Обновляем данные
});

// Обработка формы
santaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const child = children.find(c => c.id === currentReservedChildId);
    if (!child) return;
    
    // Собираем данные первой Санты (основной бронирующий)
    const santaFieldsElements = santaFields.querySelectorAll('.santa-field');
    if (santaFieldsElements.length === 0) return;
    
    const firstField = santaFieldsElements[0];
    const firstName = firstField.querySelector('#fio0').value.split(' ')[0] || '';
    const lastName = firstField.querySelector('#fio0').value.split(' ').slice(1).join(' ') || '';
    const phone = firstField.querySelector('#phone0').value;
    const email = firstField.querySelector('#email0').value;
    
    if (firstName && phone && email) {
        try {
            // Бронируем ребенка
            await reserveChild(currentReservedChildId, {
                firstName: firstName,
                lastName: lastName,
                phone: phone,
                email: email
            });
            
            // Обновляем данные
            await fetchChildren();
            
            formOverlay.style.display = 'none';
            santaForm.reset();
            currentReservedChildId = null;
            
            alert(`Вы успешно забронировали подарок для ${child.name || child.child}!`);
        } catch (error) {
            alert('Ошибка при бронировании. Попробуйте еще раз.');
        }
    }
});

// Инициализация
document.addEventListener('DOMContentLoaded', async function() {
    createSnow();
    await fetchChildren();
    
    // Обновляем данные каждые 5 секунд
    setInterval(async () => {
        const currentId = children[currentChildIndex]?.id;
        await fetchChildren();
        
        // Пытаемся сохранить текущую позицию
        if (currentId) {
            const newIndex = children.findIndex(c => c.id === currentId);
            if (newIndex !== -1) {
                currentChildIndex = newIndex;
            } else if (currentChildIndex >= children.length) {
                currentChildIndex = Math.max(0, children.length - 1);
            }
        }
        
        updateBallDisplay();
    }, 5000);
});
