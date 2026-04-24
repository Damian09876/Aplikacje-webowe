import './style.css';
import { ProjectService, StoryService, TaskService, NotificationService } from "./service";
import { SessionService } from "./session";
import type { Story, Priority, Status, Task, AppNotification, User, UserRole, Project } from "./model";

// Inicjalizacja serwisów
const projectService = new ProjectService();
const storyService = new StoryService();
const session = new SessionService();
const taskService = new TaskService();
const notificationService = new NotificationService();

// Elementy widoków
const loginView = document.getElementById("login-view")!;
const guestView = document.getElementById("guest-view")!;
const appView = document.getElementById("app-view")!;
const usersView = document.getElementById("users-view")!;

// Elementy navbar
const userInfo = document.getElementById("user-info")!;
const adminLinks = document.getElementById("admin-links")!;
const logoutBtn = document.getElementById("logoutBtn") as HTMLButtonElement;
const notificationSection = document.getElementById("notification-section")!;
const showUsersBtn = document.getElementById("showUsersBtn") as HTMLButtonElement;
const brandLink = document.getElementById("brand-link")!;

// Elementy logowania
const googleLoginBtn = document.getElementById("googleLoginBtn") as HTMLButtonElement;
const loginEmailInput = document.getElementById("loginEmail") as HTMLInputElement;

// --- ZARZĄDZANIE WIDOKAMI ---

async function showView(viewId: 'login' | 'guest' | 'app' | 'users') {
  [loginView, guestView, appView, usersView].forEach((v: HTMLElement) => v.classList.add('d-none'));
  
  if (viewId === 'login') {
    loginView.classList.remove('d-none');
    userInfo.classList.add('d-none');
    logoutBtn.classList.add('d-none');
    adminLinks.classList.add('d-none');
    notificationSection.classList.add('d-none');
  } else if (viewId === 'guest') {
    guestView.classList.remove('d-none');
    userInfo.classList.remove('d-none');
    logoutBtn.classList.remove('d-none');
  } else if (viewId === 'app') {
    appView.classList.remove('d-none');
    userInfo.classList.remove('d-none');
    logoutBtn.classList.remove('d-none');
    notificationSection.classList.remove('d-none');
    if (session.getCurrentUser()?.role === 'admin') {
      adminLinks.classList.remove('d-none');
    }
    await renderProjects();
    loadUsersToSelect();
    await renderStories();
  } else if (viewId === 'users') {
    usersView.classList.remove('d-none');
    userInfo.classList.remove('d-none');
    logoutBtn.classList.remove('d-none');
    adminLinks.classList.remove('d-none');
    renderUserList();
  }
}

// --- LOGOWANIE (Mock OAuth) ---

googleLoginBtn.addEventListener('click', async () => {
  const email = loginEmailInput.value.trim() || "user@example.com";
  const firstName = email.split('@')[0];
  const lastName = "User";
  
  const { user, isNewUser } = await session.login({
    id: crypto.randomUUID(),
    email,
    firstName,
    lastName
  });

  if (isNewUser) {
    await notifyAdmins("Nowy Użytkownik", `Nowe konto w systemie: ${user.email} (${user.firstName} ${user.lastName})`, 'high');
  }

  window.location.reload();
});

logoutBtn.addEventListener('click', () => session.logout());

// --- INICJALIZACJA SESJI ---

let currentUser: User | null = null;

// --- ZARZĄDZANIE UŻYTKOWNIKAMI (ADMIN) ---

showUsersBtn.addEventListener('click', () => showView('users'));
document.getElementById('backToAppBtn')?.addEventListener('click', () => showView('app'));
brandLink.addEventListener('click', async (e) => {
    e.preventDefault();
    if (currentUser && currentUser.role !== 'guest' && !currentUser.isBlocked) await showView('app');
});

