console.log("charts.js загружен успешно!");

function createMoodChart(data) {
    console.log("Получены данные:", data);
    
    // Проверяем, есть ли элемент для графика
    const chartElement = document.getElementById('moodChart');
    if (!chartElement) {
        console.log("Элемент moodChart не найден на странице");
        return;
    }
    
    // Проверяем, есть ли данные
    if (!data || !data.dates || data.dates.length === 0) {
        console.log("Нет данных для отображения графика");
        chartElement.parentElement.innerHTML = '<div class="alert alert-info">Добавьте записи, чтобы увидеть график</div>';
        return;
    }
    
    console.log("Создаем график с данными:", data);
    
    const ctx = chartElement.getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.dates.map(date => {
                const d = new Date(date);
                return d.toLocaleDateString('ru-RU', {day: 'numeric', month: 'short'});
            }),
            datasets: [{
                label: 'Настроение',
                data: data.mood_scores,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 10
                }
            }
        }
    });
}