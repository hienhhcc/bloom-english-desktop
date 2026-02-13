'use client';

import { CheckCircle, Loader2, X, XCircle, Zap } from 'lucide-react';
import type { WorkflowNotification } from '@/hooks/useWorkflowNotifications';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface WorkflowNotificationsProps {
  notifications: WorkflowNotification[];
  onDismiss: (id: string) => void;
}

const statusConfig = {
  pending: {
    gradient:
      'bg-gradient-to-r from-secondary/50 via-accent/30 to-secondary/50',
    border: 'border-border',
    headerBg: 'bg-primary',
    headerText: 'text-primary',
    iconBg: 'bg-primary/10',
    statusText: 'text-primary',
    icon: <Loader2 className="size-5 text-primary animate-spin" />,
    label: 'Processing...',
  },
  completed: {
    gradient:
      'bg-gradient-to-r from-green-50 via-green-50 to-green-50 dark:from-green-950/40 dark:via-green-950/40 dark:to-green-950/40',
    border: 'border-green-200 dark:border-green-800/60',
    headerBg: 'bg-green-400 dark:bg-green-500',
    headerText: 'text-green-800 dark:text-green-200',
    iconBg: 'bg-green-50 dark:bg-green-900/30',
    statusText: 'text-green-600 dark:text-green-400',
    icon: <CheckCircle className="size-5 text-green-500" />,
    label: 'Completed',
  },
  failed: {
    gradient:
      'bg-gradient-to-r from-red-50 via-red-50 to-red-50 dark:from-red-950/40 dark:via-red-950/40 dark:to-red-950/40',
    border: 'border-red-200 dark:border-red-800/60',
    headerBg: 'bg-red-400 dark:bg-red-500',
    headerText: 'text-red-800 dark:text-red-200',
    iconBg: 'bg-red-50 dark:bg-red-900/30',
    statusText: 'text-red-600 dark:text-red-400',
    icon: <XCircle className="size-5 text-red-500" />,
    label: 'Failed',
  },
} as const;

export function WorkflowNotifications({
  notifications,
  onDismiss,
}: WorkflowNotificationsProps) {
  if (notifications.length === 0) return null;

  // Group by status for display — show pending first, then failed, then completed
  const sorted = [...notifications].sort((a, b) => {
    const order = { pending: 0, failed: 1, completed: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="space-y-3 mb-6">
      {sorted.map((notification) => {
        const config = statusConfig[notification.status];

        return (
          <div
            key={notification.id}
            className={`relative rounded-2xl ${config.gradient} border ${config.border} p-4 shadow-sm`}
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className={`flex items-center justify-center size-7 rounded-lg ${config.headerBg}`}
              >
                <Zap className="size-4 text-white" />
              </div>
              <span
                className={`text-sm font-bold ${config.headerText} uppercase tracking-wide`}
              >
                Workflow {config.label}
              </span>
            </div>

            {/* Card */}
            <Card className="relative shadow-sm py-0">
              <div className="flex items-center gap-3 p-3 pr-10">
                {/* Status Icon */}
                <div
                  className={`flex-shrink-0 size-10 ${config.iconBg} rounded-lg flex items-center justify-center`}
                >
                  {config.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate text-sm">
                    {notification.label}
                  </h3>
                  <p className={`text-xs ${config.statusText} font-medium`}>
                    {notification.message || config.label}
                  </p>
                </div>
              </div>

              {/* Dismiss Button — only on resolved cards */}
              {notification.status !== 'pending' && (
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() => onDismiss(notification.id)}
                  className="absolute -top-2 -right-2 rounded-full shadow-sm"
                  title="Dismiss"
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </Card>
          </div>
        );
      })}
    </div>
  );
}