function renderUserList() {
  const users = session.getAllUsers();
  const listBody = document.getElementById("user-list-body")!;
  listBody.innerHTML = "";

  users.forEach((u: User) => {
    const isSuperAdmin = u.email === session.getSuperAdminEmail();
    const tr = document.createElement("tr");
    
    tr.innerHTML = `
      <td>
        <div class="fw-bold">${u.firstName} ${u.lastName}</div>
        <small class="text-muted">${u.id}</small>
      </td>
      <td>${u.email}</td>
      <td>
        <select class="form-select form-select-sm role-select" ${isSuperAdmin ? 'disabled' : ''}>
          <option value="guest" ${u.role === 'guest' ? 'selected' : ''}>Gość</option>
          <option value="developer" ${u.role === 'developer' ? 'selected' : ''}>Developer</option>
          <option value="devops" ${u.role === 'devops' ? 'selected' : ''}>DevOps</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
      <td>
        <span class="badge bg-${u.isBlocked ? 'danger' : 'success'}">${u.isBlocked ? 'Zablokowany' : 'Aktywny'}</span>
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-${u.isBlocked ? 'success' : 'danger'} block-btn" ${isSuperAdmin ? 'disabled' : ''}>
          ${u.isBlocked ? 'Odblokuj' : 'Zablokuj'}
        </button>
      </td>
    `;

    tr.querySelector(".role-select")?.addEventListener("change", async (e) => {
      const newRole = (e.target as HTMLSelectElement).value as UserRole;
      await session.updateUserRole(u.id, newRole);
      await notifyUser(u.id, "Zmiana uprawnień", `Twoja rola została zmieniona na: ${newRole}`, 'medium');
    });

    tr.querySelector(".block-btn")?.addEventListener("click", async () => {
      await session.toggleUserBlock(u.id);
      renderUserList();
    });

    listBody.appendChild(tr);
  });
}

// --- THEME MANAGEMENT ---
const themeToggle = document.getElementById("themeToggle") as HTMLButtonElement;
const themeIcon = document.getElementById("themeIcon") as HTMLElement;
const htmlElement = document.documentElement;

const getStoredTheme = () => localStorage.getItem('theme');
const setStoredTheme = (theme: string) => localStorage.setItem('theme', theme);

const applyTheme = (theme: string) => {
  htmlElement.setAttribute('data-bs-theme', theme);
  if (theme === 'dark') {
    themeIcon.className = 'bi bi-sun';
    themeToggle.classList.replace('btn-outline-secondary', 'btn-outline-warning');
  } else {
    themeIcon.className = 'bi bi-moon-stars';
    themeToggle.classList.replace('btn-outline-warning', 'btn-outline-secondary');
  }
};

const savedTheme = getStoredTheme() || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const currentTheme = htmlElement.getAttribute('data-bs-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setStoredTheme(newTheme);
  applyTheme(newTheme);
});

// Elementy DOM - Użytkownik i Projekty
const nameInput = document.getElementById("name") as HTMLInputElement;
const descInput = document.getElementById("description") as HTMLInputElement;
const addBtn = document.getElementById("addBtn") as HTMLButtonElement;
const projectList = document.getElementById("projects") as HTMLUListElement;
const taskUserSelect = document.getElementById("taskUser") as HTMLSelectElement;

// Elementy DOM - Historyjki (Stories)
const storySection = document.getElementById("story-section") as HTMLElement;
const noProjectAlert = document.getElementById("no-project-alert") as HTMLElement;
const storyNameInput = document.getElementById("storyName") as HTMLInputElement;
const storyDescInput = document.getElementById("storyDesc") as HTMLInputElement;
const storyPriority = document.getElementById("storyPriority") as HTMLSelectElement;
const addStoryBtn = document.getElementById("addStoryBtn") as HTMLButtonElement;

const taskNameInput = document.getElementById("taskName") as HTMLInputElement;
const taskDescInput = document.getElementById("taskDesc") as HTMLInputElement;
const taskPriorityInput = document.getElementById("taskPriority") as HTMLSelectElement;
const taskTimeInput = document.getElementById("taskTime") as HTMLInputElement;
const addTaskBtn = document.getElementById("addTaskBtn") as HTMLButtonElement;

// Elementy DOM - Powiadomienia
const notificationBtn = document.getElementById("notificationBtn") as HTMLButtonElement;
const notificationBadge = document.getElementById("notificationBadge") as HTMLElement;
const notificationList = document.getElementById("notificationList") as HTMLElement;
const markAllReadBtn = document.getElementById("markAllReadBtn") as HTMLButtonElement;
const toastContainer = document.getElementById("toastContainer") as HTMLElement;

let editingProjectId: string | null = null;
let selectedStoryId: string | null = null;
let selectedTask: Task | null = null;

// --- POWIADOMIENIA UI LOGIKA ---

