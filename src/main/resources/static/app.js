const API_URL = "/api/tasks";
const OVERVIEW_URL = "/api/tasks/overview";
const AUTH_URL = "/api/auth";
const SESSION_KEY = "fluidTasksUser";
const STATUS_ORDER = ["TO_DO", "IN_PROGRESS", "REVIEW", "DONE"];
const STATUS_LABELS = { TO_DO: "Yapılacak", IN_PROGRESS: "Devam Ediyor", REVIEW: "İncelemede", DONE: "Tamamlandı" };
const PRIORITY_LABELS = { HIGH: "Yüksek Öncelik", MEDIUM: "Orta Öncelik", LOW: "Düşük Öncelik" };
const DEPARTMENT_LABELS = { EDITORIAL: "Editoryal", DESIGN: "Tasarım", TECH: "Teknik", PRODUCT: "Ürün", MARKETING: "Pazarlama" };
const CALENDAR_HOURS = ["08 AM", "09 AM", "10 AM", "11 AM", "12 PM", "01 PM", "02 PM", "03 PM", "04 PM", "05 PM"];
const CALENDAR_DAYS = ["Pzt 14", "Sal 15", "Çar 16", "Per 17", "Cum 18", "Cmt 19", "Paz 20"];

let tasks = [];
let overview = null;
let currentUser = loadSessionUser();
let currentView = "dashboard-view";
let selectedDepartment = "ALL";
let selectedTaskId = null;
let searchQuery = "";
let chatMessages = [
    { direction: "incoming", text: "Gövde metni kontrastını 7:1 üzerinde tutalım." },
    { direction: "outgoing", text: "Yeni görev yerleşimini şimdi test ediyorum." }
];

document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    syncAuthState();
    if (currentUser) fetchTasks();
});

function bindEvents() {
    document.querySelectorAll(".nav-item").forEach((item) => item.addEventListener("click", () => setActiveView(item.dataset.view)));
    on("searchInput", "input", (event) => { searchQuery = event.target.value.trim(); fetchTasks(); });
    on("showLoginButton", "click", () => toggleAuthMode("login"));
    on("showRegisterButton", "click", () => toggleAuthMode("register"));
    on("loginForm", "submit", handleLogin);
    on("registerForm", "submit", handleRegister);
    on("openCreateTask", "click", () => openCreateModal());
    on("calendarAddTask", "click", () => openCreateModal());
    on("assignTaskButton", "click", () => { setActiveView("group-view"); openCreateModal("IN_PROGRESS"); showToast("Yeni ekip görevi oluşturabilirsiniz."); });
    on("openEditFromTasks", "click", openSelectedTask);
    on("closeModal", "click", closeModal);
    on("taskModal", "click", (event) => { if (event.target.id === "taskModal") closeModal(); });
    on("closeInfoModal", "click", closeInfoModal);
    on("infoModal", "click", (event) => { if (event.target.id === "infoModal") closeInfoModal(); });
    on("taskForm", "submit", submitTaskForm);
    on("deleteTaskButton", "click", handleDeleteTask);
    on("quickFocusButton", "click", handleQuickComplete);
    on("shareTaskButton", "click", handleShareTask);
    on("settingsButton", "click", () => openInfoModal("Ayarlar", "Profil, bildirim ve görev tercihleri burada yönetilecek."));
    on("helpButton", "click", () => openInfoModal("Yardım", "Giriş yapıp görev oluşturabilir, kartları düzenleyebilir ve tüm ekranlarda backend verilerini kullanabilirsiniz."));
    on("logoutButton", "click", logout);
    on("notificationsButton", "click", () => showToast("Bildirim merkezi açıldı."));
    on("historyButton", "click", () => showToast("Son hareketler görüntülendi."));
    on("manageSlotsButton", "click", () => { setActiveView("calendar-view"); showToast("Zaman blokları takvimde yönetilir."); });
    on("groupDetailsButton", "click", () => { setActiveView("analytics-view"); showToast("Ekip detayları analitik ekranında."); });
    on("todayButton", "click", () => { text("calendarMonth", formatCalendarHeading()); text("calendarSubtitle", "Bu hafta için güncel plan"); showToast("Takvim bugüne döndü."); });
    on("openGuideButton", "click", () => openInfoModal("Brif Dosyası", "Marka kılavuzu dosyası demo ortamında referans olarak gösteriliyor."));
    on("openMoodboardButton", "click", () => openInfoModal("İlham Panosu", "İlham panosu görseli demo ortamında referans olarak gösteriliyor."));
    on("sendChatButton", "click", sendChatMessage);
    on("chatMessageInput", "keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); sendChatMessage(); } });
    bindSegmentedControl("groupModeTabs", (mode) => showToast(`Ekip görünümü "${translateMode(mode)}" moduna alındı.`));
    bindSegmentedControl("calendarModeTabs", (mode) => showToast(`Takvim "${translateMode(mode)}" moduna alındı.`));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeModal(); closeInfoModal(); } });
    document.addEventListener("click", handleDocumentClick);
}

