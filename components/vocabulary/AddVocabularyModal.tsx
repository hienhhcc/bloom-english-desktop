'use client';

import { useState } from 'react';
import { Loader2, BookOpen, FilePlus, FileText } from 'lucide-react';
import type { VocabularyTopic } from '@/lib/vocabulary/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

type FileMode = 'existing' | 'new';

interface AddVocabularyModalProps {
  isOpen: boolean;
  onClose: () => void;
  topics: VocabularyTopic[];
  onWorkflowTriggered?: (workflowId: string, label: string) => void;
}

export function AddVocabularyModal({ isOpen, onClose, topics, onWorkflowTriggered }: AddVocabularyModalProps) {
  const [fileMode, setFileMode] = useState<FileMode>('existing');
  const [fileName, setFileName] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [vocabularies, setVocabularies] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const resolvedFileName = fileMode === 'existing' ? fileName : newFileName.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (fileMode === 'existing' && !fileName) {
      setErrorMessage('Please select a file');
      setStatus('error');
      return;
    }

    if (fileMode === 'new' && !newFileName.trim()) {
      setErrorMessage('Please enter a file name');
      setStatus('error');
      return;
    }

    if (!vocabularies.trim()) {
      setErrorMessage('Please enter at least one word');
      setStatus('error');
      return;
    }

    setIsLoading(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const wordList = vocabularies
        .split(',')
        .map((w) => w.trim())
        .filter(Boolean);

      if (wordList.length === 0) {
        throw new Error('No valid words provided');
      }

      const response = await fetch('/api/trigger-specific-vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: resolvedFileName,
          vocabularies: wordList,
          mode: fileMode,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data.workflowId && onWorkflowTriggered) {
        onWorkflowTriggered(data.workflowId, `Words: ${wordList.join(', ')}`);
      }

      setStatus('success');
      setFileName('');
      setNewFileName('');
      setVocabularies('');

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
            <BookOpen className="size-5 text-primary" />
            Research Specific Vocabularies
          </DialogTitle>
          <DialogDescription>
            The n8n workflow will research these words using AI and {fileMode === 'existing' ? 'append them to the selected file' : 'create a new file with them'}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Mode Toggle */}
          <div className="space-y-1.5">
            <Label>Destination</Label>
            <Tabs value={fileMode} onValueChange={(v) => setFileMode(v as FileMode)}>
              <TabsList className="w-full">
                <TabsTrigger value="existing" disabled={isLoading} className="flex-1">
                  <FileText className="size-4" />
                  Existing File
                </TabsTrigger>
                <TabsTrigger value="new" disabled={isLoading} className="flex-1">
                  <FilePlus className="size-4" />
                  New File
                </TabsTrigger>
              </TabsList>

              <TabsContent value="existing">
                <div className="space-y-1.5 mt-3">
                  <Label htmlFor="fileName">Target File</Label>
                  <select
                    id="fileName"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    disabled={isLoading}
                    className="w-full h-9 px-3 bg-card border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all disabled:opacity-50"
                  >
                    <option value="">Select a file...</option>
                    {topics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.icon} {topic.name}
                      </option>
                    ))}
                  </select>
                </div>
              </TabsContent>

              <TabsContent value="new">
                <div className="space-y-1.5 mt-3">
                  <Label htmlFor="newFileName">New File Name</Label>
                  <Input
                    id="newFileName"
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="e.g., day_60"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    A new JSON file will be created in the vocabulary folder
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Vocabularies Input */}
          <div className="space-y-1.5">
            <Label htmlFor="vocabularies">Words to Research</Label>
            <Input
              id="vocabularies"
              type="text"
              value={vocabularies}
              onChange={(e) => setVocabularies(e.target.value)}
              placeholder='e.g., resilient, pragmatic, elaborate'
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Separate words with commas
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
                  Researching...
                </>
              ) : (
                <>
                  <BookOpen className="size-4" />
                  Research
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
