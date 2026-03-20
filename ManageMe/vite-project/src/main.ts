import { ProjectService, StoryService, TaskService} from "./service";
import { SessionService } from "./session";
import type { Story, Priority, Status, Task } from "./model";

// Inicjalizacja serwisów
const projectService = new ProjectService();
const storyService = new StoryService();
const session = new SessionService();
const taskService = new TaskService();
// Elementy DOM - Użytkownik i Projekty
const userInfo = document.getElementById("user-info") as HTMLElement;
const nameInput = document.getElementById("name") as HTMLInputElement;
const descInput = document.getElementById("description") as HTMLInputElement;
const addBtn = document.getElementById("addBtn") as HTMLButtonElement;
const projectList = document.getElementById("projects") as HTMLUListElement;
const taskUserSelect = document.getElementById("taskUser") as HTMLSelectElement;

// Elementy DOM - Historyjki (Stories)
const storySection = document.getElementById("story-section") as HTMLElement;
const storyNameInput = document.getElementById("storyName") as HTMLInputElement;
const storyDescInput = document.getElementById("storyDesc") as HTMLInputElement;
const storyPriority = document.getElementById("storyPriority") as HTMLSelectElement;
const addStoryBtn = document.getElementById("addStoryBtn") as HTMLButtonElement;

const taskNameInput = document.getElementById("taskName") as HTMLInputElement;
const taskDescInput = document.getElementById("taskDesc") as HTMLInputElement;
const taskPriorityInput = document.getElementById("taskPriority") as HTMLSelectElement;
const taskTimeInput = document.getElementById("taskTime") as HTMLInputElement;
const addTaskBtn = document.getElementById("addTaskBtn") as HTMLButtonElement;

let editingProjectId: string | null = null;
let selectedStoryId: string | null = null;
let selectedTask: Task | null = null;
// --- LOGIKA UŻYTKOWNIKA ---
const user = session.getCurrentUser();
userInfo.innerText = `Użytkownik: ${user.firstName} ${user.lastName}`;

// --- RENDEROWANIE PROJEKTÓW ---
function renderProjects() {
  projectList.innerHTML = "";
  const projects = projectService.getAll();
  const activeProjectId = session.getActiveProjectId();

  projects.forEach(project => {
    const li = document.createElement("div"); // Zmień li na div dla list-group-item
li.className = `list-group-item list-group-item-action d-flex justify-content-between align-items-center ${project.id === activeProjectId ? "active-project" : ""}`;
li.innerHTML = `
  <div class="project-info" style="cursor:pointer; flex-grow: 1;">
    <h6 class="mb-0">${project.name}</h6>
    <small class="text-muted">${project.description.substring(0, 30)}...</small>
  </div>
  <div class="btn-group btn-group-sm">
    <button class="btn btn-outline-secondary edit-btn">✏️</button>
    <button class="btn btn-outline-danger delete-btn">🗑️</button>
  </div>
`;

    // Wybór aktywnego projektu
    li.querySelector(".project-info")?.addEventListener("click", () => {
      session.setActiveProject(project.id);
      renderProjects();
      renderStories();
    });

    // Edycja
    li.querySelector(".edit-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      nameInput.value = project.name;
      descInput.value = project.description;
      editingProjectId = project.id;
      addBtn.innerText = "Zapisz zmiany";
    });

    // Usuwanie
    li.querySelector(".delete-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      projectService.delete(project.id);
      if (session.getActiveProjectId() === project.id) {
        localStorage.removeItem("active_project_id");
      }
      renderProjects();
      renderStories();
    });

    projectList.appendChild(li);
  });
}

// --- RENDEROWANIE HISTORYJEK (BOARD) ---
function renderStories() {
  const activeProjectId = session.getActiveProjectId();
  
  if (!activeProjectId) {
    storySection.style.display = "none";
    return;
  }

  storySection.style.display = "block";
  const stories = storyService.getAll(activeProjectId);

  const cols = {
    todo: document.getElementById("col-todo")!,
    doing: document.getElementById("col-doing")!,
    done: document.getElementById("col-done")!
  };

  // Czyścimy kolumny
  Object.values(cols).forEach(c => c.innerHTML = "");

  stories.forEach(story => {
    const div = document.createElement("div");
const priorityColor = story.priority === 'high' ? 'danger' : (story.priority === 'medium' ? 'warning' : 'success');
div.addEventListener("click", () => {
  selectedStoryId = story.id;
  renderTasks(story.id);
});
div.className = `card shadow-sm mb-2 story-card border-start border-4 border-${priorityColor}`;
div.innerHTML = `
  <div class="card-body p-2">
    <h6 class="card-title mb-1">${story.name}</h6>
    <p class="card-text small text-muted mb-2">${story.description}</p>
    <button class="btn btn-sm btn-light w-100 next-status-btn">➔ Przesuń</button>
  </div>
`;

    div.querySelector(".next-status-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        const nextStatus: Record<Status, Status> = {
            'todo': 'doing',
            'doing': 'done',
            'done': 'todo'
        };
        story.status = nextStatus[story.status];
        storyService.update(story);
        renderStories();

          if (selectedStoryId === story.id) {
        renderTasks(story.id);
    }
    });

    cols[story.status].appendChild(div);
  });
}

// --- EVENT LISTENERY ---

