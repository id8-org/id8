import { useState, useEffect, useContext, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Brain, Globe, Target, Zap, Lightbulb, CheckCircle, Building2, Layers, Network, DollarSign, MessageSquare, Wand2 } from 'lucide-react';
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
      <DialogContent className="w-full max-w-5xl h-full flex flex-col" role="dialog" aria-labelledby="add-idea-title" aria-describedby="add-idea-desc">
        <DialogHeader className="flex-none px-8 pt-8 pb-4">
          <DialogTitle id="add-idea-title" className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent flex items-center gap-3">
            <Wand2 className="h-8 w-8 text-primary" />
            Transform Your Vision Into Reality
          </DialogTitle>
          <DialogDescription className="text-lg text-muted-foreground mt-2">
            Whether sparked by AI or born from your imagination, every great idea starts here. Choose your path to innovation.
          </DialogDescription>
        </DialogHeader>
        <div id="add-idea-desc" style={{display: 'none'}}>Choose between AI-generated ideas or create your own concept for validation and development.</div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col px-8 pb-8">
          <TabsList className="grid w-full grid-cols-2 mb-8 h-14 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 p-1">
            <TabsTrigger 
              value="ai-suggested" 
              className={`text-base h-12 px-6 font-semibold transition-all duration-200 rounded-lg ${
                activeTab === 'ai-suggested' 
                  ? 'bg-white text-primary shadow-md border border-primary/20' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
            > 
              <Sparkles className="mr-3 h-5 w-5" /> 
              AI-Suggested Ideas
            </TabsTrigger>
            <TabsTrigger 
              value="bring-your-own" 
              className={`text-base h-12 px-6 font-semibold transition-all duration-200 rounded-lg ${
                activeTab === 'bring-your-own' 
                  ? 'bg-white text-primary shadow-md border border-primary/20' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
            > 
              <Target className="mr-3 h-5 w-5" /> 
              Bring Your Own Idea
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="ai-suggested" className="pt-0 min-h-[500px] flex flex-col justify-between">
            <div className="space-y-8 flex-1">
              {/* Personalization Toggle */}
              <Card className="border-2 border-primary/10 bg-gradient-to-r from-primary/5 to-primary/10">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Brain className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Label htmlFor="personalization-toggle" className="text-base font-semibold text-gray-800 cursor-pointer">
                          Personalize with your profile
                        </Label>
                        <p className="text-sm text-gray-600 mt-1">
                          {hasCompletedOnboarding 
                            ? "Use your skills and preferences to generate tailored ideas" 
                            : "Complete your profile to enable personalized suggestions"
                          }
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="personalization-toggle"
                      checked={usePersonalization}
                      onCheckedChange={(checked) => setUsePersonalization(checked)}
                      disabled={!hasCompletedOnboarding}
                      aria-describedby="personalization-desc"
                    />
                  </div>
                  <div id="personalization-desc" className="sr-only">
                    Toggle to enable or disable personalized idea generation using your profile information
                  </div>
                </CardContent>
              </Card>
              
              {/* Parameter Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-800">
                      <div className="p-2 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      Industry Focus
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Select value={industry || 'any'} onValueChange={v => setIndustry(v === 'any' ? '' : v)}>
                      <SelectTrigger className="h-12 text-sm bg-white border-2 hover:border-primary/20 transition-colors">
                        {industry || 'Any Industry'}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Industry</SelectItem>
                        {INDUSTRIES.map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
                
                <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-800">
                      <div className="p-2 rounded-lg bg-green-100 group-hover:bg-green-200 transition-colors">
                        <Layers className="h-5 w-5 text-green-600" />
                      </div>
                      Business Vertical
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Select value={vertical} onValueChange={setVertical}>
                      <SelectTrigger className="h-12 text-sm bg-white border-2 hover:border-primary/20 transition-colors">
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
                  </CardContent>
                </Card>
                
                <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-800">
                      <div className="p-2 rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors">
                        <Network className="h-5 w-5 text-purple-600" />
                      </div>
                      Business Horizontal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Select value={horizontal} onValueChange={setHorizontal}>
                      <SelectTrigger className="h-12 text-sm bg-white border-2 hover:border-primary/20 transition-colors">
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
                  </CardContent>
                </Card>
                
                <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-800">
                      <div className="p-2 rounded-lg bg-amber-100 group-hover:bg-amber-200 transition-colors">
                        <DollarSign className="h-5 w-5 text-amber-600" />
                      </div>
                      Business Model
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Select value={businessModel} onValueChange={setBusinessModel}>
                      <SelectTrigger className="h-12 text-sm bg-white border-2 hover:border-primary/20 transition-colors">
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
                  </CardContent>
                </Card>
              </div>
              
              {/* Additional Context Card */}
              <Card className="border-2 border-gray-200 hover:border-primary/20 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-800">
                    <div className="p-2 rounded-lg bg-indigo-100">
                      <MessageSquare className="h-5 w-5 text-indigo-600" />
                    </div>
                    Additional Context
                    <span className="text-sm font-normal text-gray-500">(Optional)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Textarea
                    className="min-h-[100px] resize-none bg-white border-2 hover:border-primary/20 transition-colors text-sm"
                    placeholder="Share any specific requirements, constraints, or ideas you'd like the AI to consider... e.g., 'focus on tools for remote developers working with microservices'"
                    value={freeform}
                    onChange={e => setFreeform(e.target.value)}
                  />
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <Button 
                className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary flex items-center justify-center gap-3" 
                onClick={handleGenerate} 
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <Sparkles className="h-5 w-5 animate-spin" />
                    Generating Ideas...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5" />
                    Generate Ideas
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="bring-your-own" className="pt-0 min-h-[500px] flex flex-col justify-between">
            <div className="space-y-8 flex-1">
              {/* Introduction Card */}
              <Card className="border-2 border-primary/10 bg-gradient-to-r from-primary/5 to-primary/10">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
                      <Lightbulb className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Craft Your Vision</h3>
                      <p className="text-gray-600 leading-relaxed">
                        Transform your concept into a structured idea ready for validation. Fill in the story of your innovation—each field helps build a complete picture of your vision.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Madlib-style Form */}
              <div className="space-y-6">
                {/* Idea Title */}
                <Card className="border-2 border-red-200 bg-red-50/30">
                  <CardContent className="pt-6">
                    <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-3">
                      <span className="text-red-500 text-xl">*</span>
                      My idea is called
                    </Label>
                    <Input
                      className="h-12 text-base font-medium border-2 border-red-200 focus:border-red-400 bg-white"
                      placeholder="e.g., 'Smart Code Review Assistant' or 'Local Food Discovery App'"
                      value={userIdea.title}
                      onChange={e => setUserIdea({ ...userIdea, title: e.target.value })}
                      required
                      aria-describedby="title-help"
                    />
                    <p id="title-help" className="text-sm text-gray-500 mt-2">
                      Give your idea a memorable, descriptive name that captures its essence
                    </p>
                  </CardContent>
                </Card>

                {/* Hook */}
                <Card className="border-2 border-gray-200 hover:border-primary/20 transition-colors">
                  <CardContent className="pt-6">
                    <Label className="text-lg font-semibold text-gray-800 mb-3 block">
                      In one catchy sentence, it's
                    </Label>
                    <Input
                      className="h-12 text-base border-2 hover:border-primary/20 bg-white"
                      placeholder="e.g., 'The Grammarly for code that catches bugs before they ship'"
                      value={userIdea.hook}
                      onChange={e => setUserIdea({ ...userIdea, hook: e.target.value })}
                      aria-describedby="hook-help"
                    />
                    <p id="hook-help" className="text-sm text-gray-500 mt-2">
                      A memorable one-liner that immediately communicates your idea's appeal
                    </p>
                  </CardContent>
                </Card>

                {/* Value Proposition */}
                <Card className="border-2 border-gray-200 hover:border-primary/20 transition-colors">
                  <CardContent className="pt-6">
                    <Label className="text-lg font-semibold text-gray-800 mb-3 block">
                      The main value it provides is
                    </Label>
                    <Textarea
                      className="min-h-[100px] resize-none border-2 hover:border-primary/20 bg-white text-base"
                      placeholder="e.g., 'It helps developers catch critical bugs and security issues during code review, reducing production incidents by 60% and saving teams hours of debugging time'"
                      value={userIdea.value}
                      onChange={e => setUserIdea({ ...userIdea, value: e.target.value })}
                      aria-describedby="value-help"
                    />
                    <p id="value-help" className="text-sm text-gray-500 mt-2">
                      Describe the core benefit and impact your idea will have on users
                    </p>
                  </CardContent>
                </Card>

                {/* Differentiator */}
                <Card className="border-2 border-gray-200 hover:border-primary/20 transition-colors">
                  <CardContent className="pt-6">
                    <Label className="text-lg font-semibold text-gray-800 mb-3 block">
                      What makes it unique is
                    </Label>
                    <Input
                      className="h-12 text-base border-2 hover:border-primary/20 bg-white"
                      placeholder="e.g., 'It learns from your team's specific coding patterns and past mistakes'"
                      value={userIdea.differentiator}
                      onChange={e => setUserIdea({ ...userIdea, differentiator: e.target.value })}
                      aria-describedby="differentiator-help"
                    />
                    <p id="differentiator-help" className="text-sm text-gray-500 mt-2">
                      Highlight what sets your idea apart from existing solutions
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <Button 
                className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary flex items-center justify-center gap-3" 
                onClick={handleCreateOwnIdea} 
                disabled={loading || !userIdea.title.trim()}
                size="lg"
              >
                {loading ? (
                  <>
                    <CheckCircle className="h-5 w-5 animate-pulse" />
                    Creating & Validating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
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