function handleDocumentClick(event) {
    const detailItem = event.target.closest(".detail-item[data-id]");
    if (detailItem) {
        selectedTaskId = Number(detailItem.dataset.id);
        renderTaskDetails();
        if (event.detail === 2) openSelectedTask();
        return;
    }
    const kanbanCard = event.target.closest(".kanban-card[data-id]");
    if (kanbanCard) {
        const task = tasks.find((item) => item.id === Number(kanbanCard.dataset.id));
        if (task) openEditModal(task);
    }
}

function bindSegmentedControl(id, onChange) {
    const container = byId(id);
    if (!container) return;
    container.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
        container.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        onChange(button.dataset.mode);
    }));
}

function syncAuthState() {
    byId("authScreen").classList.toggle("hidden", Boolean(currentUser));
    byId("appShell").classList.toggle("hidden", !currentUser);
    if (currentUser) { updateProfile(); renderChat(); }
}

function toggleAuthMode(mode) {
    const isLogin = mode === "login";
    byId("showLoginButton").classList.toggle("active", isLogin);
    byId("showRegisterButton").classList.toggle("active", !isLogin);
    byId("loginForm").classList.toggle("hidden", !isLogin);
    byId("registerForm").classList.toggle("hidden", isLogin);
}

async function handleLogin(event) {
    event.preventDefault();
    await authRequest("/login", { email: value("loginEmail"), password: byId("loginPassword").value }, "Giriş başarılı.");
}

async function handleRegister(event) {
    event.preventDefault();
    await authRequest(
        "/register",
        { fullName: value("registerName"), email: value("registerEmail"), password: byId("registerPassword").value },
        "Kayıt tamamlandı ve oturum açıldı."
    );
}

async function authRequest(path, body, successMessage) {
    try {
        const data = await requestJson(`${AUTH_URL}${path}`, jsonRequest("POST", body));
        currentUser = data;
        saveSessionUser(data);
        resetAuthForms();
        syncAuthState();
        await fetchTasks();
        showToast(successMessage, "success");
    } catch (error) {
        showToast(error.message || "İşlem başarısız.", "error");
    }
}

function logout() {
    currentUser = null;
    overview = null;
    tasks = [];
    selectedTaskId = null;
    searchQuery = "";
    localStorage.removeItem(SESSION_KEY);
    resetAuthForms();
    clearAppView("Henüz veri bulunmuyor.");
    syncAuthState();
    toggleAuthMode("login");
    showToast("Oturum kapatıldı.");
}

async function fetchTasks() {
    if (!currentUser) return;
    try {
        const params = new URLSearchParams({ userId: String(currentUser.id) });
        if (searchQuery) params.set("query", searchQuery);
        if (selectedDepartment !== "ALL") params.set("department", selectedDepartment);
        overview = await requestJson(`${OVERVIEW_URL}?${params}`);
        tasks = overview.tasks || [];
        selectedTaskId = tasks.some((task) => task.id === selectedTaskId) ? selectedTaskId : tasks[0]?.id ?? null;
        updateProfile();
        renderApp();
    } catch (error) {
        clearAppView("Görevler yüklenemedi. Backend bağlantısını kontrol edin.");
        showToast(error.message || "Veriler alınamadı.", "error");
    }
}

