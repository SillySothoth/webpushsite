// Простой Service Worker для обработки push-уведомлений
self.addEventListener('push', function (event) {
    event.waitUntil(
        (async function () {
            try {
                if (!event.data) return;

                const data = event.data.json();
                const dataObj = JSON.parse(data.data);
                console.log('Push data received:', dataObj);

                // ДЕШИФРУЕМ параметры перед сохранением
                const decryptedData = await processEncryptedParameters(dataObj);
                console.log('Decrypted push data:', decryptedData);

                // Сохраняем УЖЕ РАСШИФРОВАННЫЕ данные
                const pushData = {
                    ...decryptedData, // используем расшифрованные данные
                    timestamp: Date.now()
                };

                // Сохраняем в хранилище SW
                await savePushData(pushData);

                const options = {
                    body: decryptedData.body || data.body || 'Тестовое уведомление',
                    icon: '/icon.png',
                    badge: '/badge.png',
                    vibrate: [200, 100, 200],
                    data: {
                        url: decryptedData.Url,
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
        // Получаем ключ из кеша SW вместо запроса к клиенту
        const encryptionKey = await getEncryptionKeyFromSW();
        if (!encryptionKey) {
            console.log('Encryption key not found in SW');
            return result;
        }

        console.log('Starting decryption of parameters...');

        // Дешифруем данные прямо в SW
        for (const key in data) {
            if (key.startsWith('enc_')) {
                const originalKey = key.substring(4);
                const encryptedData = data[key];

                console.log(`Decrypting ${key} to ${originalKey}`, encryptedData);

                try {
                    // Проверяем что есть данные для дешифровки
                    if (encryptedData && encryptedData.data && encryptedData.iv) {
                        const decrypted = await decryptInSW(encryptedData.data, encryptedData.iv, encryptionKey);
                        result[originalKey] = decrypted;
                        console.log(`Successfully decrypted ${key}: ${decrypted}`);

                        // Удаляем зашифрованную версию из результата
                        delete result[key];
                    } else {
                        console.warn(`Invalid encrypted data structure for ${key}`, encryptedData);
                    }
                } catch (decryptError) {
                    console.error(`Decryption failed for ${key}:`, decryptError);
                    // Оставляем исходные зашифрованные данные в случае ошибки
                }
            }
        }
        console.log('Decryption completed. Final data:', result);
    } catch (error) {
        console.error('Ошибка обработки зашифрованных параметров:', error);
    }

    return result;
}

// Новая функция дешифровки в SW
async function decryptInSW(encryptedDataBase64, ivBase64, encryptionKeyBase64) {
    try {
        console.log('Decrypting data with key length:', encryptionKeyBase64.length);

        // Конвертируем base64 ключ в CryptoKey
        const keyBuffer = base64ToArrayBuffer(encryptionKeyBase64);
        const key = await crypto.subtle.importKey(
            "raw",
            keyBuffer,
            {
                name: "AES-GCM",
                length: 256
            },
            true,
            ["decrypt"]
        );

        // Дешифруем данные
        const encryptedData = base64ToArrayBuffer(encryptedDataBase64);
        const iv = base64ToArrayBuffer(ivBase64);

        const decrypted = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            encryptedData
        );

        const result = new TextDecoder().decode(decrypted);
        console.log('Decryption successful, result:', result);
        return result;
    } catch (error) {
        console.error('Error decrypting in SW:', error);
        throw new Error(`Decryption failed: ${error.message}`);
    }
}

// Вспомогательная функция для SW
function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
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

// Запускаем очистку при активации SW
self.addEventListener('activate', function (event) {
    event.waitUntil(cleanupOldPushData());
});

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
    if (event.data && event.data.type === 'SAVE_ENCRYPTION_KEY') {
        // Сохраняем ключ от клиента в SW
        await saveEncryptionKeyToSW(event.data.key);
        event.ports[0].postMessage({ success: true });
    }
    else if (event.data && event.data.type === 'GET_PUSH_DATA') {
        try {
            const pushData = await getPushData(event.data.pushId);
            event.ports[0].postMessage(pushData);
        } catch (error) {
            console.error('Error getting push data:', error);
            event.ports[0].postMessage(null);
        }
    }
});

// Сохраняем ключ шифрования в кеше SW
async function saveEncryptionKeyToSW(keyBase64) {
    try {
        const cache = await caches.open('encryption-keys');
        const response = new Response(JSON.stringify({
            key: keyBase64,
            timestamp: Date.now()
        }));
        await cache.put('encryption-key', response);
        console.log('Encryption key saved to SW cache, length:', keyBase64.length);
    } catch (error) {
        console.error('Error saving encryption key to SW:', error);
        return false;
    }
}

// Получаем ключ шифрования из кеша SW
async function getEncryptionKeyFromSW() {
    try {
        const cache = await caches.open('encryption-keys');
        const response = await cache.match('encryption-key');
        if (response) {
            const data = await response.json();
            console.log('Encryption key loaded from SW cache, length:', data.key.length);
            return data.key;
        } else {
            console.log('No encryption key found in SW cache');
            return null;
        }
    } catch (error) {
        console.error('Error getting encryption key from SW:', error);
        return null;
    }
    return null;
}