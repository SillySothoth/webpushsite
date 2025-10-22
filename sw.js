// Простой Service Worker для обработки push-уведомлений
self.addEventListener('push', function (event) {
    event.waitUntil(
        (async function () {
            try {
                if (!event.data) return;

                const data = event.data.json();
                const dataObj = JSON.parse(data.data);
                console.log(dataObj);

                // Обработка зашифрованных параметров
                const decryptedData = await processEncryptedParameters(data);

                const options = {
                    body: decryptedData.body || data.body || 'Тестовое уведомление',
                    icon: '/icon.png',
                    badge: '/badge.png',
                    vibrate: [200, 100, 200],
                    data: {
                        url: dataObj.url
                    }
                };

                await sendToClient(dataObj);

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

    console.log(event);

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