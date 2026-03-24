var dbClient = window.supabase.createClient(
    'https://wydmaatvxutxgvxjknhm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZG1hYXR2eHV0eGd2eGprbmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTU1MjAsImV4cCI6MjA4OTY3MTUyMH0.ZhybOVp98GTHDZxjDXJF4IruDoip0Npf8AKcsimNeC4'
);

// Генератор случайного цвета для аватарок
function getRandomColor() {
    const colors = ['#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#8b5cf6', '#ec489a'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function getUser() {
    var u = localStorage.getItem('currentUser');
    return u ? JSON.parse(u) : null;
}

var currentChatUser = null;
var currentChatName = '';

document.addEventListener('DOMContentLoaded', function() {
    var user = getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    loadChats();
    
    var sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.onclick = sendMessage;
    }
    
    var messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.onkeypress = function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        };
    }
});

async function loadChats() {
    var user = getUser();
    if (!user) return;
    
    var { data: users, error } = await dbClient
        .from('users')
        .select('id, full_name, avatar')
        .neq('id', user.id);
    
    var chatsList = document.getElementById('chatsList');
    
    if (error || !users || users.length === 0) {
        chatsList.innerHTML = '<div class="empty-state">😔 Нет других пользователей</div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < users.length; i++) {
        var u = users[i];
        
        var avatarHtml = u.avatar 
            ? '<img src="' + u.avatar + '" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">'
            : '<div style="width: 48px; height: 48px; background: #1e40af; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">' + (u.full_name ? u.full_name.charAt(0).toUpperCase() : '?') + '</div>';
        
        var { data: lastMsg } = await dbClient
            .from('messages')
            .select('text, created_at')
            .or(`and(from_user.eq.${user.id},to_user.eq.${u.id}),and(from_user.eq.${u.id},to_user.eq.${user.id})`)
            .order('created_at', { ascending: false })
            .limit(1);
        
        var preview = '';
        var time = '';
        if (lastMsg && lastMsg[0]) {
            preview = lastMsg[0].text.length > 30 ? lastMsg[0].text.substring(0, 30) + '...' : lastMsg[0].text;
            time = formatChatTime(lastMsg[0].created_at);
        }
        
        html += `
    <div class="chat-item" data-user-id="${u.id}" onclick="openChat('${u.id}', '${u.full_name}')">
        <div class="chat-avatar" style="background: ${getRandomColor()}">
            ${u.avatar ? '<img src="' + u.avatar + '" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">' : (u.full_name ? u.full_name.charAt(0).toUpperCase() : '?')}
        </div>
        <div class="chat-info">
            <div class="chat-name">${escapeHtml(u.full_name)}</div>
            <div class="chat-preview">${preview || 'Нет сообщений'}</div>
        </div>
        ${time ? '<div class="chat-time">' + time + '</div>' : ''}
    </div>
`;
    }
    chatsList.innerHTML = html;
}

// Функция открытия чата
window.openChat = async function(userId, userName) {
    currentChatUser = userId;
    currentChatName = userName;
    
    var { data: userData } = await dbClient
        .from('users')
        .select('avatar')
        .eq('id', userId)
        .single();
    
    var avatarHtml = userData?.avatar 
        ? '<img src="' + userData.avatar + '" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">'
        : '<div style="width: 36px; height: 36px; background: #1e40af; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">' + (userName ? userName.charAt(0).toUpperCase() : '?') + '</div>';
    
    document.getElementById('chatHeader').innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            ${avatarHtml}
            <h3 style="margin: 0;">${escapeHtml(userName)}</h3>
        </div>
    `;
    document.getElementById('messageInputArea').style.display = 'block';
    
    await loadMessages(userId);
    
    // Подсвечиваем активный чат
    document.querySelectorAll('.chat-item').forEach(function(item) {
        item.classList.remove('active');
        if (item.dataset.userId === userId) {
            item.classList.add('active');
        }
    });
};

async function loadMessages(withUserId) {
    var user = getUser();
    if (!user) return;
    
    var { data, error } = await dbClient
        .from('messages')
        .select('*')
        .or(`and(from_user.eq.${user.id},to_user.eq.${withUserId}),and(from_user.eq.${withUserId},to_user.eq.${user.id})`)
        .order('created_at', { ascending: true });
    
    var messagesList = document.getElementById('messagesList');
    if (!messagesList) return;
    
    if (error || !data || data.length === 0) {
        messagesList.innerHTML = '<div class="empty-state">💬 Нет сообщений. Напишите первым!</div>';
        return;
    }
    
    var userIds = [user.id, withUserId];
    var { data: users } = await dbClient.from('users').select('id, avatar').in('id', userIds);
    var avatars = {};
    if (users) {
        for (var i = 0; i < users.length; i++) {
            avatars[users[i].id] = users[i].avatar;
        }
    }
    
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var msg = data[i];
        var isSent = msg.from_user === user.id;
        var avatar = isSent ? avatars[user.id] : avatars[withUserId];
        
        var avatarHtml = avatar 
            ? '<img src="' + avatar + '" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">'
            : '<div style="width: 32px; height: 32px; background: #1e40af; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">' + (isSent ? (user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U') : (currentChatName ? currentChatName.charAt(0).toUpperCase() : '?')) + '</div>';
        
        html += `
            <div style="display: flex; justify-content: ${isSent ? 'flex-end' : 'flex-start'}; margin-bottom: 15px;">
                ${!isSent ? '<div style="margin-right: 8px;">' + avatarHtml + '</div>' : ''}
                <div style="max-width: 70%;">
                    <div style="padding: 10px 15px; border-radius: 18px; background: ${isSent ? '#1e40af' : '#f1f5f9'}; color: ${isSent ? 'white' : '#1e293b'}; word-wrap: break-word;">
                        ${escapeHtml(msg.text)}
                        <div style="font-size: 10px; margin-top: 4px; opacity: 0.7;">${formatTime(msg.created_at)}</div>
                    </div>
                </div>
                ${isSent ? '<div style="margin-left: 8px;">' + avatarHtml + '</div>' : ''}
            </div>
        `;
    }
    messagesList.innerHTML = html;
    messagesList.scrollTop = messagesList.scrollHeight;
}

async function sendMessage() {
    var user = getUser();
    if (!user || !currentChatUser) {
        alert('Выберите чат');
        return;
    }
    
    var input = document.getElementById('messageInput');
    var text = input.value.trim();
    if (!text) return;
    
    var { error } = await dbClient
        .from('messages')
        .insert({
            from_user: user.id,
            to_user: currentChatUser,
            text: text
        });
    
    if (error) {
        alert('Ошибка отправки');
        return;
    }
    
    // Добавляем уведомление получателю
    var { data: receiverData } = await dbClient
        .from('users')
        .select('notifications')
        .eq('id', currentChatUser)
        .single();
    
    var notifications = receiverData?.notifications || [];
    
    notifications.unshift({
        id: Date.now(),
        type: 'message',
        from: user.id,
        from_name: user.full_name,
        text: text.length > 40 ? text.substring(0, 40) + '...' : text,
        timestamp: new Date().toISOString(),
        read: false
    });
    
    if (notifications.length > 50) notifications.pop();
    
    await dbClient
        .from('users')
        .update({ notifications: notifications })
        .eq('id', currentChatUser);
    
    input.value = '';
    await loadMessages(currentChatUser);
    await loadChats();
}

function formatChatTime(timestamp) {
    var date = new Date(timestamp);
    var now = new Date();
    var diff = now - date;
    
    if (diff < 60000) return 'только что';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'м';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'ч';
    return date.toLocaleDateString();
}

function formatTime(timestamp) {
    var date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}