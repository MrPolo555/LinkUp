var supabase = window.supabase.createClient(
    'https://wydmaatvxutxgvxjknhm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZG1hYXR2eHV0eGd2eGprbmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTU1MjAsImV4cCI6MjA4OTY3MTUyMH0.ZhybOVp98GTHDZxjDXJF4IruDoip0Npf8AKcsimNeC4'
);

function getUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
}

document.addEventListener('DOMContentLoaded', function() {
    var user = getUser();
    if (!user) window.location.href = 'login.html';
    
    loadGroups();
    
    document.getElementById('createGroupBtn').onclick = function() {
        document.getElementById('createGroupModal').style.display = 'flex';
    };
    
    document.getElementById('cancelGroupBtn').onclick = function() {
        document.getElementById('createGroupModal').style.display = 'none';
    };
    
    document.getElementById('saveGroupBtn').onclick = async function() {
        var name = document.getElementById('groupName').value.trim();
        var desc = document.getElementById('groupDesc').value.trim();
        
        if (!name) {
            alert('Введите название группы');
            return;
        }
        
        var { data: group, error } = await supabase
            .from('groups')
            .insert({
                name: name,
                description: desc,
                created_by: getUser().id
            })
            .select()
            .single();
        
        if (error) {
            alert('Ошибка: ' + error.message);
            return;
        }
        
        await supabase
            .from('group_members')
            .insert({
                group_id: group.id,
                user_id: getUser().id,
                role: 'admin'
            });
        
        document.getElementById('createGroupModal').style.display = 'none';
        document.getElementById('groupName').value = '';
        document.getElementById('groupDesc').value = '';
        loadGroups();
        alert('✅ Группа "' + name + '" создана!');
    };
});

async function loadGroups() {
    var user = getUser();
    
    // Группы, где пользователь состоит
    var { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);
    
    var groupIds = memberships?.map(m => m.group_id) || [];
    
    var container = document.getElementById('groupsList');
    
    if (groupIds.length === 0) {
        container.innerHTML = '<div class="card" style="text-align: center;">Вы не состоите в группах. Создайте свою!</div>';
        return;
    }
    
    var { data: groups } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .order('created_at', { ascending: false });
    
    var html = '<div class="groups-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">';
    
    for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        
        html += `
            <div class="card group-card" onclick="location.href='group.html?id=${g.id}'" style="cursor: pointer; transition: all 0.2s;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                    <div style="width: 50px; height: 50px; background: #1e40af; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">👥</div>
                    <div>
                        <h3 style="margin: 0;">${escapeHtml(g.name)}</h3>
                        <div style="font-size: 11px; color: #64748b;">📅 ${new Date(g.created_at).toLocaleDateString()}</div>
                    </div>
                </div>
                <p style="color: #475569; margin: 0;">${escapeHtml(g.description || 'Нет описания')}</p>
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
}

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}