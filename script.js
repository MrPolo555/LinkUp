var dbClient = window.supabase.createClient(
    'https://wydmaatvxutxgvxjknhm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZG1hYXR2eHV0eGd2eGprbmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTU1MjAsImV4cCI6MjA4OTY3MTUyMH0.ZhybOVp98GTHDZxjDXJF4IruDoip0Npf8AKcsimNeC4'
);

function getUser() {
    var u = localStorage.getItem('currentUser');
    return u ? JSON.parse(u) : null;
}

document.addEventListener('DOMContentLoaded', function() {
    var user = getUser();
    if (!user) return;
    
    if (window.location.pathname.includes('index.html')) {
        loadFeed();
        var btn = document.getElementById('createPostBtn');
        if (btn) btn.onclick = createPost;
    } else if (window.location.pathname.includes('profile.html')) {
        var urlParams = new URLSearchParams(window.location.search);
        var profileUserId = urlParams.get('user');
        
        if (profileUserId) {
            loadOtherProfile(profileUserId);
        } else {
            loadProfile();
        }
        loadUserPosts();
    }
});

function renderPostCard(p, userInfo, user, userMap) {
    var userName = userInfo.full_name;
    var avatar = userInfo.avatar;
    var isOwn = p.user_id === user?.id;
    var isLiked = p.likes && p.likes.includes(user?.id);
    var likesCount = p.likes ? p.likes.length : 0;
    var comments = p.comments || [];
    var isEdited = p.edited || false;
    
    var avatarHtml = avatar 
        ? '<img src="' + avatar + '" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">'
        : '<div style="width: 40px; height: 40px; background: #1e40af; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">' + (userName ? userName.charAt(0).toUpperCase() : 'U') + '</div>';
    
    var menuHtml = '';
    if (isOwn) {
        menuHtml = `
            <div style="position: relative;">
                <button class="post-menu-btn" data-post-id="${p.id}" style="background: none; border: none; cursor: pointer; font-size: 18px; color: #64748b; padding: 4px 8px; border-radius: 8px;">⋮</button>
                <div class="post-menu-dropdown-${p.id}" style="display: none; position: absolute; right: 0; top: 30px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100; min-width: 130px; overflow: hidden;">
                    <button class="edit-post-btn" data-post-id="${p.id}" style="width: 100%; padding: 10px 12px; text-align: left; background: none; border: none; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid #e2e8f0;">✏️ Редактировать</button>
                    <button class="delete-post-btn" data-post-id="${p.id}" style="width: 100%; padding: 10px 12px; text-align: left; background: none; border: none; cursor: pointer; color: #ef4444; transition: background 0.2s;">🗑️ Удалить</button>
                </div>
            </div>
        `;
    }
    
    var editedHtml = isEdited ? '<span style="font-size: 10px; color: #94a3b8; margin-left: 5px;">(ред.)</span>' : '';
    
    var authorNameHtml = isOwn 
        ? 'Вы' 
        : '<a href="profile.html?user=' + p.user_id + '" style="color: #1e40af; text-decoration: none; cursor: pointer;">' + escapeHtml(userName) + '</a>';
    
    var imageHtml = '';
    if (p.image && p.image !== '') {
        imageHtml = '<img src="' + p.image + '" onclick="openImageViewer(\'' + p.image + '\')" style="max-width: 100%; max-height: 400px; border-radius: 12px; margin-top: 10px; cursor: pointer; object-fit: contain;">';
    }
    
    var commentsHtml = '';
    if (comments && comments.length > 0) {
        commentsHtml = '<div class="comments-list-' + p.id + '" style="margin-bottom: 10px;">' + renderComments(comments, userMap) + '</div>';
    } else {
        commentsHtml = '<div class="comments-list-' + p.id + '" style="margin-bottom: 10px;"><div style="color: #94a3b8; font-size: 13px; text-align: center;">Нет комментариев</div></div>';
    }
    
    return `
        <div class="card" data-post-id="${p.id}" style="margin-bottom: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    ${avatarHtml}
                    <div>
                        <div style="font-weight: bold;">
                            ${authorNameHtml}
                            ${editedHtml}
                        </div>
                        <div style="font-size: 12px; color: #64748b;">${formatTime(p.created_at)}</div>
                    </div>
                </div>
                ${menuHtml}
            </div>
            <div class="post-content-${p.id}" style="margin-bottom: 12px;">
                ${escapeHtml(p.text || '')}
            </div>
            ${imageHtml}
            <div style="display: flex; gap: 20px; padding: 8px 0; margin-top: 12px; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                <button class="like-btn" data-post-id="${p.id}" style="background: none; border: none; cursor: pointer; font-size: 14px; color: ${isLiked ? '#ef4444' : '#64748b'}; display: flex; align-items: center; gap: 4px;">
                    ❤️ <span class="like-count-${p.id}">${likesCount}</span>
                </button>
                <button class="comment-toggle-btn" data-post-id="${p.id}" style="background: none; border: none; cursor: pointer; font-size: 14px; color: #64748b; display: flex; align-items: center; gap: 4px;">
                    💬 <span class="comment-count-${p.id}">${comments.length}</span>
                </button>
            </div>
            <div class="comments-section-${p.id}" style="display: none; margin-top: 12px;">
                <div class="comments-list-${p.id}">
                    ${commentsHtml}
                </div>
                <div style="display: flex; gap: 8px; margin-top: 10px;">
                    <input type="text" class="comment-input-${p.id}" placeholder="Написать комментарий..." style="flex: 1; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 20px; font-size: 14px;">
                    <button class="comment-submit-btn" data-post-id="${p.id}" style="padding: 8px 16px; background: #1e40af; color: white; border: none; border-radius: 20px; cursor: pointer; font-size: 14px;">Отправить</button>
                </div>
            </div>
        </div>
    `;
}

