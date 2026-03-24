let authClient = null;

// Ждем загрузки DOM и Supabase
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем Supabase каждые 100 мс
    const checkSupabase = setInterval(function() {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            clearInterval(checkSupabase);
            authClient = window.supabase.createClient(
                'https://wydmaatvxutxgvxjknhm.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZG1hYXR2eHV0eGd2eGprbmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTU1MjAsImV4cCI6MjA4OTY3MTUyMH0.ZhybOVp98GTHDZxjDXJF4IruDoip0Npf8AKcsimNeC4'
            );
            console.log('✅ Supabase готов');
            initAuth();
        }
    }, 100);
    
    // Таймаут через 5 секунд
    setTimeout(function() {
        if (!authClient) {
            console.error('❌ Supabase не загрузился');
        }
    }, 5000);
});

async function initAuth() {
    // РЕГИСТРАЦИЯ
    var regForm = document.getElementById('registerForm');
    if (regForm) {
        regForm.onsubmit = async function(e) {
            e.preventDefault();
            var name = document.getElementById('fullName').value;
            var email = document.getElementById('email').value;
            var pass = document.getElementById('password').value;
            var confirm = document.getElementById('confirmPassword').value;
            
            if (pass !== confirm) {
                alert('Пароли не совпадают');
                return;
            }
            
            try {
                var { data, error } = await authClient.auth.signUp({
                    email: email,
                    password: pass,
                    options: { data: { full_name: name } }
                });
                
                if (error) throw error;
                
                await authClient.from('users').insert({
                    id: data.user.id,
                    email: email,
                    full_name: name,
                    bio: '',
                    city: '',
                    avatar: '',
                    posts_count: 0
                });
                
                alert('Регистрация успешна!');
                window.location.href = 'login.html';
            } catch (err) {
                alert('Ошибка: ' + err.message);
            }
        };
    }
    
    // ВХОД
    var logForm = document.getElementById('loginForm');
    if (logForm) {
        logForm.onsubmit = async function(e) {
            e.preventDefault();
            var email = document.getElementById('email').value;
            var pass = document.getElementById('password').value;
            
            try {
                var { data, error } = await authClient.auth.signInWithPassword({
                    email: email,
                    password: pass
                });
                
                if (error) throw error;
                
                var { data: userData } = await authClient
                    .from('users')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();
                
                localStorage.setItem('currentUser', JSON.stringify({
                    id: data.user.id,
                    email: data.user.email,
                    full_name: userData.full_name,
                    bio: userData.bio || '',
                    city: userData.city || '',
                    avatar: userData.avatar || '',
                    posts_count: userData.posts_count || 0
                }));
                
                window.location.href = 'index.html';
            } catch (err) {
                alert('Неверный email или пароль');
            }
        };
    }
    
    // ПРОВЕРКА АВТОРИЗАЦИИ
    var publicPages = ['login.html', 'register.html'];
    var currentPage = window.location.pathname.split('/').pop();
    if (!publicPages.includes(currentPage) && !localStorage.getItem('currentUser')) {
        window.location.href = 'login.html';
    }
    
    // ВЫХОД
    var logout = document.getElementById('logoutBtn');
    if (logout) {
        logout.onclick = async function() {
            await authClient.auth.signOut();
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        };
    }
}