// push.js - управление push-уведомлениями

const VAPID_PUBLIC_KEY = 'BDSqWNkHgrFhXSSMWJLcGHl_8cBlB_oPbno4x4msw0sYNZh_JypYgn9SEuV9mRUPARWQQR5JocovJ-tgBlctdb0';

// Запрос разрешения на уведомления
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Браузер не поддерживает уведомления');
        return false;
    }
    
    const permission = await Notification.requestPermission();
    console.log('Разрешение на уведомления:', permission);
    return permission === 'granted';
}

// Подписка на push
async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push не поддерживается');
        return;
    }
    
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
        console.log('Уже подписан');
        return subscription;
    }
    
    try {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        
        console.log('Подписка создана!');
        await saveSubscription(subscription);
        return subscription;
    } catch (err) {
        console.error('Ошибка подписки:', err);
    }
}

// Сохранение подписки в Supabase
async function saveSubscription(subscription) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    const supabase = window.supabase.createClient(
        'https://wydmaatvxutxgvxjknhm.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZG1hYXR2eHV0eGd2eGprbmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTU1MjAsImV4cCI6MjA4OTY3MTUyMH0.ZhybOVp98GTHDZxjDXJF4IruDoip0Npf8AKcsimNeC4'
    );
    
    const { error } = await supabase
        .from('users')
        .update({ push_subscription: subscription })
        .eq('id', user.id);
    
    if (error) {
        console.error('Ошибка сохранения подписки:', error);
    } else {
        console.log('Подписка сохранена в Supabase');
    }
}

// Преобразование ключа
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Проверка поддержки
function isPushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window;
}

// Инициализация push
async function initPush() {
    if (!isPushSupported()) {
        console.log('Push-уведомления не поддерживаются в этом браузере');
        return;
    }
    
    const hasPermission = await requestNotificationPermission();
    if (hasPermission) {
        await subscribeToPush();
    }
}

// Запускаем после загрузки страницы
document.addEventListener('DOMContentLoaded', function() {
    // Запускаем только на главной странице
    if (window.location.pathname.includes('index.html')) {
        setTimeout(initPush, 2000);
    }
});