async function loadFeed() {
    var feed = document.getElementById('feed');
    if (!feed) return;
    
    feed.innerHTML = '<div class="card" style="text-align: center;">Загрузка...</div>';
    
    var { data, error } = await dbClient.from('posts').select('*').order('created_at', { ascending: false });
    if (error) {
        feed.innerHTML = '<div class="card">Ошибка загрузки</div>';
        return;
    }
    
    var user = getUser();
    if (!data || data.length === 0) {
        feed.innerHTML = '<div class="card">Нет постов. Создайте первый!</div>';
        return;
    }
    
    var userIds = [...new Set(data.map(p => p.user_id))];
    var { data: users } = await dbClient.from('users').select('id, full_name, avatar').in('id', userIds);
    var userMap = {};
    if (users) {
        for (var i = 0; i < users.length; i++) {
            userMap[users[i].id] = users[i];
        }
    }
    
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var p = data[i];
        var userInfo = userMap[p.user_id] || { full_name: 'Пользователь', avatar: null };
        html += renderPostCard(p, userInfo, user, userMap);
    }
    feed.innerHTML = html;
    
    attachEventHandlers();
    
    if (window.realtimeChannel) {
        dbClient.removeChannel(window.realtimeChannel);
    }
    
    window.realtimeChannel = dbClient
        .channel('posts-realtime')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'posts' },
            async (payload) => {
                await addNewPostToFeed(payload.new);
            }
        )
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'posts' },
            (payload) => {
                updatePostInFeed(payload.new);
            }
        )
        .on('postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'posts' },
            (payload) => {
                var postElement = document.querySelector('.card[data-post-id="' + payload.old.id + '"]');
                if (postElement) postElement.remove();
            }
        )
        .subscribe();
}

function attachEventHandlers() {
    var likeBtns = document.querySelectorAll('.like-btn');
    for (var i = 0; i < likeBtns.length; i++) {
        likeBtns[i].onclick = function() { toggleLike(this.getAttribute('data-post-id')); };
    }
    
    var toggleBtns = document.querySelectorAll('.comment-toggle-btn');
    for (var i = 0; i < toggleBtns.length; i++) {
        toggleBtns[i].onclick = function() {
            var postId = this.getAttribute('data-post-id');
            var section = document.querySelector('.comments-section-' + postId);
            if (section) {
                section.style.display = section.style.display === 'none' ? 'block' : 'none';
            }
        };
    }
    
    var submitBtns = document.querySelectorAll('.comment-submit-btn');
    for (var i = 0; i < submitBtns.length; i++) {
        submitBtns[i].onclick = function() {
            var postId = this.getAttribute('data-post-id');
            var input = document.querySelector('.comment-input-' + postId);
            var text = input.value.trim();
            if (text) {
                addComment(postId, text);
                input.value = '';
            }
        };
    }
    
    var commentInputs = document.querySelectorAll('[class^="comment-input-"]');
    for (var i = 0; i < commentInputs.length; i++) {
        commentInputs[i].onkeypress = function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                var classes = this.className.split(' ');
                var postId = '';
                for (var j = 0; j < classes.length; j++) {
                    if (classes[j].indexOf('comment-input-') === 0) {
                        postId = classes[j].replace('comment-input-', '');
                        break;
                    }
                }
                var submitBtn = document.querySelector('.comment-submit-btn[data-post-id="' + postId + '"]');
                if (submitBtn) submitBtn.click();
            }
        };
    }
    
    var menuBtns = document.querySelectorAll('.post-menu-btn');
    for (var i = 0; i < menuBtns.length; i++) {
        menuBtns[i].onclick = function(e) {
            e.stopPropagation();
            var postId = this.getAttribute('data-post-id');
            var dropdown = document.querySelector('.post-menu-dropdown-' + postId);
            if (dropdown) {
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            }
        };
    }
    
    var editBtns = document.querySelectorAll('.edit-post-btn');
    for (var i = 0; i < editBtns.length; i++) {
        editBtns[i].onclick = function(e) {
            e.stopPropagation();
            var postId = this.getAttribute('data-post-id');
            editPost(postId);
        };
    }
    
    var deleteBtns = document.querySelectorAll('.delete-post-btn');
    for (var i = 0; i < deleteBtns.length; i++) {
        deleteBtns[i].onclick = function(e) {
            e.stopPropagation();
            var postId = this.getAttribute('data-post-id');
            deletePost(postId);
        };
    }
    
    document.addEventListener('click', function() {
        var dropdowns = document.querySelectorAll('[class^="post-menu-dropdown-"]');
        for (var i = 0; i < dropdowns.length; i++) {
            dropdowns[i].style.display = 'none';
        }
    });
}

