const API_URL = "/api/tasks";
const STATUS_ORDER = ["TO_DO", "IN_PROGRESS", "REVIEW", "DONE"];
const STATUS_LABELS = {
    TO_DO: "To Do",
    IN_PROGRESS: "In Progress",
    REVIEW: "Review",
    DONE: "Done"
};
const PRIORITY_LABELS = {
    HIGH: "High Priority",
    MEDIUM: "Medium Priority",
    LOW: "Low Priority"
};
const DEPARTMENT_LABELS = {
    EDITORIAL: "Editorial",
    DESIGN: "Design",
    TECH: "Tech",
    PRODUCT: "Product",
    MARKETING: "Marketing"
};

let tasks = [];
let filteredTasks = [];
let currentView = "dashboard-view";
let selectedDepartment = "ALL";
let selectedTaskId = null;

document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    fetchTasks();
});

function bindEvents() {
    document.querySelectorAll(".nav-item").forEach((item) => {
        item.addEventListener("click", () => setActiveView(item.dataset.view));
    });

    document.getElementById("searchInput").addEventListener("input", (event) => {
        filterTasks(event.target.value);
    });

    document.getElementById("openCreateTask").addEventListener("click", () => openCreateModal());
    document.getElementById("calendarAddTask").addEventListener("click", () => openCreateModal());
    document.getElementById("assignTaskButton").addEventListener("click", () => openCreateModal("IN_PROGRESS"));
    document.getElementById("openEditFromTasks").addEventListener("click", () => openSelectedTask());
    document.getElementById("closeModal").addEventListener("click", closeModal);
    document.getElementById("taskModal").addEventListener("click", (event) => {
        if (event.target.id === "taskModal") {
            closeModal();
        }
    });

    document.getElementById("taskForm").addEventListener("submit", submitTaskForm);
    document.getElementById("deleteTaskButton").addEventListener("click", handleDeleteTask);
}

async function fetchTasks() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error("Task listesi alinamadi");
        }

        tasks = await response.json();
        filteredTasks = [...tasks];
        selectedTaskId = filteredTasks[0]?.id ?? null;
        updateProfile();
        renderApp();
    } catch (error) {
        console.error("Veri cekme hatasi:", error);
        showInlineError("Gorevler yuklenemedi. Lutfen backend baglantisini kontrol edin.");
    }
}

function filterTasks(query) {
    const normalized = query.trim().toLowerCase();

    filteredTasks = tasks.filter((task) => {
        if (!normalized) {
            return true;
        }

        const fields = [
            task.title,
            task.description,
            task.status,
            task.priority,
            task.department,
            task.assignee?.fullName
        ].filter(Boolean);

        return fields.some((field) => field.toLowerCase().includes(normalized));
    });

    if (!filteredTasks.some((task) => task.id === selectedTaskId)) {
        selectedTaskId = filteredTasks[0]?.id ?? null;
    }

    renderApp();
}

function renderApp() {
    const scopedTasks = selectedDepartment === "ALL"
        ? filteredTasks
        : filteredTasks.filter((task) => task.department === selectedDepartment);

    renderDashboard(scopedTasks);
    renderTaskDetails(scopedTasks);
    renderGroupWorkspace(scopedTasks);
    renderCalendar(scopedTasks);
    renderAnalytics(scopedTasks);
}

function setActiveView(viewId) {
    currentView = viewId;

    document.querySelectorAll(".view").forEach((view) => {
        view.classList.toggle("active", view.id === viewId);
    });

    document.querySelectorAll(".nav-item").forEach((item) => {
        item.classList.toggle("active", item.dataset.view === viewId);
    });
}

