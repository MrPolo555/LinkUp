import { supabase } from './supabase-config.js'

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentUser = null
let currentChatUser = null

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async () => {
    // Проверяем авторизацию
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session && !window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
        window.location.href = 'login.html'
        return
    }
    
    if (session) {
        // Получаем данные пользователя
        const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email)
            .single()
        
        if (userData) {
            currentUser = userData
            localStorage.setItem('currentUser', JSON.stringify(currentUser))
        }
    }
    
    // Загружаем данные в зависимости от страницы
    if (window.location.pathname.includes('index.html')) {
        await loadFeed()
        setupCreatePost()
        subscribeToNewPosts()
    } else if (window.location.pathname.includes('profile.html')) {
        await loadProfile()
        await loadUserPosts()
        setupEditProfile()
    } else if (window.location.pathname.includes('messages.html')) {
        await loadMessagesPage()
        subscribeToNewMessages()
    }
    
    // Инициализация уведомлений
    updateNotificationsUI()
    
    // Кнопка выхода
    const logoutBtn = document.getElementById('logoutBtn')
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut()
            localStorage.removeItem('currentUser')
            window.location.href = 'login.html'
        })
    }
    
    // Колокольчик уведомлений
    const notificationsBtn = document.getElementById('notificationsBtn')
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            const dropdown = document.getElementById('notificationsDropdown')
            if (dropdown) dropdown.classList.toggle('show')
        })
        
        document.addEventListener('click', () => {
            const dropdown = document.getElementById('notificationsDropdown')
            if (dropdown) dropdown.classList.remove('show')
        })
    }
})

// ========== ПОСТЫ ==========
function setupCreatePost() {
    const createBtn = document.getElementById('createPostBtn')
    if (createBtn) {
        createBtn.onclick = createPost
    }
    
    const fileInput = document.getElementById('postImage')
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const fileNameSpan = document.getElementById('fileName')
            if (fileNameSpan && this.files && this.files[0]) {
                fileNameSpan.textContent = this.files[0].name
            } else if (fileNameSpan) {
                fileNameSpan.textContent = 'Файл не выбран'
            }
        })
    }
}