async function updateNotificationBadge() {
  if (!currentUser) return;
  const count = await notificationService.getUnreadCount(currentUser.id);
  if (count > 0) {
    notificationBadge.innerText = count.toString();
    notificationBadge.classList.remove('d-none');
  } else {
    notificationBadge.classList.add('d-none');
  }
}

async function renderNotificationList() {
  if (!currentUser) return;
  const notifications = await notificationService.getAll(currentUser.id);
  notificationList.innerHTML = "";

  if (notifications.length === 0) {
    notificationList.innerHTML = `<div class="p-4 text-center text-muted">Brak powiadomień</div>`;
    return;
  }

  notifications.forEach((notif: AppNotification) => {
    const item = document.createElement("a");
    item.href = "#";
    const priorityColor = notif.priority === 'high' ? 'danger' : (notif.priority === 'medium' ? 'warning' : 'info');
    item.className = `list-group-item list-group-item-action border-start border-4 border-${priorityColor} ${notif.isRead ? 'opacity-75' : 'bg-primary-subtle bg-opacity-10 fw-bold'}`;
    
    item.innerHTML = `
      <div class="d-flex w-100 justify-content-between">
        <h6 class="mb-1">${notif.title}</h6>
        <small class="text-muted">${new Date(notif.date).toLocaleTimeString()}</small>
      </div>
      <p class="mb-1 small">${notif.message}</p>
      <div class="d-flex justify-content-between align-items-center mt-2">
        <small class="text-muted">${new Date(notif.date).toLocaleDateString()}</small>
        ${!notif.isRead ? `<button class="btn btn-xs btn-outline-primary mark-read-btn">Oznacz jako przeczytane</button>` : ''}
      </div>
    `;

    item.querySelector(".mark-read-btn")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      e.preventDefault();
      await notificationService.markAsRead(notif.id);
      await renderNotificationList();
      await updateNotificationBadge();
    });

    item.addEventListener("click", async (e) => {
      e.preventDefault();
      await showNotificationDetail(notif);
    });

    notificationList.appendChild(item);
  });
}

async function showNotificationDetail(notif: AppNotification) {
  await notificationService.markAsRead(notif.id);
  await updateNotificationBadge();
  await renderNotificationList();

  const title = document.getElementById("notificationDetailTitle")!;
  const date = document.getElementById("notificationDetailDate")!;
  const message = document.getElementById("notificationDetailMessage")!;
  const header = document.getElementById("notificationDetailHeader")!;

  const priorityColor = notif.priority === 'high' ? 'danger' : (notif.priority === 'medium' ? 'warning' : 'info');
  header.className = `modal-header bg-${priorityColor} text-white`;

  title.innerText = notif.title;
  date.innerText = new Date(notif.date).toLocaleString();
  message.innerText = notif.message;

  // @ts-ignore
  const detailModal = new bootstrap.Modal(document.getElementById("notificationDetailModal"));
  detailModal.show();
}

function showToast(notif: AppNotification) {
  if (notif.priority === 'low') return;

  const toastEl = document.createElement("div");
  const priorityColor = notif.priority === 'high' ? 'danger' : 'warning';
  toastEl.className = `toast shadow-lg border-0 border-start border-4 border-${priorityColor}`;
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');

  toastEl.innerHTML = `
    <div class="toast-header">
      <strong class="me-auto text-${priorityColor}"><i class="bi bi-exclamation-triangle-fill me-2"></i>Nowe Powiadomienie</strong>
      <small>przed chwilą</small>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
    <div class="toast-body">
      <div class="fw-bold">${notif.title}</div>
      <div class="small">${notif.message}</div>
    </div>
  `;

  toastContainer.appendChild(toastEl);
  // @ts-ignore
  const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
  toast.show();

  toastEl.addEventListener('hidden.bs.toast', () => {
    toastEl.remove();
  });
}

notificationBtn.addEventListener("click", async () => {
  await renderNotificationList();
  // @ts-ignore
  const modal = new bootstrap.Modal(document.getElementById("notificationsModal"));
  modal.show();
});

markAllReadBtn.addEventListener("click", async () => {
  if (currentUser) {
    await notificationService.markAllAsRead(currentUser.id);
    await renderNotificationList();
    await updateNotificationBadge();
  }
});

window.addEventListener('new-notification', (async (e: any) => {
  await updateNotificationBadge();
  showToast(e.detail);
}) as EventListener);

