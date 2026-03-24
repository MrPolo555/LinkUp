// notifications.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
var notifClient = window.supabase.createClient(
    'https://wydmaatvxutxgvxjknhm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZG1hYXR2eHV0eGd2eGprbmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTU1MjAsImV4cCI6MjA4OTY3MTUyMH0.ZhybOVp98GTHDZxjDXJF4IruDoip0Npf8AKcsimNeC4'
);

function getNotifUser() {
    var u = localStorage.getItem('currentUser');
    return u ? JSON.parse(u) : null;
}

async function updateNotificationsUI() {
    var user = getNotifUser();
    if (!user) return;
    
    var { data: userData, error } = await notifClient
        .from('users')
        .select('notifications')
        .eq('id', user.id)
        .single();
    
    if (error || !userData) return;
    
    var notifications = userData.notifications || [];
    var unreadCount = notifications.filter(function(n) { return !n.read; }).length;
    
    var countElement = document.getElementById('notificationsCount');
    if (countElement) {
        countElement.textContent = unreadCount;
        countElement.style.display = unreadCount > 0 ? 'block' : 'none';
    }
    
    var listElement = document.getElementById('notificationsList');
    if (listElement) {
        if (notifications.length === 0) {
            listElement.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b;">Нет уведомлений</div>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < notifications.length; i++) {
            var n = notifications[i];
            var icon = '';
            var text = '';
            var time = formatNotifTime(n.timestamp);
            
            if (n.type === 'like') {
                icon = '❤️';
                text = n.from_name + ' поставил(а) лайк вашему посту';
            } else if (n.type === 'comment') {
                icon = '💬';
                text = n.from_name + ' прокомментировал(а): "' + n.text + '"';
            } else if (n.type === 'friend_request') {
                icon = '👥';
                text = n.from_name + ' отправил(а) запрос в друзья';
            } else if (n.type === 'message') {
                icon = '💬';
                text = n.from_name + ': ' + n.text;
            } else {
                icon = '📢';
                text = n.text || 'Новое уведомление';
            }
            
            html += `
                <div class="notification-item ${!n.read ? 'unread' : ''}" data-id="${n.id}" style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; cursor: pointer; transition: background 0.2s; ${!n.read ? 'background: #eef2ff;' : ''}">
                    <div style="display: flex; gap: 12px;">
                        <div style="font-size: 18px;">${icon}</div>
                        <div style="flex: 1;">
                            <div style="font-size: 13px; color: #1e293b;">${escapeNotifHtml(text)}</div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">${time}</div>
                        </div>
                    </div>
                </div>
            `;
        }
        listElement.innerHTML = html;
        
        listElement.querySelectorAll('.notification-item').forEach(function(item) {
            item.onclick = function() {
                var id = parseInt(this.dataset.id);
                markNotificationRead(id);
            };
        });
    }
}

async function markNotificationRead(notificationId) {
    var user = getNotifUser();
    if (!user) return;
    
    var { data: userData } = await notifClient
        .from('users')
        .select('notifications')
        .eq('id', user.id)
        .single();
    
    if (!userData) return;
    
    var notifications = userData.notifications || [];
    var updated = notifications.map(function(n) {
        if (n.id === notificationId) n.read = true;
        return n;
    });
    
    await notifClient
        .from('users')
        .update({ notifications: updated })
        .eq('id', user.id);
    
    updateNotificationsUI();
}

function formatNotifTime(timestamp) {
    var date = new Date(timestamp);
    var now = new Date();
    var diff = now - date;
    
    if (diff < 60000) return 'только что';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' мин назад';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' ч назад';
    return date.toLocaleDateString();
}

function escapeNotifHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Обновляем уведомления каждые 5 секунд
setInterval(updateNotificationsUI, 5000);

// Обновляем при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    updateNotificationsUI();
});

// ========== ФУНКЦИЯ ДЛЯ ЗАЯВОК (исправлена) ==========
async function updateRequestsCount() {
    var user = getNotifUser();
    if (!user) return;
    
    // Правильный запрос к friend_requests таблице
    var { data: requests, error } = await notifClient
        .from('friend_requests')
        .select('*')
        .eq('to_user', user.id)
        .eq('status', 'pending');
    
    var requestsCount = requests?.length || 0;
    
    var requestsLink = document.querySelector('a[href="requests.html"]');
    if (requestsLink) {
        if (requestsCount > 0) {
            var existingBadge = requestsLink.querySelector('.requests-badge');
            if (existingBadge) existingBadge.remove();
            var badge = document.createElement('span');
            badge.className = 'requests-badge';
            badge.textContent = requestsCount;
            badge.style.cssText = 'background: #ef4444; color: white; font-size: 10px; border-radius: 10px; padding: 2px 6px; margin-left: 5px;';
            requestsLink.appendChild(badge);
        } else {
            var badge = requestsLink.querySelector('.requests-badge');
            if (badge) badge.remove();
        }
    }
}

// Вызываем обновление вместе с уведомлениями
setInterval(function() {
    updateNotificationsUI();
    updateRequestsCount();
}, 5000);

// При загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    updateNotificationsUI();
    updateRequestsCount();
});