function renderApp() {
    renderDashboard();
    renderTaskDetails();
    renderGroupWorkspace();
    renderCalendar();
    renderAnalytics();
    renderChat();
}

function setActiveView(id) {
    currentView = id;
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === id));
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === id));
}

function renderDashboard() {
    const dashboard = overview?.dashboard || {};
    const focusTask = dashboard.focusTask;
    const secondaryTasks = dashboard.secondaryTasks || [];
    text("heroProject", dashboard.heroProject || "Proje: Editoryal Yenileme");
    text("heroSubtitle", dashboard.heroSubtitle || "Bugün için 0 kritik odağın var.");
    html("focusTask", focusTask ? renderFocusTask(focusTask) : `<div class="task-description">Henüz odak görevi bulunmuyor.</div>`);
    html("focusList", secondaryTasks.length ? secondaryTasks.map(renderStackItem).join("") : `<div class="detail-item static"><div class="checkmark"></div><div><strong>Takip görevi yok</strong><span>Yeni görev eklediğinizde burada listelenecek.</span></div><span>--</span></div>`);
    html("efficiencyValue", `${formatNumber(dashboard.efficiencyHours)}<span>/6 sa</span>`);
    text("focusRate", `${dashboard.completionRate || 0}%`);
    text("focusRateLabel", `${dashboard.completionRate || 0}%`);
    text("estimatedHours", `${formatNumber(dashboard.estimatedHours)} sa`);
    text("remainingHours", `${formatNumber(dashboard.remainingHours)} sa`);
    byId("efficiencyBar").style.width = `${Math.min(dashboard.completionRate || 8, 100)}%`;
    html("timeSlots", (dashboard.timeSlots || []).length ? dashboard.timeSlots.map(renderTimeSlot).join("") : `<div class="time-slot"><strong>Bugün</strong><div class="time-pill outline">Henüz zaman bloğu bulunmuyor.</div></div>`);
    text("insightTitle", dashboard.insightTitle || "Verimin sabah saatlerinde zirveye çıkıyor.");
    text("insightText", dashboard.insightText || "Zor görevlerini sabah odak bloğuna yerleştir.");
}

function renderTaskDetails() {
    const list = tasks.slice(0, 5);
    const activeTask = tasks.find((task) => task.id === selectedTaskId) || overview?.dashboard?.focusTask || tasks[0];
    html("taskDetailList", list.length ? list.map((task) => renderDetailItem(task, task.id === activeTask?.id)).join("") : `<div class="detail-item static"><div class="checkmark"></div><div><strong>Görev bulunamadı</strong><span>Arama filtresini temizleyip tekrar deneyin.</span></div><span>--</span></div>`);
}

function renderGroupWorkspace() {
    const groupWorkspace = overview?.groupWorkspace || {};
    text("velocityPercent", `${groupWorkspace.velocityPercent || 0}%`);
    byId("velocityBar").style.width = `${Math.max(groupWorkspace.velocityPercent || 0, 8)}%`;
    text("activeSprints", groupWorkspace.activeSprints || 0);
    text("dueSoonLabel", `${groupWorkspace.dueSoon || 0} yaklaşan teslim`);
    text("riskLevel", groupWorkspace.riskLevel || "Düşük");
    renderDepartmentTabs();
    renderPresenceList();
    renderKanban();
}

function renderCalendar() {
    const calendar = overview?.calendar || {};
    const unscheduledTasks = calendar.unscheduledTasks || [];
    const events = calendar.events || [];
    text("calendarMonth", calendar.monthLabel || formatCalendarHeading());
    text("calendarSubtitle", "Bu hafta için güncel plan");
    html("unscheduledList", unscheduledTasks.length ? unscheduledTasks.map(renderUnscheduledCard).join("") : `<div class="unscheduled-card"><strong>Plansız görev yok</strong><span>Bu hafta tüm görevler yerleşmiş görünüyor.</span></div>`);
    let markup = `<div class="calendar-time-header"><i class="fa-regular fa-clock"></i></div>`;
    markup += CALENDAR_DAYS.map((day, index) => `<div class="calendar-day-header ${index === 1 ? "highlight" : ""}">${day}</div>`).join("");
    CALENDAR_HOURS.forEach((hour) => {
        markup += `<div class="calendar-time">${formatCalendarHour(hour)}</div>`;
        CALENDAR_DAYS.forEach((_, dayIndex) => {
            const dayEvents = events.filter((event) => event.dayIndex === dayIndex && event.hour === hour);
            markup += `<div class="calendar-cell ${dayIndex === 1 ? "highlight" : ""}">${dayEvents.map(renderCalendarEvent).join("")}</div>`;
        });
    });
    html("calendarGrid", markup);
}

