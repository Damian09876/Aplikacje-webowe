import type { Project } from "./model"
 
const STORAGE_KEY = "projects"
 
export class ProjectService {
 
  getAll(): Project[] {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  }
 
  saveAll(projects: Project[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
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
  }
 
}