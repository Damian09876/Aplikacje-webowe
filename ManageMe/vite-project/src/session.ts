import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  query,
  where
} from "firebase/firestore";
import { db } from "./db";
import { CONFIG } from "./config";
import type { User, UserRole } from "./model";

const USERS_KEY = "app_users";
const SESSION_KEY = "current_session_user_id";
const ACTIVE_PROJECT_KEY = "active_project_id";

// Konfiguracja super admina
const SUPER_ADMIN_EMAIL = "admin@manageme.com";

export interface ISessionService {
  initialize(): Promise<void>;
  getCurrentUser(): User | null;
  login(userData: { email: string; firstName: string; lastName: string; id: string }): Promise<{ user: User, isNewUser: boolean }>;
  logout(): void;
  setActiveProject(projectId: string): void;
  getActiveProjectId(): string | null;
  getAllUsers(): User[];
  updateUserRole(userId: string, role: UserRole): Promise<void>;
  toggleUserBlock(userId: string): Promise<void>;
  getSuperAdminEmail(): string;
}

class LocalStorageSessionService implements ISessionService {
  private users: User[] = [];

  async initialize() {
    this.loadUsers();
  }

  private loadUsers() {
    const data = localStorage.getItem(USERS_KEY);
    this.users = data ? JSON.parse(data) : [];
  }

  private saveUsers() {
    localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
  }

  getCurrentUser(): User | null {
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) return null;
    return this.users.find(u => u.id === userId) || null;
  }

  async login(userData: { email: string; firstName: string; lastName: string; id: string }) {
    let user = this.users.find(u => u.email === userData.email);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const role: UserRole = userData.email === SUPER_ADMIN_EMAIL ? 'admin' : 'guest';
      user = {
        ...userData,
        role,
        isBlocked: false
      };
      this.users.push(user);
      this.saveUsers();
    }

    localStorage.setItem(SESSION_KEY, user.id);
    return { user, isNewUser };
  }

  logout() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
    window.location.reload();
  }

  setActiveProject(projectId: string) {
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
  }

  getActiveProjectId(): string | null {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  }

  getAllUsers(): User[] {
    return this.users;
  }

  async updateUserRole(userId: string, role: UserRole) {
    const user = this.users.find(u => u.id === userId);
    if (user && user.email !== SUPER_ADMIN_EMAIL) {
      user.role = role;
      this.saveUsers();
    }
  }

  async toggleUserBlock(userId: string) {
    const user = this.users.find(u => u.id === userId);
    if (user && user.email !== SUPER_ADMIN_EMAIL) {
      user.isBlocked = !user.isBlocked;
      this.saveUsers();
    }
  }

  getSuperAdminEmail() {
    return SUPER_ADMIN_EMAIL;
  }
}

class FirestoreSessionService implements ISessionService {
  private users: User[] = [];
  private collectionRef = collection(db, USERS_KEY);

  async initialize() {
    await this.fetchUsers();
  }

  private async fetchUsers() {
    const snapshot = await getDocs(this.collectionRef);
    this.users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  }

  getCurrentUser(): User | null {
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) return null;
    return this.users.find(u => u.id === userId) || null;
  }

  async login(userData: { email: string; firstName: string; lastName: string; id: string }) {
    const q = query(this.collectionRef, where("email", "==", userData.email));
    const snapshot = await getDocs(q);
    
    let user: User;
    let isNewUser = false;

    if (snapshot.empty) {
      isNewUser = true;
      const role: UserRole = userData.email === SUPER_ADMIN_EMAIL ? 'admin' : 'guest';
      user = {
        ...userData,
        role,
        isBlocked: false
      };
      await setDoc(doc(this.collectionRef, user.id), user);
      this.users.push(user);
    } else {
      user = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
      if (!this.users.find(u => u.id === user.id)) {
        this.users.push(user);
      }
    }

    localStorage.setItem(SESSION_KEY, user.id);
    return { user, isNewUser };
  }

  logout() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
    window.location.reload();
  }

  setActiveProject(projectId: string) {
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
  }

  getActiveProjectId(): string | null {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  }

  getAllUsers(): User[] {
    return this.users;
  }

  async updateUserRole(userId: string, role: UserRole) {
    const user = this.users.find(u => u.id === userId);
    if (user && user.email !== SUPER_ADMIN_EMAIL) {
      user.role = role;
      const docRef = doc(this.collectionRef, userId);
      await updateDoc(docRef, { role });
    }
  }

  async toggleUserBlock(userId: string) {
    const user = this.users.find(u => u.id === userId);
    if (user && user.email !== SUPER_ADMIN_EMAIL) {
      user.isBlocked = !user.isBlocked;
      const docRef = doc(this.collectionRef, userId);
      await updateDoc(docRef, { isBlocked: user.isBlocked });
    }
  }

  getSuperAdminEmail() {
    return SUPER_ADMIN_EMAIL;
  }
}

export class SessionService implements ISessionService {
  private instance: ISessionService = CONFIG.storageType === 'firestore' ? new FirestoreSessionService() : new LocalStorageSessionService();
  initialize() { return this.instance.initialize(); }
  getCurrentUser() { return this.instance.getCurrentUser(); }
  login(userData: { email: string; firstName: string; lastName: string; id: string }) { return this.instance.login(userData); }
  logout() { return this.instance.logout(); }
  setActiveProject(projectId: string) { return this.instance.setActiveProject(projectId); }
  getActiveProjectId() { return this.instance.getActiveProjectId(); }
  getAllUsers() { return this.instance.getAllUsers(); }
  updateUserRole(userId: string, role: UserRole) { return this.instance.updateUserRole(userId, role); }
  toggleUserBlock(userId: string) { return this.instance.toggleUserBlock(userId); }
  getSuperAdminEmail() { return this.instance.getSuperAdminEmail(); }
}