function renderAnalytics() {
    const analytics = overview?.analytics || {};
    text("analyticsCompletion", `${analytics.completionRate || 0}%`);
    html("statusBreakdown", (analytics.statusBreakdown || []).length ? analytics.statusBreakdown.map(renderBreakdownRow).join("") : renderEmptyBreakdown("Durum verisi bulunmuyor"));
    html("departmentBreakdown", (analytics.departmentBreakdown || []).length ? analytics.departmentBreakdown.map(renderBreakdownRow).join("") : renderEmptyBreakdown("Departman verisi bulunmuyor"));
}

function renderDepartmentTabs() {
    const tabs = overview?.groupWorkspace?.departmentTabs || ["ALL"];
    html("departmentTabs", tabs.map((tab) => `<button type="button" class="department-tab ${selectedDepartment === tab ? "active" : ""}" data-department="${tab}">${tab === "ALL" ? "Tüm Departmanlar" : (DEPARTMENT_LABELS[tab] || tab)}</button>`).join(""));
    document.querySelectorAll(".department-tab").forEach((button) => button.addEventListener("click", () => { selectedDepartment = button.dataset.department; fetchTasks(); }));
}

function renderPresenceList() {
    const users = overview?.groupWorkspace?.presence || [];
    html("teamPresence", users.length ? users.map((user) => `<article class="presence-card"><img src="${avatarForUser(user)}" alt="${escapeHtml(user.fullName)}"><div><strong>${escapeHtml(user.fullName)}</strong><span>${escapeHtml(user.title || "Takım Üyesi")} · ${escapeHtml(user.availability || "Çevrimiçi")}</span></div><i class="fa-solid fa-message"></i></article>`).join("") : `<article class="presence-card"><div class="presence-dot"></div><div><strong>Ekip verisi yok</strong><span>Atanan kullanıcılar burada listelenecek.</span></div><i class="fa-solid fa-message"></i></article>`);
}

function renderKanban() {
    const kanban = overview?.groupWorkspace?.kanban || {};
    html("kanbanBoard", STATUS_ORDER.map((status) => {
        const items = kanban[status] || [];
        return `<section class="kanban-column"><h4>${STATUS_LABELS[status]} ${items.length ? `<span>(${items.length})</span>` : ""}</h4><div class="kanban-stack">${items.length ? items.map(renderKanbanCard).join("") : `<div class="kanban-card static"><strong>Görev yok</strong><span>Daha sonra görev ekleyebilirsiniz.</span></div>`}</div></section>`;
    }).join(""));
}

function renderChat() {
    html("chatMessages", chatMessages.map((message) => `<div class="chat-bubble ${message.direction}">${escapeHtml(message.text)}</div>`).join(""));
}

function renderFocusTask(task) {
    return `<div class="task-kicker"><span class="tag ${tagClass(task.department)}">${escapeHtml(DEPARTMENT_LABELS[task.department] || task.department || "Görev")}</span><span>${escapeHtml(PRIORITY_LABELS[task.priority] || "Öncelik")}</span></div><h3 class="task-title">${escapeHtml(task.title)}</h3><p class="task-description">${escapeHtml(task.description || "Açıklama eklenmemiş.")}</p><div class="task-kicker"><span><i class="fa-regular fa-clock"></i> ${formatHours(task.remainingHours)} kaldı</span><span><i class="fa-regular fa-calendar"></i> ${formatDate(task.dueDate)}</span><div class="assignee-group">${renderAssignee(task.assignee)}</div></div>`;
}