// Dodawanie/Edycja Projektu
addBtn.addEventListener("click", () => {
  if (editingProjectId) {
    projectService.update({
      id: editingProjectId,
      name: nameInput.value,
      description: descInput.value
    });
    editingProjectId = null;
    addBtn.innerText = "Dodaj projekt";
  } else {
    projectService.create({
      id: crypto.randomUUID(),
      name: nameInput.value,
      description: descInput.value
    });
  }
  nameInput.value = "";
  descInput.value = "";
  renderProjects();
});

// Dodawanie Historyjki
addStoryBtn.addEventListener("click", () => {
  const activeId = session.getActiveProjectId();
  if (!activeId) return;

  const newStory: Story = {
    id: crypto.randomUUID(),
    name: storyNameInput.value,
    description: storyDescInput.value,
    priority: storyPriority.value as Priority,
    projectId: activeId,
    ownerId: session.getCurrentUser().id,
    createdAt: new Date().toISOString(),
    status: 'todo'
  };

  storyService.create(newStory);
  storyNameInput.value = "";
  storyDescInput.value = "";
  renderStories();
});
function assignUserToTask(task: Task, userId: string) {
  task.assignedUserId = userId;
  task.status = "doing";
  task.startedAt = new Date().toISOString();

  taskService.update(task);

  // 🔥 update story
  const story = storyService.getAll(task.storyId).find(s => s.id === task.storyId);
  if (story && story.status === "todo") {
    story.status = "doing";
    storyService.update(story);
  }
}

function finishTask(task: Task) {
  task.status = "done";
  task.finishedAt = new Date().toISOString();

  taskService.update(task);

  // 🔥 sprawdzamy czy wszystkie taski skończone
  const tasks = taskService.getByStory(task.storyId);
  const allDone = tasks.every(t => t.status === "done");

  if (allDone) {
    const story = storyService.getAll(task.storyId).find(s => s.id === task.storyId);
    if (story) {
      story.status = "done";
      storyService.update(story);
    }
  }
}

function renderTasks(storyId: string) {
  const tasks = taskService.getByStory(storyId);
  console.log("TASKI:", tasks);
  const cols = {
    todo: document.getElementById("col-todo")!,
    doing: document.getElementById("col-doing")!,
    done: document.getElementById("col-done")!
  };

  Object.values(cols).forEach(c => c.innerHTML = "");

  tasks.forEach(task => {
    const div = document.createElement("div");
    div.addEventListener("click", () => {
  showTaskDetails(task);
});
    div.className = "card mb-2 p-2";
    const assignedUser = session.getAllUsers()
  .find(u => u.id === task.assignedUserId);

div.innerHTML = `
  <b>${task.name}</b><br/>
  <small>${task.description}</small><br/>
  <small>👤 ${assignedUser ? assignedUser.firstName : "Nieprzypisany"}</small>
  <button class="done">Done</button>
`;

    div.querySelector(".done")?.addEventListener("click", () => {
      finishTask(task);
      renderTasks(storyId);
    });

    cols[task.status].appendChild(div);
  });
}
addTaskBtn.addEventListener("click", () => {
  if (!selectedStoryId) {
    alert("Wybierz story!");
    return;
  }

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
}

taskService.create(newTask);

  // reset
  taskNameInput.value = "";
  taskDescInput.value = "";
  taskTimeInput.value = "";

  renderTasks(selectedStoryId);
});
function loadUsersToSelect() {
  const users = session.getAllUsers()
    .filter(u => u.role !== "admin");

  taskUserSelect.innerHTML = `<option value="">Przypisz użytkownika</option>`;

  users.forEach(user => {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = `${user.firstName} ${user.lastName} (${user.role})`;
    taskUserSelect.appendChild(option);
  });
}
function showTaskDetails(task: Task) {
  selectedTask = task;

  const assignedUser = session.getAllUsers()
    .find(u => u.id === task.assignedUserId);

  const story = storyService
    .getAll(session.getActiveProjectId()!)
    .find(s => s.id === task.storyId);

  const details = document.getElementById("taskDetails")!;

  details.innerHTML = `
    <p><b>Nazwa:</b> ${task.name}</p>
    <p><b>Opis:</b> ${task.description}</p>
    <p><b>Priorytet:</b> ${task.priority}</p>
    <p><b>Status:</b> ${task.status}</p>
    <p><b>Story:</b> ${story?.name}</p>
    <p><b>Przewidywany czas:</b> ${task.estimatedTime}h</p>
    <p><b>Start:</b> ${task.startedAt ?? "-"}</p>
    <p><b>Koniec:</b> ${task.finishedAt ?? "-"}</p>
    <p><b>Użytkownik:</b> ${assignedUser ? assignedUser.firstName : "-"}</p>
  `;

  // @ts-ignore (bootstrap global)
  const modal = new bootstrap.Modal(document.getElementById("taskModal"));
  modal.show();
}
const finishTaskBtn = document.getElementById("finishTaskBtn") as HTMLButtonElement;

finishTaskBtn.addEventListener("click", () => {
  if (!selectedTask) return;

  finishTask(selectedTask);

  renderTasks(selectedTask.storyId);

  // zamknięcie modala
  const modalEl = document.getElementById("taskModal")!;
  // @ts-ignore
  const modal = bootstrap.Modal.getInstance(modalEl);
  modal.hide();
});
// Start aplikacji
renderProjects();
loadUsersToSelect();