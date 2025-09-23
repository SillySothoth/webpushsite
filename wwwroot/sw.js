// Простой Service Worker для обработки push-уведомлений
self.addEventListener('push', function (event) {
    console.log('Push event received:', event);

    let title = 'Уведомление';
    let body = 'Новое сообщение';
    let icon = '/icon.png';

    try {
        if (event.data) {
            try {
                const data = event.data.json();
                title = data.title || title;
                body = data.body || body;
                icon = data.icon || icon;
            } catch (jsonError) {
                // Если не JSON, читаем как текст
                console.log('Данные не в JSON формате, читаем как текст');
                const textData = event.data.text();
                title = 'WebPush Уведомление';
                body = textData || 'Новое уведомление';
            }
        }
    } catch (error) {
        console.error('Ошибка обработки push данных:', error);
        title = 'Уведомление';
        body = 'Получено новое уведомление';
    }

    // Уникальный tag для каждого уведомления (используем timestamp)
    const uniqueTag = 'webpush-' + Date.now();

    const options = {
        body: body,
        icon: icon,
        badge: '/badge.png',
        vibrate: [200, 100, 200],
        tag: uniqueTag, // Уникальный идентификатор для каждого уведомления
        requireInteraction: false // Разрешаем автоматическое скрытие
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', function (event) {
    console.log('Notification click received');
    event.notification.close();

    event.waitUntil(
        clients.openWindow('/')
    );
});

// Обработка закрытия уведомления
self.addEventListener('notificationclose', function (event) {
    console.log('Notification closed:', event.notification.tag);
});