async function createPost() {
    const text = document.getElementById('postText')?.value
    const imageFile = document.getElementById('postImage')?.files[0]
    
    if (!text && !imageFile) {
        alert('Напишите что-нибудь или добавьте фото')
        return
    }
    
    let imageUrl = ''
    
    if (imageFile) {
        // Загружаем фото в Storage Supabase
        const fileName = `${Date.now()}_${imageFile.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(fileName, imageFile)
        
        if (uploadError) {
            console.error('Ошибка загрузки фото:', uploadError)
            alert('Ошибка загрузки фото')
            return
        }
        
        // Получаем публичный URL
        const { data: urlData } = supabase.storage
            .from('post-images')
            .getPublicUrl(fileName)
        
        imageUrl = urlData.publicUrl
    }
    
    // Сохраняем пост в базу
    const { data, error } = await supabase
        .from('posts')
        .insert({
            user_id: currentUser.id,
            text: text || '',
            image: imageUrl,
            likes: [],
            reactions: {}
        })
        .select()
        .single()
    
    if (error) {
        console.error('Ошибка создания поста:', error)
        alert('Ошибка при создании поста')
        return
    }
    
    // Обновляем счетчик постов у пользователя
    await supabase
        .from('users')
        .update({ posts_count: (currentUser.posts_count || 0) + 1 })
        .eq('id', currentUser.id)
    
    // Очищаем форму
    document.getElementById('postText').value = ''
    document.getElementById('postImage').value = ''
    const fileNameSpan = document.getElementById('fileName')
    if (fileNameSpan) fileNameSpan.textContent = 'Файл не выбран'
    
    // Добавляем пост в ленту
    addPostToFeed(data)
}

async function loadFeed() {
    const feed = document.getElementById('feed')
    if (!feed) return
    
    feed.innerHTML = '<div style="text-align: center; padding: 40px;">Загрузка...</div>'
    
    const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
    
    if (error) {
        console.error('Ошибка загрузки постов:', error)
        feed.innerHTML = '<div class="card" style="text-align: center;">Ошибка загрузки</div>'
        return
    }
    
    if (posts.length === 0) {
        feed.innerHTML = '<div class="card" style="text-align: center;">Нет постов. Будьте первым!</div>'
        return
    }
    
    // Загружаем данные пользователей для всех постов
    const userIds = [...new Set(posts.map(p => p.user_id))]
    const { data: users } = await supabase
        .from('users')
        .select('id, full_name, avatar')
        .in('id', userIds)
    
    const userMap = {}
    users?.forEach(u => userMap[u.id] = u)
    
    feed.innerHTML = posts.map(post => renderPost(post, userMap)).join('')
    
    posts.forEach(post => {
        attachPostHandlers(post.id)
    })
}

function renderPost(post, userMap) {
    const postUser = userMap[post.user_id] || { full_name: 'Пользователь', avatar: null }
    const userName = postUser.full_name
    const userAvatar = postUser.avatar
    
    const avatarHtml = userAvatar 
        ? `<img src="${userAvatar}" class="post-avatar" style="object-fit: cover;">`
        : `<div class="post-avatar">${userName[0].toUpperCase()}</div>`
    
    const isLiked = post.likes?.includes(currentUser?.id) || false
    
    let reactionsHtml = ''
    if (post.reactions) {
        reactionsHtml = Object.entries(post.reactions).map(([emoji, usersList]) => {
            if (usersList.length > 0) {
                return `<span class="reaction-badge" style="margin-left: 5px;">${emoji} ${usersList.length}</span>`
            }
            return ''
        }).join('')
    }
    
    // Загружаем комментарии для этого поста
    loadCommentsForPost(post.id).then(comments => {
        updateCommentsDisplay(post.id, comments)
    })
    
    return `
        <div class="card" data-post-id="${post.id}">
            <div class="post-header">
                ${avatarHtml}
                <div class="post-user-info">
                    <a href="profile.html?user=${post.user_id}" class="post-user-name">${escapeHtml(userName)}</a>
                    <div class="post-time">${formatTime(post.created_at)}</div>
                </div>
            </div>
            <div class="post-content">
                ${post.text ? `<div class="post-text">${escapeHtml(post.text)}</div>` : ''}
                ${post.image ? `<img src="${post.image}" class="post-image" alt="post image" onclick="openImageModal('${post.image}')">` : ''}
            </div>
            <div class="post-actions">
                <div class="post-action like-action ${isLiked ? 'active' : ''}" data-action="like">
                    ❤️ <span class="like-count">${post.likes?.length || 0}</span>
                </div>
                <div class="post-action reaction-action" data-action="reaction">
                    😊 Реакции ${reactionsHtml}
                </div>
                <div class="post-action comment-action" data-action="comment">
                    💬 <span class="comment-count" id="comment-count-${post.id}">0</span>
                </div>
            </div>
            <div class="comments-section" id="comments-section-${post.id}" style="display: none;">
                <div class="comments-list" id="comments-list-${post.id}">
                    <div style="padding: 10px; text-align: center;">Загрузка комментариев...</div>
                </div>
                <div class="comment-form">
                    <input type="text" class="comment-input" id="comment-input-${post.id}" placeholder="Написать комментарий...">
                    <button class="btn btn-primary submit-comment" data-post-id="${post.id}">Отправить</button>
                </div>
            </div>
        </div>
    `
}

async function loadCommentsForPost(postId) {
    const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
    
    if (error) {
        console.error('Ошибка загрузки комментариев:', error)
        return []
    }
    
    // Загружаем данные пользователей для комментариев
    const userIds = [...new Set(comments.map(c => c.user_id))]
    const { data: users } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', userIds)
    
    const userMap = {}
    users?.forEach(u => userMap[u.id] = u)
    
    return comments.map(comment => ({
        ...comment,
        user_name: userMap[comment.user_id]?.full_name || 'Пользователь'
    }))
}

function updateCommentsDisplay(postId, comments) {
    const commentsList = document.getElementById(`comments-list-${postId}`)
    const commentCountSpan = document.getElementById(`comment-count-${postId}`)
    
    if (commentCountSpan) {
        commentCountSpan.textContent = comments.length
    }
    
    if (commentsList) {
        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="empty-state">Нет комментариев</div>'
        } else {
            commentsList.innerHTML = comments.map(comment => `
                <div class="comment">
                    <div class="comment-avatar">${comment.user_name[0].toUpperCase()}</div>
                    <div class="comment-content">
                        <div class="comment-user">${escapeHtml(comment.user_name)}</div>
                        <div class="comment-text">${escapeHtml(comment.text)}</div>
                        <div class="comment-time">${formatTime(comment.created_at)}</div>
                    </div>
                </div>
            `).join('')
        }
    }
}

function attachPostHandlers(postId) {
    const likeBtn = document.querySelector(`.card[data-post-id="${postId}"] .like-action`)
    if (likeBtn) {
        likeBtn.onclick = () => toggleLike(postId)
    }
    
    const reactionBtn = document.querySelector(`.card[data-post-id="${postId}"] .reaction-action`)
    if (reactionBtn) {
        reactionBtn.onclick = (e) => showReactionPicker(e, postId)
    }
    
    const commentBtn = document.querySelector(`.card[data-post-id="${postId}"] .comment-action`)
    const commentsSection = document.getElementById(`comments-section-${postId}`)
    if (commentBtn && commentsSection) {
        commentBtn.onclick = () => {
            const isVisible = commentsSection.style.display !== 'none'
            commentsSection.style.display = isVisible ? 'none' : 'block'
            if (!isVisible) {
                loadCommentsForPost(postId).then(comments => {
                    updateCommentsDisplay(postId, comments)
                })
            }
        }
    }
    
    const submitComment = document.querySelector(`.submit-comment[data-post-id="${postId}"]`)
    const commentInput = document.getElementById(`comment-input-${postId}`)
    if (submitComment && commentInput) {
        submitComment.onclick = () => {
            addComment(postId, commentInput.value)
            commentInput.value = ''
        }
    }
}

async function toggleLike(postId) {
    // Получаем текущий пост
    const { data: post, error } = await supabase
        .from('posts')
        .select('likes')
        .eq('id', postId)
        .single()
    
    if (error) return
    
    let likes = post.likes || []
    
    if (likes.includes(currentUser.id)) {
        likes = likes.filter(id => id !== currentUser.id)
    } else {
        likes.push(currentUser.id)
        // Уведомление автору
        await addNotification(post.user_id, 'like', currentUser.id, postId)
    }
    
    // Обновляем лайки
    await supabase
        .from('posts')
        .update({ likes: likes })
        .eq('id', postId)
    
    // Обновляем UI
    const likeCountSpan = document.querySelector(`.card[data-post-id="${postId}"] .like-count`)
    if (likeCountSpan) {
        likeCountSpan.textContent = likes.length
    }
    
    const likeBtn = document.querySelector(`.card[data-post-id="${postId}"] .like-action`)
    if (likeBtn) {
        if (likes.includes(currentUser.id)) {
            likeBtn.classList.add('active')
        } else {
            likeBtn.classList.remove('active')
        }
    }
}

async function addComment(postId, text) {
    if (!text.trim()) return
    
    const { error } = await supabase
        .from('comments')
        .insert({
            post_id: postId,
            user_id: currentUser.id,
            text: text.trim()
        })
    
    if (error) {
        console.error('Ошибка добавления комментария:', error)
        return
    }
    
    // Получаем пост для уведомления
    const { data: post } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single()
    
    if (post && post.user_id !== currentUser.id) {
        await addNotification(post.user_id, 'comment', currentUser.id, postId)
    }
    
    // Обновляем комментарии
    const comments = await loadCommentsForPost(postId)
    updateCommentsDisplay(postId, comments)
}

function addPostToFeed(post) {
    const feed = document.getElementById('feed')
    if (!feed) return
    
    const postHtml = `
        <div class="card" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-avatar">${currentUser.full_name[0].toUpperCase()}</div>
                <div class="post-user-info">
                    <a href="profile.html" class="post-user-name">${escapeHtml(currentUser.full_name)}</a>
                    <div class="post-time">только что</div>
                </div>
            </div>
            <div class="post-content">
                ${post.text ? `<div class="post-text">${escapeHtml(post.text)}</div>` : ''}
                ${post.image ? `<img src="${post.image}" class="post-image" alt="post image">` : ''}
            </div>
            <div class="post-actions">
                <div class="post-action like-action">❤️ <span class="like-count">0</span></div>
                <div class="post-action reaction-action">😊 Реакции</div>
                <div class="post-action comment-action">💬 <span class="comment-count">0</span></div>
            </div>
            <div class="comments-section" style="display: none;">
                <div class="comments-list"></div>
                <div class="comment-form">
                    <input type="text" class="comment-input" placeholder="Написать комментарий...">
                    <button class="btn btn-primary submit-comment">Отправить</button>
                </div>
            </div>
        </div>
    `
    
    feed.insertAdjacentHTML('afterbegin', postHtml)
    attachPostHandlers(post.id)
}

function subscribeToNewPosts() {
    supabase
        .channel('posts-channel')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'posts' },
            async (payload) => {
                const newPost = payload.new
                // Не добавляем свой пост (уже добавлен)
                if (newPost.user_id !== currentUser.id) {
                    // Загружаем данные автора
                    const { data: author } = await supabase
                        .from('users')
                        .select('full_name, avatar')
                        .eq('id', newPost.user_id)
                        .single()
                    
                    const feed = document.getElementById('feed')
                    if (feed) {
                        const postHtml = `
                            <div class="card" data-post-id="${newPost.id}">
                                <div class="post-header">
                                    ${author.avatar ? `<img src="${author.avatar}" class="post-avatar">` : `<div class="post-avatar">${author.full_name[0].toUpperCase()}</div>`}
                                    <div class="post-user-info">
                                        <a href="profile.html?user=${newPost.user_id}" class="post-user-name">${escapeHtml(author.full_name)}</a>
                                        <div class="post-time">только что</div>
                                    </div>
                                </div>
                                <div class="post-content">
                                    ${newPost.text ? `<div class="post-text">${escapeHtml(newPost.text)}</div>` : ''}
                                    ${newPost.image ? `<img src="${newPost.image}" class="post-image">` : ''}
                                </div>
                                <div class="post-actions">
                                    <div class="post-action like-action">❤️ <span class="like-count">0</span></div>
                                    <div class="post-action reaction-action">😊 Реакции</div>
                                    <div class="post-action comment-action">💬 <span class="comment-count">0</span></div>
                                </div>
                                <div class="comments-section" style="display: none;">
                                    <div class="comments-list"></div>
                                    <div class="comment-form">
                                        <input type="text" class="comment-input" placeholder="Написать комментарий...">
                                        <button class="btn btn-primary submit-comment">Отправить</button>
                                    </div>
                                </div>
                            </div>
                        `
                        feed.insertAdjacentHTML('afterbegin', postHtml)
                        attachPostHandlers(newPost.id)
                    }
                }
            }
        )
        .subscribe()
}

// ========== ПРОФИЛЬ ==========
async function loadProfile() {
    const urlParams = new URLSearchParams(window.location.search)
    const profileUserId = urlParams.get('user') || currentUser.id
    const isOwnProfile = profileUserId === currentUser.id
    
    let profileUser
    if (isOwnProfile) {
        profileUser = currentUser
    } else {
        const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', profileUserId)
            .single()
        profileUser = data
    }
    
    if (!profileUser) {
        document.getElementById('profileContent').innerHTML = '<div class="card">Пользователь не найден</div>'
        return
    }
    
    const friends = profileUser.friends || []
    const isFriend = friends.includes(currentUser.id)
    const hasRequest = (profileUser.friend_requests || []).includes(currentUser.id)
    
    const avatarHtml = profileUser.avatar 
        ? `<img src="${profileUser.avatar}" class="profile-avatar-large" style="object-fit: cover;">`
        : `<div class="profile-avatar-large">${profileUser.full_name[0].toUpperCase()}</div>`
    
    const editButton = isOwnProfile ? 
        `<button class="edit-profile-btn" onclick="openEditProfile()">✏️ Редактировать профиль</button>` : ''
    
    const bioHtml = profileUser.bio ? `<p class="profile-bio">${escapeHtml(profileUser.bio)}</p>` : ''
    const cityHtml = profileUser.city ? `<p class="profile-city">📍 ${escapeHtml(profileUser.city)}</p>` : ''
    
    let friendButtonHtml = ''
    if (!isOwnProfile) {
        if (isFriend) {
            friendButtonHtml = '<button class="friend-button" onclick="removeFriend(\'' + profileUserId + '\')">Друзья ✓</button>'
        } else if (hasRequest) {
            friendButtonHtml = '<button class="friend-button requested">Запрос отправлен</button>'
        } else {
            friendButtonHtml = '<button class="friend-button" onclick="sendFriendRequest(\'' + profileUserId + '\')">Добавить в друзья</button>'
        }
    }
    
    document.getElementById('profileContent').innerHTML = `
        <div class="profile-header">
            ${avatarHtml}
            <h1 class="profile-name">${escapeHtml(profileUser.full_name)}</h1>
            ${bioHtml}
            ${cityHtml}
            <div class="profile-email">${profileUser.email}</div>
            ${editButton}
            ${friendButtonHtml}
            <div class="profile-stats">
                <div class="stat">
                    <div class="stat-number">${profileUser.posts_count || 0}</div>
                    <div class="stat-label">Постов</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${friends.length}</div>
                    <div class="stat-label">Друзей</div>
                </div>
            </div>
        </div>
    `
}

async function loadUserPosts() {
    const urlParams = new URLSearchParams(window.location.search)
    const profileUserId = urlParams.get('user') || currentUser.id
    
    const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', profileUserId)
        .order('created_at', { ascending: false })
    
    const container = document.getElementById('userPosts')
    if (container) {
        if (!posts || posts.length === 0) {
            container.innerHTML = '<h3>Посты</h3><div class="card" style="text-align: center;">Нет постов</div>'
            return
        }
        
        const userMap = { [profileUserId]: { full_name: currentUser.full_name, avatar: currentUser.avatar } }
        container.innerHTML = '<h3>Посты</h3>' + posts.map(post => renderPost(post, userMap)).join('')
        posts.forEach(post => attachPostHandlers(post.id))
    }
}

// ========== ДРУЗЬЯ ==========
async function sendFriendRequest(userId) {
    const { data: user } = await supabase
        .from('users')
        .select('friend_requests')
        .eq('id', userId)
        .single()
    
    const requests = user.friend_requests || []
    if (!requests.includes(currentUser.id)) {
        requests.push(currentUser.id)
        await supabase
            .from('users')
            .update({ friend_requests: requests })
            .eq('id', userId)
        
        await addNotification(userId, 'friend_request', currentUser.id)
        alert('Запрос отправлен!')
        loadProfile()
    }
}

async function removeFriend(userId) {
    // Удаляем из друзей у текущего пользователя
    const { data: currentUserData } = await supabase
        .from('users')
        .select('friends')
        .eq('id', currentUser.id)
        .single()
    
    const currentFriends = (currentUserData.friends || []).filter(id => id !== userId)
    await supabase
        .from('users')
        .update({ friends: currentFriends })
        .eq('id', currentUser.id)
    
    // Удаляем из друзей у другого пользователя
    const { data: otherUser } = await supabase
        .from('users')
        .select('friends')
        .eq('id', userId)
        .single()
    
    const otherFriends = (otherUser.friends || []).filter(id => id !== currentUser.id)
    await supabase
        .from('users')
        .update({ friends: otherFriends })
        .eq('id', userId)
    
    alert('Пользователь удален из друзей')
    loadProfile()
}

// ========== СООБЩЕНИЯ ==========
async function loadMessagesPage() {
    const container = document.getElementById('messagesContainer')
    if (!container) return
    
    // Получаем друзей
    const { data: friends } = await supabase
        .from('users')
        .select('friends')
        .eq('id', currentUser.id)
        .single()
    
    const friendIds = friends?.friends || []
    
    if (friendIds.length === 0) {
        container.innerHTML = `
            <div class="chats-list">
                <div class="chat-item" style="background: #eef2ff; font-weight: bold;">
                    <div>💬 Сообщения</div>
                </div>
                <div class="chat-item">Нет друзей. Добавьте кого-нибудь в друзья!</div>
            </div>
            <div class="messages-area">
                <div class="messages-header">Выберите чат</div>
                <div class="messages-list"></div>
            </div>
        `
        return
    }
    
    // Загружаем данные друзей
    const { data: friendsData } = await supabase
        .from('users')
        .select('id, full_name, avatar')
        .in('id', friendIds)
    
    const friendsList = friendsData.map(friend => `
        <div class="chat-item" data-user="${friend.id}" onclick="openChat('${friend.id}')">
            <div class="chat-avatar">${friend.full_name[0].toUpperCase()}</div>
            <div class="chat-info">
                <div class="chat-name">${escapeHtml(friend.full_name)}</div>
            </div>
        </div>
    `).join('')
    
    container.innerHTML = `
        <div class="chats-list">
            <div class="chat-item" style="background: #eef2ff; font-weight: bold;">
                <div>💬 Сообщения</div>
            </div>
            ${friendsList}
        </div>
        <div class="messages-area" id="messagesArea">
            <div class="messages-header">Выберите чат</div>
            <div class="messages-list" id="messagesList"></div>
            <div class="message-input-area" id="messageInputArea" style="display: none;">
                <input type="text" class="message-input" id="messageInput" placeholder="Напишите сообщение...">
                <button class="btn btn-primary" id="sendMessageBtn">Отправить</button>
            </div>
        </div>
    `
}

window.openChat = async function(userId) {
    currentChatUser = userId
    
    const { data: user } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .single()
    
    const messagesHeader = document.querySelector('.messages-header')
    const messageInputArea = document.getElementById('messageInputArea')
    const messagesList = document.getElementById('messagesList')
    
    if (messagesHeader) messagesHeader.textContent = `Чат с ${user.full_name}`
    if (messageInputArea) messageInputArea.style.display = 'flex'
    
    await loadMessages(userId)
    
    const sendBtn = document.getElementById('sendMessageBtn')
    const messageInput = document.getElementById('messageInput')
    
    if (sendBtn) {
        sendBtn.onclick = () => {
            const text = messageInput?.value.trim()
            if (text) {
                sendMessage(userId, text)
                if (messageInput) messageInput.value = ''
            }
        }
    }
    
    if (messageInput) {
        messageInput.onkeypress = (e) => {
            if (e.key === 'Enter' && sendBtn) sendBtn.click()
        }
    }
}

async function loadMessages(withUserId) {
    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(from_user.eq.${currentUser.id},to_user.eq.${withUserId}),and(from_user.eq.${withUserId},to_user.eq.${currentUser.id})`)
        .order('created_at', { ascending: true })
    
    if (error) {
        console.error('Ошибка загрузки сообщений:', error)
        return
    }
    
    const messagesList = document.getElementById('messagesList')
    if (!messagesList) return
    
    if (messages.length === 0) {
        messagesList.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b;">Нет сообщений. Напишите что-нибудь!</div>'
        return
    }
    
    messagesList.innerHTML = messages.map(msg => `
        <div class="message ${msg.from_user === currentUser.id ? 'sent' : 'received'}">
            <div class="message-bubble">
                ${escapeHtml(msg.text)}
                <div class="message-time">${formatTime(msg.created_at)}</div>
            </div>
        </div>
    `).join('')
    
    messagesList.scrollTop = messagesList.scrollHeight
}

