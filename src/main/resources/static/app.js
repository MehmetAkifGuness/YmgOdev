const API_URL = 'http://localhost:8081/api/tasks';

// Sayfa ilk açıldığında veritabanındaki görevleri getir
document.addEventListener('DOMContentLoaded', fetchTasks);

// 1. GET İsteği: Görevleri Listele
async function fetchTasks() {
    try {
        const response = await fetch(API_URL);
        const tasks = await response.json();
        
        const container = document.getElementById('tasksContainer');
        container.innerHTML = ''; // Eski listeyi temizle

        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-card';
            taskElement.innerHTML = `
                <div class="task-title">${task.title}</div>
                <div class="task-desc">${task.description}</div>
                <div>
                    <span class="task-badge">📌 ${task.status}</span>
                    <span class="task-badge">🏢 ${task.department}</span>
                    <span class="task-badge">⏳ ${task.estimatedHours} Saat</span>
                </div>
            `;
            container.appendChild(taskElement);
        });
    } catch (error) {
        console.error('Bağlantı Hatası:', error);
        document.getElementById('tasksContainer').innerHTML = 
            '<p style="color: #ef4444;">Backend\'e ulaşılamıyor. Docker çalışıyor mu?</p>';
    }
}

// 2. POST İsteği: Yeni Görev Ekle
async function createTask() {
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const status = document.getElementById('status').value;
    const department = document.getElementById('department').value;
    const hours = document.getElementById('hours').value;

    if (!title || !description) {
        alert('Lütfen görev başlığı ve açıklama alanlarını doldur!');
        return;
    }

    const newTask = {
        title: title,
        description: description,
        status: status,
        department: department,
        estimatedHours: parseInt(hours) || 0
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newTask)
        });

        if (response.ok) {
            // Kayıt başarılıysa formu temizle ve listeyi yenile
            document.getElementById('title').value = '';
            document.getElementById('description').value = '';
            document.getElementById('department').value = '';
            document.getElementById('hours').value = '';
            
            fetchTasks();
        } else {
            alert('Görev kaydedilirken sunucu hatası oluştu (400/500).');
        }
    } catch (error) {
        console.error('Kayıt Hatası:', error);
        alert('Görev gönderilemedi. Sunucu kapalı olabilir.');
    }
}