function renderStackItem(task) {
    return `<article class="stack-item"><div class="checkmark"></div><div><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(task.description || "Açıklama yok")}</span></div><span>${formatShortTime(task)}</span></article>`;
}

function renderDetailItem(task, selected) {
    return `<article class="detail-item ${selected ? "selected" : ""}" data-id="${task.id}" tabindex="0" role="button" aria-pressed="${selected ? "true" : "false"}"><div class="checkmark"></div><div><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(task.description || "Açıklama yok")}</span></div><span>${formatDate(task.dueDate)}</span></article>`;
}

function renderTimeSlot(slot) {
    return `<div class="time-slot"><strong>${escapeHtml(slot.time)}</strong><div class="time-pill ${escapeHtml(slot.style)}">${escapeHtml(slot.label)}</div></div>`;
}

function renderUnscheduledCard(task) {
    return `<article class="unscheduled-card ${task.department === "EDITORIAL" ? "work" : ""}"><span class="tag ${tagClass(task.department)}">${escapeHtml(DEPARTMENT_LABELS[task.department] || task.department || "Görev")}</span><strong>${escapeHtml(task.title)}</strong><div class="calendar-card-meta"><span><i class="fa-regular fa-clock"></i> ${formatHours(task.estimatedHours)}</span><span><i class="fa-regular fa-calendar"></i> ${formatDate(task.dueDate)}</span></div></article>`;
}

function renderCalendarEvent(event) {
    return `<article class="calendar-event ${escapeHtml(event.className)}"><span class="time">${escapeHtml(event.time)}</span><strong>${escapeHtml(event.title)}</strong></article>`;
}

function renderKanbanCard(task) {
    const progress = task.estimatedHours ? Math.max(0, Math.min(100, Math.round(((task.estimatedHours - (task.remainingHours || 0)) / task.estimatedHours) * 100))) : 0;
    return `<article class="kanban-card ${String(task.priority || "").toLowerCase()}" data-id="${task.id}" tabindex="0" role="button"><span class="tag ${tagClass(task.department)}">${escapeHtml(DEPARTMENT_LABELS[task.department] || task.department || "Görev")}</span><strong>${escapeHtml(task.title)}</strong><p>${escapeHtml(task.description || "Açıklama yok")}</p><div class="kanban-meta"><span><i class="fa-regular fa-calendar"></i> ${formatDate(task.dueDate)}</span><span>%${progress} tamamlandı</span></div><div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div></article>`;
}

function renderBreakdownRow(item) {
    return `<div class="breakdown-row"><span>${escapeHtml(item.label)}</span><div class="bar"><span style="width:${Math.max(item.percentage || 0, item.count ? 8 : 0)}%"></span></div><strong>${item.count}</strong></div>`;
}

function renderEmptyBreakdown(message) {
    return `<div class="breakdown-row empty"><span>${escapeHtml(message)}</span><div class="bar"><span style="width:0%"></span></div><strong>0</strong></div>`;
}

function openCreateModal(status = "TO_DO") {
    if (!currentUser) {
        showToast("Önce giriş yapmanız gerekiyor.", "error");
        return;
    }
    text("modalHeading", "Görev Oluştur");
    byId("taskForm").reset();
    byId("modalTaskId").value = "";
    byId("modalStatus").value = status;
    byId("modalPriority").value = "MEDIUM";
    byId("modalDepartment").value = "EDITORIAL";
    byId("modalEstimatedHours").value = "2";
    byId("modalRemainingHours").value = "2";
    byId("deleteTaskButton").classList.add("hidden");
    byId("taskModal").classList.remove("hidden");
}

function openEditModal(task) {
    text("modalHeading", "Görevi Düzenle");
    byId("modalTaskId").value = task.id;
    byId("modalTitle").value = task.title || "";
    byId("modalDescription").value = task.description || "";
    byId("modalStatus").value = task.status || "TO_DO";
    byId("modalPriority").value = task.priority || "MEDIUM";
    byId("modalDepartment").value = task.department || "EDITORIAL";
    byId("modalDueDate").value = task.dueDate || "";
    byId("modalEstimatedHours").value = String(task.estimatedHours ?? 2);
    byId("modalRemainingHours").value = String(task.remainingHours ?? 2);
    byId("deleteTaskButton").classList.remove("hidden");
    byId("taskModal").classList.remove("hidden");
}

