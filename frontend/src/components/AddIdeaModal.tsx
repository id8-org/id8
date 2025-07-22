import { useState, useEffect, useContext, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Brain, Globe, Target, Zap, Lightbulb, CheckCircle } from 'lucide-react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectGroup, SelectLabel } from "@/components/ui/select";
import { BUSINESS_MODEL_GROUPS, BUSINESS_HORIZONTAL_GROUPS, BUSINESS_VERTICAL_GROUPS } from '@/lib/businessOptions';
import UnifiedIdeaModal from './UnifiedIdeaModal';
import type { Idea } from '@/lib/api';
import { getShortlist, addToShortlist, removeFromShortlist } from '../lib/api';

const INDUSTRIES = ["Technology", "Healthcare", "Finance", "Education", "Entertainment", "Retail", "Travel"];
const BUSINESS_MODELS = ["SaaS", "Marketplace", "E-commerce", "API as a Service", "Open Source"];

interface AddIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIdeaCreated: (ideaId?: string) => void;
  refreshIdeas?: () => void;
}

// Defensive: always use safeArray() for any .length or .map on possibly undefined fields
function safeArray(val: any) {
  return Array.isArray(val) ? val : [];
}

export const AddIdeaModal = ({ isOpen, onClose, onIdeaCreated, refreshIdeas }: AddIdeaModalProps) => {
  const [activeTab, setActiveTab] = useState("ai-suggested");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // State for AI-Suggested Idea
  const [industry, setIndustry] = useState("");
  const [vertical, setVertical] = useState("");
  const [horizontal, setHorizontal] = useState("");
  const [businessModel, setBusinessModel] = useState("");
  const [freeform, setFreeform] = useState("");
  const [usePersonalization, setUsePersonalization] = useState(true);

  // State for Bring Your Own Idea
  const [userIdea, setUserIdea] = useState({
    title: "",
    hook: "",
    value: "",
    evidence: "",
    differentiator: "",
    call_to_action: "",
  });

  // Add state for modals and data
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewIdea, setReviewIdea] = useState(null);
  const [showGeneratedIdeasModal, setShowGeneratedIdeasModal] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState([]);
  const [shortlist, setShortlist] = useState<string[]>([]);

  // Add state for stepper
  const [currentIdeaIndex, setCurrentIdeaIndex] = useState(0);
  const [acceptedIdeas, setAcceptedIdeas] = useState<any[]>([]);

  const hasCompletedOnboarding = user?.profile?.onboarding_completed ?? false;

  useEffect(() => {
    if (user && !hasCompletedOnboarding) {
      setUsePersonalization(false);
    }
  }, [user, hasCompletedOnboarding]);

  useEffect(() => {
    getShortlist().then(res => {
      if (Array.isArray(res)) setShortlist(res.map((i: any) => i.id));
    });
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/ideas/generate', {
        industry,
        business_model: businessModel,
        vertical,
        horizontal,
        context: freeform,
        use_personalization: usePersonalization,
        flow_type: 'ai',
      });
      setGeneratedIdeas(response.data.ideas || []);
      setCurrentIdeaIndex(0);
      setAcceptedIdeas([]);
      setShowGeneratedIdeasModal(true);
      // Do NOT call onIdeaCreated or refreshIdeas yet; wait for accept
      onClose();
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Could not generate ideas. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Accept the current idea
  const handleAcceptGeneratedIdea = async () => {
    const idea = generatedIdeas[currentIdeaIndex];
    if (!idea) return;
    try {
      await api.post('/ideas/save', idea); // Save to backend
      setAcceptedIdeas(prev => [...prev, idea]);
    } catch (error) {
      toast({ title: 'Failed to save idea', description: 'Please try again.' });
    }
    handleNextGeneratedIdea();
  };

  // Reject the current idea
  const handleRejectGeneratedIdea = () => {
    handleNextGeneratedIdea();
  };

  // Move to next idea or finish
  const handleNextGeneratedIdea = () => {
    if (currentIdeaIndex < generatedIdeas.length - 1) {
      setCurrentIdeaIndex(currentIdeaIndex + 1);
    } else {
      setShowGeneratedIdeasModal(false);
      if (acceptedIdeas.length > 0) {
        toast({
          title: `Added ${acceptedIdeas.length} idea${acceptedIdeas.length > 1 ? 's' : ''} to your board!`,
          description: 'You can now see them on your Kanban board.',
        });
        if (refreshIdeas) refreshIdeas();
        if (onIdeaCreated) onIdeaCreated();
      } else {
        toast({
          title: 'No ideas added',
          description: 'You rejected all generated ideas.',
        });
      }
    }
  };

  const reviewModalRef = useRef<HTMLDivElement>(null);

  const handleCreateOwnIdea = async () => {
    if (!userIdea.title.trim()) {
      toast({
        title: "Title is Required",
        description: "Please provide a title for your idea.",
      });
      return;
    }
    setLoading(true);
    try {
      // Clean userIdea: remove empty strings for optional fields
      const cleanedIdea = Object.fromEntries(
        Object.entries({ ...userIdea, status: 'deep_dive' })
          .filter(([_, v]) => v !== "")
      );
      const res = await api.post('/ideas/validate', {
        idea_data: cleanedIdea,
        use_personalization: usePersonalization,
        flow_type: 'byoi', // Specify BYOI flow
      });
      const newIdea = res.data?.idea || res.data;
      // Immediately add to board and close modal
      onIdeaCreated(newIdea?.id);
      if (refreshIdeas) refreshIdeas();
      toast({
        title: "Idea Added!",
        description: "Your idea has been added to the board."
      });
      onClose();
      // Optionally, show review modal if you want a second step
      // setReviewIdea(newIdea);
      // setTimeout(() => setShowReviewModal(true), 200);
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Could not save your idea. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewModalClose = () => {
    setShowReviewModal(false);
    setReviewIdea(null);
  };

  const handleReviewModalSave = (ideaId?: string) => {
    onIdeaCreated(ideaId);
    handleReviewModalClose();
  };

  const handleAddToShortlist = async (ideaId: string) => {
    await addToShortlist(ideaId);
    setShortlist(prev => prev.includes(ideaId) ? prev : [...prev, ideaId]);
  };

  const handleRemoveFromShortlist = async (ideaId: string) => {
    await removeFromShortlist(ideaId);
    setShortlist(prev => prev.filter(id => id !== ideaId));
  };

  // Simple data adapter (to be moved to a util file if needed)
  function mapIdeaToUnifiedIdeaModalProps(idea) {
    if (!idea) return null;
    const deepDive = idea.deep_dive || {};
    const iterating = idea.iterating || {};
    return {
      ...idea,
      problem: idea.problem_statement || idea.problem || '',
      elevatorPitch: idea.elevator_pitch || idea.elevatorPitch || '',
      overallScore: idea.score || idea.overall_score || 0,
      effort: idea.mvp_effort || idea.effort || 0,
      currentStage: idea.status,
      stageHistory: idea.stageHistory || [
        {
          stage: idea.status,
          date: idea.created_at,
          notes: idea.generation_notes || '',
        }
      ],
      // Deep Dive mapping for modal/card (defensive)
      marketOpportunity: deepDive.market_opportunity
        ? {
            score: deepDive.market_opportunity.scores?.product_market_fit_potential ?? deepDive.market_opportunity.scores?.product_market_fit ?? 0,
            rationale: deepDive.market_opportunity.narratives?.product_market_fit || '',
            details: [],
          }
        : { score: 0, rationale: 'Not available', details: [] },
      executionCapability: deepDive.execution_capability
        ? {
            score: deepDive.execution_capability.scores?.technical_feasibility ?? 0,
            rationale: deepDive.execution_capability.narratives?.technical_feasibility || '',
            details: [],
          }
        : { score: 0, rationale: 'Not available', details: [] },
      businessViability: deepDive.business_viability
        ? {
            score: deepDive.business_viability.scores?.profitability_potential ?? 0,
            rationale: deepDive.business_viability.narratives?.profitability_potential || '',
            details: [],
          }
        : { score: 0, rationale: 'Not available', details: [] },
      strategicAlignment: deepDive.strategic_alignment_risks
        ? {
            score: deepDive.strategic_alignment_risks.scores?.strategic_exit ?? 0,
            rationale: deepDive.strategic_alignment_risks.narratives?.strategic_exit || '',
            details: [],
          }
        : { score: 0, rationale: 'Not available', details: [] },
      // Iteration summary (defensive)
      iterationSummary: idea.iteration_notes || iterating.summary || '',
      // Add more fields as needed for modal
    };
  }

  const handleSaveGeneratedIdea = async (idea) => {
    // Ensure score and mvp_effort are included in the payload
    const payload = {
      ...idea,
      score: idea.score,
      mvp_effort: idea.mvp_effort,
      source_type: idea.source_type,
      // include any other required fields
    };
    await api.post('/ideas/save', payload); // Use the correct endpoint for saving a new idea
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl h-full flex flex-col">
        <DialogHeader className="flex-none">
          <DialogTitle className="text-2xl font-bold">Add Idea</DialogTitle>
          <DialogDescription>
            Add a new idea to your workspace.
          </DialogDescription>
        </DialogHeader>
        <div id="add-idea-desc" style={{display: 'none'}}>Add a new idea to your workspace.</div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
            <TabsTrigger value="ai-suggested" className={`text-sm h-12 px-4 font-semibold transition-all ${activeTab === 'ai-suggested' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-gray-700'}`}> 
              <Sparkles className="mr-2 h-4 w-4" /> AI-Suggested
            </TabsTrigger>
            <TabsTrigger value="bring-your-own" className={`text-sm h-12 px-4 font-semibold transition-all ${activeTab === 'bring-your-own' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-gray-700'}`}> 
              <Target className="mr-2 h-4 w-4" /> Bring Your Own
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="ai-suggested" className="pt-1 min-h-[400px] flex flex-col justify-between">
            <div className="space-y-6 flex-1">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="personalization-toggle"
                  checked={usePersonalization}
                  onCheckedChange={(checked) => setUsePersonalization(checked === true)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="personalization-toggle" className="text-sm font-medium text-gray-700">
                  Use my profile to personalize ideas
                </Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Industry</Label>
                  <Select value={industry || 'any'} onValueChange={v => setIndustry(v === 'any' ? '' : v)}>
                    <SelectTrigger className="h-11 text-sm bg-white">
                      {industry || 'Any'}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {INDUSTRIES.map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Business Vertical</Label>
                  <Select value={vertical} onValueChange={setVertical}>
                    <SelectTrigger className="h-11 text-sm bg-white">
                      {vertical || "Select vertical"}
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_VERTICAL_GROUPS.map(group => (
                        <SelectGroup key={group.label}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.options.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Business Horizontal</Label>
                  <Select value={horizontal} onValueChange={setHorizontal}>
                    <SelectTrigger className="h-11 text-sm bg-white">
                      {horizontal || "Select horizontal"}
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_HORIZONTAL_GROUPS.map(group => (
                        <SelectGroup key={group.label}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.options.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Business Model</Label>
                  <Select value={businessModel} onValueChange={setBusinessModel}>
                    <SelectTrigger className="h-11 text-sm bg-white">
                      {businessModel || "Select business model"}
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_MODEL_GROUPS.map(group => (
                        <SelectGroup key={group.label}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.options.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  Additional Context <span className="text-gray-400 font-normal">(Optional)</span>
                </Label>
                <Textarea
                  className="min-h-[80px] resize-none bg-white"
                  placeholder="e.g., focus on tools for remote developers..."
                  value={freeform}
                  onChange={e => setFreeform(e.target.value)}
                />
              </div>
            </div>
            
            <Button 
              className="mt-6 w-full h-12 text-base font-semibold shadow-sm" 
              onClick={handleGenerate} 
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Ideas'}
            </Button>
          </TabsContent>
          
          <TabsContent value="bring-your-own" className="pt-1 min-h-[400px] flex flex-col justify-between">
            <div className="space-y-6 flex-1">
              <div className="mb-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  Input the core components of your idea for validation and refinement.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    Idea Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    className="h-11 text-sm"
                    placeholder="e.g., AI-Powered Code Review Assistant"
                    value={userIdea.title}
                    onChange={e => setUserIdea({ ...userIdea, title: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Hook</Label>
                  <Input
                    className="h-11 text-sm"
                    placeholder="A catchy one-liner to grab attention."
                    value={userIdea.hook}
                    onChange={e => setUserIdea({ ...userIdea, hook: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Value Proposition</Label>
                  <Textarea
                    className="min-h-[80px] resize-none"
                    placeholder="What is the primary value your idea provides?"
                    value={userIdea.value}
                    onChange={e => setUserIdea({ ...userIdea, value: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Differentiator</Label>
                  <Input
                    className="h-11 text-sm"
                    placeholder="What makes your idea unique?"
                    value={userIdea.differentiator}
                    onChange={e => setUserIdea({ ...userIdea, differentiator: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <Button 
              className="mt-6 w-full h-12 text-base font-semibold shadow-sm" 
              onClick={handleCreateOwnIdea} 
              disabled={loading || !userIdea.title.trim()}
            >
              {loading ? 'Creating...' : 'Create and Validate Idea'}
            </Button>
          </TabsContent>
        </Tabs>
        
        {/* BYOI Review Modal - only open after AddIdeaModal closes */}
        {showReviewModal && reviewIdea && reviewIdea.id && (
          <UnifiedIdeaModal
            idea={mapIdeaToUnifiedIdeaModalProps(reviewIdea) as any}
            isOpen={showReviewModal}
            onClose={handleReviewModalClose}
          />
        )}
        
        {/* AI-Generated Ideas Modal */}
        {showGeneratedIdeasModal && generatedIdeas.length > 0 && (
          <UnifiedIdeaModal
            idea={mapIdeaToUnifiedIdeaModalProps(generatedIdeas[currentIdeaIndex]) as any}
            isOpen={showGeneratedIdeasModal}
            onClose={() => setShowGeneratedIdeasModal(false)}
            footerExtra={
              <div className="flex justify-between gap-4 mt-4">
                <Button variant="secondary" onClick={handleRejectGeneratedIdea}>
                  Reject
                </Button>
                <Button variant="default" onClick={handleAcceptGeneratedIdea}>
                  Accept & Add
                </Button>
              </div>
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}; 