function renderComments(comments, userMap) {
    if (!comments || comments.length === 0) {
        return '<div style="color: #94a3b8; font-size: 13px; text-align: center;">Нет комментариев</div>';
    }
    var html = '';
    for (var i = 0; i < comments.length; i++) {
        var c = comments[i];
        var userInfo = userMap[c.user_id] || { full_name: 'Пользователь' };
        html += `
            <div class="comment">
                <div class="comment-avatar">${userInfo.full_name ? userInfo.full_name.charAt(0).toUpperCase() : 'U'}</div>
                <div class="comment-content">
                    <div class="comment-user">${escapeHtml(userInfo.full_name)}</div>
                    <div class="comment-text">${escapeHtml(c.text)}</div>
                    <div class="comment-time">${formatTime(c.created_at)}</div>
                </div>
            </div>
        `;
    }
    return html;
}

async function toggleLike(postId) {
    var user = getUser();
    if (!user) return;
    
    var { data: post } = await dbClient.from('posts').select('user_id, likes').eq('id', postId).single();
    var likes = post.likes || [];
    var wasLiked = likes.includes(user.id);
    
    if (wasLiked) {
        likes = likes.filter(function(id) { return id !== user.id; });
    } else {
        likes.push(user.id);
    }
    
    await dbClient.from('posts').update({ likes: likes }).eq('id', postId);
    
    if (!wasLiked && post.user_id !== user.id) {
        var { data: author } = await dbClient.from('users').select('notifications').eq('id', post.user_id).single();
        var notifications = author.notifications || [];
        
        notifications.unshift({
            id: Date.now(),
            type: 'like',
            from_user: user.id,
            from_name: user.full_name,
            post_id: postId,
            timestamp: new Date().toISOString(),
            read: false
        });
        
        if (notifications.length > 50) notifications.pop();
        await dbClient.from('users').update({ notifications: notifications }).eq('id', post.user_id);
    }
    
    var likeCountSpan = document.querySelector('.like-count-' + postId);
    if (likeCountSpan) likeCountSpan.textContent = likes.length;
    
    var likeBtn = document.querySelector('.like-btn[data-post-id="' + postId + '"]');
    if (likeBtn) likeBtn.style.color = likes.includes(user.id) ? '#ef4444' : '#64748b';
}