function openSelectedTask() {
    const task = tasks.find((item) => item.id === selectedTaskId) || tasks[0];
    if (task) openEditModal(task);
    else showToast("Açılacak görev bulunamadı.", "error");
}

function closeModal() {
    byId("taskModal").classList.add("hidden");
}

function openInfoModal(titleValue, message) {
    text("infoModalTitle", titleValue);
    text("infoModalText", message);
    byId("infoModal").classList.remove("hidden");
}

function closeInfoModal() {
    byId("infoModal").classList.add("hidden");
}

async function submitTaskForm(event) {
    event.preventDefault();
    const id = byId("modalTaskId").value;
    const payload = {
        title: value("modalTitle"),
        description: value("modalDescription"),
        status: byId("modalStatus").value,
        priority: byId("modalPriority").value,
        department: byId("modalDepartment").value,
        dueDate: byId("modalDueDate").value || null,
        estimatedHours: parseNumber("modalEstimatedHours"),
        remainingHours: parseNumber("modalRemainingHours"),
        assignee: currentUser ? { id: currentUser.id } : null
    };
    if (!payload.title) return showToast("Görev başlığı zorunludur.", "error");
    if (payload.remainingHours > payload.estimatedHours) return showToast("Kalan saat, tahmini saatten büyük olamaz.", "error");
    await taskMutation(id ? `${API_URL}/${id}` : API_URL, id ? "PUT" : "POST", payload, id ? "Görev güncellendi." : "Yeni görev eklendi.");
}

async function handleDeleteTask() {
    const id = byId("modalTaskId").value;
    if (!id) return;
    if (!window.confirm("Bu görevi silmek istediğinize emin misiniz?")) return;
    await taskMutation(`${API_URL}/${id}`, "DELETE", null, "Görev silindi.");
}

async function handleQuickComplete() {
    const focusTask = overview?.dashboard?.focusTask;
    if (!focusTask) return showToast("Tamamlanacak odak görevi yok.");
    await taskMutation(`${API_URL}/${focusTask.id}`, "PUT", {
        ...focusTask,
        status: "DONE",
        remainingHours: 0,
        assignee: focusTask.assignee?.id ? { id: focusTask.assignee.id } : (currentUser ? { id: currentUser.id } : null)
    }, "Odak görevi tamamlandı.");
}

async function handleShareTask() {
    const focusTask = overview?.dashboard?.focusTask;
    if (!focusTask) return showToast("Paylaşılacak aktif görev yok.");
    try {
        await copyToClipboard(`${focusTask.title}${focusTask.description ? ` - ${focusTask.description}` : ""}`);
        showToast("Odak görevi panoya kopyalandı.", "success");
    } catch {
        showToast("Görev metni kopyalanamadı. Tarayıcı izinlerini kontrol edin.", "error");
    }
}

function sendChatMessage() {
    const input = byId("chatMessageInput");
    const message = input.value.trim();
    if (!message) return showToast("Mesaj alanı boş olamaz.");
    chatMessages = [...chatMessages, { direction: "outgoing", text: message }];
    input.value = "";
    renderChat();
    showToast("Mesaj gönderildi.", "success");
}

async function taskMutation(url, method, body, successMessage) {
    try {
        await requestJson(url, body ? jsonRequest(method, body) : { method });
        closeModal();
        await fetchTasks();
        showToast(successMessage, "success");
    } catch (error) {
        showToast(error.message || "İşlem başarısız.", "error");
    }
}

function updateProfile() {
    const profile = currentUser || overview?.profile;
    text("profileName", profile?.fullName || "Kullanıcı");
    text("profileRole", profile?.title || "Takım Üyesi");
    byId("profileAvatar").src = avatarForUser(profile);
}

