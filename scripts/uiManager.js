class UIManager {
    constructor() {
        this.pushSubscriptionManager = pushSubscriptionManager;
    }

    // Отображение статуса
    showStatus(message, type) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = type;
        status.style.display = 'block';

        // Автоскрытие успешных сообщений
        if (type === 'success') {
            setTimeout(() => {
                status.style.display = 'none';
            }, 5000);
        }
    }

    // Отображение данных подписки
    showSubscriptionData(subscription, publicKeyBase64) {
        const dataContainer = document.getElementById('subscriptionData');

        try {
            const subData = this.pushSubscriptionManager.getSubscriptionData(subscription);

            document.getElementById('endpoint').textContent = subData.endpoint;
            document.getElementById('p256dh').textContent = subData.p256dh;
            document.getElementById('auth').textContent = subData.auth;
            document.getElementById('encryptionKey').textContent = publicKeyBase64;

            dataContainer.style.display = 'block';

        } catch (error) {
            console.error('Ошибка отображения данных:', error);
            this.showStatus('Ошибка отображения данных подписки', 'error');
        }
    }

    // Инициализация обработчиков событий
    initEventListeners() {
        // Обработчик кнопки подписки
        document.getElementById('subscribeBtn').addEventListener('click', () => {
            this.pushSubscriptionManager.subscribe();
        });
    }
}

const uiManager = new UIManager();