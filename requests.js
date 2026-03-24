// Подписка на изменения заявок
const channel = supabase
    .channel('friend-requests')
    .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'users' },
        (payload) => {
            if (payload.new.id === currentUser.id) {
                console.log('🔄 Заявки обновлены!');
                loadRequests(); // перезагружаем список
            }
        }
    )
    .subscribe();