function renderDashboard(currentTasks) {
    const focusTask = getPrimaryTask(currentTasks);
    const secondaryTasks = currentTasks.filter((task) => task.id !== focusTask?.id).slice(0, 3);
    const completedCount = currentTasks.filter((task) => task.status === "DONE").length;
    const totalEstimated = sumOf(currentTasks, "estimatedHours");
    const totalRemaining = sumOf(currentTasks, "remainingHours");
    const completionRate = currentTasks.length ? Math.round((completedCount / currentTasks.length) * 100) : 0;
    const efficiencyHours = Math.max(0, totalEstimated - totalRemaining);

    document.getElementById("heroSubtitle").textContent =
        `${formatToday()} - You have ${currentTasks.filter((task) => task.priority === "HIGH").length} critical focuses.`;
    document.getElementById("heroProject").textContent =
        focusTask ? `Project: ${focusTask.title}` : "Project: Editorial Flow Refresh";

    document.getElementById("focusTask").innerHTML = focusTask
        ? renderFocusTask(focusTask)
        : `<div class="task-description">Henuz gorev yok. Yeni bir gorev ekleyerek bu alani doldurabilirsiniz.</div>`;

    document.getElementById("focusList").innerHTML = secondaryTasks.length
        ? secondaryTasks.map(renderStackItem).join("")
        : `<div class="detail-item"><div class="checkmark"></div><div><strong>No follow-up tasks</strong><span>Once you add more tasks they will appear here.</span></div><span>--</span></div>`;

    document.getElementById("efficiencyValue").innerHTML = `${efficiencyHours.toFixed(1)}<span>/6h</span>`;
    document.getElementById("focusRate").textContent = `${completionRate}%`;
    document.getElementById("focusRateLabel").textContent = `${completionRate}%`;
    document.getElementById("estimatedHours").textContent = `${totalEstimated.toFixed(1)} hrs`;
    document.getElementById("remainingHours").textContent = `${totalRemaining.toFixed(1)} hrs`;
    document.getElementById("efficiencyBar").style.width = `${Math.min(completionRate || 8, 100)}%`;

    const slots = buildTimeSlots(currentTasks);
    document.getElementById("timeSlots").innerHTML = slots.map(renderTimeSlot).join("");

    if (focusTask) {
        document.getElementById("insightTitle").textContent =
            `${focusTask.title} icin en guclu penceren 10:00 - 12:00 araligi.`;
        document.getElementById("insightText").textContent =
            `${PRIORITY_LABELS[focusTask.priority] || "Priority task"} yogunlugu yuksek. Bu gorevi sabah derin odak bloguna yerlestirmen verimi artirir.`;
    }
}

function renderTaskDetails(currentTasks) {
    const list = currentTasks.slice(0, 5);
    const activeTask = currentTasks.find((task) => task.id === selectedTaskId) || getPrimaryTask(currentTasks);

    document.getElementById("taskDetailList").innerHTML = list.length
        ? list.map((task) => renderDetailItem(task, task.id === activeTask?.id)).join("")
        : `<div class="detail-item"><div class="checkmark"></div><div><strong>No tasks found</strong><span>Search filtresini temizleyip tekrar deneyin.</span></div><span>--</span></div>`;
}

function renderGroupWorkspace(currentTasks) {
    const velocity = currentTasks.length
        ? Math.round((currentTasks.filter((task) => task.status === "DONE").length / currentTasks.length) * 100)
        : 0;
    const dueSoon = currentTasks.filter((task) => daysUntil(task.dueDate) <= 3 && daysUntil(task.dueDate) >= 0).length;
    const activeSprintCount = currentTasks.filter((task) => task.status !== "DONE").length;

    document.getElementById("velocityPercent").textContent = `${velocity}%`;
    document.getElementById("velocityBar").style.width = `${Math.max(velocity, 8)}%`;
    document.getElementById("activeSprints").textContent = activeSprintCount;
    document.getElementById("dueSoonLabel").textContent = `${dueSoon} due soon`;
    document.getElementById("riskLevel").textContent = velocity > 65 ? "Low" : velocity > 35 ? "Moderate" : "High";

    renderDepartmentTabs(currentTasks);
    renderPresenceList(currentTasks);
    renderKanban(currentTasks);
}

