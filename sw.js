// Простой Service Worker для обработки push-уведомлений
self.addEventListener('push', function (event) {
    event.waitUntil(
        (async function () {
            try {
                if (!event.data) return;

                const data = event.data.json();
                const dataObj = JSON.parse(data.data);
                console.log('Push data received:', dataObj);

                const pushData = {
                    ...dataObj,
                    timestamp: Date.now()
                };

                // Сохраняем в хранилище SW
                await savePushData(pushData);

                // Обработка зашифрованных параметров
                const decryptedData = await processEncryptedParameters(data);

                const options = {
                    body: decryptedData.body || data.body || 'Тестовое уведомление',
                    icon: '/icon.png',
                    badge: '/badge.png',
                    vibrate: [200, 100, 200],
                    data: {
                        url: dataObj.Url,
                        pushId: pushData.timestamp // Используем timestamp как ID
                    }
                };

                //await sendToClient(dataObj);

                await self.registration.showNotification(
                    decryptedData.title || data.title || 'WebPush Test',
                    options
                );

            } catch (error) {
                console.error('Error in push event:', error);
            }
        })()
    );
});

// Сохраняем данные пуша
async function savePushData(pushData) {
    try {
        const cache = await caches.open('push-data');
        const response = new Response(JSON.stringify(pushData));
        await cache.put(`push-${pushData.timestamp}`, response);
    } catch (error) {
        console.error('Error saving push data:', error);
    }
}

// Получаем данные пуша
async function getPushData(pushId) {
    try {
        const cache = await caches.open('push-data');
        const response = await cache.match(`push-${pushId}`);
        if (response) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error getting push data:', error);
    }
    return null;
}

// Функция для обработки зашифрованных параметров
async function processEncryptedParameters(data) {
    const result = { ...data };

    try {
        const clients = await self.clients.matchAll();
        if (clients.length === 0) return result;

        for (const key in data) {
            if (key.startsWith('enc_')) {
                const originalKey = key.substring(4);
                const encryptedData = data[key];

                const channel = new MessageChannel();
                const responsePromise = new Promise((resolve) => {
                    channel.port1.onmessage = (event) => {
                        resolve(event.data);
                    };
                });

                clients[0].postMessage({
                    type: 'DECRYPT_DATA',
                    encryptedData: encryptedData.data,
                    iv: encryptedData.iv
                }, [channel.port2]);

                const response = await responsePromise;
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

    const pushId = event.notification.data.pushId;
    const url = event.notification.data.url || '/';

    // Добавляем параметр с ID пуша в URL
    const urlWithParams = new URL(url, self.location.origin);
    urlWithParams.searchParams.set('pushId', pushId);

    event.waitUntil(
        clients.openWindow(urlWithParams.toString())
    );
});

// Очистка старых данных пуша
async function cleanupOldPushData() {
    try {
        const cache = await caches.open('push-data');
        const keys = await cache.keys();
        const now = Date.now();
        const dayInMs = 24 * 60 * 60 * 1000;

        for (const request of keys) {
            if (request.url.includes('push-')) {
                const pushId = request.url.split('push-')[1];
                if (now - parseInt(pushId) > dayInMs) {
                    await cache.delete(request);
                }
            }
        }
    } catch (error) {
        console.error('Error cleaning up push data:', error);
    }
}

self.addEventListener('pushsubscriptionchange', function (event) {
    console.log('Подписка изменена:', event);
});

// Обработка сообщений от клиента
self.addEventListener('message', async function (event) {
    if (event.data && event.data.type === 'DECRYPT_DATA') {
        try {
            const decrypted = await decryptInClient(event.data.encryptedData, event.data.iv);
            event.ports[0].postMessage({ decrypted });
        } catch (error) {
            console.error('Ошибка расшифровки:', error);
            event.ports[0].postMessage({ error: error.message });
        }
    }
});

// Запускаем очистку при активации SW
self.addEventListener('activate', function (event) {
    event.waitUntil(cleanupOldPushData());
});

// Функция-заглушка для расшифровки в клиенте
async function decryptInClient(encryptedData, iv) {
    // Реальная реализация должна быть в основном потоке
    return "Расшифрованные данные";
}

function sendToClient(data) {
    return self.clients.matchAll().then(clients => {
        const promises = clients.map(client =>
            client.postMessage({
                type: 'PUSH_DATA',
                data: data
            })
        );
        return Promise.all(promises);
    });
}

self.addEventListener('message', async function (event) {
    if (event.data && event.data.type === 'GET_PUSH_DATA') {
        try {
            const pushData = await getPushData(event.data.pushId);
            event.ports[0].postMessage(pushData);
        } catch (error) {
            console.error('Error getting push data:', error);
            event.ports[0].postMessage(null);
        }
    }
});