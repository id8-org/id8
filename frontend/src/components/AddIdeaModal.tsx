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
      <DialogContent className="w-full max-w-5xl h-full flex flex-col">
        <DialogHeader className="flex-none px-8 pt-8 pb-4">
          <DialogTitle className="text-3xl font-bold text-gray-900">Add Idea</DialogTitle>
          <DialogDescription className="text-lg text-gray-600 mt-2">
            Add a new idea to your workspace and validate it.
          </DialogDescription>
        </DialogHeader>
        <div id="add-idea-desc" style={{display: 'none'}}>Add a new idea to your workspace and validate it.</div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col px-8 pb-8">
          <TabsList className="grid w-full grid-cols-2 mb-8 h-14 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
            <TabsTrigger value="ai-suggested" className={`text-base h-12 px-6 font-semibold transition-all duration-200 rounded-lg ${activeTab === 'ai-suggested' ? 'bg-white text-primary shadow-md border border-primary/20' : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'}`}> 
              <Sparkles className="mr-3 h-5 w-5" /> AI-Suggested Ideas
            </TabsTrigger>
            <TabsTrigger value="bring-your-own" className={`text-base h-12 px-6 font-semibold transition-all duration-200 rounded-lg ${activeTab === 'bring-your-own' ? 'bg-white text-primary shadow-md border border-primary/20' : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'}`}> 
              <Target className="mr-3 h-5 w-5" /> Bring Your Own Idea
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="ai-suggested" className="pt-0 min-h-[500px] flex flex-col justify-between">
            <div className="space-y-8 flex-1">
              <div className="flex items-center space-x-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <Checkbox
                  id="personalization-toggle"
                  checked={usePersonalization}
                  onCheckedChange={(checked) => setUsePersonalization(checked === true)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  disabled={!hasCompletedOnboarding}
                />
                <div>
                  <Label htmlFor="personalization-toggle" className="text-base font-medium text-gray-800 cursor-pointer">
                    Use my profile to personalize ideas
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {hasCompletedOnboarding 
                      ? "Generate ideas tailored to your skills and preferences" 
                      : "Complete your profile to enable personalized suggestions"
                    }
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-8 rounded-xl border border-gray-200">
                <div className="space-y-3">
                  <Label className="text-base font-semibold text-gray-800">Industry Focus</Label>
                  <Select value={industry || 'any'} onValueChange={v => setIndustry(v === 'any' ? '' : v)}>
                    <SelectTrigger className="h-12 text-base bg-white border-2 hover:border-primary/30 transition-colors">
                      {industry || 'Any Industry'}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Industry</SelectItem>
                      {INDUSTRIES.map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-base font-semibold text-gray-800">Business Vertical</Label>
                  <Select value={vertical} onValueChange={setVertical}>
                    <SelectTrigger className="h-12 text-base bg-white border-2 hover:border-primary/30 transition-colors">
                      {vertical || "Choose a vertical market"}
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
                
                <div className="space-y-3">
                  <Label className="text-base font-semibold text-gray-800">Business Horizontal</Label>
                  <Select value={horizontal} onValueChange={setHorizontal}>
                    <SelectTrigger className="h-12 text-base bg-white border-2 hover:border-primary/30 transition-colors">
                      {horizontal || "Select horizontal approach"}
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
                
                <div className="space-y-3">
                  <Label className="text-base font-semibold text-gray-800">Business Model</Label>
                  <Select value={businessModel} onValueChange={setBusinessModel}>
                    <SelectTrigger className="h-12 text-base bg-white border-2 hover:border-primary/30 transition-colors">
                      {businessModel || "Define your revenue model"}
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
              
              <div className="space-y-4">
                <Label className="text-lg font-semibold text-gray-800">
                  Additional Context <span className="text-gray-500 font-normal">(Optional)</span>
                </Label>
                <Textarea
                  className="min-h-[100px] resize-none bg-white border-2 hover:border-primary/30 transition-colors text-base"
                  placeholder="Share any specific requirements, constraints, or ideas you'd like the AI to consider... e.g., 'focus on tools for remote developers working with microservices'"
                  value={freeform}
                  onChange={e => setFreeform(e.target.value)}
                />
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <Button 
                className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200" 
                onClick={handleGenerate} 
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                    Generating Ideas...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Ideas
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="bring-your-own" className="pt-0 min-h-[500px] flex flex-col justify-between">
            <div className="space-y-8 flex-1">
              <div className="p-6 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
                    <Lightbulb className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Create Your Vision</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Input the core components of your idea for validation and refinement. Each field helps build a complete picture of your concept.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3 p-4 border-2 border-red-200 bg-red-50/30 rounded-lg">
                  <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <span className="text-red-500 text-xl">*</span>
                    Idea Title
                  </Label>
                  <Input
                    className="h-12 text-base font-medium border-2 border-red-200 focus:border-red-400 bg-white"
                    placeholder="e.g., Smart Code Review Assistant or Local Food Discovery App"
                    value={userIdea.title}
                    onChange={e => setUserIdea({ ...userIdea, title: e.target.value })}
                    required
                  />
                  <p className="text-sm text-gray-500">
                    Give your idea a memorable, descriptive name that captures its essence
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-lg font-semibold text-gray-800">Hook</Label>
                  <Input
                    className="h-12 text-base border-2 hover:border-primary/30 bg-white transition-colors"
                    placeholder="A catchy one-liner that immediately communicates your idea's appeal"
                    value={userIdea.hook}
                    onChange={e => setUserIdea({ ...userIdea, hook: e.target.value })}
                  />
                  <p className="text-sm text-gray-500">
                    e.g., "The Grammarly for code that catches bugs before they ship"
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-lg font-semibold text-gray-800">Value Proposition</Label>
                  <Textarea
                    className="min-h-[100px] resize-none border-2 hover:border-primary/30 bg-white text-base transition-colors"
                    placeholder="Describe the core benefit and impact your idea will have on users..."
                    value={userIdea.value}
                    onChange={e => setUserIdea({ ...userIdea, value: e.target.value })}
                  />
                  <p className="text-sm text-gray-500">
                    e.g., "Helps developers catch critical bugs during review, reducing production incidents by 60%"
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-lg font-semibold text-gray-800">Differentiator</Label>
                  <Input
                    className="h-12 text-base border-2 hover:border-primary/30 bg-white transition-colors"
                    placeholder="What sets your idea apart from existing solutions?"
                    value={userIdea.differentiator}
                    onChange={e => setUserIdea({ ...userIdea, differentiator: e.target.value })}
                  />
                  <p className="text-sm text-gray-500">
                    e.g., "It learns from your team's specific coding patterns and past mistakes"
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <Button 
                className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200" 
                onClick={handleCreateOwnIdea} 
                disabled={loading || !userIdea.title.trim()}
                size="lg"
              >
                {loading ? (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5 animate-pulse" />
                    Creating & Validating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Create and Validate Idea
                  </>
                )}
              </Button>
              {!userIdea.title.trim() && (
                <p className="text-sm text-red-500 mt-2 text-center">
                  Please provide an idea title to continue
                </p>
              )}
            </div>
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