function renderCalendar(currentTasks) {
    const unscheduled = currentTasks.slice(0, 3);
    document.getElementById("calendarMonth").textContent = formatCalendarHeading();
    document.getElementById("unscheduledList").innerHTML = unscheduled.length
        ? unscheduled.map(renderUnscheduledCard).join("")
        : `<div class="unscheduled-card"><strong>No unscheduled tasks</strong><span>Everything looks organized for this week.</span></div>`;

    const hours = ["08 AM", "09 AM", "10 AM", "11 AM", "12 PM", "01 PM", "02 PM", "03 PM", "04 PM", "05 PM"];
    const days = ["Mon 14", "Tue 15", "Wed 16", "Thu 17", "Fri 18", "Sat 19", "Sun 20"];
    const events = buildCalendarEvents(currentTasks);

    let markup = `<div class="calendar-time-header"><i class="fa-regular fa-clock"></i></div>`;
    markup += days.map((day, index) => `<div class="calendar-day-header ${index === 1 ? "highlight" : ""}">${day}</div>`).join("");

    hours.forEach((hour) => {
        markup += `<div class="calendar-time">${hour}</div>`;

        days.forEach((day, index) => {
            const dayEvents = events.filter((event) => event.dayIndex === index && event.hour === hour);
            markup += `<div class="calendar-cell ${index === 1 ? "highlight" : ""}">${dayEvents.map(renderCalendarEvent).join("")}</div>`;
        });
    });

    document.getElementById("calendarGrid").innerHTML = markup;
}

function renderAnalytics(currentTasks) {
    const completion = currentTasks.length
        ? Math.round((currentTasks.filter((task) => task.status === "DONE").length / currentTasks.length) * 100)
        : 0;

    document.getElementById("analyticsCompletion").textContent = `${completion}%`;
    document.getElementById("statusBreakdown").innerHTML = STATUS_ORDER
        .map((status) => createBreakdownRow(STATUS_LABELS[status], currentTasks.filter((task) => task.status === status).length, currentTasks.length))
        .join("");

    const departmentCounts = countBy(currentTasks, "department");
    document.getElementById("departmentBreakdown").innerHTML = Object.keys(DEPARTMENT_LABELS)
        .map((department) => createBreakdownRow(DEPARTMENT_LABELS[department], departmentCounts[department] || 0, currentTasks.length))
        .join("");
}

function renderDepartmentTabs(currentTasks) {
    const tabs = ["ALL", ...Object.keys(DEPARTMENT_LABELS)];
    const container = document.getElementById("departmentTabs");

    container.innerHTML = tabs.map((tab) => {
        const label = tab === "ALL" ? "All Departments" : DEPARTMENT_LABELS[tab];
        return `<button class="department-tab ${selectedDepartment === tab ? "active" : ""}" data-department="${tab}">${label}</button>`;
    }).join("");

    container.querySelectorAll(".department-tab").forEach((button) => {
        button.addEventListener("click", () => {
            selectedDepartment = button.dataset.department;
            renderApp();
        });
    });
}

function renderPresenceList(currentTasks) {
    const uniqueUsers = deduplicateUsers(currentTasks);
    const container = document.getElementById("teamPresence");

    container.innerHTML = uniqueUsers.length
        ? uniqueUsers.map((user, index) => `
            <article class="presence-card">
                <img src="${avatarForUser(user)}" alt="${escapeHtml(user.fullName)}">
                <div>
                    <strong>${escapeHtml(user.fullName)}</strong>
                    <span>${escapeHtml(user.title || "Team Member")} • ${index % 3 === 2 ? "Away" : "Online"}</span>
                </div>
                <i class="fa-solid fa-message"></i>
            </article>
        `).join("")
        : `<article class="presence-card"><div class="presence-dot"></div><div><strong>No team data</strong><span>Add assignees to tasks for team presence.</span></div><i class="fa-solid fa-message"></i></article>`;
}

function renderKanban(currentTasks) {
    const container = document.getElementById("kanbanBoard");

    container.innerHTML = STATUS_ORDER.map((status) => {
        const items = currentTasks.filter((task) => task.status === status);
        return `
            <section class="kanban-column">
                <h4>${STATUS_LABELS[status]} ${items.length ? `<span>(${items.length})</span>` : ""}</h4>
                <div class="kanban-stack">
                    ${items.length ? items.map(renderKanbanCard).join("") : `<div class="kanban-card"><strong>No tasks</strong><span>Drop work here later.</span></div>`}
                </div>
            </section>
        `;
    }).join("");

    container.querySelectorAll(".kanban-card[data-id]").forEach((card) => {
        card.addEventListener("click", () => {
            const task = tasks.find((item) => item.id === Number(card.dataset.id));
            if (task) {
                openEditModal(task);
            }
        });
    });
}

