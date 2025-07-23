// IMPORTANT: This component must only be rendered as a child of the main app layout, which provides the sidebar.
// If you render this directly, the sidebar will not appear.

import React, { useState, useEffect, type ReactElement, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Star, Lightbulb, Target, TrendingUp, Users, ArrowRight, StickyNote, Save, Edit3, Rocket, Clock, Brain, Briefcase, BarChart, GripVertical, Filter, Eye, EyeOff, Calendar, Code, Zap, Loader2, CheckCircle, ChevronRight, ChevronDown, ChevronLeft, ChevronUp, MessageCircle, LayoutDashboard, Plus, UserCircle, Menu } from 'lucide-react';
import { getDeepDiveVersions, createDeepDiveVersion, restoreDeepDiveVersion, fetchIdeas, updateIdeaStatus, getAllIdeas, triggerDeepDive, getIdeaById, triggerIterationTasks, triggerConsiderationTasks, triggerClosureTasks, updateIdea, getShortlist, addToShortlist, removeFromShortlist, getIdeasByStatus } from "../lib/api";
import type { IdeaStatus, DeepDiveVersion, Repo } from '../lib/api';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { AxiosError } from 'axios';
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useNavigate, Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { getEffortColor } from '../lib/utils';
import { IdeaFilterBar } from './IdeaFilterBar';
import ClosureReasonModal from './ui/ClosureReasonModal';
import AskAIWindow from './ui/AskAIWindow';
import { MvpChecklist } from './MvpChecklist';
import Confetti from 'react-confetti';
import { mapIdeaToIdeaModalProps, toSuggestedIdeaCard, toDeepDiveIdeaCard, toIteratingIdeaCard, filterIdeas, sortIdeas, IdeaFilters } from '@/lib/ideaUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import UnifiedIdeaCard from './UnifiedIdeaCard';
import UnifiedIdeaModal from './UnifiedIdeaModal';
import type { SuggestedIdeaCard, DeepDiveIdeaCard, IteratingIdeaCard, DeepDiveStage } from '@/types/ideaModels';
import { IterationStepper } from './IterationStepper';
import type { Idea as IdeaType } from '../types/idea';
import { api } from "@/lib/api";

import KanbanColumn from './KanbanColumn';
import type { Idea as NormalizedIdea } from '../types/idea';


// Define a single Stage type for consistency
export type Stage = 'suggested' | 'deep-dive' | 'iterating' | 'considering' | 'closed';

// Utility to map backend status to Stage
function mapStatusToStage(status: string): Stage {
  switch (status) {
    case 'deep_dive':
      return 'deep-dive';
    case 'iterating':
      return 'iterating';
    case 'considering':
      return 'considering';
    case 'closed':
      return 'closed';
    default:
      return 'suggested';
  }
}

// Utility to get potential consistently
function getPotential(idea: NormalizedIdea): number {
  if (typeof idea.potential === 'number') return idea.potential;
  if (typeof idea.score === 'number' && typeof idea.mvp_effort === 'number') return idea.score - idea.mvp_effort;
  return 0;
}

// Update LIFECYCLE_STAGES to use Stage
export const LIFECYCLE_STAGES: { key: Stage; label: string }[] = [
  { key: 'suggested', label: 'Suggested' },
  { key: 'deep-dive', label: 'Deep Dive' },
  { key: 'iterating', label: 'Iterating' },
  { key: 'considering', label: 'Considering' },
  { key: 'closed', label: 'Closed' },
];

interface IdeaWorkspaceProps {
  ideasByStage: {
    suggested: NormalizedIdea[];
    deep_dive: NormalizedIdea[];
    iterating: NormalizedIdea[];
    considering: NormalizedIdea[];
    closed: NormalizedIdea[];
  };
  refreshStage: (stage: string) => void;
  repos?: Repo[];
  onIdeaDeleted: (ideaId: string) => void;
  onIdeaUpdated: (idea: NormalizedIdea) => void;
  onStatusChange: (ideaId: string, status: IdeaStatus) => Promise<void>;
  onDeepDive: (ideaId: string) => Promise<void>;
  modalIdea: NormalizedIdea | null;
  setModalIdea: (idea: NormalizedIdea | null) => void;
  onOpenModal?: (idea: NormalizedIdea) => void;
  onAddIdea?: () => void;
  openAskAI: (context: { type: 'profile' } | { type: 'idea', idea: any } | { type: 'version', idea: any, version: number }) => void;
}

interface FilterState {
  language: string;
  age: string;
  ideaType: string;
  showNew: boolean;
  showSeen: boolean;
  showManual: boolean;
  showGenerated: boolean;
  minScore: number;
  maxEffort: number;
}

// Utility to map Stage back to backend status string
function mapStageToStatus(stage: Stage): IdeaStatus {
  switch (stage) {
    case 'deep-dive':
      return 'deep_dive';
    case 'iterating':
      return 'iterating';
    case 'considering':
      return 'considering';
    case 'closed':
      return 'closed';
    default:
      return 'suggested';
  }
}

