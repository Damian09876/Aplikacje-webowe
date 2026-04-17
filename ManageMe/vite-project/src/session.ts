import type { User, UserRole } from "./model";

const USERS_KEY = "app_users";
const SESSION_KEY = "current_session_user_id";

// Konfiguracja super admina
const SUPER_ADMIN_EMAIL = "admin@manageme.com";

export class SessionService {
  private users: User[] = [];

  constructor() {
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

  login(userData: { email: string; firstName: string; lastName: string; id: string }) {
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
    localStorage.removeItem("active_project_id");
    window.location.reload();
  }

  setActiveProject(projectId: string) {
    localStorage.setItem("active_project_id", projectId);
  }

  getActiveProjectId(): string | null {
    return localStorage.getItem("active_project_id");
  }

  getAllUsers(): User[] {
    return this.users;
  }

  updateUserRole(userId: string, role: UserRole) {
    const user = this.users.find(u => u.id === userId);
    if (user && user.email !== SUPER_ADMIN_EMAIL) {
      user.role = role;
      this.saveUsers();
    }
  }

  toggleUserBlock(userId: string) {
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