async function sendMessage(toUserId, text) {
    const { error } = await supabase
        .from('messages')
        .insert({
            from_user: currentUser.id,
            to_user: toUserId,
            text: text
        })
    
    if (error) {
        console.error('Ошибка отправки сообщения:', error)
        return
    }
    
    await loadMessages(toUserId)
}

function subscribeToNewMessages() {
    supabase
        .channel('messages-channel')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            async (payload) => {
                const newMessage = payload.new
                if (newMessage.to_user === currentUser.id && currentChatUser === newMessage.from_user) {
                    await loadMessages(currentChatUser)
                }
            }
        )
        .subscribe()
}

// ========== УВЕДОМЛЕНИЯ ==========
async function addNotification(userId, type, fromUserId, postId = null) {
    const { data: user } = await supabase
        .from('users')
        .select('notifications')
        .eq('id', userId)
        .single()
    
    const notifications = user.notifications || []
    
    notifications.unshift({
        id: Date.now(),
        type: type,
        from: fromUserId,
        postId: postId,
        timestamp: new Date().toISOString(),
        read: false
    })
    
    if (notifications.length > 50) notifications.pop()
    
    await supabase
        .from('users')
        .update({ notifications: notifications })
        .eq('id', userId)
    
    if (userId === currentUser.id) {
        updateNotificationsUI()
    }
}

