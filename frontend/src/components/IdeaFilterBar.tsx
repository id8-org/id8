import React from 'react';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Star, Eye, EyeOff, Zap, Brain } from 'lucide-react';

export interface IdeaFilterBarFilters {
  language: string;
  ideaType: string;
  minScore: number;
  maxEffort: number;
  showNew?: boolean;
  showSeen?: boolean;
  showManual?: boolean;
  showGenerated?: boolean;
}

interface IdeaFilterBarProps<T extends IdeaFilterBarFilters = IdeaFilterBarFilters> {
  filters: T;
  setFilters: React.Dispatch<React.SetStateAction<T>>;
  availableLanguages: string[];
  availableIdeaTypes: string[];
  showToggles?: boolean;
  stats?: {
    newIdeas?: number;
    seenIdeasCount?: number;
    manualIdeas?: number;
    generatedIdeas?: number;
  };
}

export const IdeaFilterBar = <T extends IdeaFilterBarFilters = IdeaFilterBarFilters>({
  filters,
  setFilters,
  availableLanguages,
  availableIdeaTypes,
  showToggles = false,
  stats = {},
}: IdeaFilterBarProps<T>) => (
  <Card className="p-1 mb-1">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-1 items-center">
      {/* Language Filter */}
      <div>
        <Label className="text-xs mb-0.5">Language</Label>
        <Select value={filters.language} onValueChange={v => setFilters(f => ({ ...f, language: v }))}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All languages" /></SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="all">All</SelectItem>
            {availableLanguages.map(lang => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {/* Type Filter */}
      <div>
        <Label className="text-xs mb-0.5">Type</Label>
        <Select value={filters.ideaType} onValueChange={v => setFilters(f => ({ ...f, ideaType: v }))}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="all">All</SelectItem>
            {availableIdeaTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {/* Min Score Filter */}
      <div>
        <Label className="text-xs mb-0.5">Min Score</Label>
        <Select value={filters.minScore.toString()} onValueChange={v => setFilters(f => ({ ...f, minScore: parseInt(v) }))}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="0">Any</SelectItem>
            <SelectItem value="6">6+</SelectItem>
            <SelectItem value="7">7+</SelectItem>
            <SelectItem value="8">8+</SelectItem>
            <SelectItem value="9">9+</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Max Effort Filter */}
      <div>
        <Label className="text-xs mb-0.5">Max Effort</Label>
        <Select value={filters.maxEffort.toString()} onValueChange={v => setFilters(f => ({ ...f, maxEffort: parseInt(v) }))}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="10">Any</SelectItem>
            <SelectItem value="6">6</SelectItem>
            <SelectItem value="4">4</SelectItem>
            <SelectItem value="3">3</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    {showToggles && (
      <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 pt-2 border-t">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-new"
              checked={!!filters.showNew}
              onCheckedChange={(checked) => setFilters(f => ({ ...f, showNew: checked }))}
            />
            <Label htmlFor="show-new" className="text-sm flex items-center gap-1">
              <Eye className="w-4 h-4" />
              New{typeof stats.newIdeas === 'number' ? ` (${stats.newIdeas})` : ''}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="show-seen"
              checked={!!filters.showSeen}
              onCheckedChange={(checked) => setFilters(f => ({ ...f, showSeen: checked }))}
            />
            <Label htmlFor="show-seen" className="text-sm flex items-center gap-1">
              <EyeOff className="w-4 h-4" />
              Seen{typeof stats.seenIdeasCount === 'number' ? ` (${stats.seenIdeasCount})` : ''}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="show-manual"
              checked={!!filters.showManual}
              onCheckedChange={(checked) => setFilters(f => ({ ...f, showManual: checked }))}
            />
            <Label htmlFor="show-manual" className="text-sm flex items-center gap-1">
              <Zap className="w-4 h-4" />
              Manual{typeof stats.manualIdeas === 'number' ? ` (${stats.manualIdeas})` : ''}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="show-generated"
              checked={!!filters.showGenerated}
              onCheckedChange={(checked) => setFilters(f => ({ ...f, showGenerated: checked }))}
            />
            <Label htmlFor="show-generated" className="text-sm flex items-center gap-1">
              <Brain className="w-4 h-4" />
              Generated{typeof stats.generatedIdeas === 'number' ? ` (${stats.generatedIdeas})` : ''}
            </Label>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters(f => ({
              ...f,
              language: 'all',
              ideaType: 'all',
              minScore: 0,
              maxEffort: 10,
              showNew: true,
              showSeen: true,
              showManual: true,
              showGenerated: true,
            }))}
            className="text-xs"
          >
            Clear All Filters
          </Button>
        </div>
      </>
    )}
  </Card>
); 