window.addEventListener('notification-updated', async () => {
  await updateNotificationBadge();
});

// --- HELPER POWIADOMIENIA TRIGGERS ---

async function notifyAdmins(title: string, message: string, priority: Priority) {
  const admins = session.getAllUsers().filter((u: User) => u.role === 'admin');
  for (const admin of admins) {
    await notificationService.create({
      id: crypto.randomUUID(),
      title,
      message,
      date: new Date().toISOString(),
      priority,
      isRead: false,
      recipientId: admin.id
    });
  }
}

async function notifyUser(userId: string, title: string, message: string, priority: Priority) {
  await notificationService.create({
    id: crypto.randomUUID(),
    title,
    message,
    date: new Date().toISOString(),
    priority,
    isRead: false,
    recipientId: userId
  });
}

// --- RENDEROWANIE PROJEKTÓW ---
async function renderProjects() {
  projectList.innerHTML = "";
  const projects = await projectService.getAll();
  const activeProjectId = session.getActiveProjectId();

  projects.forEach((project: Project) => {
    const isActive = project.id === activeProjectId;
    const li = document.createElement("div");
    li.className = `list-group-item list-group-item-action d-flex justify-content-between align-items-center border-0 mb-1 rounded ${isActive ? "active-project shadow-sm" : ""}`;
    li.innerHTML = `
      <div class="project-info py-1" style="cursor:pointer; flex-grow: 1;">
        <h6 class="mb-0 fw-semibold">${project.name}</h6>
        <small class="text-muted text-truncate d-block" style="max-width: 150px;">${project.description || 'Brak opisu'}</small>
      </div>
      <div class="btn-group btn-group-sm opacity-75">
        <button class="btn btn-link text-secondary p-1 edit-btn" title="Edytuj"><i class="bi bi-pencil-square"></i></button>
        <button class="btn btn-link text-danger p-1 delete-btn" title="Usuń"><i class="bi bi-trash"></i></button>
      </div>
    `;

    li.querySelector(".project-info")?.addEventListener("click", async () => {
      session.setActiveProject(project.id);
      await renderProjects();
      await renderStories();
    });

    li.querySelector(".edit-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      nameInput.value = project.name;
      descInput.value = project.description;
      editingProjectId = project.id;
      addBtn.innerText = "Zapisz zmiany";
      addBtn.classList.replace('btn-primary', 'btn-warning');
      nameInput.focus();
    });

    li.querySelector(".delete-btn")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      if(confirm(`Czy na pewno chcesz usunąć projekt "${project.name}"?`)) {
        await projectService.delete(project.id);
        if (session.getActiveProjectId() === project.id) {
          localStorage.removeItem("active_project_id");
        }
        await renderProjects();
        await renderStories();
      }
    });

    projectList.appendChild(li);
  });
}

// --- RENDEROWANIE HISTORYJEK (BOARD) ---
async function renderStories() {
  const activeProjectId = session.getActiveProjectId();
  
  if (!activeProjectId) {
    storySection.style.display = "none";
    noProjectAlert.style.display = "flex";
    return;
  }

  storySection.style.display = "block";
  noProjectAlert.style.display = "none";
  const stories = await storyService.getAll(activeProjectId);

  const cols: Record<Status, HTMLElement> = {
    todo: document.getElementById("col-todo")!,
    doing: document.getElementById("col-doing")!,
    done: document.getElementById("col-done")!
  };

  Object.values(cols).forEach((c: HTMLElement) => c.innerHTML = "");

  stories.forEach((story: Story) => {
    const div = document.createElement("div");
    const priorityColor = story.priority === 'high' ? 'danger' : (story.priority === 'medium' ? 'warning' : 'success');
    const isSelected = selectedStoryId === story.id;
    
    div.className = `card shadow-sm mb-3 story-card border-0 border-start border-4 border-${priorityColor} ${isSelected ? 'ring-2 ring-primary shadow' : ''}`;
    if (isSelected) div.style.boxShadow = '0 0 0 2px var(--bs-primary)';

    div.innerHTML = `
      <div class="card-body p-3">
        <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="card-title mb-0 fw-bold">${story.name}</h6>
            <span class="badge rounded-pill text-bg-${priorityColor}" style="font-size: 0.65rem;">${story.priority.toUpperCase()}</span>
        </div>
        <p class="card-text small text-muted mb-3">${story.description || 'Brak opisu'}</p>
        <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary flex-grow-1 next-status-btn">
                <i class="bi bi-arrow-right-circle me-1"></i>Przesuń
            </button>
             <button class="btn btn-sm btn-light select-story-btn">
                <i class="bi bi-eye"></i>
            </button>
        </div>
      </div>
    `;

    div.querySelector(".select-story-btn")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      selectedStoryId = story.id;
      await renderStories();
      await renderTasks(story.id);
    });

    div.querySelector(".next-status-btn")?.addEventListener("click", async (e) => {
        e.stopPropagation();
        const nextStatus: Record<Status, Status> = {
            'todo': 'doing',
            'doing': 'done',
            'done': 'todo'
        };
        const oldStatus = story.status;
        story.status = nextStatus[story.status];
        await storyService.update(story);
        
        // Notification for status change
        const priority: Priority = story.status === 'done' ? 'medium' : (story.status === 'doing' ? 'low' : 'low');
        await notifyUser(story.ownerId, "Zmiana statusu historyjki", `Historyjka "${story.name}" zmieniła status z ${oldStatus} na ${story.status}.`, priority);

        await renderStories();

        if (selectedStoryId === story.id) {
            await renderTasks(story.id);
        }
    });

    cols[story.status].appendChild(div);
  });
}

