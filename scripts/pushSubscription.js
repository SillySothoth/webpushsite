class PushSubscriptionManager {
    constructor() {
        this.encryptionService = encryptionService;
    }

    // Функция подписки
    async subscribe() {
        const publicKey = document.getElementById('publicKey').value.trim();
        const btn = document.getElementById('subscribeBtn');
        //const status = document.getElementById('status');

        if (!publicKey) {
            uiManager.showStatus('Введите VAPID публичный ключ', 'error');
            return;
        }

        // Проверка поддержки браузером
        if (!this.checkBrowserSupport()) {
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Подписываем...';

        try {
            // Регистрируем Service Worker
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('Service Worker зарегистрирован');

            // Запрашиваем разрешение
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                uiManager.showStatus('Разрешение на уведомления не получено', 'error');
                return;
            }

            // Ждем пока SW активируется
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Генерируем ключ шифрования
            const keys = await this.encryptionService.generateEncryptionKey();
            const encryptionKeyBase64 = keys.public;// await this.encryptionService.generateEncryptionKey();
            console.log('Ключ шифрования сгенерирован:', encryptionKeyBase64);

            // Сохраняем ключ в Service Worker
            await this.encryptionService.saveEncryptionKeyToSW(keys.private, registration);
            console.log('Ключ шифрования сохранен');

            // Создаем подписку
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });

            // Показываем успех и данные подписки
            uiManager.showStatus('✅ Подписка успешно создана!', 'success');
            uiManager.showSubscriptionData(subscription, encryptionKeyBase64);

        } catch (error) {
            console.error('Ошибка:', error);

            let errorMessage = 'Ошибка: ' + error.message;
            if (error.message.includes('applicationServerKey is not valid')) {
                errorMessage = 'Неверный VAPID публичный ключ. Проверьте формат ключа.';
            } else if (error.message.includes('subscription failed')) {
                errorMessage = 'Ошибка подписки. Проверьте VAPID ключ и поддержку браузером.';
            }

            uiManager.showStatus('Ошибка: ' + errorMessage, 'error');
        } finally {
            this.resetButton(btn);
        }
    }

    // Проверка поддержки браузером
    checkBrowserSupport() {
        if (!('serviceWorker' in navigator)) {
            uiManager.showStatus('Браузер не поддерживает Service Worker', 'error');
            return false;
        }

        if (!('PushManager' in window)) {
            uiManager.showStatus('Браузер не поддерживает Push уведомления', 'error');
            return false;
        }

        return true;
    }

    // Сброс кнопки к начальному состоянию
    resetButton(btn) {
        btn.disabled = false;
        btn.textContent = 'Подписаться на уведомления';
    }

    // Получение данных подписки для отображения
    getSubscriptionData(subscription) {
        let p256dhKey = 'Не доступен';
        let authKey = 'Не доступен';

        if (subscription.getKey) {
            const p256dhBuffer = subscription.getKey('p256dh');
            const authBuffer = subscription.getKey('auth');

            if (p256dhBuffer) p256dhKey = arrayBufferToBase64(p256dhBuffer);
            if (authBuffer) authKey = arrayBufferToBase64(authBuffer);
        }

        return {
            endpoint: subscription.endpoint,
            p256dh: p256dhKey,
            auth: authKey
        };
    }
}

const pushSubscriptionManager = new PushSubscriptionManager();