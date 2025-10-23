class EncryptionService {
    constructor() {
        this.encryptionKey = null;
    }

    // ��������� ����� ����������
    async generateEncryptionKey() {
        try {
            const keyPair = await window.crypto.subtle.generateKey(
                {
                    name: "RSA-OAEP",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-1"
                },
                true,
                ["encrypt", "decrypt"]
            );


            // ������������ ��������� ����
            const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
            const privateKeyBase64 = arrayBufferToBase64(privateKey);

            // ������������ ��������� ����
            const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
            const publicKeyBase64 = arrayBufferToBase64(publicKey);

            // ��������� �����
            this.encryptionKey = keyPair.privateKey;
            localStorage.setItem('webpush_private_key', privateKeyBase64);
            localStorage.setItem('webpush_public_key', publicKeyBase64);

            console.log('RSA key pair generated');
            var keys = new Object;
            keys.public = publicKeyBase64;
            keys.private = privateKeyBase64;
            return keys;

        } catch (error) {
            console.error('������ ��������� �����:', error);
            throw error;
        }
    }

    // �������� ����� �� localStorage
    async loadEncryptionKey() {
        try {
            const privateKeyBase64 = localStorage.getItem('webpush_private_key');
            if (!privateKeyBase64) return null;

            const privateKeyBuffer = base64ToArrayBuffer(privateKeyBase64);
            const privateKey = await crypto.subtle.importKey(
                "pkcs8",
                privateKeyBuffer,
                {
                    name: "RSA-OAEP",
                    hash: { name: "SHA-1" }
                },
                true,
                ["decrypt"]
            );

            this.encryptionKey = privateKey;
            console.log('Private key loaded from localStorage');
            return privateKeyBase64;

        } catch (error) {
            console.error('������ �������� ���������� �����:', error);
            return null;
        }
    }

    // ����������� ������
    async decryptData(encryptedDataBase64, ivBase64) {
        if (!this.encryptionKey) {
            throw new Error('���� ���������� �� ������');
        }

        try {
            const encryptedData = base64ToArrayBuffer(encryptedDataBase64);
            const iv = base64ToArrayBuffer(ivBase64);

            const decrypted = await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                this.encryptionKey,
                encryptedData
            );

            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('������ �����������:', error);
            throw error;
        }
    }

    // ���������� ����� � Service Worker
    async saveEncryptionKeyToSW(keyBase64, registration) {
        return new Promise((resolve, reject) => {
            if (!registration.active) {
                reject(new Error('Service Worker �� �������'));
                return;
            }

            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = (event) => {
                if (event.data.success) {
                    resolve();
                } else {
                    reject(new Error('�� ������� ��������� ���� � SW'));
                }
            };

            registration.active.postMessage({
                type: 'SAVE_ENCRYPTION_KEY',
                key: keyBase64
            }, [messageChannel.port2]);
        });
    }
}

// ������� ���������� ���������
const encryptionService = new EncryptionService();