// --- EVENT LISTENERY ---

addBtn.addEventListener("click", async () => {
  if (!nameInput.value.trim()) return;
  
  if (editingProjectId) {
    await projectService.update({
      id: editingProjectId,
      name: nameInput.value,
      description: descInput.value
    });
    editingProjectId = null;
    addBtn.innerText = "Dodaj projekt";
    addBtn.classList.replace('btn-warning', 'btn-primary');
  } else {
    const newProject = {
      id: crypto.randomUUID(),
      name: nameInput.value,
      description: descInput.value
    };
    await projectService.create(newProject);
    
    // Notification for new project
    await notifyAdmins("Nowy Projekt", `Utworzono nowy projekt: "${newProject.name}"`, 'high');
  }
  nameInput.value = "";
  descInput.value = "";
  await renderProjects();
});

addStoryBtn.addEventListener("click", async () => {
  const activeId = session.getActiveProjectId();
  if (!activeId || !storyNameInput.value.trim() || !currentUser) return;

  const newStory: Story = {
    id: crypto.randomUUID(),
    name: storyNameInput.value,
    description: storyDescInput.value,
    priority: storyPriority.value as Priority,
    projectId: activeId,
    ownerId: currentUser.id,
    createdAt: new Date().toISOString(),
    status: 'todo'
  };

  await storyService.create(newStory);
  storyNameInput.value = "";
  storyDescInput.value = "";
  await renderStories();
});

async function renderTasks(storyId: string) {
  const tasks = await taskService.getByStory(storyId);
  const story = await storyService.getById(storyId);
  
  const cols: Record<Status, HTMLElement> = {
    todo: document.getElementById("col-todo")!,
    doing: document.getElementById("col-doing")!,
    done: document.getElementById("col-done")!
  };

  Object.values(cols).forEach((c: HTMLElement) => c.innerHTML = "");

  const backBtn = document.createElement("div");
  backBtn.className = "mb-3 w-100";
  backBtn.innerHTML = `<button class="btn btn-sm btn-outline-secondary w-100"><i class="bi bi-arrow-left me-1"></i>Powrót do Stories (${story?.name})</button>`;
  backBtn.onclick = async () => {
    selectedStoryId = null;
    await renderStories();
  };
  cols.todo.appendChild(backBtn);

  tasks.forEach((task: Task) => {
    const div = document.createElement("div");
    const priorityColor = task.priority === 'high' ? 'danger' : (task.priority === 'medium' ? 'warning' : 'success');
    
    div.className = `card mb-2 shadow-sm border-0 border-start border-3 border-${priorityColor}`;
    div.style.cursor = "pointer";
    div.onclick = async () => await showTaskDetails(task);
    
    const assignedUser = session.getAllUsers().find((u: User) => u.id === task.assignedUserId);

    div.innerHTML = `
      <div class="card-body p-2">
        <div class="d-flex justify-content-between align-items-start">
            <span class="fw-bold small flex-grow-1">${task.name}</span>
            <div class="btn-group btn-group-sm ms-2">
              <button class="btn btn-link text-danger p-0 delete-task-btn"><i class="bi bi-trash small"></i></button>
            </div>
        </div>
        <p class="small text-muted mb-1 text-truncate">${task.description || 'Brak opisu'}</p>
        <div class="d-flex justify-content-between align-items-center mt-2">
            <span class="badge bg-light text-dark border small" style="font-size: 0.6rem;">
                <i class="bi bi-person me-1"></i>${assignedUser ? assignedUser.firstName : "Nieprzypisany"}
            </span>
            ${task.status !== 'done' ? `<button class="btn btn-xs btn-success py-0 px-1 done-btn" style="font-size: 0.6rem;">Gotowe</button>` : '<i class="bi bi-check-all text-success"></i>'}
        </div>
      </div>
    `;

    div.querySelector(".delete-task-btn")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (confirm(`Czy usunąć task "${task.name}"?`)) {
        await taskService.delete(task.id);
        
        // Notification for deleted task
        if (story) {
           await notifyUser(story.ownerId, "Usunięcie zadania", `Usunięto zadanie "${task.name}" z historyjki "${story.name}".`, 'medium');
        }
        
        await renderTasks(storyId);
      }
    });

    div.querySelector(".done-btn")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      await finishTask(task);
      await renderTasks(storyId);
    });

    cols[task.status].appendChild(div);
  });
}