async function updateNotificationsUI() {
    const unreadCount = currentUser.notifications?.filter(n => !n.read).length || 0
    const countElement = document.getElementById('notificationsCount')
    if (countElement) {
        countElement.textContent = unreadCount
        countElement.style.display = unreadCount > 0 ? 'block' : 'none'
    }
    
    const listElement = document.getElementById('notificationsList')
    if (listElement) {
        if (!currentUser.notifications || currentUser.notifications.length === 0) {
            listElement.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b;">Нет уведомлений</div>'
            return
        }
        
        // Загружаем имена отправителей
        const fromIds = [...new Set(currentUser.notifications.map(n => n.from))]
        const { data: users } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', fromIds)
        
        const userMap = {}
        users?.forEach(u => userMap[u.id] = u)
        
        listElement.innerHTML = currentUser.notifications.map(notif => {
            const fromUser = userMap[notif.from]
            const userName = fromUser ? fromUser.full_name : 'Пользователь'
            const time = formatTime(notif.timestamp)
            
            let text = ''
            let icon = ''
            switch(notif.type) {
                case 'like':
                    text = `${userName} поставил(а) лайк вашему посту`
                    icon = '❤️'
                    break
                case 'comment':
                    text = `${userName} прокомментировал(а) ваш пост`
                    icon = '💬'
                    break
                case 'friend_request':
                    text = `${userName} отправил(а) запрос в друзья`
                    icon = '👥'
                    break
                default:
                    text = `${userName} взаимодействовал(а) с вами`
                    icon = '📢'
            }
            
            return `
                <div class="notification-item ${!notif.read ? 'unread' : ''}" data-id="${notif.id}">
                    <div class="notification-icon">${icon}</div>
                    <div class="notification-content">
                        <div class="notification-text">${escapeHtml(text)}</div>
                        <div class="notification-time">${time}</div>
                    </div>
                </div>
            `
        }).join('')
        
        listElement.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id)
                markNotificationAsRead(id)
            })
        })
    }
}