function buildTimeSlots(currentTasks) {
    const focus = getPrimaryTask(currentTasks);
    const secondary = currentTasks.find((task) => task.id !== focus?.id);
    const third = currentTasks.find((task) => task.id !== focus?.id && task.id !== secondary?.id);

    return [
        { time: "09:00", label: focus?.title || "Deep Work", style: "green" },
        { time: "11:30", label: "Free Slot - 45m available", style: "outline" },
        { time: "12:30", label: secondary?.title || "Lunch Break", style: "violet" },
        { time: "14:00", label: third?.title || "Team Sync", style: "blue" }
    ];
}

function buildCalendarEvents(currentTasks) {
    const hours = ["08 AM", "09 AM", "10 AM", "11 AM", "02 PM"];
    return currentTasks.slice(0, 5).map((task, index) => ({
        title: task.title,
        time: `${["08:30", "09:00", "10:00", "11:00", "14:00"][index] || "09:30"} - ${["10:15", "10:00", "12:30", "12:00", "15:00"][index] || "10:30"}`,
        dayIndex: index % 5,
        hour: hours[index] || "09 AM",
        className: index % 3 === 0 ? "blue" : index % 3 === 1 ? "green" : "violet"
    }));
}

function renderFocusTask(task) {
    return `
        <div class="task-kicker">
            <span class="tag ${tagClass(task.department)}">${escapeHtml(DEPARTMENT_LABELS[task.department] || task.department || "Task")}</span>
            <span>${escapeHtml(PRIORITY_LABELS[task.priority] || "Priority")}</span>
        </div>
        <h3 class="task-title">${escapeHtml(task.title)}</h3>
        <p class="task-description">${escapeHtml(task.description || "No description yet.")}</p>
        <div class="task-kicker">
            <span><i class="fa-regular fa-clock"></i> ${formatHours(task.remainingHours)} left</span>
            <span><i class="fa-regular fa-calendar"></i> ${formatDate(task.dueDate)}</span>
            <div class="assignee-group">${renderAssignees(task.assignee)}</div>
        </div>
    `;
}

function renderStackItem(task) {
    return `
        <article class="stack-item">
            <div class="checkmark"></div>
            <div>
                <strong>${escapeHtml(task.title)}</strong>
                <span>${escapeHtml(task.description || "No description")}</span>
            </div>
            <span>${formatShortTime(task)}</span>
        </article>
    `;
}

function renderDetailItem(task, selected) {
    return `
        <article class="detail-item" data-id="${task.id}" style="${selected ? "border:1px solid rgba(15,110,168,0.22);" : ""}">
            <div class="checkmark"></div>
            <div>
                <strong>${escapeHtml(task.title)}</strong>
                <span>${escapeHtml(task.description || "No description")}</span>
            </div>
            <span>${formatDate(task.dueDate)}</span>
        </article>
    `;
}

function renderTimeSlot(slot) {
    return `
        <div class="time-slot">
            <strong>${slot.time}</strong>
            <div class="time-pill ${slot.style}">${escapeHtml(slot.label)}</div>
        </div>
    `;
}

function renderUnscheduledCard(task) {
    const klass = task.department === "GROUP" ? "group" : task.department === "EDITORIAL" ? "work" : "";
    return `
        <article class="unscheduled-card ${klass}">
            <span class="tag ${tagClass(task.department)}">${escapeHtml(DEPARTMENT_LABELS[task.department] || task.department || "Task")}</span>
            <strong>${escapeHtml(task.title)}</strong>
            <div class="calendar-card-meta">
                <span><i class="fa-regular fa-clock"></i> ${formatHours(task.estimatedHours)}</span>
                <span><i class="fa-regular fa-calendar"></i> ${formatDate(task.dueDate)}</span>
            </div>
        </article>
    `;
}

function renderCalendarEvent(event) {
    return `
        <article class="calendar-event ${event.className}">
            <span class="time">${event.time}</span>
            <strong>${escapeHtml(event.title)}</strong>
        </article>
    `;
}

