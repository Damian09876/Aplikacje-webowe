import type { Project } from "./model";
import { ProjectService } from "./service";
 
const service = new ProjectService();
 
export function addProject(name: string, description: string) {
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    description
  };
 
  service.create(project);
}
 
export function getProjects(): Project[] {
  return service.getAll();
}
 
export function deleteProject(id: string) {
  service.delete(id);
}