async function addComment(postId, text) {
    var user = getUser();
    if (!user) return;
    
    var { data: post } = await dbClient.from('posts').select('user_id, comments').eq('id', postId).single();
    var comments = post.comments || [];
    
    comments.push({
        id: Date.now(),
        user_id: user.id,
        text: text,
        created_at: new Date().toISOString()
    });
    
    await dbClient.from('posts').update({ comments: comments }).eq('id', postId);
    
    if (post.user_id !== user.id) {
        var { data: author } = await dbClient.from('users').select('notifications').eq('id', post.user_id).single();
        var notifications = author.notifications || [];
        
        notifications.unshift({
            id: Date.now(),
            type: 'comment',
            from_user: user.id,
            from_name: user.full_name,
            post_id: postId,
            text: text.length > 50 ? text.substring(0, 50) + '...' : text,
            timestamp: new Date().toISOString(),
            read: false
        });
        
        if (notifications.length > 50) notifications.pop();
        await dbClient.from('users').update({ notifications: notifications }).eq('id', post.user_id);
    }
    
    var commentCountSpan = document.querySelector('.comment-count-' + postId);
    if (commentCountSpan) commentCountSpan.textContent = comments.length;
    
    var userIds = [];
    for (var i = 0; i < comments.length; i++) {
        if (userIds.indexOf(comments[i].user_id) === -1) {
            userIds.push(comments[i].user_id);
        }
    }
    
    var { data: users } = await dbClient.from('users').select('id, full_name, avatar').in('id', userIds);
    var userMap = {};
    if (users) {
        for (var i = 0; i < users.length; i++) {
            userMap[users[i].id] = users[i];
        }
    }
    
    var commentsList = document.querySelector('.comments-list-' + postId);
    if (commentsList) {
        commentsList.innerHTML = renderComments(comments, userMap);
    }
}

async function editPost(postId) {
    var user = getUser();
    if (!user) return;
    
    var { data: post } = await dbClient.from('posts').select('text').eq('id', postId).single();
    if (!post) return;
    
    var newText = prompt('Редактировать пост:', post.text);
    if (newText === null || newText.trim() === '') return;
    
    var { error } = await dbClient
        .from('posts')
        .update({ 
            text: newText.trim(),
            edited: true
        })
        .eq('id', postId);
    
    if (error) {
        alert('Ошибка при редактировании');
        return;
    }
    
    var contentDiv = document.querySelector('.post-content-' + postId);
    if (contentDiv) {
        contentDiv.innerHTML = escapeHtml(newText.trim());
    }
    
    var nameDiv = document.querySelector('.card[data-post-id="' + postId + '"] .post-user-info div:first-child');
    if (nameDiv && !nameDiv.innerHTML.includes('(ред.)')) {
        nameDiv.innerHTML += '<span style="font-size: 10px; color: #94a3b8; margin-left: 5px;">(ред.)</span>';
    }
    
    alert('Пост отредактирован!');
}

async function deletePost(postId) {
    if (!confirm('Удалить пост? Это действие нельзя отменить.')) return;
    
    var user = getUser();
    if (!user) return;
    
    var { error } = await dbClient.from('posts').delete().eq('id', postId);
    
    if (error) {
        alert('Ошибка при удалении');
        return;
    }
    
    var postElement = document.querySelector('.card[data-post-id="' + postId + '"]');
    if (postElement) {
        postElement.remove();
    }
    
    var { count } = await dbClient.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    user.posts_count = count;
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    if (window.location.pathname.includes('profile.html')) {
        loadProfile();
        loadUserPosts();
    }
    
    alert('Пост удален!');
}

async function addNewPostToFeed(newPost) {
    var feed = document.getElementById('feed');
    if (!feed) return;
    
    var user = getUser();
    var { data: author } = await dbClient.from('users').select('id, full_name, avatar').eq('id', newPost.user_id).single();
    if (!author) return;
    
    var userMap = {};
    userMap[author.id] = author;
    
    var postHtml = renderPostCard(newPost, author, user, userMap);
    feed.insertAdjacentHTML('afterbegin', postHtml);
    
    attachSinglePostHandlers(newPost.id);
}

function attachSinglePostHandlers(postId) {
    var likeBtn = document.querySelector('.like-btn[data-post-id="' + postId + '"]');
    if (likeBtn) likeBtn.onclick = function() { toggleLike(postId); };
    
    var commentToggle = document.querySelector('.comment-toggle-btn[data-post-id="' + postId + '"]');
    if (commentToggle) {
        commentToggle.onclick = function() {
            var section = document.querySelector('.comments-section-' + postId);
            if (section) section.style.display = section.style.display === 'none' ? 'block' : 'none';
        };
    }
    
    var submitBtn = document.querySelector('.comment-submit-btn[data-post-id="' + postId + '"]');
    if (submitBtn) {
        submitBtn.onclick = function() {
            var input = document.querySelector('.comment-input-' + postId);
            var text = input.value.trim();
            if (text) {
                addComment(postId, text);
                input.value = '';
            }
        };
    }
    
    var commentInput = document.querySelector('.comment-input-' + postId);
    if (commentInput) {
        commentInput.onkeypress = function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                var submit = document.querySelector('.comment-submit-btn[data-post-id="' + postId + '"]');
                if (submit) submit.click();
            }
        };
    }
    
    var menuBtn = document.querySelector('.post-menu-btn[data-post-id="' + postId + '"]');
    if (menuBtn) {
        menuBtn.onclick = function(e) {
            e.stopPropagation();
            var dropdown = document.querySelector('.post-menu-dropdown-' + postId);
            if (dropdown) dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        };
    }
    
    var editBtn = document.querySelector('.edit-post-btn[data-post-id="' + postId + '"]');
    if (editBtn) editBtn.onclick = function(e) { e.stopPropagation(); editPost(postId); };
    
    var deleteBtn = document.querySelector('.delete-post-btn[data-post-id="' + postId + '"]');
    if (deleteBtn) deleteBtn.onclick = function(e) { e.stopPropagation(); deletePost(postId); };
}

