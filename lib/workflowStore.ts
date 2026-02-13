export type WorkflowType = 'topic' | 'specific-vocabulary';
export type WorkflowStatus = 'pending' | 'completed' | 'failed';

export interface WorkflowRecord {
  id: string;
  type: WorkflowType;
  status: WorkflowStatus;
  label: string;
  message?: string;
  createdAt: number;
  resolvedAt?: number;
}

// Persist across Next.js dev hot reloads using globalThis
const globalKey = '__workflowStore';
const globalRef = globalThis as typeof globalThis & {
  [globalKey]?: Map<string, WorkflowRecord>;
};
if (!globalRef[globalKey]) {
  globalRef[globalKey] = new Map<string, WorkflowRecord>();
}
const store = globalRef[globalKey];

const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

export function createWorkflow(
  id: string,
  type: WorkflowType,
  label: string
): WorkflowRecord {
  const record: WorkflowRecord = {
    id,
    type,
    status: 'pending',
    label,
    createdAt: Date.now(),
  };
  store.set(id, record);
  cleanupOldRecords();
  return record;
}

export function getWorkflow(id: string): WorkflowRecord | undefined {
  return store.get(id);
}

export function updateWorkflow(
  id: string,
  status: 'completed' | 'failed',
  message?: string
): WorkflowRecord | undefined {
  const record = store.get(id);
  if (!record) return undefined;
  record.status = status;
  record.message = message;
  record.resolvedAt = Date.now();
  return record;
}

export function getRecentWorkflows(): WorkflowRecord[] {
  return Array.from(store.values()).sort((a, b) => b.createdAt - a.createdAt);
}

function cleanupOldRecords(): void {
  const now = Date.now();
  for (const [id, record] of store) {
    if (now - record.createdAt > MAX_AGE_MS) {
      store.delete(id);
    }
  }
}
