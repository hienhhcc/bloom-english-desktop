'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkflowStatus, WorkflowType } from '@/lib/workflowStore';

export interface WorkflowNotification {
  id: string;
  type: WorkflowType;
  status: WorkflowStatus;
  label: string;
  message?: string;
  createdAt: number;
  dismissed: boolean;
}

const POLL_INTERVAL_MS = 3000;
const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function useWorkflowNotifications() {
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pendingNotifications = notifications.filter(
    (n) => n.status === 'pending' && !n.dismissed
  );

  const visibleNotifications = notifications.filter((n) => !n.dismissed);

  const trackWorkflow = useCallback(
    (id: string, type: WorkflowType, label: string) => {
      setNotifications((prev) => [
        ...prev,
        {
          id,
          type,
          status: 'pending',
          label,
          createdAt: Date.now(),
          dismissed: false,
        },
      ]);
    },
    []
  );

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, dismissed: true } : n))
    );
  }, []);

  // Poll for pending workflow statuses
  useEffect(() => {
    if (pendingNotifications.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const poll = async () => {
      const now = Date.now();

      for (const notification of pendingNotifications) {
        // Auto-fail timed out workflows
        if (now - notification.createdAt > TIMEOUT_MS) {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notification.id
                ? { ...n, status: 'failed' as const, message: 'Workflow timed out' }
                : n
            )
          );
          continue;
        }

        try {
          const res = await fetch(`/api/workflow-status?id=${notification.id}`);
          if (res.status === 404) {
            // Server restarted, mark as failed
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === notification.id
                  ? { ...n, status: 'failed' as const, message: 'Status lost (server restarted)' }
                  : n
              )
            );
            continue;
          }
          if (!res.ok) continue;

          const data = await res.json();
          if (data.status !== 'pending') {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === notification.id
                  ? { ...n, status: data.status, message: data.message }
                  : n
              )
            );
          }
        } catch {
          // Network error — keep polling
        }
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pendingNotifications.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    notifications: visibleNotifications,
    trackWorkflow,
    dismissNotification,
  };
}
