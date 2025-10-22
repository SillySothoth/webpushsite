self.addEventListener('push', async function (event) {
        if (!event.data) return;

            const data = event.data.text();
                //alert(data);

                    console.log('=== WEB PUSH RECEIVED ===');
                        console.log('Ïîëó÷åííûå äàííûå:', data);

                            // Âûâîäèì âñå ïàðàìåòðû ñ íàçâàíèÿìè è çíà÷åíèÿìè
                                console.log('--- Âñå ïàðàìåòðû push-óâåäîìëåíèÿ ---');
                                    for (const [key, value] of Object.entries(data)) {
                                            console.log(`Ïàðàìåòð: ${key} =`, value);
                                                }
                                                
})