function renderKanbanCard(task) {
    const progress = task.estimatedHours
        ? Math.max(0, Math.min(100, Math.round(((task.estimatedHours - (task.remainingHours || 0)) / task.estimatedHours) * 100)))
        : 0;

    return `
        <article class="kanban-card ${String(task.priority || "").toLowerCase()}" data-id="${task.id}">
            <span class="tag ${tagClass(task.department)}">${escapeHtml(DEPARTMENT_LABELS[task.department] || task.department || "Task")}</span>
            <strong>${escapeHtml(task.title)}</strong>
            <p>${escapeHtml(task.description || "No description")}</p>
            <div class="kanban-meta">
                <span><i class="fa-regular fa-calendar"></i> ${formatDate(task.dueDate)}</span>
                <span>${progress}% complete</span>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
        </article>
    `;
}

function createBreakdownRow(label, count, total) {
    const percentage = total ? Math.round((count / total) * 100) : 0;
    return `
        <div class="breakdown-row">
            <span>${escapeHtml(label)}</span>
            <div class="bar"><span style="width:${Math.max(percentage, count ? 8 : 0)}%"></span></div>
            <strong>${count}</strong>
        </div>
    `;
}

function openCreateModal(defaultStatus = "TO_DO") {
    document.getElementById("modalHeading").textContent = "Create Task";
    document.getElementById("taskForm").reset();
    document.getElementById("modalTaskId").value = "";
    document.getElementById("modalStatus").value = defaultStatus;
    document.getElementById("modalPriority").value = "MEDIUM";
    document.getElementById("modalDepartment").value = "EDITORIAL";
    document.getElementById("modalEstimatedHours").value = 2;
    document.getElementById("modalRemainingHours").value = 2;
    document.getElementById("deleteTaskButton").classList.add("hidden");
    document.getElementById("taskModal").classList.remove("hidden");
}

function openEditModal(task) {
    document.getElementById("modalHeading").textContent = "Edit Task";
    document.getElementById("modalTaskId").value = task.id;
    document.getElementById("modalTitle").value = task.title || "";
    document.getElementById("modalDescription").value = task.description || "";
    document.getElementById("modalStatus").value = task.status || "TO_DO";
    document.getElementById("modalPriority").value = task.priority || "MEDIUM";
    document.getElementById("modalDepartment").value = task.department || "EDITORIAL";
    document.getElementById("modalDueDate").value = task.dueDate || "";
    document.getElementById("modalEstimatedHours").value = task.estimatedHours ?? 2;
    document.getElementById("modalRemainingHours").value = task.remainingHours ?? 2;
    document.getElementById("deleteTaskButton").classList.remove("hidden");
    document.getElementById("taskModal").classList.remove("hidden");
}

function openSelectedTask() {
    const task = filteredTasks.find((item) => item.id === selectedTaskId) || filteredTasks[0];
    if (task) {
        openEditModal(task);
    } else {
        openCreateModal();
    }
}

function closeModal() {
    document.getElementById("taskModal").classList.add("hidden");
}

async function submitTaskForm(event) {
    event.preventDefault();

    const taskId = document.getElementById("modalTaskId").value;
    const payload = {
        title: document.getElementById("modalTitle").value.trim(),
        description: document.getElementById("modalDescription").value.trim(),
        status: document.getElementById("modalStatus").value,
        priority: document.getElementById("modalPriority").value,
        department: document.getElementById("modalDepartment").value,
        dueDate: document.getElementById("modalDueDate").value || null,
        estimatedHours: parseNumber("modalEstimatedHours"),
        remainingHours: parseNumber("modalRemainingHours")
    };

    if (!payload.title) {
        alert("Task title is required.");
        return;
    }

    const method = taskId ? "PUT" : "POST";
    const url = taskId ? `${API_URL}/${taskId}` : API_URL;

    try {
        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error("Task kaydedilemedi");
        }

        closeModal();
        await fetchTasks();
    } catch (error) {
        console.error("Kaydetme hatasi:", error);
        alert("Task kaydedilemedi. Lutfen tekrar deneyin.");
    }
}