async function finishTask(task: Task) {
  task.status = "done";
  task.finishedAt = new Date().toISOString();
  await taskService.update(task);
  
  const story = await storyService.getById(task.storyId);
  if (story) {
    await notifyUser(story.ownerId, "Status zadania: DONE", `Zadanie "${task.name}" w historyjce "${story.name}" zostało ukończone.`, 'medium');
  }

  const tasks = await taskService.getByStory(task.storyId);
  const allDone = tasks.every((t: Task) => t.status === "done");

  if (allDone) {
    if (story) {
      story.status = "done";
      await storyService.update(story);
      await notifyUser(story.ownerId, "Historyjka ukończona", `Wszystkie zadania w historyjce "${story.name}" zostały ukończone. Status zmieniony na DONE.`, 'medium');
      await renderStories();
    }
  }
}

addTaskBtn.addEventListener("click", async () => {
  if (!selectedStoryId) {
    alert("Najpierw wybierz Story z tablicy!");
    return;
  }
  if (!taskNameInput.value.trim()) return;

  const newTask: Task = {
    id: crypto.randomUUID(),
    name: taskNameInput.value,
    description: taskDescInput.value,
    priority: taskPriorityInput.value as Priority,
    storyId: selectedStoryId,
    estimatedTime: Number(taskTimeInput.value),
    status: "todo",
    createdAt: new Date().toISOString()
  };

  if (taskUserSelect.value) {
    newTask.assignedUserId = taskUserSelect.value;
    newTask.status = "doing";
    newTask.startedAt = new Date().toISOString();
    
    // Notification for task assignment
    await notifyUser(newTask.assignedUserId, "Przypisanie do zadania", `Zostałeś przypisany do nowego zadania: "${newTask.name}"`, 'high');
  }

  await taskService.create(newTask);
  
  // Notification for new task in story
  const story = await storyService.getById(selectedStoryId);
  if (story) {
    await notifyUser(story.ownerId, "Nowe zadanie w historyjce", `Do Twojej historyjki "${story.name}" dodano nowe zadanie: "${newTask.name}".`, 'medium');
  }

  taskNameInput.value = "";
  taskDescInput.value = "";
  taskTimeInput.value = "";
  await renderTasks(selectedStoryId);
});

function loadUsersToSelect() {
  const users = session.getAllUsers().filter((u: User) => u.role !== "admin" && u.role !== "guest" && !u.isBlocked);
  taskUserSelect.innerHTML = `<option value="">Użytkownik</option>`;
  users.forEach((user: User) => {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = `${user.firstName} ${user.lastName}`;
    taskUserSelect.appendChild(option);
  });
}

