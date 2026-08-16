const STORAGE_KEY = 'say2build.projects.v1';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeAll(value) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function saveStoredProject(stored) {
  const all = readAll();
  all[stored.state.projectId] = { ...stored, ui: { ...(stored.ui || {}), lastOpenedAt: new Date().toISOString() } };
  writeAll(all);
  return all[stored.state.projectId];
}

export function loadStoredProject(projectId) {
  return readAll()[projectId] || null;
}

export function listStoredProjects() {
  return Object.values(readAll()).sort((a, b) => String(b.ui?.lastOpenedAt || b.state.meta.updatedAt).localeCompare(String(a.ui?.lastOpenedAt || a.state.meta.updatedAt)));
}

export function deleteStoredProject(projectId) {
  const all = readAll();
  delete all[projectId];
  writeAll(all);
}

export function importStoredProject(payload) {
  if (!payload?.state?.projectId || payload?.state?.schemaVersion !== '1.0') throw new Error('This file is not a valid Say2Build v1 project export.');
  return saveStoredProject({
    state: payload.state,
    conversations: Array.isArray(payload.conversations) ? payload.conversations : [],
    taskSpecs: Array.isArray(payload.taskSpecs) ? payload.taskSpecs : [],
    snapshots: [],
    ui: { lastOpenedAt: new Date().toISOString() },
  });
}