async function markNotificationAsRead(notificationId) {
    const notifications = currentUser.notifications.map(n => {
        if (n.id === notificationId) n.read = true
        return n
    })
    
    await supabase
        .from('users')
        .update({ notifications: notifications })
        .eq('id', currentUser.id)
    
    currentUser.notifications = notifications
    updateNotificationsUI()
}

// ========== РЕДАКТИРОВАНИЕ ПРОФИЛЯ ==========
let tempAvatar = null

function setupEditProfile() {
    const editForm = document.getElementById('editProfileForm')
    if (editForm) {
        editForm.addEventListener('submit', saveProfileChanges)
    }
    
    const avatarInput = document.getElementById('avatarInput')
    if (avatarInput) {
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0]
            if (file) {
                const reader = new FileReader()
                reader.onload = function(event) {
                    tempAvatar = event.target.result
                    const preview = document.getElementById('editAvatarPreview')
                    if (preview) preview.src = tempAvatar
                }
                reader.readAsDataURL(file)
            }
        })
    }
}

window.openEditProfile = function() {
    const fullNameInput = document.getElementById('editFullName')
    const bioInput = document.getElementById('editBio')
    const cityInput = document.getElementById('editCity')
    const avatarPreview = document.getElementById('editAvatarPreview')
    
    if (fullNameInput) fullNameInput.value = currentUser.full_name || ''
    if (bioInput) bioInput.value = currentUser.bio || ''
    if (cityInput) cityInput.value = currentUser.city || ''
    
    if (avatarPreview) {
        if (currentUser.avatar) {
            avatarPreview.src = currentUser.avatar
        } else {
            avatarPreview.src = 'https://via.placeholder.com/100'
        }
    }
    
    const modal = document.getElementById('editProfileModal')
    if (modal) modal.style.display = 'flex'
}

