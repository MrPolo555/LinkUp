// notifications.js
var notifClient = window.supabase.createClient(
    'https://wydmaatvxutxgvxjknhm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZG1hYXR2eHV0eGd2eGprbmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTU1MjAsImV4cCI6MjA4OTY3MTUyMH0.ZhybOVp98GTHDZxjDXJF4IruDoip0Npf8AKcsimNeC4'
);

function getUser() {
    var u = localStorage.getItem('currentUser');
    return u ? JSON.parse(u) : null;
}

async function updateBadges() {
    var user = getUser();
    if (!user) return;
    
    // Считаем непрочитанные сообщения
    var { data: messages, error: msgError } = await notifClient
        .from('messages')
        .select('id')
        .eq('to_user', user.id)
        .eq('read', false);
    
    var unreadMessages = messages?.length || 0;
    
    // Считаем непрочитанные заявки
    var { data: requests, error: reqError } = await notifClient
        .from('friend_requests')
        .select('id')
        .eq('to_user', user.id)
        .eq('status', 'pending');
    
    var unreadRequests = requests?.length || 0;
    
    // Обновляем бейджики
    var messagesBadge = document.getElementById('messagesBadge');
    var requestsBadge = document.getElementById('requestsBadge');
    
    if (messagesBadge) {
        if (unreadMessages > 0) {
            messagesBadge.textContent = unreadMessages > 9 ? '9+' : unreadMessages;
            messagesBadge.style.display = 'inline-block';
        } else {
            messagesBadge.style.display = 'none';
        }
    }
    
    if (requestsBadge) {
        if (unreadRequests > 0) {
            requestsBadge.textContent = unreadRequests > 9 ? '9+' : unreadRequests;
            requestsBadge.style.display = 'inline-block';
        } else {
            requestsBadge.style.display = 'none';
        }
    }
}

// Обновляем каждые 10 секунд
setInterval(updateBadges, 10000);

// При загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    updateBadges();
});