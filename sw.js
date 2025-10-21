// ������� Service Worker ��� ��������� push-�����������
self.addEventListener('push', async function (event) {
    if (!event.data) return;

    const data = event.data.json();

    // ��������� ������������� ����������
    const decryptedData = await processEncryptedParameters(data);

    const options = {
        body: decryptedData.body || data.body || '�������� �����������',
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

// ������� ��� ��������� ������������� ����������
async function processEncryptedParameters(data) {
    const result = { ...data };

    try {
        // �������� ���� ���������� �� �������
        const clients = await self.clients.matchAll();
        if (clients.length === 0) return result;

        const client = clients[0];

        // ���� ��������� � ��������� enc_
        for (const key in data) {
            if (key.startsWith('enc_')) {
                const originalKey = key.substring(4); // ������� ������� enc_

                // ������������, ��� ������������� ������ �������� ������ � IV � ������� base64
                const encryptedData = data[key];

                // ���������� ������ �� ����������� �������
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
        console.error('������ ��������� ������������� ����������:', error);
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
    console.log('�������� ��������:', event);
});

// ��������� ��������� �� �������
self.addEventListener('message', async function (event) {
    if (event.data && event.data.type === 'DECRYPT_DATA') {
        try {
            // ����� ������ ���� ���������� ����������� � �������
            // ��� �������� ���������� ��������� ������
            const decrypted = await decryptInClient(event.data.encryptedData, event.data.iv);
            event.ports[0].postMessage({ decrypted });
        } catch (error) {
            console.error('������ �����������:', error);
            event.ports[0].postMessage({ error: error.message });
        }
    }
});

// �������-�������� ��� ����������� � �������
async function decryptInClient(encryptedData, iv) {
    // �������� ���������� ������ ���� � �������� ������
    // ��� ������ ��������
    return "�������������� ������";
}