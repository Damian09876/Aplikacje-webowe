import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  getDoc,
  orderBy
} from "firebase/firestore";
import { db } from "./db";
import { CONFIG } from "./config";
import type { Project, Story, Task, AppNotification } from "./model";

const PROJECTS_KEY = "projects";
const STORIES_KEY = "stories";
const TASKS_KEY = "tasks";
const NOTIFICATIONS_KEY = "notifications";

// --- INTERFACES ---

export interface IProjectService {
  getAll(): Promise<Project[]>;
  create(project: Project): Promise<void>;
  update(updatedProject: Project): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IStoryService {
  getAll(projectId: string): Promise<Story[]>;
  getById(id: string): Promise<Story | undefined>;
  create(story: Story): Promise<void>;
  update(updatedStory: Story): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ITaskService {
  getAll(): Promise<Task[]>;
  getById(id: string): Promise<Task | undefined>;
  create(task: Task): Promise<void>;
  update(task: Task): Promise<void>;
  delete(id: string): Promise<void>;
  getByStory(storyId: string): Promise<Task[]>;
}

export interface INotificationService {
  create(notification: AppNotification): Promise<void>;
  getAll(recipientId: string): Promise<AppNotification[]>;
  getUnreadCount(recipientId: string): Promise<number>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(recipientId: string): Promise<void>;
  getById(id: string): Promise<AppNotification | undefined>;
}

// --- LOCAL STORAGE IMPLEMENTATIONS ---

class LocalStorageProjectService implements IProjectService {
  async getAll(): Promise<Project[]> {
    const data = localStorage.getItem(PROJECTS_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveAll(projects: Project[]) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }

  async create(project: Project) {
    const projects = await this.getAll();
    projects.push(project);
    this.saveAll(projects);
  }

  async update(updatedProject: Project) {
    const projects = (await this.getAll()).map(p =>
      p.id === updatedProject.id ? updatedProject : p
    );
    this.saveAll(projects);
  }

  async delete(id: string) {
    const projects = (await this.getAll()).filter(p => p.id !== id);
    this.saveAll(projects);
    
    const data = localStorage.getItem(STORIES_KEY);
    const allStories: Story[] = data ? JSON.parse(data) : [];
    const filteredStories = allStories.filter(s => s.projectId !== id);
    localStorage.setItem(STORIES_KEY, JSON.stringify(filteredStories));
  }
}

class LocalStorageStoryService implements IStoryService {
  async getAll(projectId: string): Promise<Story[]> {
    const data = localStorage.getItem(STORIES_KEY);
    const allStories: Story[] = data ? JSON.parse(data) : [];
    return allStories.filter(story => story.projectId === projectId);
  }

  private getAllFromStorage(): Story[] {
    const data = localStorage.getItem(STORIES_KEY);
    return data ? JSON.parse(data) : [];
  }

  async getById(id: string): Promise<Story | undefined> {
    return this.getAllFromStorage().find(s => s.id === id);
  }

  async create(story: Story) {
    const allStories = this.getAllFromStorage();
    allStories.push(story);
    localStorage.setItem(STORIES_KEY, JSON.stringify(allStories));
  }

  async update(updatedStory: Story) {
    const allStories = this.getAllFromStorage();
    const updatedList = allStories.map(s =>
      s.id === updatedStory.id ? updatedStory : s
    );
    localStorage.setItem(STORIES_KEY, JSON.stringify(updatedList));
  }

  async delete(id: string) {
    const allStories = this.getAllFromStorage();
    const filteredList = allStories.filter(s => s.id !== id);
    localStorage.setItem(STORIES_KEY, JSON.stringify(filteredList));
  }
}

class LocalStorageTaskService implements ITaskService {
  private getAllFromStorage(): Task[] {
    const data = localStorage.getItem(TASKS_KEY);
    return data ? JSON.parse(data) : [];
  }

  async getAll(): Promise<Task[]> {
    return this.getAllFromStorage();
  }

  async getById(id: string): Promise<Task | undefined> {
    return this.getAllFromStorage().find(t => t.id === id);
  }

  async create(task: Task) {
    const tasks = this.getAllFromStorage();
    tasks.push(task);
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }

  async update(task: Task) {
    const tasks = this.getAllFromStorage().map(t =>
      t.id === task.id ? task : t
    );
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }

  async delete(id: string) {
    const tasks = this.getAllFromStorage().filter(t => t.id !== id);
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }

  async getByStory(storyId: string): Promise<Task[]> {
    return this.getAllFromStorage().filter(t => t.storyId === storyId);
  }
}

class LocalStorageNotificationService implements INotificationService {
  private getAllFromStorage(): AppNotification[] {
    const data = localStorage.getItem(NOTIFICATIONS_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveAll(notifications: AppNotification[]) {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }

  async create(notification: AppNotification) {
    const notifications = this.getAllFromStorage();
    notifications.push(notification);
    this.saveAll(notifications);
    window.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));
  }

  async getAll(recipientId: string): Promise<AppNotification[]> {
    return this.getAllFromStorage()
      .filter(n => n.recipientId === recipientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    const notifs = await this.getAll(recipientId);
    return notifs.filter(n => !n.isRead).length;
  }

  async markAsRead(id: string) {
    const notifications = this.getAllFromStorage().map(n =>
      n.id === id ? { ...n, isRead: true } : n
    );
    this.saveAll(notifications);
    window.dispatchEvent(new CustomEvent('notification-updated'));
  }

  async markAllAsRead(recipientId: string) {
    const notifications = this.getAllFromStorage().map(n =>
      n.recipientId === recipientId ? { ...n, isRead: true } : n
    );
    this.saveAll(notifications);
    window.dispatchEvent(new CustomEvent('notification-updated'));
  }

  async getById(id: string): Promise<AppNotification | undefined> {
    return this.getAllFromStorage().find(n => n.id === id);
  }
}

// --- FIRESTORE IMPLEMENTATIONS ---

class FirestoreProjectService implements IProjectService {
  private collectionRef = collection(db, PROJECTS_KEY);

  async getAll(): Promise<Project[]> {
    const snapshot = await getDocs(this.collectionRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
  }

  async create(project: Project) {
    await setDoc(doc(this.collectionRef, project.id), project);
  }

  async update(updatedProject: Project) {
    const docRef = doc(this.collectionRef, updatedProject.id);
    await updateDoc(docRef, { ...updatedProject });
  }

  async delete(id: string) {
    await deleteDoc(doc(this.collectionRef, id));
  }
}

class FirestoreStoryService implements IStoryService {
  private collectionRef = collection(db, STORIES_KEY);

  async getAll(projectId: string): Promise<Story[]> {
    const q = query(this.collectionRef, where("projectId", "==", projectId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));
  }

  async getById(id: string): Promise<Story | undefined> {
    const docRef = doc(this.collectionRef, id);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Story : undefined;
  }

  async create(story: Story) {
    await setDoc(doc(this.collectionRef, story.id), story);
  }

  async update(updatedStory: Story) {
    const docRef = doc(this.collectionRef, updatedStory.id);
    await updateDoc(docRef, { ...updatedStory });
  }

  async delete(id: string) {
    await deleteDoc(doc(this.collectionRef, id));
  }
}

class FirestoreTaskService implements ITaskService {
  private collectionRef = collection(db, TASKS_KEY);

  async getAll(): Promise<Task[]> {
    const snapshot = await getDocs(this.collectionRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
  }

  async getById(id: string): Promise<Task | undefined> {
    const docRef = doc(this.collectionRef, id);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Task : undefined;
  }

  async create(task: Task) {
    await setDoc(doc(this.collectionRef, task.id), task);
  }

  async update(task: Task) {
    const docRef = doc(this.collectionRef, task.id);
    await updateDoc(docRef, { ...task });
  }

  async delete(id: string) {
    await deleteDoc(doc(this.collectionRef, id));
  }

  async getByStory(storyId: string): Promise<Task[]> {
    const q = query(this.collectionRef, where("storyId", "==", storyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
  }
}

class FirestoreNotificationService implements INotificationService {
  private collectionRef = collection(db, NOTIFICATIONS_KEY);

  async create(notification: AppNotification) {
    await setDoc(doc(this.collectionRef, notification.id), notification);
    window.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));
  }

  async getAll(recipientId: string): Promise<AppNotification[]> {
    const q = query(
      this.collectionRef, 
      where("recipientId", "==", recipientId),
      orderBy("date", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    const q = query(
      this.collectionRef, 
      where("recipientId", "==", recipientId),
      where("isRead", "==", false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  async markAsRead(id: string) {
    const docRef = doc(this.collectionRef, id);
    await updateDoc(docRef, { isRead: true });
    window.dispatchEvent(new CustomEvent('notification-updated'));
  }

  async markAllAsRead(recipientId: string) {
    const q = query(this.collectionRef, where("recipientId", "==", recipientId), where("isRead", "==", false));
    const snapshot = await getDocs(q);
    const promises = snapshot.docs.map(d => updateDoc(doc(this.collectionRef, d.id), { isRead: true }));
    await Promise.all(promises);
    window.dispatchEvent(new CustomEvent('notification-updated'));
  }

  async getById(id: string): Promise<AppNotification | undefined> {
    const docRef = doc(this.collectionRef, id);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as AppNotification : undefined;
  }
}

// --- DELEGATING WRAPPERS ---

export class ProjectService implements IProjectService {
  private instance: IProjectService = CONFIG.storageType === 'firestore' ? new FirestoreProjectService() : new LocalStorageProjectService();
  getAll() { return this.instance.getAll(); }
  create(project: Project) { return this.instance.create(project); }
  update(updatedProject: Project) { return this.instance.update(updatedProject); }
  delete(id: string) { return this.instance.delete(id); }
}

export class StoryService implements IStoryService {
  private instance: IStoryService = CONFIG.storageType === 'firestore' ? new FirestoreStoryService() : new LocalStorageStoryService();
  getAll(projectId: string) { return this.instance.getAll(projectId); }
  getById(id: string) { return this.instance.getById(id); }
  create(story: Story) { return this.instance.create(story); }
  update(updatedStory: Story) { return this.instance.update(updatedStory); }
  delete(id: string) { return this.instance.delete(id); }
}

export class TaskService implements ITaskService {
  private instance: ITaskService = CONFIG.storageType === 'firestore' ? new FirestoreTaskService() : new LocalStorageTaskService();
  getAll() { return this.instance.getAll(); }
  getById(id: string) { return this.instance.getById(id); }
  create(task: Task) { return this.instance.create(task); }
  update(task: Task) { return this.instance.update(task); }
  delete(id: string) { return this.instance.delete(id); }
  getByStory(storyId: string) { return this.instance.getByStory(storyId); }
}

export class NotificationService implements INotificationService {
  private instance: INotificationService = CONFIG.storageType === 'firestore' ? new FirestoreNotificationService() : new LocalStorageNotificationService();
  create(notification: AppNotification) { return this.instance.create(notification); }
  getAll(recipientId: string) { return this.instance.getAll(recipientId); }
  getUnreadCount(recipientId: string) { return this.instance.getUnreadCount(recipientId); }
  markAsRead(id: string) { return this.instance.markAsRead(id); }
  markAllAsRead(recipientId: string) { return this.instance.markAllAsRead(recipientId); }
  getById(id: string) { return this.instance.getById(id); }
}
