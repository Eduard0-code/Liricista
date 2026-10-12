import { get, set } from 'idb-keyval'
import { validateProject } from './files'
import { cloneProject, type Project } from './model'

const key = 'liricista-project-v1'
let queue: Promise<unknown> = Promise.resolve()

export async function restore(): Promise<Project | null> {
  const value = await get(key)
  return value === undefined ? null : validateProject(value)
}

export function save(project: Project): Promise<void> {
  const snapshot = cloneProject(project)
  const operation = queue.catch(() => undefined).then(() => set(key, snapshot))
  queue = operation
  return operation
}