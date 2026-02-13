'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AddTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkflowTriggered?: (workflowId: string, label: string) => void;
}

export function AddTopicModal({ isOpen, onClose, onWorkflowTriggered }: AddTopicModalProps) {
  const [topic, setTopic] = useState('');
  const [vocabulariesCount, setVocabulariesCount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!topic.trim()) {
      setErrorMessage('Please enter a topic theme');
      setStatus('error');
      return;
    }

    setIsLoading(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/trigger-vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), vocabulariesCount }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data.workflowId && onWorkflowTriggered) {
        onWorkflowTriggered(data.workflowId, `New topic: ${topic.trim()}`);
      }

      setStatus('success');
      setTopic('');
      setVocabulariesCount(10);

      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to trigger workflow');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setStatus('idle');
      setErrorMessage('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Add New Vocabulary Topic
          </DialogTitle>
          <DialogDescription>
            The n8n workflow will generate vocabulary using AI. This may take a moment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Topic Theme Input */}
          <div className="space-y-1.5">
            <Label htmlFor="topic">Topic Theme</Label>
            <Input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Business, Sports, Technology..."
              disabled={isLoading}
            />
          </div>

          {/* Vocabulary Count Input */}
          <div className="space-y-1.5">
            <Label htmlFor="vocabulariesCount">Number of Words</Label>
            <Input
              id="vocabulariesCount"
              type="number"
              min={1}
              max={50}
              value={vocabulariesCount}
              onChange={(e) => setVocabulariesCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Choose between 1 and 50 words
            </p>
          </div>

          {/* Status Messages */}
          {status === 'success' && (
            <Alert className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
              <AlertDescription className="text-green-700 dark:text-green-300">
                Workflow started! You&apos;ll be notified when it completes.
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
