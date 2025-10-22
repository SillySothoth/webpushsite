// Простой Service Worker для обработки push-уведомлений
self.addEventListener('push', async function (event) {
    if (!event.data) return;

    const data = event.data.json();

    console.log(data.data);

    // Обработка зашифрованных параметров
    const decryptedData = await processEncryptedParameters(data);

    const options = {
        body: decryptedData.body || data.body || 'Тестовое уведомление',
        icon: '/icon.png',
        badge: '/badge.png',
        vibrate: [200, 100, 200],
        data: {
            url: decryptedData.url || data.url || '/'
        }
    };

    //event.waitUntil(
    //    self.registration.showNotification(decryptedData.title || data.title || 'WebPush Test', options)
    //);
});

// Функция для обработки зашифрованных параметров
async function processEncryptedParameters(data) {
    const result = { ...data };

    try {
        // Получаем ключ шифрования из клиента
        const clients = await self.clients.matchAll();
        if (clients.length === 0) return result;

        const client = clients[0];

        // Ищем параметры с префиксом enc_
        for (const key in data) {
            if (key.startsWith('enc_')) {
                const originalKey = key.substring(4); // Убираем префикс enc_

                // Предполагаем, что зашифрованные данные содержат данные и IV в формате base64
                const encryptedData = data[key];

                // Отправляем запрос на расшифровку клиенту
                const response = await client.postMessage({
                    type: 'DECRYPT_DATA',
                    encryptedData: encryptedData.data,
                    iv: encryptedData.iv
                });

                if (response && response.decrypted) {
                    result[originalKey] = response.decrypted;
                }
            }
        }
    } catch (error) {
        console.error('Ошибка обработки зашифрованных параметров:', error);
    }

    return result;
}

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});

self.addEventListener('pushsubscriptionchange', function (event) {
    console.log('Подписка изменена:', event);
});

// Обработка сообщений от клиента
self.addEventListener('message', async function (event) {
    if (event.data && event.data.type === 'DECRYPT_DATA') {
        try {
            // Здесь должна быть реализация расшифровки в клиенте
            // Для простоты возвращаем фиктивные данные
            const decrypted = await decryptInClient(event.data.encryptedData, event.data.iv);
            event.ports[0].postMessage({ decrypted });
        } catch (error) {
            console.error('Ошибка расшифровки:', error);
            event.ports[0].postMessage({ error: error.message });
        }
    }
});

// Функция-заглушка для расшифровки в клиенте
async function decryptInClient(encryptedData, iv) {
    // Реальная реализация должна быть в основном потоке
    // Это просто заглушка
    return "Расшифрованные данные";
}