async function showTaskDetails(task: Task) {
  selectedTask = task;
  const assignedUser = session.getAllUsers().find((u: User) => u.id === task.assignedUserId);
  const story = await storyService.getById(task.storyId);
  const details = document.getElementById("taskDetails")!;

  details.innerHTML = `
    <div class="list-group list-group-flush">
        <div class="list-group-item px-0">
            <small class="text-muted d-block text-uppercase fw-bold" style="font-size: 0.7rem;">Nazwa zadania</small>
            <span class="fw-semibold">${task.name}</span>
        </div>
        <div class="list-group-item px-0">
            <small class="text-muted d-block text-uppercase fw-bold" style="font-size: 0.7rem;">Opis</small>
            <span>${task.description || '-'}</span>
        </div>
        <div class="list-group-item px-0 d-flex justify-content-between">
            <div>
                <small class="text-muted d-block text-uppercase fw-bold" style="font-size: 0.7rem;">Priorytet</small>
                <span class="badge text-bg-${task.priority === 'high' ? 'danger' : (task.priority === 'medium' ? 'warning' : 'success')}">${task.priority}</span>
            </div>
            <div class="text-end">
                <small class="text-muted d-block text-uppercase fw-bold" style="font-size: 0.7rem;">Status</small>
                <span class="badge text-bg-secondary">${task.status}</span>
            </div>
        </div>
        <div class="list-group-item px-0">
            <small class="text-muted d-block text-uppercase fw-bold" style="font-size: 0.7rem;">Przypisany Użytkownik</small>
            <i class="bi bi-person me-1"></i>${assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : "Brak"}
        </div>
        <div class="list-group-item px-0 row g-0">
            <div class="col-6">
                <small class="text-muted d-block text-uppercase fw-bold" style="font-size: 0.7rem;">Przewidywany czas</small>
                <span><i class="bi bi-clock me-1"></i>${task.estimatedTime}h</span>
            </div>
             <div class="col-6">
                <small class="text-muted d-block text-uppercase fw-bold" style="font-size: 0.7rem;">Story</small>
                <span class="text-truncate d-block">${story?.name}</span>
            </div>
        </div>
        ${task.startedAt ? `<div class="list-group-item px-0 small text-muted">
            <i class="bi bi-calendar-play me-1"></i>Rozpoczęto: ${new Date(task.startedAt).toLocaleString()}
        </div>` : ''}
        ${task.finishedAt ? `<div class="list-group-item px-0 small text-success">
            <i class="bi bi-calendar-check me-1"></i>Zakończono: ${new Date(task.finishedAt).toLocaleString()}
        </div>` : ''}
    </div>
  `;

  // @ts-ignore
  const modal = new bootstrap.Modal(document.getElementById("taskModal"));
  modal.show();
}

const finishTaskBtn = document.getElementById("finishTaskBtn") as HTMLButtonElement;
finishTaskBtn.addEventListener("click", async () => {
  if (!selectedTask) return;
  await finishTask(selectedTask);
  await renderTasks(selectedTask.storyId);
  const modalEl = document.getElementById("taskModal")!;
  // @ts-ignore
  const modal = bootstrap.Modal.getInstance(modalEl);
  modal.hide();
});

// --- INICJALIZACJA APLIKACJI ---

async function init() {
  await session.initialize();
  currentUser = session.getCurrentUser();

  if (!currentUser) {
    await showView('login');
  } else if (currentUser.isBlocked) {
    userInfo.innerHTML = `<span class="badge bg-danger">Zablokowany: ${currentUser.email}</span>`;
    await showView('login');
    loginView.querySelector('.card-body')!.innerHTML = `
      <h2 class="text-danger">Konto Zablokowane</h2>
      <p>Twoje konto (${currentUser.email}) zostało zablokowane przez administratora.</p>
      <button class="btn btn-primary" onclick="localStorage.clear(); location.reload()">Wyloguj</button>
    `;
  } else if (currentUser.role === 'guest') {
    userInfo.innerHTML = `<span class="badge bg-secondary"><i class="bi bi-person me-1"></i>Gość: ${currentUser.firstName}</span>`;
    await showView('guest');
  } else {
    const roleColor = currentUser.role === 'admin' ? 'danger' : (currentUser.role === 'devops' ? 'info' : 'primary');
    userInfo.innerHTML = `<span class="badge bg-${roleColor}-subtle text-${roleColor} border border-${roleColor}-subtle p-2"><i class="bi bi-person-circle me-1"></i>${currentUser.firstName} (${currentUser.role})</span>`;
    await showView('app');
  }
  await updateNotificationBadge();
}

init();