async function handleDeleteTask() {
    const taskId = document.getElementById("modalTaskId").value;
    if (!taskId) {
        return;
    }

    const confirmed = confirm("Bu gorevi silmek istediginize emin misiniz?");
    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${taskId}`, { method: "DELETE" });
        if (!response.ok) {
            throw new Error("Task silinemedi");
        }

        closeModal();
        await fetchTasks();
    } catch (error) {
        console.error("Silme hatasi:", error);
        alert("Task silinemedi. Lutfen tekrar deneyin.");
    }
}

function updateProfile() {
    const assignee = deduplicateUsers(tasks)[0];
    if (!assignee) {
        return;
    }

    document.getElementById("profileAvatar").src = avatarForUser(assignee);
    document.getElementById("profileName").textContent = assignee.fullName || "Team Member";
    document.getElementById("profileRole").textContent = assignee.title || "Contributor";
}

function getPrimaryTask(currentTasks) {
    const sorted = [...currentTasks].sort((left, right) => {
        const leftPriority = priorityScore(left.priority);
        const rightPriority = priorityScore(right.priority);

        if (rightPriority !== leftPriority) {
            return rightPriority - leftPriority;
        }

        return daysUntil(left.dueDate) - daysUntil(right.dueDate);
    });

    return sorted[0];
}

function priorityScore(priority) {
    return priority === "HIGH" ? 3 : priority === "MEDIUM" ? 2 : 1;
}

function deduplicateUsers(currentTasks) {
    const map = new Map();

    currentTasks.forEach((task) => {
        if (task.assignee?.id && !map.has(task.assignee.id)) {
            map.set(task.assignee.id, task.assignee);
        }
    });

    return [...map.values()];
}

function countBy(items, field) {
    return items.reduce((acc, item) => {
        const key = item[field] || "UNKNOWN";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
}

function sumOf(items, field) {
    return items.reduce((sum, item) => sum + Number(item[field] || 0), 0);
}

function formatToday() {
    return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric"
    }).format(new Date());
}

function formatCalendarHeading() {
    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric"
    }).format(new Date());
}

function formatDate(dateValue) {
    if (!dateValue) {
        return "No date";
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric"
    }).format(new Date(dateValue));
}

function daysUntil(dateValue) {
    if (!dateValue) {
        return Number.MAX_SAFE_INTEGER;
    }

    const today = new Date();
    const dueDate = new Date(dateValue);
    const diff = dueDate.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
    return Math.round(diff / (1000 * 60 * 60 * 24));
}

function formatHours(value) {
    const numeric = Number(value || 0);
    return `${numeric.toFixed(1)}h`;
}

function formatShortTime(task) {
    const days = daysUntil(task.dueDate);
    if (days === Number.MAX_SAFE_INTEGER) {
        return "--";
    }
    if (days <= 0) {
        return "Today";
    }
    return `${days}d`;
}

function avatarForUser(user) {
    return user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || "Team Member")}&background=0f6ea8&color=fff`;
}

function renderAssignees(assignee) {
    if (!assignee) {
        return "";
    }

    return `<img src="${avatarForUser(assignee)}" alt="${escapeHtml(assignee.fullName || "Assignee")}">`;
}

function parseNumber(id) {
    const value = parseFloat(document.getElementById(id).value);
    return Number.isNaN(value) ? 0 : value;
}

function tagClass(department) {
    return String(department || "").toLowerCase();
}

function showInlineError(message) {
    document.getElementById("focusTask").innerHTML = `<div class="task-description">${escapeHtml(message)}</div>`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

document.addEventListener("click", (event) => {
    const detailItem = event.target.closest(".detail-item[data-id]");
    if (detailItem) {
        selectedTaskId = Number(detailItem.dataset.id);
        if (currentView === "tasks-view") {
            renderTaskDetails(selectedDepartment === "ALL"
                ? filteredTasks
                : filteredTasks.filter((item) => item.department === selectedDepartment));
        }
    }

    if (event.target.id === "quickFocusButton" || event.target.closest("#quickFocusButton")) {
        const focusTask = getPrimaryTask(filteredTasks);
        if (focusTask) {
            openEditModal(focusTask);
        }
    }

    if (event.target.id === "shareTaskButton" || event.target.closest("#shareTaskButton")) {
        const focusTask = getPrimaryTask(filteredTasks);
        if (focusTask) {
            navigator.clipboard?.writeText(`${focusTask.title} - ${focusTask.description || ""}`);
            alert("Current focus copied to clipboard.");
        }
    }
});