function updatePostInFeed(updatedPost) {
    var postElement = document.querySelector('.card[data-post-id="' + updatedPost.id + '"]');
    if (!postElement) return;
    
    var likeCountSpan = postElement.querySelector('.like-count-' + updatedPost.id);
    if (likeCountSpan) likeCountSpan.textContent = updatedPost.likes ? updatedPost.likes.length : 0;
    
    var commentCountSpan = postElement.querySelector('.comment-count-' + updatedPost.id);
    if (commentCountSpan) commentCountSpan.textContent = updatedPost.comments ? updatedPost.comments.length : 0;
}

async function loadProfile() {
    var cont = document.getElementById('profileContent');
    if (!cont) return;
    var user = getUser();
    if (!user) return;
    
    var { count } = await dbClient.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    
    // Получаем количество друзей из таблицы friend_requests
    var { data: acceptedFriends } = await dbClient
        .from('friend_requests')
        .select('*')
        .or(`and(from_user.eq.${user.id},status.eq.accepted),and(to_user.eq.${user.id},status.eq.accepted)`);
    
    var friendsCount = acceptedFriends?.length || 0;
    
    // Получаем данные друзей для отображения
    var friendsHtml = '';
    if (acceptedFriends && acceptedFriends.length > 0) {
        var friendIds = [];
        for (var i = 0; i < acceptedFriends.length; i++) {
            var fr = acceptedFriends[i];
            var friendId = fr.from_user === user.id ? fr.to_user : fr.from_user;
            friendIds.push(friendId);
        }
        
        var { data: friendsData } = await dbClient.from('users').select('id, full_name, avatar').in('id', friendIds);
        if (friendsData && friendsData.length > 0) {
            friendsHtml = '<div style="margin-top: 20px;"><h3>👥 Друзья</h3><div class="friends-list">';
            for (var i = 0; i < friendsData.length; i++) {
                var f = friendsData[i];
                var fAvatar = f.avatar 
                    ? '<img src="' + f.avatar + '" class="friend-avatar" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">'
                    : '<div class="friend-avatar" style="width: 32px; height: 32px; background: #1e40af; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">' + f.full_name.charAt(0).toUpperCase() + '</div>';
                friendsHtml += `
                    <div class="friend-card" onclick="location.href='profile.html?user=${f.id}'">
                        ${fAvatar}
                        <span class="friend-name">${escapeHtml(f.full_name)}</span>
                    </div>
                `;
            }
            friendsHtml += '</div></div>';
        }
    }
    
    var avatarHtml = user.avatar 
        ? '<img src="' + user.avatar + '" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin: 0 auto; display: block;">'
        : '<div style="width: 80px; height: 80px; background: #1e40af; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; font-size: 32px; color: white;">' + (user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U') + '</div>';
    
    var bioHtml = user.bio ? '<div style="margin: 10px 0; color: #475569;">' + escapeHtml(user.bio) + '</div>' : '';
    var cityHtml = user.city ? '<div style="margin: 5px 0; color: #64748b;">📍 ' + escapeHtml(user.city) + '</div>' : '';
    
    cont.innerHTML = `
        <div class="profile-header">
            ${avatarHtml}
            <h1 class="profile-name">${escapeHtml(user.full_name)}</h1>
            ${bioHtml}
            ${cityHtml}
            <div class="profile-email">${user.email}</div>
            <button id="editProfileBtn" class="edit-profile-btn">✏️ Редактировать профиль</button>
            <div class="profile-stats">
                <div class="stat">
                    <div class="stat-number">${count || 0}</div>
                    <div class="stat-label">постов</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${friendsCount}</div>
                    <div class="stat-label">друзей</div>
                </div>
            </div>
        </div>
    `;
    
    if (friendsHtml) {
        cont.innerHTML += friendsHtml;
    }
    
    var editBtn = document.getElementById('editProfileBtn');
    if (editBtn) editBtn.onclick = function() { openEditModal(); };
}

async function loadOtherProfile(userId) {
    var cont = document.getElementById('profileContent');
    if (!cont) return;
    var currentUser = getUser();
    var { data: profileUser, error } = await dbClient.from('users').select('*').eq('id', userId).single();
    if (error || !profileUser) {
        cont.innerHTML = '<div style="background:white; border-radius:20px; padding:30px; text-align:center;">Пользователь не найден</div>';
        return;
    }
    
    var { count } = await dbClient.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    
    // Получаем друзей этого пользователя
    var { data: userFriends } = await dbClient
        .from('friend_requests')
        .select('*')
        .or(`and(from_user.eq.${profileUser.id},status.eq.accepted),and(to_user.eq.${profileUser.id},status.eq.accepted)`);
    var friendsCount = userFriends?.length || 0;
    
    // Получаем данные друзей для отображения
    var friendsHtml = '';
    if (userFriends && userFriends.length > 0) {
        var friendIds = [];
        for (var i = 0; i < userFriends.length; i++) {
            var fr = userFriends[i];
            var friendId = fr.from_user === profileUser.id ? fr.to_user : fr.from_user;
            friendIds.push(friendId);
        }
        
        var { data: friendsData } = await dbClient.from('users').select('id, full_name, avatar').in('id', friendIds);
        if (friendsData && friendsData.length > 0) {
            friendsHtml = '<div style="margin-top: 20px;"><h3>👥 Друзья</h3><div class="friends-list">';
            for (var i = 0; i < friendsData.length; i++) {
                var f = friendsData[i];
                var fAvatar = f.avatar 
                    ? '<img src="' + f.avatar + '" class="friend-avatar" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">'
                    : '<div class="friend-avatar" style="width: 32px; height: 32px; background: #1e40af; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">' + f.full_name.charAt(0).toUpperCase() + '</div>';
                friendsHtml += `
                    <div class="friend-card" onclick="location.href='profile.html?user=${f.id}'">
                        ${fAvatar}
                        <span class="friend-name">${escapeHtml(f.full_name)}</span>
                    </div>
                `;
            }
            friendsHtml += '</div></div>';
        }
    }
    
    // Проверяем статус отношений
    var { data: friendRequest } = await dbClient
        .from('friend_requests')
        .select('*')
        .or(`and(from_user.eq.${currentUser.id},to_user.eq.${userId}),and(from_user.eq.${userId},to_user.eq.${currentUser.id})`)
        .single();
    
    var isFriend = friendRequest?.status === 'accepted';
    var hasRequest = friendRequest?.status === 'pending' && friendRequest?.to_user === currentUser.id;
    var requestSent = friendRequest?.status === 'pending' && friendRequest?.from_user === currentUser.id;
    
    var avatarHtml = profileUser.avatar 
        ? '<img src="' + profileUser.avatar + '" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin: 0 auto; display: block;">'
        : '<div style="width: 80px; height: 80px; background: #1e40af; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; font-size: 32px; color: white;">' + (profileUser.full_name ? profileUser.full_name.charAt(0).toUpperCase() : 'U') + '</div>';
    
    var bioHtml = profileUser.bio ? '<div style="margin: 10px 0; color: #475569;">' + escapeHtml(profileUser.bio) + '</div>' : '';
    var cityHtml = profileUser.city ? '<div style="margin: 5px 0; color: #64748b;">📍 ' + escapeHtml(profileUser.city) + '</div>' : '';
    
    var buttonHtml = '';
    if (isFriend) {
        buttonHtml = '<button class="friend-button" style="background:#10b981;" disabled>✓ В друзьях</button>';
    } else if (hasRequest) {
        buttonHtml = '<button class="friend-button" onclick="acceptFriendRequest(\'' + friendRequest.id + '\')">✅ Принять заявку</button>';
    } else if (requestSent) {
        buttonHtml = '<button class="friend-button requested" disabled>⏳ Запрос отправлен</button>';
    } else {
        buttonHtml = '<button class="friend-button" onclick="sendFriendRequest(\'' + userId + '\')">➕ Добавить в друзья</button>';
    }
    
    cont.innerHTML = `
        <div style="background:white; border-radius:20px; padding:30px; text-align:center; margin-bottom:20px;">
            ${avatarHtml}
            <h1 style="margin-top:15px;">${escapeHtml(profileUser.full_name)}</h1>
            ${bioHtml}
            ${cityHtml}
            <div style="color:#64748b;">${profileUser.email}</div>
            ${buttonHtml}
            <div style="display:flex; justify-content:center; gap:30px; margin-top:20px;">
                <div><strong>${count || 0}</strong> постов</div>
                <div><strong>${friendsCount}</strong> друзей</div>
            </div>
        </div>
    `;
    
    if (friendsHtml) {
        cont.innerHTML += friendsHtml;
    }
}

window.sendFriendRequest = async function(userId) {
    console.log('🔵 Отправка запроса в друзья');
    
    var currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        alert('Ошибка: вы не авторизованы');
        return;
    }
    
    var { data: existing } = await dbClient
        .from('friend_requests')
        .select('*')
        .eq('from_user', currentUser.id)
        .eq('to_user', userId)
        .eq('status', 'pending')
        .single();
    
    if (existing) {
        alert('⚠️ Запрос уже отправлен');
        return;
    }
    
    var { data: areFriends } = await dbClient
        .from('friend_requests')
        .select('*')
        .or(`and(from_user.eq.${currentUser.id},to_user.eq.${userId},status.eq.accepted),and(from_user.eq.${userId},to_user.eq.${currentUser.id},status.eq.accepted)`)
        .single();
    
    if (areFriends) {
        alert('👥 Вы уже друзья!');
        return;
    }
    
    var { error } = await dbClient
        .from('friend_requests')
        .insert({
            from_user: currentUser.id,
            to_user: userId,
            status: 'pending'
        });
    
    if (error) {
        console.log('❌ Ошибка:', error);
        alert('Ошибка: ' + error.message);
    } else {
        console.log('✅ Запрос отправлен!');
        alert('✅ Запрос отправлен!');
        location.reload();
    }
};