// Utility to create a blank idea for Add Idea modal
function getBlankIdea(): NormalizedIdea {
  return {
    id: '',
    idea_number: 0,
    user_id: '',
    repo_id: '',
    title: '',
    hook: '',
    value: '',
    evidence: '',
    differentiator: '',
    call_to_action: '',
    deep_dive: undefined,
    score: 0,
    mvp_effort: 0,
    deep_dive_requested: false,
    status: 'suggested',
    type: '',
    business_model: '',
    market_positioning: '',
    revenue_streams: '',
    target_audience: '',
    competitive_advantage: '',
    go_to_market_strategy: '',
    success_metrics: '',
    risk_factors: '',
    iteration_notes: '',
    business_intelligence: {},
    repo_usage: '',
    repo_language: '',
    repo_stars: 0,
    repo_forks: 0,
    repo_watchers: 0,
    repo_url: '',
    assumptions: [],
    source_type: undefined, // must be undefined, not empty string
    vertical: '',
    horizontal: '',
    scope_commitment: '',
    source_of_inspiration: '',
    problem_statement: '',
    elevator_pitch: '',
    core_assumptions: [],
    riskiest_assumptions: [],
    generation_notes: '',
    customer_validation_plan: '',
    potential: 0,
    tam: 0,
    sam: 0,
    som: 0,
    iterating: undefined,
  };
}

// Add a normalization helper for ideas
export function normalizeIdea(idea: any): NormalizedIdea {
  let type = idea.type;
  if (typeof type === 'string') {
    const t = type.trim().toLowerCase().replace(/[-_\s]/g, '');
    if (t === 'sidehustle') type = 'side_hustle';
    else if (t === 'fullscale' || t === 'fulltime' || t === 'full_time') type = 'full_scale';
  }
  let source_type: 'byoi' | 'madlib' | 'system' | undefined = undefined;
  if (idea.source_type === 'byoi' || idea.source_type === 'madlib' || idea.source_type === 'system') {
    source_type = idea.source_type;
  }
  // Defensive deep_dive normalization: ensure customer_validation_plan exists
  const deep_dive = idea.deep_dive && typeof idea.deep_dive === 'object' ? { ...idea.deep_dive } : {};
  if (deep_dive) {
    const sections = (deep_dive as any).sections;
    // For each major section, ensure customer_validation_plan exists
    ['market_opportunity', 'execution_capability', 'business_viability', 'strategic_alignment_risks'].forEach(key => {
      if (deep_dive[key]) {
        if (typeof deep_dive[key].customer_validation_plan !== 'string') {
          deep_dive[key].customer_validation_plan = '';
        }
      }
    });
    // Defensive: if sections exist, keep them
    if (sections) {
      (deep_dive as any).sections = sections;
    }
  }
  return {
    ...idea,
    type,
    source_type,
    deep_dive,
    iterating: idea.iterating && typeof idea.iterating === 'object' ? idea.iterating : {},
  } as NormalizedIdea;
}

const normalizeIdeas = (ideas: any[]): NormalizedIdea[] => ideas.map(normalizeIdea);

