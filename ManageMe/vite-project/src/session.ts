import type { User } from "./model";

export class SessionService {
  // Mock użytkownika
  private readonly users: User[] = [
  {
    id: "1",
    firstName: "Marcin",
    lastName: "Palys",
    role: "admin"
  },
  {
    id: "2",
    firstName: "Jan",
    lastName: "Developer",
    role: "developer"
  },
  {
    id: "3",
    firstName: "Anna",
    lastName: "DevOps",
    role: "devops"
  }
];
  getCurrentUser(): User {
  return this.users.find(u => u.role === "admin")!;
}

  // Zarządzanie aktywnym projektem w LocalStorage
  setActiveProject(projectId: string) {
    localStorage.setItem("active_project_id", projectId);
  }

  getActiveProjectId(): string | null {
    return localStorage.getItem("active_project_id");
  }

  getAllUsers(): User[] {
    return this.users;
  }
}