window.acceptFriendRequest = async function(requestId) {
    var { error } = await dbClient
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);
    
    if (error) {
        alert('Ошибка: ' + error.message);
    } else {
        alert('✅ Вы теперь друзья!');
        location.reload();
    }
};

async function loadUserPosts() {
    var cont = document.getElementById('userPosts');
    if (!cont) return;
    var urlParams = new URLSearchParams(window.location.search);
    var profileUserId = urlParams.get('user') || (getUser() ? getUser().id : null);
    if (!profileUserId) return;
    
    var { data, error } = await dbClient.from('posts').select('*').eq('user_id', profileUserId).order('created_at', { ascending: false });
    if (error || !data || data.length === 0) {
        cont.innerHTML = '<div class="card">Нет постов</div>';
        return;
    }
    
    var html = '<h3 style="margin-bottom:15px;">📝 Посты</h3>';
    for (var i = 0; i < data.length; i++) {
        var edited = data[i].edited ? '<span style="font-size: 10px; color: #94a3b8;"> (ред.)</span>' : '';
        html += '<div class="card" style="margin-bottom:12px;"><div>' + escapeHtml(data[i].text || '') + edited + '</div><div style="margin-top:8px; font-size:12px; color:#64748b;">❤️ ' + (data[i].likes ? data[i].likes.length : 0) + ' лайков | 💬 ' + (data[i].comments ? data[i].comments.length : 0) + ' комментариев</div></div>';
    }
    cont.innerHTML = html;
}

