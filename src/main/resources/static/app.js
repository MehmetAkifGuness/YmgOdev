const API_URL = 'http://localhost:8081/api/tasks';

// 1. Uygulama Başlangıcı
document.addEventListener('DOMContentLoaded', () => {
    fetchTasks();
});

// 2. GET İsteği: Görevleri Listele ve Kartları Oluştur
async function fetchTasks() {
    try {
        const response = await fetch(API_URL);
        const tasks = await response.json();
        
        // Dashboard Görünümünü Doldur (Tasarım 1)
        const container = document.getElementById('tasksContainer');
        container.innerHTML = ''; 

        tasks.forEach(task => {
            const el = document.createElement('div');
            el.className = `task-card`;
            el.onclick = () => showModal(task); // Tıklayınca Detay Modalı (Tasarım 4)
            el.innerHTML = `
                <div class="task-title">${task.title}</div>
                <div class="task-desc">${task.description}</div>
            `;
            container.appendChild(el);
        });
        
    } catch (e) { console.error('Bağlantı Hatası:', e); }
}

// 3. FULL-STACK UPDATE (PUT İsteği) - "Save Changes" Butonu
async function updateTask() {
    const taskId = document.getElementById('modalTaskId').value;
    const data = {
        title: document.getElementById('modalTitle').value,
        description: document.getElementById('modalDescription').value,
        status: document.getElementById('modalStatus').value,
        priority: document.getElementById('modalPriority').value
    };

    try {
        const response = await fetch(`${API_URL}/${taskId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });

        if (response.ok) {
            hideModal();
            fetchTasks(); // Listeyi yenile
        } else { alert('Görev güncellenemedi.'); }
    } catch (e) { console.error('Hata:', e); }
}

// 4. FULL-STACK DELETE (DELETE İsteği) - "Delete Task" Butonu
async function deleteTask() {
    const taskId = document.getElementById('modalTaskId').value;
    if (!confirm('Bu görevi silmek istediğine emin misin?')) return;

    try {
        const response = await fetch(`${API_URL}/${taskId}`, { method: 'DELETE' });

        if (response.ok) {
            hideModal();
            fetchTasks(); // Listeyi yenile
        } else { alert('Görev silinemedi.'); }
    } catch (e) { console.error('Hata:', e); }
}

// 5. UI Yönetimi: Navigasyon ve Modal Kontrolleri
function navigateTo(viewName) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    
    document.getElementById(`${viewName}-view`).style.display = 'block';
    // Tıklanan menü öğesini aktif yap
    event.currentTarget.classList.add('active');
}

function showModal(task) {
    document.getElementById('taskModal').style.display = 'block';
    // Modalı seçilen görevin verileriyle doldur
    document.getElementById('modalTaskId').value = task.id;
    document.getElementById('modalTitle').value = task.title;
    document.getElementById('modalDescription').value = task.description;
    document.getElementById('modalStatus').value = task.status;
    document.getElementById('modalPriority').value = task.priority || 'MEDIUM';
}

function hideModal() { document.getElementById('taskModal').style.display = 'none'; }