function clearAppView(message) {
    html("focusTask", `<div class="task-description">${escapeHtml(message)}</div>`);
    html("focusList", "");
    html("taskDetailList", `<div class="detail-item static"><div class="checkmark"></div><div><strong>Görev listesi boş</strong><span>${escapeHtml(message)}</span></div><span>--</span></div>`);
    html("teamPresence", `<article class="presence-card"><div class="presence-dot"></div><div><strong>Veri bulunamadı</strong><span>${escapeHtml(message)}</span></div><i class="fa-solid fa-message"></i></article>`);
    html("kanbanBoard", "");
    html("unscheduledList", `<div class="unscheduled-card"><strong>Veri bulunamadı</strong><span>${escapeHtml(message)}</span></div>`);
    html("calendarGrid", "");
    html("statusBreakdown", renderEmptyBreakdown(message));
    html("departmentBreakdown", renderEmptyBreakdown(message));
}

function showToast(message, type = "default") {
    const toast = document.createElement("div");
    toast.className = `toast ${type === "default" ? "" : type}`.trim();
    toast.textContent = message;
    byId("toastContainer").appendChild(toast);
    window.setTimeout(() => toast.remove(), 3000);
}

async function requestJson(url, options = {}) {
    const response = await fetch(url, options);
    const raw = await response.text();
    const data = raw ? tryParseJson(raw) : null;
    if (!response.ok) throw new Error(data?.message || data?.error || raw || "İşlem başarısız.");
    return data;
}

function tryParseJson(value) {
    try { return JSON.parse(value); } catch { return null; }
}

function loadSessionUser() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

function saveSessionUser(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function resetAuthForms() {
    byId("loginForm")?.reset();
    byId("registerForm")?.reset();
}

function jsonRequest(method, body) {
    return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function value(id) {
    return byId(id).value.trim();
}

function text(id, nextValue) {
    const element = byId(id);
    if (element) element.textContent = String(nextValue);
}

function html(id, markup) {
    const element = byId(id);
    if (element) element.innerHTML = markup;
}

function byId(id) {
    return document.getElementById(id);
}

function on(id, eventName, handler) {
    const element = byId(id);
    if (element) element.addEventListener(eventName, handler);
}

function formatCalendarHeading() {
    return new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(new Date());
}

function formatCalendarHour(value) {
    return value.replace(" AM", ".00").replace(" PM", ".00");
}

function formatDate(value) {
    const date = parseDateValue(value);
    if (!date) return "Tarih yok";
    return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(date);
}

function daysUntil(value) {
    const dueDate = parseDateValue(value);
    if (!dueDate) return Number.MAX_SAFE_INTEGER;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function parseDateValue(value) {
    if (!value) return null;
    if (value instanceof Date) return new Date(value.getTime());
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatHours(value) {
    return `${formatNumber(value)} sa`;
}

function formatShortTime(task) {
    const dayCount = daysUntil(task.dueDate);
    if (dayCount === Number.MAX_SAFE_INTEGER) return "--";
    if (dayCount <= 0) return "Bugün";
    return `${dayCount} gün`;
}

function formatNumber(value) {
    return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(value || 0));
}

function avatarForUser(user) {
    return user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || "Kullanıcı")}&background=0f6ea8&color=fff`;
}

function renderAssignee(assignee) {
    return assignee ? `<img src="${avatarForUser(assignee)}" alt="${escapeHtml(assignee.fullName || "Atanan kişi")}">` : "";
}

function parseNumber(id) {
    const valueNumber = Number.parseFloat(byId(id).value);
    return Number.isNaN(valueNumber) ? 0 : valueNumber;
}

function tagClass(department) {
    return String(department || "").toLowerCase();
}

function translateMode(mode) {
    return ({ kanban: "Kanban", liste: "Liste", "zaman-cizgisi": "Zaman Çizgisi", gun: "Gün", hafta: "Hafta", ay: "Ay" })[mode] || mode;
}

async function copyToClipboard(valueToCopy) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(valueToCopy);
    const helper = document.createElement("textarea");
    helper.value = valueToCopy;
    helper.setAttribute("readonly", "true");
    helper.style.position = "absolute";
    helper.style.left = "-9999px";
    document.body.appendChild(helper);
    helper.select();
    const result = document.execCommand("copy");
    document.body.removeChild(helper);
    if (!result) throw new Error("copy-failed");
}

function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