async function createPost() {
    var user = getUser();
    if (!user || !user.id) {
        alert('Ошибка: пользователь не авторизован');
        return;
    }
    
    var text = document.getElementById('postText')?.value;
    var imageFile = document.getElementById('postImage')?.files[0];
    
    if (!text && !imageFile) {
        alert('Напишите что-нибудь или добавьте фото');
        return;
    }
    
    var postData = {
        user_id: user.id,
        text: text || '',
        image: '',
        likes: [],
        comments: [],
        edited: false
    };
    
    if (imageFile) {
        var reader = new FileReader();
        reader.onload = async function(e) {
            postData.image = e.target.result;
            var { error: postError } = await dbClient.from('posts').insert(postData);
            
            if (postError) {
                alert('Ошибка при создании поста: ' + postError.message);
                return;
            }
            
            var newCount = (user.posts_count || 0) + 1;
            await dbClient.from('users').update({ posts_count: newCount }).eq('id', user.id);
            user.posts_count = newCount;
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            document.getElementById('postText').value = '';
            document.getElementById('postImage').value = '';
            await loadFeed();
            alert('Пост опубликован!');
        };
        reader.readAsDataURL(imageFile);
    } else {
        var { error: postError } = await dbClient.from('posts').insert(postData);
        
        if (postError) {
            alert('Ошибка при создании поста: ' + postError.message);
            return;
        }
        
        var newCount = (user.posts_count || 0) + 1;
        await dbClient.from('users').update({ posts_count: newCount }).eq('id', user.id);
        user.posts_count = newCount;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        document.getElementById('postText').value = '';
        await loadFeed();
        alert('Пост опубликован!');
    }
}