window.closeEditProfile = function() {
    const modal = document.getElementById('editProfileModal')
    if (modal) modal.style.display = 'none'
    tempAvatar = null
}

async function saveProfileChanges(e) {
    e.preventDefault()
    
    const fullNameInput = document.getElementById('editFullName')
    const bioInput = document.getElementById('editBio')
    const cityInput = document.getElementById('editCity')
    
    const updates = {
        full_name: fullNameInput.value,
        bio: bioInput.value,
        city: cityInput.value
    }
    
    if (tempAvatar) {
        updates.avatar = tempAvatar
    }
    
    const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', currentUser.id)
    
    if (error) {
        console.error('Ошибка сохранения:', error)
        alert('Ошибка при сохранении')
        return
    }
    
    // Обновляем текущего пользователя
    Object.assign(currentUser, updates)
    if (tempAvatar) currentUser.avatar = tempAvatar
    localStorage.setItem('currentUser', JSON.stringify(currentUser))
    
    closeEditProfile()
    loadProfile()
}

// ========== РЕАКЦИИ ==========
window.showReactionPicker = function(event, postId) {
    const reactions = ['👍', '❤️', '😂', '😮', '😢', '😡']
    const picker = document.createElement('div')
    picker.className = 'reactions-picker'
    picker.innerHTML = reactions.map(emoji => 
        `<span class="reaction-emoji" data-emoji="${emoji}">${emoji}</span>`
    ).join('')
    
    const rect = event.target.getBoundingClientRect()
    picker.style.position = 'absolute'
    picker.style.top = (rect.top - 50) + 'px'
    picker.style.left = rect.left + 'px'
    picker.style.background = 'white'
    picker.style.borderRadius = '30px'
    picker.style.padding = '8px'
    picker.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
    picker.style.display = 'flex'
    picker.style.gap = '8px'
    picker.style.zIndex = '1000'
    
    document.body.appendChild(picker)
    
    picker.querySelectorAll('.reaction-emoji').forEach(emojiEl => {
        emojiEl.onclick = async () => {
            await addReaction(postId, emojiEl.dataset.emoji)
            picker.remove()
        }
    })
    
    setTimeout(() => {
        if (document.body.contains(picker)) picker.remove()
    }, 5000)
}

