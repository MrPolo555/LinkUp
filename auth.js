// Обработка регистрации
if (document.getElementById('registerForm')) {
    const registerForm = document.getElementById('registerForm');
    
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Валидация
        if (!fullName || !email || !password) {
            showAuthError('Пожалуйста, заполните все поля');
            return;
        }
        
        if (password !== confirmPassword) {
            showAuthError('Пароли не совпадают');
            return;
        }
        
        if (password.length < 6) {
            showAuthError('Пароль должен содержать минимум 6 символов');
            return;
        }
        
        if (!email.includes('@') || !email.includes('.')) {
            showAuthError('Введите корректный email адрес');
            return;
        }
        
        // Получаем существующих пользователей
        let users = localStorage.getItem('users');
        users = users ? JSON.parse(users) : {};
        
        // Проверяем, не занят ли email
        if (users[email]) {
            showAuthError('Пользователь с таким email уже существует');
            return;
        }
        
        // Создаем нового пользователя
        users[email] = {
            fullName: fullName,
            email: email,
            password: password,
            bio: '',
            city: '',
            avatar: null,
            friends: [],
            friendRequests: [],
            notifications: [],
            postsCount: 0,
            createdAt: new Date().toISOString()
        };
        
        localStorage.setItem('users', JSON.stringify(users));
        
        // Показываем успех и перенаправляем на вход
        showAuthSuccess('Регистрация успешна! Перенаправляем на вход...');
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    });
}

// Обработка входа
if (document.getElementById('loginForm')) {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            showAuthError('Пожалуйста, заполните все поля');
            return;
        }
        
        // Получаем пользователей
        let users = localStorage.getItem('users');
        users = users ? JSON.parse(users) : {};
        
        const user = users[email];
        
        if (!user || user.password !== password) {
            showAuthError('Неверный email или пароль');
            return;
        }
        
        // Сохраняем текущего пользователя
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Перенаправляем на профиль
        window.location.href = 'index.html';
    });
}

// Вспомогательные функции для auth страниц
function showAuthError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        if (successDiv) successDiv.style.display = 'none';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

function showAuthSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    const errorDiv = document.getElementById('errorMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        if (errorDiv) errorDiv.style.display = 'none';
    }
}

// Проверка авторизации для всех страниц
function checkAuth() {
    const currentUser = localStorage.getItem('currentUser');
    const publicPages = ['login.html', 'register.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (!currentUser && !publicPages.includes(currentPage)) {
        window.location.href = 'login.html';
    }
}

// Вызываем проверку при загрузке
checkAuth();