window.openEditModal = function() {
    var user = getUser();
    if (!user) return;
    
    var modal = document.getElementById('editProfileModal');
    if (!modal) {
        var modalHtml = `
            <div id="editProfileModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
                <div style="background: white; border-radius: 24px; padding: 24px; width: 90%; max-width: 500px;">
                    <h3 style="margin-bottom: 20px;">Редактировать профиль</h3>
                    <img id="editAvatarPreview" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin: 0 auto 15px; display: block;">
                    <label style="display: block; text-align: center; background: #f1f5f9; padding: 8px; border-radius: 20px; cursor: pointer; margin-bottom: 15px;">
                        📷 Загрузить фото
                        <input type="file" id="editAvatarInput" accept="image/*" style="display: none;">
                    </label>
                    <div style="margin-bottom: 15px;">
                        <label>Имя</label>
                        <input type="text" id="editFullName" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 12px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label>О себе</label>
                        <textarea id="editBio" rows="3" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 12px;"></textarea>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label>Город</label>
                        <input type="text" id="editCity" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 12px;">
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button id="saveProfileChangesBtn" class="btn btn-primary" style="flex: 1;">Сохранить</button>
                        <button id="closeEditModalBtn" class="btn btn-secondary" style="flex: 1;">Отмена</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        document.getElementById('closeEditModalBtn').onclick = function() {
            document.getElementById('editProfileModal').style.display = 'none';
        };
        
        document.getElementById('editAvatarInput').onchange = function(e) {
            var file = e.target.files[0];
            if (file) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('editAvatarPreview').src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        };
        
        document.getElementById('saveProfileChangesBtn').onclick = async function() {
            var user = getUser();
            var newName = document.getElementById('editFullName').value;
            var newBio = document.getElementById('editBio').value;
            var newCity = document.getElementById('editCity').value;
            var newAvatar = document.getElementById('editAvatarPreview').src;
            
            var file = document.getElementById('editAvatarInput').files[0];
            if (file) {
                var fileName = user.id + '_' + Date.now();
                var { data, error } = await dbClient.storage.from('avatars').upload(fileName, file);
                if (!error) {
                    var { data: urlData } = dbClient.storage.from('avatars').getPublicUrl(fileName);
                    newAvatar = urlData.publicUrl;
                }
            }
            
            await dbClient.from('users').update({
                full_name: newName,
                bio: newBio,
                city: newCity,
                avatar: newAvatar
            }).eq('id', user.id);
            
            user.full_name = newName;
            user.bio = newBio;
            user.city = newCity;
            user.avatar = newAvatar;
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            document.getElementById('editProfileModal').style.display = 'none';
            loadProfile();
        };
    }
    
    document.getElementById('editFullName').value = user.full_name || '';
    document.getElementById('editBio').value = user.bio || '';
    document.getElementById('editCity').value = user.city || '';
    document.getElementById('editAvatarPreview').src = user.avatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%231e40af"/%3E%3Ctext x="50" y="65" font-size="40" text-anchor="middle" fill="white"%3E' + (user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U') + '%3C/text%3E%3C/svg%3E';
    
    document.getElementById('editProfileModal').style.display = 'flex';
};

function formatTime(timestamp) {
    var date = new Date(timestamp);
    var now = new Date();
    var diff = now - date;
    if (diff < 60000) return 'только что';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' мин назад';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' ч назад';
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.openImageViewer = function(imageSrc) {
    var modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.9)';
    modal.style.zIndex = '10000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.cursor = 'pointer';
    
    var img = document.createElement('img');
    img.src = imageSrc;
    img.style.maxWidth = '90%';
    img.style.maxHeight = '90%';
    img.style.objectFit = 'contain';
    img.style.borderRadius = '8px';
    
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '20px';
    closeBtn.style.right = '20px';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'white';
    closeBtn.style.fontSize = '32px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.zIndex = '10001';
    
    modal.appendChild(img);
    modal.appendChild(closeBtn);
    document.body.appendChild(modal);
    
    modal.onclick = function(e) {
        if (e.target === modal || e.target === closeBtn) {
            modal.remove();
        }
    };
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.body.contains(modal)) {
            modal.remove();
        }
    });
};