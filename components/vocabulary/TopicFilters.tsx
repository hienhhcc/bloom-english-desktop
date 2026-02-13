'use client';

import { Search, SlidersHorizontal, ArrowUpDown, X } from 'lucide-react';
import { useState } from 'react';
import type { DifficultyLevel } from '@/lib/vocabulary/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export type StatusFilter = 'all' | 'not-started' | 'completed' | 'review-due';
export type SortOption = 'added-desc' | 'added-asc' | 'name-asc' | 'name-desc' | 'words-asc' | 'words-desc' | 'difficulty-asc' | 'difficulty-desc';

interface TopicFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  difficultyFilter: DifficultyLevel | 'all';
  onDifficultyChange: (difficulty: DifficultyLevel | 'all') => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  resultCount: number;
  totalCount: number;
}

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'not-started', label: 'Not Started' },
  { value: 'completed', label: 'Completed' },
  { value: 'review-due', label: 'Review Due' },
];

const difficultyOptions: { value: DifficultyLevel | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All Levels', color: 'bg-muted text-muted-foreground' },
  { value: 'beginner', label: 'Beginner', color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
  { value: 'intermediate', label: 'Intermediate', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' },
  { value: 'advanced', label: 'Advanced', color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'added-desc', label: 'Recently Added' },
  { value: 'added-asc', label: 'Oldest First' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'words-asc', label: 'Words (Low to High)' },
  { value: 'words-desc', label: 'Words (High to Low)' },
  { value: 'difficulty-asc', label: 'Difficulty (Easy First)' },
  { value: 'difficulty-desc', label: 'Difficulty (Hard First)' },
];

export function TopicFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  difficultyFilter,
  onDifficultyChange,
  sortOption,
  onSortChange,
  resultCount,
  totalCount,
}: TopicFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = statusFilter !== 'all' || difficultyFilter !== 'all' || searchQuery.length > 0;

  const clearAllFilters = () => {
    onSearchChange('');
    onStatusChange('all');
    onDifficultyChange('all');
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Search and Toggle Row */}
      <div className="flex gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search topics..."
            className="pl-10 pr-10 h-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        {/* Filter Toggle Button */}
        <Button
          variant={showFilters || hasActiveFilters ? 'secondary' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters || hasActiveFilters ? 'bg-primary/10 border-primary/20 text-primary' : ''}
        >
          <SlidersHorizontal className="size-5" />
          <span className="hidden sm:inline font-medium">Filters</span>
          {hasActiveFilters && (
            <span className="size-2 bg-primary rounded-full" />
          )}
        </Button>

        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="appearance-none pl-4 pr-10 h-10 bg-card border border-input rounded-md text-muted-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent cursor-pointer transition-all"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Expandable Filters */}
      {showFilters && (
        <div className="p-4 bg-muted rounded-xl border border-border space-y-4">
          {/* Status Filter */}
          <div>
            <Label className="mb-2">Status</Label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={statusFilter === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onStatusChange(option.value)}
                  className={statusFilter === option.value ? 'bg-primary/10 text-primary hover:bg-primary/20' : ''}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Difficulty Filter */}
          <div>
            <Label className="mb-2">Difficulty</Label>
            <div className="flex flex-wrap gap-2">
              {difficultyOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={difficultyFilter === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onDifficultyChange(option.value)}
                  className={difficultyFilter === option.value ? option.color : ''}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="link"
              onClick={clearAllFilters}
              className="text-muted-foreground p-0 h-auto"
            >
              Clear all filters
            </Button>
          )}
        </div>
      )}

      {/* Results Count */}
      {(hasActiveFilters || searchQuery) && (
        <div className="text-sm text-muted-foreground">
          Showing {resultCount} of {totalCount} topics
          {resultCount === 0 && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">
              — Try adjusting your filters
            </span>
          )}
        </div>
      )}
    </div>
  );
}
