import type { Project, Story, Task, AppNotification } from "./model"

const PROJECTS_KEY = "projects"
const STORIES_KEY = "stories"
const TASKS_KEY = "tasks";
const NOTIFICATIONS_KEY = "notifications";

// --- SERWIS PROJEKTÓW ---
export class ProjectService {
  getAll(): Project[] {
    const data = localStorage.getItem(PROJECTS_KEY)
    return data ? JSON.parse(data) : []
  }

  saveAll(projects: Project[]) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
  }

  create(project: Project) {
    const projects = this.getAll()
    projects.push(project)
    this.saveAll(projects)
  }

  update(updatedProject: Project) {
    const projects = this.getAll().map(p =>
      p.id === updatedProject.id ? updatedProject : p
    )
    this.saveAll(projects)
  }

  delete(id: string) {
    const projects = this.getAll().filter(p => p.id !== id)
    this.saveAll(projects)
    
    const allStories = this.getGlobalStories()
    const filteredStories = allStories.filter(s => s.projectId !== id)
    localStorage.setItem(STORIES_KEY, JSON.stringify(filteredStories))
  }

  private getGlobalStories(): Story[] {
    const data = localStorage.getItem(STORIES_KEY)
    return data ? JSON.parse(data) : []
  }
}

export class StoryService {
  getAll(projectId: string): Story[] {
    const data = localStorage.getItem(STORIES_KEY)
    const allStories: Story[] = data ? JSON.parse(data) : []
    return allStories.filter(story => story.projectId === projectId)
  }

  private getAllFromStorage(): Story[] {
    const data = localStorage.getItem(STORIES_KEY)
    return data ? JSON.parse(data) : []
  }

  getById(id: string): Story | undefined {
    return this.getAllFromStorage().find(s => s.id === id);
  }

  saveAll(storiesInProject: Story[], projectId: string) {
    const allStories = this.getAllFromStorage()
    const otherProjectsStories = allStories.filter(s => s.projectId !== projectId)
    const updatedTotalList = [...otherProjectsStories, ...storiesInProject]
    
    localStorage.setItem(STORIES_KEY, JSON.stringify(updatedTotalList))
  }

  create(story: Story) {
    const allStories = this.getAllFromStorage()
    allStories.push(story)
    localStorage.setItem(STORIES_KEY, JSON.stringify(allStories))
  }

  update(updatedStory: Story) {
    const allStories = this.getAllFromStorage()
    const updatedList = allStories.map(s =>
      s.id === updatedStory.id ? updatedStory : s
    )
    localStorage.setItem(STORIES_KEY, JSON.stringify(updatedList))
  }

  delete(id: string) {
    const allStories = this.getAllFromStorage()
    const filteredList = allStories.filter(s => s.id !== id)
    localStorage.setItem(STORIES_KEY, JSON.stringify(filteredList))
  }
}
export class TaskService {
  private getAllFromStorage(): Task[] {
    const data = localStorage.getItem(TASKS_KEY);
    return data ? JSON.parse(data) : [];
  }

  getAll(): Task[] {
    return this.getAllFromStorage();
  }

  getById(id: string): Task | undefined {
    return this.getAllFromStorage().find(t => t.id === id);
  }

  create(task: Task) {
    const tasks = this.getAllFromStorage();
    tasks.push(task);
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }

  update(task: Task) {
    const tasks = this.getAllFromStorage().map(t =>
      t.id === task.id ? task : t
    );
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }

  delete(id: string) {
    const tasks = this.getAllFromStorage().filter(t => t.id !== id);
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }

  getByStory(storyId: string): Task[] {
    return this.getAllFromStorage().filter(t => t.storyId === storyId);
  }
}

export class NotificationService {
  private getAllFromStorage(): AppNotification[] {
    const data = localStorage.getItem(NOTIFICATIONS_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveAll(notifications: AppNotification[]) {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }

  create(notification: AppNotification) {
    const notifications = this.getAllFromStorage();
    notifications.push(notification);
    this.saveAll(notifications);
    
    // Trigger event for UI
    window.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));
  }

  getAll(recipientId: string): AppNotification[] {
    return this.getAllFromStorage().filter(n => n.recipientId === recipientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getUnreadCount(recipientId: string): number {
    return this.getAll(recipientId).filter(n => !n.isRead).length;
  }

  markAsRead(id: string) {
    const notifications = this.getAllFromStorage().map(n =>
      n.id === id ? { ...n, isRead: true } : n
    );
    this.saveAll(notifications);
    window.dispatchEvent(new CustomEvent('notification-updated'));
  }

  markAllAsRead(recipientId: string) {
    const notifications = this.getAllFromStorage().map(n =>
      n.recipientId === recipientId ? { ...n, isRead: true } : n
    );
    this.saveAll(notifications);
    window.dispatchEvent(new CustomEvent('notification-updated'));
  }

  getById(id: string): AppNotification | undefined {
    return this.getAllFromStorage().find(n => n.id === id);
  }
}
