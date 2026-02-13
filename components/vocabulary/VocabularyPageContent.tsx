'use client';

import { useProgress } from '@/hooks/useProgress';
import { useWorkflowNotifications } from '@/hooks/useWorkflowNotifications';
import { getTopicStatus } from '@/lib/vocabulary/progress';
import type { DifficultyLevel, VocabularyTopic } from '@/lib/vocabulary/types';
import type { WorkflowType } from '@/lib/workflowStore';
import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AddTopicModal } from './AddTopicModal';
import { AddVocabularyModal } from './AddVocabularyModal';
import { ReviewReminders } from './ReviewReminders';
import { TopicCard } from './TopicCard';
import { TopicFilters, type SortOption, type StatusFilter } from './TopicFilters';
import { WorkflowNotifications } from './WorkflowNotifications';

interface VocabularyPageContentProps {
  topics: VocabularyTopic[];
}

const difficultyOrder: Record<DifficultyLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

export function VocabularyPageContent({ topics }: VocabularyPageContentProps) {
  const {
    progress,
    isLoaded,
    getDueReviews,
    dismissReviewAlert,
    isReviewAlertDismissed,
    getTopicProgress,
  } = useProgress();

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyLevel | 'all'>('all');
  const [sortOption, setSortOption] = useState<SortOption>('added-desc');

  // Modal state
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [showAddVocabularyModal, setShowAddVocabularyModal] = useState(false);

  // Workflow notifications
  const {
    notifications: workflowNotifications,
    trackWorkflow,
    dismissNotification,
  } = useWorkflowNotifications();

  const handleWorkflowTriggered = useCallback(
    (workflowId: string, label: string, type: WorkflowType = 'topic') => {
      trackWorkflow(workflowId, type, label);
    },
    [trackWorkflow]
  );

  // Filter and sort topics
  const filteredTopics = useMemo(() => {
    let result = [...topics];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (topic) =>
          topic.name.toLowerCase().includes(query) ||
          topic.nameVietnamese.toLowerCase().includes(query) ||
          topic.description.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all' && isLoaded) {
      result = result.filter((topic) => {
        const topicProgress = getTopicProgress(topic.id);
        const status = getTopicStatus(topicProgress);
        return status === statusFilter;
      });
    }

    // Difficulty filter
    if (difficultyFilter !== 'all') {
      result = result.filter((topic) => topic.difficulty === difficultyFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case 'added-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'added-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'words-asc':
          return a.wordCount - b.wordCount;
        case 'words-desc':
          return b.wordCount - a.wordCount;
        case 'difficulty-asc':
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        case 'difficulty-desc':
          return difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty];
        default:
          return 0;
      }
    });

    return result;
  }, [topics, searchQuery, statusFilter, difficultyFilter, sortOption, isLoaded, getTopicProgress]);

  const dueReviews = getDueReviews();

  // Create a map of topic info for the reminders
  const topicMap = new Map(topics.map((t) => [t.id, t]));

  // Filter out dismissed reviews
  const reviewsWithTopicInfo = dueReviews
    .filter((review) => !isReviewAlertDismissed(review.topicId, review.reviewType))
    .map((review) => {
      const topic = topicMap.get(review.topicId);
      if (!topic) return null;
      return {
        ...review,
        topicName: topic.name,
        topicIcon: topic.icon,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <>
      {isLoaded && reviewsWithTopicInfo.length > 0 && (
        <ReviewReminders
          reviews={reviewsWithTopicInfo}
          onDismiss={dismissReviewAlert}
        />
      )}

      {/* Workflow Notifications */}
      <WorkflowNotifications
        notifications={workflowNotifications}
        onDismiss={dismissNotification}
      />

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mb-4">
        <Button
          variant="secondary"
          onClick={() => setShowAddVocabularyModal(true)}
        >
          <Plus className="size-5" />
          <span>Research specific Words</span>
        </Button>
        <Button
          onClick={() => setShowAddTopicModal(true)}
        >
          <Plus className="size-5" />
          <span>Research a new Topic</span>
        </Button>
      </div>

      {/* Search, Filter, and Sort */}
      <TopicFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        difficultyFilter={difficultyFilter}
        onDifficultyChange={setDifficultyFilter}
        sortOption={sortOption}
        onSortChange={setSortOption}
        resultCount={filteredTopics.length}
        totalCount={topics.length}
      />

      {/* Topics Grid */}
      {filteredTopics.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTopics.map((topic, index) => {
            const dueReview = dueReviews.find((r) => r.topicId === topic.id);
            const reviewDismissed = dueReview
              ? isReviewAlertDismissed(dueReview.topicId, dueReview.reviewType)
              : false;
            return (
              <div
                key={topic.id}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <TopicCard
                  topic={topic}
                  progress={isLoaded ? progress?.topics[topic.id] : null}
                  isReviewDismissed={reviewDismissed}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-muted-foreground/50 mb-2">
            <svg className="size-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            No topics found
          </h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      )}

      {/* Add Topic Modal */}
      <AddTopicModal
        isOpen={showAddTopicModal}
        onClose={() => setShowAddTopicModal(false)}
        onWorkflowTriggered={(id, label) => handleWorkflowTriggered(id, label, 'topic')}
      />

      {/* Add Vocabulary Modal */}
      <AddVocabularyModal
        isOpen={showAddVocabularyModal}
        onClose={() => setShowAddVocabularyModal(false)}
        topics={topics}
        onWorkflowTriggered={(id, label) => handleWorkflowTriggered(id, label, 'specific-vocabulary')}
      />
    </>
  );
}
