class PushDataLoader {
    // Получение параметров пуша при загрузке страницы
    async loadPushData() {
        const urlParams = new URLSearchParams(window.location.search);
        const pushId = urlParams.get('pushId');

        if (pushId) {
            try {
                const pushData = await this.getPushDataFromSW(pushId);
                if (pushData) {
                    this.displayJsonData(pushData);
                    console.log('Push data loaded:', pushData);
                } else {
                    console.log('No push data found for ID:', pushId);
                    this.displayJsonData({ error: 'Данные пуша не найдены' });
                }
            } catch (error) {
                console.error('Error loading push data:', error);
                this.displayJsonData({ error: 'Ошибка загрузки данных' });
            }
        } else {
            console.log('No push ID in URL');
        }
    }

    // Запрос данных из Service Worker
    async getPushDataFromSW(pushId) {
        return new Promise((resolve) => {
            if (!navigator.serviceWorker.controller) {
                resolve(null);
                return;
            }

            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = (event) => {
                resolve(event.data);
            };

            navigator.serviceWorker.controller.postMessage({
                type: 'GET_PUSH_DATA',
                pushId: pushId
            }, [messageChannel.port2]);
        });
    }

    // Функция для отображения данных на странице
    displayJsonData(data) {
        const outputElement = document.getElementById('json-output');

        if (!outputElement) {
            console.error('Output element not found');
            return;
        }

        if (!data || Object.keys(data).length === 0) {
            outputElement.innerHTML = '<p>Нет данных для отображения</p>';
            return;
        }

        let html = '<h3>Параметры пуша:</h3>';

        try {
            for (const [key, value] of Object.entries(data)) {
                let displayValue;

                if (key === 'data' && typeof value === 'string') {
                    try {
                        // Первый парсинг - убираем экранирование
                        const firstParse = JSON.parse(value);
                        // Второй парсинг - если результат тоже JSON строка
                        if (typeof firstParse === 'string') {
                            const secondParse = JSON.parse(firstParse);
                            displayValue = JSON.stringify(secondParse, null, 2);
                        } else {
                            displayValue = JSON.stringify(firstParse, null, 2);
                        }
                    } catch (e) {
                        // Если не получается распарсить, показываем как есть
                        displayValue = String(value);
                    }
                } else if (typeof value === 'object' && value !== null) {
                    displayValue = JSON.stringify(value, null, 2);
                } else if (typeof value === 'string') {
                    // Для других строк пробуем распарсить как JSON
                    try {
                        const parsed = JSON.parse(value);
                        displayValue = JSON.stringify(parsed, null, 2);
                    } catch (e) {
                        displayValue = String(value);
                    }
                } else {
                    displayValue = String(value);
                }

                html += `<div class="data-item">
            <div class="data-label">${key}:</div>
            <div class="data-value">${displayValue}</div>
         </div>`;
            }
        } catch (error) {
            html = `<p>Ошибка отображения данных: ${error.message}</p>`;
        }

        outputElement.innerHTML = html;
    }
}

const pushDataLoader = new PushDataLoader();