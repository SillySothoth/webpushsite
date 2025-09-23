# webpushsite
<!DOCTYPE html>
<html>
<head>
    <title>WebPush Подписка</title>
    <meta charset="utf-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
        }

        .input-group {
            margin: 20px 0;
        }

        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }

        input[type="text"] {
            width: 100%;
            padding: 10px;
            font-size: 14px;
            border: 1px solid #ddd;
            border-radius: 5px;
            box-sizing: border-box;
        }

        button {
            padding: 15px 30px;
            font-size: 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }

            button:hover {
                background: #0056b3;
            }

        #status {
            margin-top: 20px;
            padding: 10px;
            border-radius: 5px;
        }

        .success {
            background: #d4edda;
            color: #155724;
        }

        .error {
            background: #f8d7da;
            color: #721c24;
        }
    </style>
</head>
<body>
    <h1>Подписка на WebPush уведомления</h1>

    <div class="input-group">
        <label for="publicKeyInput">Public Key (Application Server Key):</label>
        <input type="text" id="publicKeyInput" placeholder="Введите ваш публичный ключ VAPID" style="width: 100%;">
    </div>

    <button onclick="subscribe()">Подписаться на уведомления</button>

    <div id="status"></div>

    <div id="subscriptionData" style="display:none; margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
        <h3>Данные вашей подписки:</h3>
        <div>
            <strong>Endpoint:</strong>
            <div id="endpoint" style="word-break: break-all; background: white; padding: 10px; border-radius: 3px; margin: 5px 0;"></div>
        </div>
        <div>
            <strong>P256dh ключ:</strong>
            <div id="p256dh" style="word-break: break-all; background: white; padding: 10px; border-radius: 3px; margin: 5px 0;"></div>
        </div>
        <div>
            <strong>Auth ключ:</strong>
            <div id="auth" style="word-break: break-all; background: white; padding: 10px; border-radius: 3px; margin: 5px 0;"></div>
        </div>
    </div>

    <script>
        // Конвертация ключа
        function urlBase64ToUint8Array(base64String) {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
            const rawData = atob(base64);
            return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
        }

        // Основная функция подписки
        async function subscribe() {
            // Получаем ключ из поля ввода
            const publicKeyInput = document.getElementById('publicKeyInput').value.trim();

            if (!publicKeyInput) {
                showStatus('Пожалуйста, введите публичный ключ', 'error');
                return;
            }

            if (!('serviceWorker' in navigator)) {
                showStatus('Ваш браузер не поддерживает Service Worker', 'error');
                return;
            }

            try {
                // Регистрируем Service Worker
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker зарегистрирован');

                // Запрашиваем разрешение на уведомления
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    showStatus('Разрешение на уведомления не получено', 'error');
                    return;
                }

                // Создаем подписку с ключом из поля ввода
                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKeyInput)
                });

                // Отправляем подписку на сервер
                const response = await fetch('/Home/Subscribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(subscription)
                });

                if (response.ok) {
                    showStatus('✅ Подписка успешно создана! Вы будете получать уведомления', 'success');
                    showSubscriptionData(subscription);
                } else {
                    showStatus('Ошибка при создании подписки', 'error');
                }

            } catch (error) {
                showStatus('Ошибка: ' + error.message, 'error');
                console.error('Ошибка подписки:', error);
            }
        }

        // Показать статус
        function showStatus(message, type) {
            const statusDiv = document.getElementById('status');
            statusDiv.className = type;
            statusDiv.innerHTML = message;
        }

        // Автоматически регистрируем Service Worker при загрузке
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(() => console.log('SW зарегистрирован'))
                .catch(err => console.error('Ошибка SW:', err));
        }

        // Функция для отображения данных подписки
        function showSubscriptionData(subscription) {
            const subData = document.getElementById('subscriptionData');

            try {
                const endpoint = subscription.endpoint;

                // Получаем ключи как ArrayBuffer и преобразуем в base64
                let p256dhKey = 'Не доступен';
                let authKey = 'Не доступен';

                if (subscription.getKey) {
                    const p256dhBuffer = subscription.getKey('p256dh');
                    const authBuffer = subscription.getKey('auth');

                    if (p256dhBuffer) {
                        p256dhKey = arrayBufferToBase64(p256dhBuffer);
                    }
                    if (authBuffer) {
                        authKey = arrayBufferToBase64(authBuffer);
                    }
                } else if (subscription.keys) {
                    // Если ключи уже в формате base64 (редкий случай)
                    p256dhKey = subscription.keys.p256dh || 'Не доступен';
                    authKey = subscription.keys.auth || 'Не доступен';
                }

                document.getElementById('endpoint').textContent = endpoint;
                document.getElementById('p256dh').textContent = p256dhKey;
                document.getElementById('auth').textContent = authKey;

            } catch (error) {
                console.error('Ошибка отображения данных:', error);
                document.getElementById('endpoint').textContent = subscription.endpoint;
                document.getElementById('p256dh').textContent = 'Ошибка преобразования: ' + error.message;
                document.getElementById('auth').textContent = 'Проверьте консоль';
            }

            subData.style.display = 'block';
        }

        // Функция для преобразования ArrayBuffer в base64 строку
        function arrayBufferToBase64(buffer) {
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        }
    </script>
</body>
</html>