async function addReaction(postId, emoji) {
    const { data: post } = await supabase
        .from('posts')
        .select('reactions')
        .eq('id', postId)
        .single()
    
    let reactions = post.reactions || {}
    
    // Удаляем предыдущую реакцию пользователя
    for (let e in reactions) {
        reactions[e] = reactions[e].filter(id => id !== currentUser.id)
    }
    
    // Добавляем новую реакцию
    if (!reactions[emoji]) reactions[emoji] = []
    reactions[emoji].push(currentUser.id)
    
    await supabase
        .from('posts')
        .update({ reactions: reactions })
        .eq('id', postId)
    
    loadFeed()
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function formatTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'только что'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} дн назад`
    return date.toLocaleDateString()
}

function escapeHtml(text) {
    if (!text) return ''
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

window.openImageModal = function(imageSrc) {
    const modal = document.createElement('div')
    modal.className = 'modal'
    modal.style.display = 'flex'
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 90%; padding: 0; background: transparent;">
            <span class="modal-close" style="position: absolute; top: 10px; right: 20px; color: white; font-size: 30px; cursor: pointer;">&times;</span>
            <img src="${imageSrc}" style="max-width: 100%; max-height: 80vh; border-radius: 12px;">
        </div>
    `
    document.body.appendChild(modal)
    
    modal.querySelector('.modal-close').onclick = () => modal.remove()
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove()
    }
}