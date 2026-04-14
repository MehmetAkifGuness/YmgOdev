const API_URL = 'http://localhost:8081/api/tasks';

document.addEventListener('DOMContentLoaded', fetchTasks);

async function fetchTasks() {
    try {
        const response = await fetch(API_URL);
        const tasks = await response.json();
        
        const container = document.getElementById('tasksContainer');
        container.innerHTML = ''; 

        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            // Öncelik durumuna göre yan taraftaki renkli şeridi belirliyoruz
            const priorityClass = task.priority ? `priority-${task.priority.toLowerCase()}` : '';
            taskElement.className = `task-card ${priorityClass}`;
            
            taskElement.innerHTML = `
                <div class="task-header">
                    <span class="task-badge status-badge">${task.status}</span>
                    <span class="task-badge priority-badge">${task.priority || 'MEDIUM'}</span>
                </div>
                <div class="task-title">${task.title}</div>
                <div class="task-desc">${task.description}</div>
                <div class="task-footer">
                    <span><i class="fa-solid fa-building"></i> ${task.department || 'General'}</span>
                    <span><i class="fa-solid fa-clock"></i> ${task.estimatedHours || 0} hrs</span>
                </div>
            `;
            container.appendChild(taskElement);
        });
    } catch (error) {
        console.error('Bağlantı Hatası:', error);
        document.getElementById('tasksContainer').innerHTML = 
            '<p class="error-msg">Backend sistemine ulaşılamıyor. Docker servislerini kontrol et!</p>';
    }
}

async function createTask() {
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const status = document.getElementById('status').value;
    const priority = document.getElementById('priority').value;
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
        priority: priority,
        department: department,
        estimatedHours: parseFloat(hours) || 0.0
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTask)
        });

        if (response.ok) {
            resetForm();
            hideModal(); // Kayıt sonrası modal'ı kapat
            fetchTasks(); // Listeyi yenile
        } else {
            alert('Görev kaydedilirken sunucu hatası oluştu.');
        }
    } catch (error) {
        console.error('Kayıt Hatası:', error);
        alert('Sunucuya ulaşılamadı.');
    }
}

// Formu temizleme fonksiyonu
function resetForm() {
    document.getElementById('title').value = '';
    document.getElementById('description').value = '';
    document.getElementById('department').value = '';
    document.getElementById('hours').value = '';
}

// Modal Kontrolleri (Tasarımda kullandığımız butonlar için)
function showModal() {
    document.getElementById('taskModal').style.display = 'block';
}

function hideModal() {
    document.getElementById('taskModal').style.display = 'none';
}

// Modal dışına tıklandığında kapatma
window.onclick = function(event) {
    const modal = document.getElementById('taskModal');
    if (event.target == modal) {
        hideModal();
    }
}