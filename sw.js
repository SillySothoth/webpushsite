// Ïðîñòîé Service Worker äëÿ îáðàáîòêè push-óâåäîìëåíèé
self.addEventListener('push', async function (event) {
    if (!event.data) return;

    const data = event.data.text();
    alert(data);

    console.log('=== WEB PUSH RECEIVED ===');
    console.log('Ïîëó÷åííûå äàííûå:', data);

    // Âûâîäèì âñå ïàðàìåòðû ñ íàçâàíèÿìè è çíà÷åíèÿìè
    console.log('--- Âñå ïàðàìåòðû push-óâåäîìëåíèÿ ---');
    for (const [key, value] of Object.entries(data)) {
        console.log(`Ïàðàìåòð: ${key} =`, value);
    }

    // Îáðàáîòêà çàøèôðîâàííûõ ïàðàìåòðîâ
    const decryptedData = await processEncryptedParameters(data);

    const options = {
        body: decryptedData.body || data.body || 'Òåñòîâîå óâåäîìëåíèå',
        icon: '/icon.png',
        badge: '/badge.png',
        vibrate: [200, 100, 200],
        data: {
            url: decryptedData.url || data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(decryptedData.title || data.title || 'WebPush Test', options)
    );
});

// Ôóíêöèÿ äëÿ îáðàáîòêè çàøèôðîâàííûõ ïàðàìåòðîâ
async function processEncryptedParameters(data) {
    const result = { ...data };

    try {
        // Ïîëó÷àåì êëþ÷ øèôðîâàíèÿ èç êëèåíòà
        const clients = await self.clients.matchAll();
        if (clients.length === 0) return result;

        const client = clients[0];

        // Èùåì ïàðàìåòðû ñ ïðåôèêñîì enc_
        for (const key in data) {
            if (key.startsWith('enc_')) {
                const originalKey = key.substring(4); // Óáèðàåì ïðåôèêñ enc_

                // Ïðåäïîëàãàåì, ÷òî çàøèôðîâàííûå äàííûå ñîäåðæàò äàííûå è IV â ôîðìàòå base64
                const encryptedData = data[key];

                // Îòïðàâëÿåì çàïðîñ íà ðàñøèôðîâêó êëèåíòó
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
        console.error('Îøèáêà îáðàáîòêè çàøèôðîâàííûõ ïàðàìåòðîâ:', error);
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
    console.log('Ïîäïèñêà èçìåíåíà:', event);
});

// Îáðàáîòêà ñîîáùåíèé îò êëèåíòà
self.addEventListener('message', async function (event) {
    if (event.data && event.data.type === 'DECRYPT_DATA') {
        try {
            // Çäåñü äîëæíà áûòü ðåàëèçàöèÿ ðàñøèôðîâêè â êëèåíòå
            // Äëÿ ïðîñòîòû âîçâðàùàåì ôèêòèâíûå äàííûå
            const decrypted = await decryptInClient(event.data.encryptedData, event.data.iv);
            event.ports[0].postMessage({ decrypted });
        } catch (error) {
            console.error('Îøèáêà ðàñøèôðîâêè:', error);
            event.ports[0].postMessage({ error: error.message });
        }
    }
});

// Ôóíêöèÿ-çàãëóøêà äëÿ ðàñøèôðîâêè â êëèåíòå
async function decryptInClient(encryptedData, iv) {
    // Ðåàëüíàÿ ðåàëèçàöèÿ äîëæíà áûòü â îñíîâíîì ïîòîêå
    // Ýòî ïðîñòî çàãëóøêà
    return "Ðàñøèôðîâàííûå äàííûå";
}
