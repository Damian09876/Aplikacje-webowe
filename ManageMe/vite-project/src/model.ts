export interface Project {
  id: string
  name: string
  description: string
}
export interface User {
  id: string;
  firstName: string;
  lastName: string;
}

export type Priority = 'low' | 'medium' | 'high';
export type Status = 'todo' | 'doing' | 'done';
export type UserRole = 'admin' | 'devops' | 'developer';

export interface Story {
  id: string;
  name: string;
  description: string;
  priority: Priority;
  projectId: string;
  ownerId: string;
  createdAt: string;
  status: Status;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  priority: Priority;
  storyId: string;

  estimatedTime: number;

  status: Status;

  createdAt: string;
  startedAt?: string;
  finishedAt?: string;

  assignedUserId?: string;
}