export function IdeaWorkspace({ 
  ideasByStage,
  refreshStage,
  repos = [],
  onIdeaDeleted,
  onIdeaUpdated,
  onStatusChange,
  onDeepDive,
  modalIdea,
  setModalIdea,
  onOpenModal,
  openAskAI
}: IdeaWorkspaceProps) {
  // Shortlist state from backend
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [shortlistLoading, setShortlistLoading] = useState(false);

  // Filtered ideas state (must be NormalizedIdea[])
  const [filteredIdeas, setFilteredIdeas] = useState<NormalizedIdea[]>([]);
  const [showIterationStepper, setShowIterationStepper] = useState(false);
  const [iterationIdea, setIterationIdea] = useState<NormalizedIdea | null>(null);
  const [activeStage, setActiveStage] = useState<string>('suggested');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ closed: false });
  
  // Enhanced filter state
  const [filters, setFilters] = useState<FilterState>({
    language: 'all',
    age: 'all',
    ideaType: 'all',
    showNew: true,
    showSeen: true,
    showManual: true,
    showGenerated: true,
    minScore: 0,
    maxEffort: 10
  });

  // Track seen ideas in localStorage
  const [seenIdeas, setSeenIdeas] = useState<Set<string>>(new Set());

  const [ideaNotes, setIdeaNotes] = useState<Record<number, string>>({});
  const [editingNotes, setEditingNotes] = useState<Record<number, boolean>>({});

  const [editingDeepDive, setEditingDeepDive] = useState<Record<string, Record<string, string>>>({});
  const [versionHistory, setVersionHistory] = useState<Record<string, DeepDiveVersion[]>>({});
  const [showVersionHistory, setShowVersionHistory] = useState<string | null>(null);
  const [versionLoading, setVersionLoading] = useState<boolean>(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  const [deepDiveInProgress, setDeepDiveInProgress] = useState<string | null>(null);

  const [modalLoading, setModalLoading] = useState(false);

  // Add to component state:
  const [closedCollapsed, setClosedCollapsed] = useState<boolean>(true);
  // Remove deepDiveCollapsed state and all logic/UI for collapsing Deep Dive column
  // Only keep closedCollapsed for Closed column

  // Add filter bar collapse state
  const [filterCollapsed, setFilterCollapsed] = useState<boolean>(true);

  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [closureIdea, setClosureIdea] = useState<NormalizedIdea | null>(null);
  const [closurePendingStatus, setClosurePendingStatus] = useState<string | null>(null);

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Add state for idea disappearance alert
  const [ideaDisappeared, setIdeaDisappeared] = useState(false);

  const revertOnCancelRef = useRef<null | (() => void)>(null);
  const askAIButtonRef = useRef<HTMLButtonElement>(null);

  // Load seen ideas from localStorage
  useEffect(() => {
    const savedSeenIdeas = localStorage.getItem('seenIdeas');
    if (savedSeenIdeas) {
      setSeenIdeas(new Set(JSON.parse(savedSeenIdeas)));
    }
  }, []);

  // Save seen ideas to localStorage
  const markIdeaAsSeen = (ideaId: string) => {
    const newSeenIdeas = new Set(seenIdeas);
    newSeenIdeas.add(ideaId);
    setSeenIdeas(newSeenIdeas);
    localStorage.setItem('seenIdeas', JSON.stringify([...newSeenIdeas]));
  };

  // PATCH: Always show suggested ideas if no filters are applied
  useEffect(() => {
    // If all filters are at their default values, show all suggested ideas
    const noFilters =
      filters.language === 'all' &&
      filters.age === 'all' &&
      filters.ideaType === 'all' &&
      filters.showNew &&
      filters.showSeen &&
      filters.showManual &&
      filters.showGenerated &&
      filters.minScore === 0 &&
      filters.maxEffort === 10;
    if (noFilters) {
      setFilteredIdeas(normalizeIdeas(ideasByStage.suggested));
      return;
    }
    const filtered = filterIdeas(
      normalizeIdeas(ideasByStage.suggested),
      filters,
      seenIdeas,
      shortlist,
      showFavoritesOnly
    );
    setFilteredIdeas(filtered);
  }, [ideasByStage.suggested, filters, repos, seenIdeas, shortlist, showFavoritesOnly]);

  // Get available languages from repos
  const availableLanguages = React.useMemo(() => {
    const languages = new Set<string>();
    repos.forEach(repo => {
      if (repo.language) {
        languages.add(repo.language);
      }
    });
    return Array.from(languages).sort();
  }, [repos]);

  // Get available idea types
  const availableIdeaTypes = React.useMemo(() => {
    const types = new Set<string>();
    ideasByStage.suggested.forEach(idea => {
      if (idea.type) {
        types.add(idea.type);
      }
    });
    return Array.from(types).sort();
  }, [ideasByStage.suggested]);

  // Get statistics
  const stats = React.useMemo(() => {
    const total = ideasByStage.suggested.length;
    const newIdeas = ideasByStage.suggested.filter(idea => !seenIdeas.has(idea.id)).length;
    const seenIdeasCount = ideasByStage.suggested.filter(idea => seenIdeas.has(idea.id)).length;
    const manualIdeas = ideasByStage.suggested.filter(idea => !idea.repo_id).length;
    const generatedIdeas = ideasByStage.suggested.filter(idea => idea.repo_id).length;
    
    return { total, newIdeas, seenIdeasCount, manualIdeas, generatedIdeas };
  }, [ideasByStage.suggested, seenIdeas]);

  useEffect(() => {
    const fetchShortlist = async () => {
      setShortlistLoading(true);
      try {
        const shortlistIdeas = await getShortlist();
        // Always map to IDs
        setShortlist(shortlistIdeas.map((i: any) => i.id));
      } catch (err) {
        setShortlist([]);
      } finally {
        setShortlistLoading(false);
      }
    };
    fetchShortlist();
  }, []);

  const handleAddToShortlist = async (ideaId: string) => {
    setShortlistLoading(true);
    try {
      await addToShortlist(ideaId);
      setShortlist(prev => [...prev, ideaId]);
    } catch (err) {
      // Handle error
    } finally {
      setShortlistLoading(false);
    }
  };

  const handleRemoveFromShortlist = async (ideaId: string) => {
    setShortlistLoading(true);
    try {
      await removeFromShortlist(ideaId);
      setShortlist(prev => prev.filter(id => id !== ideaId));
    } catch (err) {
      // Handle error
    } finally {
      setShortlistLoading(false);
    }
  };

  const handleNoteSave = (ideaIndex: number, note: string) => {
    setIdeaNotes(prev => ({ ...prev, [ideaIndex]: note }));
    setEditingNotes(prev => ({ ...prev, [ideaIndex]: false }));
  };

  const getScoreColor = (score: number) => {
    if (score > 7) return 'text-green-600';
    if (score > 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleDeepDiveFieldChange = (ideaId: string, field: string, value: string) => {
    setEditingDeepDive(prev => ({
      ...prev,
      [ideaId]: {
        ...prev[ideaId],
        [field]: value
      }
    }));
  };

  const handleSaveAndRerun = async (idea: NormalizedIdea, rerun: boolean) => {
    try {
      // Only pass id and fields, not the whole idea object
      const updatedIdea = await createDeepDiveVersion(idea.id, editingDeepDive[idea.id], idea.deep_dive_raw_response || '');
      onIdeaUpdated(updatedIdea);
      setEditingDeepDive(prev => {
        const newState = { ...prev };
        delete newState[idea.id];
        return newState;
      });
      // Refresh versions
      const versions = await getDeepDiveVersions(idea.id);
      setVersionHistory(prev => ({ ...prev, [idea.id]: versions }));
      if (rerun) {
        setDeepDiveInProgress(idea.id);
      }
    } catch (err) {
      // Handle error
    }
  };

  const handleShowVersionHistory = async (ideaId: string) => {
    if (showVersionHistory === ideaId) {
      setShowVersionHistory(null);
    } else {
      setVersionLoading(true);
      try {
        const versions = await getDeepDiveVersions(ideaId);
        setVersionHistory(prev => ({ ...prev, [ideaId]: versions }));
        setShowVersionHistory(ideaId);
      } catch (err) {
        // Handle error
      } finally {
        setVersionLoading(false);
      }
    }
  };

  const handleRestoreVersion = async (ideaId: string, versionNumber: number) => {
    try {
      // Only pass id and version number
      const restoredIdea = await restoreDeepDiveVersion(ideaId, versionNumber);
      onIdeaUpdated(restoredIdea);
      setShowVersionHistory(null);
      window.location.reload();
    } catch (err) {
      // Handle error
    }
  };

  const handleDeleteVersion = (ideaId: string, versionNumber: number) => {
    // Implement if needed
  };

  // PATCH: Always normalize when setting filteredIdeas from API or filter
  const handleStatusChange = async (id: string, newStatus: IdeaStatus) => {
    try {
      await onStatusChange(id, newStatus);
      setFilteredIdeas(prev => prev.map(idea => idea.id === id ? normalizeIdea({ ...idea, status: newStatus }) : idea));
      if (newStatus === 'deep_dive') {
        const updated = await getIdeaById(id);
        setFilteredIdeas(prev => prev.map(idea => idea.id === id ? normalizeIdea(updated) : idea));
        if (modalIdea?.id === id) setModalIdea(normalizeIdea(updated));
      }
    } catch (err: unknown) {
      if (isAxios404Error(err)) {
        alert('This idea no longer exists in the backend. It will be removed from the board.');
        setFilteredIdeas(prev => prev.filter(idea => idea.id !== id));
        setIdeaDisappeared(true);
      } else {
        alert('Failed to update status');
      }
    }
  };

  // Group ideas by status for kanban columns using Stage
  const ideasByStatus: Record<Stage, NormalizedIdea[]> = {
    suggested: [],
    'deep-dive': [],
    iterating: [],
    considering: [],
    closed: [],
  };
  
  (filteredIdeas || []).forEach(idea => {
    const stage = mapStatusToStage(idea.status);
    ideasByStatus[stage].push(idea);
  });
  
  // Sort each column by best ideas (highest score, lowest effort)
  Object.keys(ideasByStatus).forEach(status => {
    ideasByStatus[status as Stage] = sortIdeas(ideasByStatus[status as Stage]);
  });

  // Helper to fetch all ideas by stage
  const fetchAllIdeasByStage = async () => {
    const statuses = ['suggested', 'deep_dive', 'iterating', 'considering', 'closed'];
    const results: Record<string, NormalizedIdea[]> = {};
    for (const status of statuses) {
      try {
        const ideas = await getIdeasByStatus(status);
        results[status] = normalizeIdeas(ideas);
      } catch {
        results[status] = [];
      }
    }
    return results;
  };

  // Helper to fetch all ideas by stage and update state
  const fetchAllIdeasByStageAndUpdate = async () => {
    const statuses = ['suggested', 'deep_dive', 'iterating', 'considering', 'closed'];
    const results: Record<string, NormalizedIdea[]> = {};
    for (const status of statuses) {
      try {
        const ideas = await getIdeasByStatus(status);
        results[status] = normalizeIdeas(ideas);
      } catch {
        results[status] = [];
      }
    }
    // Merge all ideas into filteredIdeas for global search/filter, but keep by stage for Kanban
    const allIdeas = [
      ...results.suggested,
      ...results.deep_dive,
      ...results.iterating,
      ...results.considering,
      ...results.closed,
    ];
    setFilteredIdeas(allIdeas); // already normalized
    setKanbanIdeasByStage(prev => {
      // Preserve any optimistically updated ideas
      const newState = {
        suggested: results.suggested,
        'deep-dive': results.deep_dive,
        iterating: results.iterating,
        considering: results.considering,
        closed: results.closed,
      };
      
      // For each stage, preserve any ideas that have been optimistically updated
      Object.keys(prev).forEach(stageKey => {
        const stage = stageKey as Stage;
        const prevIdeas = prev[stage];
        const newIdeas = newState[stage];
        
        // Find any ideas in the previous state that aren't in the new state (optimistically updated)
        const preservedIdeas = prevIdeas.filter(prevIdea => {
          const existsInNew = newIdeas.some(newIdea => newIdea.id === prevIdea.id);
          const hasOptimisticUpdate = (prevIdea as any).deepDiveStatus || 
                                    (prevIdea as any).optimisticallyUpdated;
          return !existsInNew && hasOptimisticUpdate;
        });
        
        if (preservedIdeas.length > 0) {
          newState[stage] = [...newIdeas, ...preservedIdeas];
        }
      });
      
      return newState;
    });
    // Notify when deep dive is ready
    setDeepDivePending(prevPending => {
      const stillPending: string[] = [];
      prevPending.forEach(id => {
        const idea = allIdeas.find(i => i.id === id);
        if (idea && ((idea.deep_dive && Object.keys(idea.deep_dive).length > 0) || (idea.deep_dive_raw_response && idea.deep_dive_raw_response.length > 0))) {
          toast({
            title: 'Deep Dive Complete',
            description: `The Deep Dive analysis for "${idea.title}" is ready to view.`,
          });
        } else if (idea) {
          stillPending.push(id);
        }
      });
      return stillPending;
    });
  };

  // Polling to keep board current
  React.useEffect(() => {
    fetchAllIdeasByStageAndUpdate(); // Initial load
    const interval = setInterval(fetchAllIdeasByStageAndUpdate, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  // After any drag/drop or status change, refresh all columns
  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    console.log('onDragEnd called', { source, destination, draggableId });
    
    if (!destination) {
      return;
    }
    
    const sourceStatus = source.droppableId as Stage;
    const destStatus = destination.droppableId as Stage;
    
    if (sourceStatus === destStatus && source.index === destination.index) {
      return;
    }
    
    // Find the idea from the original ideas array, not filtered
    const idea = ideasByStage.suggested.find(i => i.id === draggableId) ||
                 ideasByStage.deep_dive.find(i => i.id === draggableId) ||
                 ideasByStage.iterating.find(i => i.id === draggableId) ||
                 ideasByStage.considering.find(i => i.id === draggableId) ||
                 ideasByStage.closed.find(i => i.id === draggableId);
    if (!idea) {
      console.error('❌ ERROR: Could not find idea with id:', draggableId);
      return;
    }
    
    // Optimistically update UI immediately
    const optimisticUpdate = (ideaId: string, updates: Partial<NormalizedIdea>) => {
      setFilteredIdeas(prev => prev.map(i => i.id === ideaId ? normalizeIdea({ ...i, ...updates }) : i));
      // Also update kanbanIdeasByStage to persist the visual change
      setKanbanIdeasByStage(prev => {
        const newState = { ...prev };
        
        // Find the idea in any stage and remove it
        let foundIdea: NormalizedIdea | undefined;
        Object.keys(newState).forEach(stageKey => {
          const stage = stageKey as Stage;
          const stageIdeas = newState[stage];
          const ideaIndex = stageIdeas.findIndex(i => i.id === ideaId);
          if (ideaIndex !== -1) {
            foundIdea = stageIdeas[ideaIndex];
            newState[stage] = stageIdeas.filter(i => i.id !== ideaId);
          }
        });
        
        // If we found the idea and it has a new status, add it to the correct stage
        if (foundIdea && updates.status) {
          const newStatus = updates.status;
          const targetStage = mapStatusToStage(newStatus);
          const updatedIdea = normalizeIdea({ ...foundIdea, ...updates, optimisticallyUpdated: true });
          newState[targetStage] = [...(newState[targetStage] || []), updatedIdea];
        }
        
        return newState;
      });
    };

    // If moving to 'closed', optimistically update status and show closure modal
    if (mapStatusToStage(destStatus) === 'closed') {
      const prevStatus = idea.status;
      optimisticUpdate(idea.id, { status: 'closed' });
      setClosureIdea(idea);
      setClosurePendingStatus(destStatus);
      setClosureModalOpen(true);
      // If closure is cancelled, revert status
      revertOnCancelRef.current = () => {
        optimisticUpdate(idea.id, { status: prevStatus });
      };
      return;
    }

    // --- Unified robust pattern for all transitions ---
    // 1. Set status to destination stage in backend and UI
    const newStatus = mapStageToStatus(destStatus);
    console.log('Transition', { from: sourceStatus, to: destStatus, newStatus });
    optimisticUpdate(idea.id, { status: newStatus });
    try {
      await onStatusChange(idea.id, newStatus);
      console.log('Status updated in backend', { id: idea.id, newStatus });
    } catch (err) {
      console.error('❌ ERROR: Status update failed:', err);
      optimisticUpdate(idea.id, { status: mapStageToStatus(sourceStatus) });
      toast({
        title: 'Failed to update status.',
        description: err instanceof Error ? err.message : 'Unknown error occurred',
        variant: 'destructive',
      });
      return;
    }
    // 2. Determine required background tasks
    const requiredTasks = getRequiredTasksForTransition(sourceStatus, destStatus);
    console.log('Required tasks for transition', requiredTasks);
    if (requiredTasks.length > 0) {
      // 3. Trigger all required tasks in the background
      toast({
        title: `${destStatus.charAt(0).toUpperCase() + destStatus.slice(1)} Started`,
        description: `"${idea.title}" is being processed...`,
      });
      try {
        // Special handling for deep dive: show a running notification and poll for completion
        if (requiredTasks.includes('deep_dive')) {
          toast({
            title: 'Deep Dive analysis is running...',
            description: `"${idea.title}" is being analyzed. You will be notified when it is ready.`,
          });
        }
        await executeCascadingTasks({ ...idea, status: newStatus }, requiredTasks);
        // 4. After all tasks complete, refresh the idea data
        await refreshIdeaById(idea.id);
        toast({
          title: `${destStatus.charAt(0).toUpperCase() + destStatus.slice(1)} Complete`,
          description: `"${idea.title}" has been processed successfully!`,
        });
      } catch (cascadeError) {
        console.error('❌ ERROR: Cascading tasks failed:', cascadeError);
        toast({
          title: 'Processing Incomplete',
          description: 'Some tasks failed. You can retry individual steps from the idea details.',
          variant: 'destructive',
        });
      }
    } else {
      // No tasks required, just show a simple status change toast
      if (sourceStatus !== destStatus) {
        toast({
          title: 'Status Updated',
          description: `"${idea.title}" moved to ${destStatus.replace('_', ' ')}`,
        });
      }
    }
    // 5. Refresh both source and destination columns
    refreshStage(sourceStatus);
    refreshStage(destStatus);

    if (newStatus === 'iterating') {
      try {
        console.log('Triggering iterating LLM experiment for', idea.id);
        // Trigger LLM experiment proposal for iterating
        const res = await api.post('/iterating/propose-experiment', { idea_id: idea.id });
        if (res && res.data) {
          // Optionally update the idea in the iterating column with the new experiment data
          setFilteredIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, iterating: { ...i.iterating, latest_experiment: res.data } } : i));
          // Automatically open the IterationStepper dialog for user review/edit/accept
          setIterationIdea({ ...idea, iterating: { ...idea.iterating, latest_experiment: res.data } });
          setShowIterationStepper(true);
          toast({ title: 'Iteration Plan Ready', description: 'Review and edit your iteration plan.' });
        }
      } catch (err) {
        // TODO: handle LLM call failure (show toast, fallback, etc.)
        console.error('Failed to trigger iterating LLM experiment:', err);
      }
    }
  };

  function isAxios404Error(err: unknown): err is AxiosError {
    return (
      typeof err === 'object' &&
      err !== null &&
      'response' in err &&
      (err as AxiosError).response !== undefined &&
      (err as AxiosError).response?.status === 404
    );
  }

  // 1. After a Deep Dive is triggered or polling completes, fetch the latest idea data and update state
  const refreshIdeaById = async (ideaId: string) => {
    try {
      const updated = await getIdeaById(ideaId);
      setFilteredIdeas(prev => prev.map(i => i.id === ideaId ? normalizeIdea(updated) : i));
      if (modalIdea && modalIdea.id === ideaId) setModalIdea(normalizeIdea(updated));
    } catch (err) {
      // Optionally handle error
    }
  };

  // When a card is clicked, open the modal
  // PATCH: Always normalize when setting modal/closure state
  const handleCardClick = (idea: NormalizedIdea) => {
    setModalIdea(normalizeIdea(idea));
  };

  // Update handleCardView to accept the normalized Idea type from '../types/idea'
  // PATCH: Always normalize when setting modal/closure state
  const handleCardView = (idea: NormalizedIdea) => {
    setModalIdea(normalizeIdea(idea));
  };

  

  // Helper function to determine required tasks based on status transition
  const getRequiredTasksForTransition = (fromStatus: Stage, toStatus: Stage): string[] => {
    const taskMap: Record<string, string[]> = {
      'suggested->deep-dive': ['deep_dive'],
      'suggested->iterating': ['deep_dive', 'iterating'],
      'suggested->considering': ['deep_dive', 'iterating', 'considering'],
      'suggested->closed': ['deep_dive', 'iterating', 'considering', 'closure'],
      'deep-dive->iterating': ['iterating'],
      'deep-dive->considering': ['iterating', 'considering'],
      'deep-dive->closed': ['iterating', 'considering', 'closure'],
      'iterating->considering': ['considering'],
      'iterating->closed': ['considering', 'closure'],
      'considering->closed': ['closure']
    };
    
    const key = `${fromStatus}->${toStatus}`;
    return taskMap[key] || [];
  };

  // Helper function to execute cascading tasks
  const executeCascadingTasks = async (idea: NormalizedIdea, tasks: string[]): Promise<void> => {
    console.log('🔍 DEBUG: Executing cascading tasks:', tasks, 'for idea', idea.id);
    
    for (const task of tasks) {
      console.log(`🔍 DEBUG: Executing task: ${task} for idea ${idea.id}`);
      
      switch (task) {
        case 'deep_dive': {
          toast({ title: 'Triggering Deep Dive', description: `Running deep dive for "${idea.title}"...` });
          // PATCH: Call triggerDeepDive to hit the backend /api/ideas/{id}/deep-dive endpoint
          await triggerDeepDive(idea.id);
          setFilteredIdeas(prev => prev.map(i => i.id === idea.id ? normalizeIdea({ ...i, deep_dive_requested: true }) : i));
          
          // Poll for deep dive completion
          const pollDeepDive = async (retries = 30) => {
            console.log('🔍 DEBUG: Starting deep dive polling for idea:', idea.id);
            for (let i = 0; i < retries; i++) {
              try {
                console.log(`🔍 DEBUG: Polling attempt ${i + 1}/${retries}`);
                const updated = await getIdeaById(idea.id);
                
                if ((updated.deep_dive_raw_response && updated.deep_dive_raw_response.length > 0) || 
                    (updated.deep_dive && Object.keys(updated.deep_dive).length > 0)) {
                  console.log('🔍 DEBUG: Deep dive completed');
                  setFilteredIdeas(prev => prev.map(i => i.id === idea.id ? normalizeIdea({ ...updated, deepDiveStatus: 'ready' }) : i));
                  
                  toast({
                    title: 'Deep Dive Complete',
                    description: `"${idea.title}" analysis is ready!`,
                  });
                  await refreshIdeaById(idea.id); // ensure latest data
                  return;
                }
                
                await new Promise(res => setTimeout(res, 2000));
              } catch (error) {
                console.error('❌ ERROR: Error polling for deep dive:', error);
                break;
              }
            }
            
            // If we get here, the deep dive didn't complete in time
            console.warn('⚠️ WARNING: Deep dive polling timed out');
            setFilteredIdeas(prev => prev.map(i => i.id === idea.id ? normalizeIdea({ ...i, deepDiveStatus: 'error' }) : i));
            toast({
              title: 'Deep Dive Timeout',
              description: `"${idea.title}" analysis is taking longer than expected. You can retry from the idea details.`,
              variant: 'destructive',
            });
          };
          
          await pollDeepDive();
          break;
        }
          
        case 'iterating':
          toast({ title: 'Triggering Iterating', description: `Running iterating LLM for "${idea.title}"...` });
          await triggerIterationTasks(idea.id);
          break;
          
        case 'considering':
          await triggerConsiderationTasks(idea.id);
          break;
          
        case 'closure':
          await triggerClosureTasks(idea.id);
          break;
          
        default:
          console.warn(`🔍 WARNING: Unknown task type: ${task}`);
      }
    }
  };

  // Always put 'closed' column last, and deduplicate
  const uniqueStages = Array.from(new Set(LIFECYCLE_STAGES.map(s => s.key)));
  const orderedStages = uniqueStages.filter(k => k !== 'closed').map(k => LIFECYCLE_STAGES.find(s => s.key === k)!).concat(LIFECYCLE_STAGES.find(s => s.key === 'closed')!);

  // Helper to extract signal scores from idea.deep_dive
  function getSignalScores(idea: NormalizedIdea): Record<string, number> | null {
    const sections = (idea.deep_dive as any)?.sections || [];
    if (!sections) return null;
    const section = sections.find((s: any) => /signal score/i.test(s.title));
    if (!section) return null;
    try {
      const match = section.content.match(/\{[\s\S]*\}/);
      if (match) {
        const obj = JSON.parse(match[0]);
        if (typeof obj === 'object') return obj;
      }
    } catch {}
    // Try to parse as key: value lines
    const lines = section.content.split('\n');
    const scores: Record<string, number> = {};
    let found = false;
    for (const line of lines) {
      const m = line.match(/([\w\s]+):\s*(\d+)/);
      if (m) {
        scores[m[1].trim()] = parseInt(m[2], 10);
        found = true;
      }
    }
    return found ? scores : null;
  }

  // Helper to safely add width/height if present
  function withFrozenSize(style: any, isDragging: boolean) {
    const frozen: Record<string, any> = {
      minWidth: '220px',
      minHeight: '120px',
      maxWidth: '100%',
    };
    if (isDragging) {
      if (style && 'width' in style) frozen.width = style.width;
      else frozen.width = '100%';
      if (style && 'height' in style) frozen.height = style.height;
    } else {
      frozen.width = '100%';
    }
    return { ...style, ...frozen };
  }

  // --- FINAL PASS: API call future-proofing ---
  // For all API calls, never pass a NormalizedIdea directly. Always pass a plain object or only the required fields.
  // For updateIdea, only pass the update fields, not the whole idea object.
  // For createDeepDiveVersion, pass the idea id and the fields as plain objects.
  // For restoreDeepDiveVersion, pass the id and version number only.
  // For getIdeaById, triggerDeepDive, triggerIterationTasks, triggerConsiderationTasks, triggerClosureTasks, getIdeasByStatus, only pass the id or status string as required.
  const handleClosureModalSubmit = async ({ closureReason, postMortem }: { closureReason: string; postMortem: string }) => {
    if (!closureIdea) return;
    // Only pass update fields, not the whole idea object
    await updateIdea(closureIdea.id, {
      status: 'closed',
      closure_reason: closureReason,
      post_mortem: postMortem,
    });
    setClosureModalOpen(false);
    setClosureIdea(null);
    setClosurePendingStatus(null);
    setFilteredIdeas(prev => prev.filter(i => i.id !== closureIdea.id));
  };

  // PATCH: Update all setClosureIdea and setModalIdea calls to always normalize
  // PATCH: Update all function signatures and props to use NormalizedIdea
  const handleClosureModalSkip = async () => {
    if (revertOnCancelRef.current) {
      revertOnCancelRef.current();
      revertOnCancelRef.current = null;
    }
    setClosureModalOpen(false);
    setClosureIdea(null);
    setClosurePendingStatus(null);
  };

  // Add a handler to open AskAI for a specific idea (from card or modal)
  // Use openAskAI from props
  const handleOpenAskAI = (idea?: NormalizedIdea) => {
    if (idea) {
      openAskAI({ type: 'idea', idea });
    } else {
      openAskAI({ type: 'profile' });
    }
  };

  // 1. Add state for drag-over column and confetti
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [showStageConfetti, setShowStageConfetti] = useState<{ [stage: string]: boolean }>({});

  // 2. Helper for stage analytics
  function getStageAnalytics(ideasForStage: NormalizedIdea[]) {
    const arr = Array.isArray(ideasForStage) ? ideasForStage : [];
    const count = arr.length;
    const avgScore = count > 0 ? Math.round(arr.reduce((sum, i) => (i.score || 0) + sum, 0) / count) : 0;
    const nextTip = count === 0 ? 'Add ideas to get started!' : avgScore >= 8 ? 'Promote your best ideas!' : 'Refine and research.';
    return { count, avgScore, nextTip };
  }

  // Inline mapping function to convert backend deep_dive to DeepDiveStage
  function mapDeepDiveToStage(deepDive: any) {
    if (!deepDive) return {};
    return {
      product_market_fit_score: deepDive.market_opportunity?.scores?.product_market_fit,
      market_size_score: deepDive.market_opportunity?.scores?.market_size,
      market_timing_score: deepDive.market_opportunity?.scores?.market_timing,
      founders_execution_score: deepDive.execution_capability?.scores?.founders_ability,
      technical_feasibility_score: deepDive.execution_capability?.scores?.technical_feasibility,
      go_to_market_score: deepDive.execution_capability?.scores?.go_to_market,
      profitability_potential_score: deepDive.business_viability?.scores?.profitability_potential,
      competitive_moat_score: deepDive.business_viability?.scores?.competitive_moat,
      strategic_exit_score: deepDive.strategic_alignment_risks?.scores?.strategic_exit,
      regulatory_risk_score: deepDive.strategic_alignment_risks?.scores?.regulatory_risks,
      overall_investor_attractiveness_score: deepDive.strategic_alignment_risks?.scores?.overall_investor_score,
      // Add narratives if needed
    };
  }

  // Defensive helpers for nested arrays
  function safeArray(val: any) {
    return Array.isArray(val) ? val : [];
  }

  // Add state for Kanban ideas by stage
  const [kanbanIdeasByStage, setKanbanIdeasByStage] = useState<Record<Stage, NormalizedIdea[]>>({
    suggested: [],
    'deep-dive': [],
    iterating: [],
    considering: [],
    closed: [],
  });

  // Add the missing deepDivePending state here
  const [deepDivePending, setDeepDivePending] = useState<string[]>([]);

  // Helper to map type to label
  function getTypeLabel(type?: string) {
    if (!type) return '';
    if (type === 'side_hustle') return 'Side Hustle';
    if (type === 'full_scale') return 'Full Scale';
    return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
  }

  // --- Main render ---
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 min-h-screen">
      <main className="flex-1 min-w-0">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 min-h-[80vh] w-full p-4">
              {LIFECYCLE_STAGES.map((stage, colIdx) => {
                const ideasForStage = kanbanIdeasByStage[stage.key as Stage].map(normalizeIdea);
                const analytics = getStageAnalytics(ideasForStage);
                const isClosed = stage.key === 'closed';
                const isCollapsed = isClosed && closedCollapsed;
                return (
                  <KanbanColumn
                    key={stage.key}
                    stage={stage}
                    ideas={ideasForStage}
                    analytics={analytics}
                    onCardClick={idea => { handleCardView(idea); }}
                    droppableId={stage.key}
                    isClosed={isClosed}
                    isCollapsed={isCollapsed}
                    onCollapse={isClosed ? () => setClosedCollapsed(true) : undefined}
                    onExpand={isClosed ? () => setClosedCollapsed(false) : undefined}
                  />
                );
              })}
            </div>
          </DragDropContext>
          {/* All other modals and overlays remain here, unchanged */}
          <Dialog open={showIterationStepper} onOpenChange={setShowIterationStepper}>
            <DialogContent className="max-w-2xl">
              {/* Add close/cancel button to Stepper dialog */}
              <div className="flex justify-end mb-2">
                <button
                  className="text-gray-500 hover:text-gray-700 text-sm px-2 py-1 rounded"
                  onClick={() => {
                    setShowIterationStepper(false);
                    setIterationIdea(null);
                  }}
                  aria-label="Close Stepper"
                >
                  Cancel
                </button>
              </div>
              {iterationIdea && (
                <IterationStepper
                  initialData={{
                    ideaId: iterationIdea.id,
                    version: (iterationIdea as any).version || '',
                    ...iterationIdea,
                    deep_dive: mapDeepDiveToStage(iterationIdea.deep_dive),
                    source_type: (['byoi', 'madlib', 'system'] as const).includes(iterationIdea.source_type as any)
                      ? (iterationIdea.source_type as 'byoi' | 'madlib' | 'system')
                      : undefined,
                  }}
                  onComplete={async (iterationData) => {
                    setShowIterationStepper(false);
                    setIterationIdea(null);
                    refreshIdeaById(iterationData.ideaId);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
          <ClosureReasonModal
            open={closureModalOpen}
            onClose={handleClosureModalSkip}
            onSubmit={handleClosureModalSubmit}
            ideaTitle={closureIdea?.title}
          />
          {modalIdea && (
            <>
              <UnifiedIdeaModal
                idea={normalizeIdea(modalIdea)}
                isOpen={!!modalIdea}
                onClose={() => {
                  setModalIdea(null);
                }}
                defaultStage={(() => {
                  if (modalIdea.status === 'deep_dive') return 'deep-dive';
                  if (modalIdea.status === 'iterating') return 'iterating';
                  if (modalIdea.status === 'considering') return 'considering';
                  if (modalIdea.status === 'closed') return 'closed';
                  return 'suggested';
                })()}
                onRequestDeepDive={async (ideaId) => {
                  await onDeepDive(ideaId);
                  for (let i = 0; i < 30; i++) {
                    const updated = await getIdeaById(ideaId);
                    if ((updated.deep_dive_raw_response && updated.deep_dive_raw_response.length > 0) || (updated.deep_dive && Object.keys(updated.deep_dive).length > 0)) {
                      setModalIdea(normalizeIdea(updated));
                      return;
                    }
                    await new Promise(res => setTimeout(res, 2000));
                  }
                }}
                setIterationIdea={setIterationIdea}
                setShowIterationStepper={setShowIterationStepper}
              />
            </>
          )}
          {process.env.NODE_ENV === 'development' && (
            <div className="fixed bottom-4 right-4 bg-black text-white p-2 rounded text-xs z-50">
              Modal State: {modalIdea ? `Open - ${modalIdea.title}` : 'Closed'}
            </div>
          )}
          {ideaDisappeared && (
            <Alert className="mb-4 w-full flex items-center justify-between bg-yellow-50 border-yellow-400 text-yellow-800">
              <AlertDescription className="flex-1">Idea disappeared from the board.</AlertDescription>
              <button className="ml-4 text-yellow-700 hover:underline text-sm font-medium" onClick={() => setIdeaDisappeared(false)}>
                Dismiss
              </button>
            </Alert>
          )}
        </main>
      </div>
  );
}