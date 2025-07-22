import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Presentation, BarChart3, Users, DollarSign, Target, TrendingUp, Globe, Shield, Zap, Clock, Eye, Settings, Palette, AlertTriangle } from 'lucide-react';
import { useState } from "react";
import type { Idea, InvestorDeck } from "../lib/api";
import { generateInvestorDeck, logExport } from "../lib/api";
import { API_BASE_URL } from "../lib/api";

interface InvestorDeckExporterProps {
  idea: Idea;
  onClose: () => void;
}

interface SlideTemplate {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
  included: boolean;
}

interface DeckStyle {
  id: string;
  name: string;
  description: string;
  preview: string;
}

interface FocusArea {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface SlideContent {
  title: string;
  content: string[];
}

export const InvestorDeckExporter = ({ idea, onClose }: InvestorDeckExporterProps) => {
  const [selectedSlides, setSelectedSlides] = useState<string[]>([
    'problem', 'solution', 'market', 'business-model', 'traction', 'team', 'financials', 'roadmap'
  ]);
  const [selectedStyle, setSelectedStyle] = useState<string>("modern");
  const [selectedFocus, setSelectedFocus] = useState<string>("general");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDeck, setGeneratedDeck] = useState<InvestorDeck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [parsingFailed, setParsingFailed] = useState(false);
  const [pptxLoading, setPptxLoading] = useState(false);
  // Track last generated options
  const [lastGeneratedOptions, setLastGeneratedOptions] = useState<{
    slides: string[];
    style: string;
    focus: string;
  } | null>(null);
  const [recipient, setRecipient] = useState<string>("");
  const [exportLogError, setExportLogError] = useState<string | null>(null);

  const focusAreas: FocusArea[] = [
    {
      id: "general",
      name: "General Overview",
      description: "Balanced presentation covering all aspects",
      icon: <Presentation className="w-4 h-4" />
    },
    {
      id: "configuration",
      name: "Configuration Focus",
      description: "Emphasize configuration capabilities and flexibility",
      icon: <Settings className="w-4 h-4" />
    },
    {
      id: "technology",
      name: "Technology Innovation",
      description: "Highlight technical advantages and innovation",
      icon: <Zap className="w-4 h-4" />
    },
    {
      id: "market",
      name: "Market Opportunity",
      description: "Focus on market size, growth, and opportunity",
      icon: <Globe className="w-4 h-4" />
    },
    {
      id: "team",
      name: "Team & Execution",
      description: "Emphasize team expertise and execution capability",
      icon: <Users className="w-4 h-4" />
    },
    {
      id: "traction",
      name: "Traction & Growth",
      description: "Highlight current traction and growth metrics",
      icon: <TrendingUp className="w-4 h-4" />
    }
  ];

  const slideTemplates: SlideTemplate[] = [
    {
      id: "problem",
      title: "Problem Statement",
      description: "Define the pain point and market need",
      icon: <Target className="w-4 h-4" />,
      required: true,
      included: true
    },
    {
      id: "solution",
      title: "Solution Overview",
      description: "How your product solves the problem",
      icon: <Zap className="w-4 h-4" />,
      required: true,
      included: true
    },
    {
      id: "market",
      title: "Market Opportunity",
      description: "Market size, growth, and segmentation",
      icon: <Globe className="w-4 h-4" />,
      required: true,
      included: true
    },
    {
      id: "business-model",
      title: "Business Model",
      description: "Revenue streams and pricing strategy",
      icon: <DollarSign className="w-4 h-4" />,
      required: true,
      included: true
    },
    {
      id: "traction",
      title: "Traction & Metrics",
      description: "Key performance indicators and growth",
      icon: <TrendingUp className="w-4 h-4" />,
      required: false,
      included: true
    },
    {
      id: "team",
      title: "Team",
      description: "Founding team and key hires",
      icon: <Users className="w-4 h-4" />,
      required: true,
      included: true
    },
    {
      id: "financials",
      title: "Financial Projections",
      description: "Revenue forecasts and unit economics",
      icon: <BarChart3 className="w-4 h-4" />,
      required: false,
      included: true
    },
    {
      id: "roadmap",
      title: "Product Roadmap",
      description: "Development timeline and milestones",
      icon: <Clock className="w-4 h-4" />,
      required: false,
      included: true
    },
    {
      id: "competition",
      title: "Competitive Analysis",
      description: "Competitive landscape and differentiation",
      icon: <Shield className="w-4 h-4" />,
      required: false,
      included: false
    },
    {
      id: "go-to-market",
      title: "Go-to-Market Strategy",
      description: "Customer acquisition and growth strategy",
      icon: <Eye className="w-4 h-4" />,
      required: false,
      included: false
    }
  ];

  const deckStyles: DeckStyle[] = [
    {
      id: "modern",
      name: "Modern & Clean",
      description: "Professional design with clean typography",
      preview: "Clean lines, modern fonts, minimal color palette"
    },
    {
      id: "bold",
      name: "Bold & Impactful",
      description: "High contrast design with strong visuals",
      preview: "Bold colors, large typography, impactful imagery"
    },
    {
      id: "corporate",
      name: "Corporate Professional",
      description: "Traditional business presentation style",
      preview: "Conservative colors, structured layout, formal tone"
    },
    {
      id: "startup",
      name: "Startup Dynamic",
      description: "Energetic and innovative presentation style",
      preview: "Bright colors, dynamic layouts, creative elements"
    }
  ];

  const toggleSlide = (slideId: string) => {
    const slide = slideTemplates.find(s => s.id === slideId);
    if (slide?.required) return; // Can't remove required slides

    setSelectedSlides(prev => 
      prev.includes(slideId) 
        ? prev.filter(id => id !== slideId)
        : [...prev, slideId]
    );
  };

  const validateDeckStructure = (deck: InvestorDeck): boolean => {
    try {
      // Check if we have the basic structure
      if (!deck.deck_content || !deck.deck_content.slides || !Array.isArray(deck.deck_content.slides)) {
        return false;
      }
      
      // Check if slides have required fields
      const hasValidSlides = deck.deck_content.slides.some(slide => 
        slide.title && (slide.content || slide.key_points)
      );
      
      return hasValidSlides;
    } catch (error) {
      console.error('Error validating deck structure:', error);
      return false;
    }
  };

  const generateDeck = async () => {
    setIsGenerating(true);
    setError(null);
    setRawResponse(null);
    setParsingFailed(false);
    setGeneratedDeck(null);
    setExportLogError(null);
    try {
      const response = await generateInvestorDeck(
        idea.id,
        selectedSlides.includes('case-studies'),
        selectedSlides.includes('market'),
        selectedSlides.includes('financials'),
        selectedFocus
      );
      
      console.log('🔍 DEBUG: Investor deck generation response:', response);
      
      const { investor_deck, llm_raw_response } = response;
      setRawResponse(llm_raw_response);
      
      // Validate the deck structure
      if (validateDeckStructure(investor_deck)) {
        setGeneratedDeck(investor_deck);
        setLastGeneratedOptions({
          slides: [...selectedSlides],
          style: selectedStyle,
          focus: selectedFocus,
        });
        // Log export (generation)
        try {
          await logExport({
            user_id: idea.user_id || '',
            idea_id: idea.id,
            deck_id: investor_deck.id,
            slides: selectedSlides,
            focus_area: selectedFocus,
            style: selectedStyle,
            file_type: 'pptx',
            recipient: recipient || undefined,
          });
        } catch (err: any) {
          setExportLogError('Failed to log export: ' + (err.message || 'Unknown error'));
        }
      } else {
        setParsingFailed(true);
        setLastGeneratedOptions(null);
        console.warn('⚠️ WARNING: Failed to parse investor deck structure, showing raw response');
      }
      
      // In a real implementation, this would trigger a download
      alert('Deck generated successfully! In a real implementation, this would download a PowerPoint or PDF file.');
    } catch (error) {
      console.error('❌ ERROR: Failed to generate investor deck:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate investor deck. Please try again.');
      setLastGeneratedOptions(null);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to check if current options match last generated
  const isCurrentOptionsGenerated =
    lastGeneratedOptions &&
    JSON.stringify(lastGeneratedOptions.slides) === JSON.stringify(selectedSlides) &&
    lastGeneratedOptions.style === selectedStyle &&
    lastGeneratedOptions.focus === selectedFocus;

  const getSlideContent = (slideId: string): SlideContent => {
    // If we have generated deck data, use it
    if (generatedDeck && generatedDeck.deck_content && generatedDeck.deck_content.slides) {
      const slide = generatedDeck.deck_content.slides.find((s: { slide_type?: string; title?: string; key_points?: string[]; content?: string }) => 
        s.slide_type === slideId || s.title?.toLowerCase().includes(slideId)
      );
      if (slide) {
        return {
          title: slide.title || slideId,
          content: slide.key_points || [slide.content || "Content generated by AI"]
        };
      }
    }

    // Fallback to default content
    switch (slideId) {
      case "problem":
        return {
          title: "The Problem",
          content: [
            "Current solutions are inefficient and expensive",
            "Users spend hours on manual processes",
            "No integrated solution exists in the market",
            "Costs businesses $X billion annually"
          ]
        };
      case "solution":
        return {
          title: "Our Solution",
          content: [
            "AI-powered automation platform",
            "Reduces manual work by 80%",
            "Integrates with existing workflows",
            "Scalable and customizable"
          ]
        };
      case "market":
        return {
          title: "Market Opportunity",
          content: [
            "Total Addressable Market: $45.2B",
            "Serviceable Addressable Market: $12.8B",
            "Serviceable Obtainable Market: $2.1B",
            "18.5% annual growth rate"
          ]
        };
      case "business-model":
        return {
          title: "Business Model",
          content: [
            "SaaS subscription model",
            "Enterprise: $50K-$200K annually",
            "SMB: $5K-$25K annually",
            "Consumer: $99/month"
          ]
        };
      default:
        return {
          title: "Slide Content",
          content: ["Content will be generated based on your idea"]
        };
    }
  };

  const handleDownloadPPTX = async () => {
    setPptxLoading(true);
    setError(null);
    setExportLogError(null);
    try {
      const url = `${API_BASE_URL}/advanced/investor-deck/${idea.id}/pptx`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to generate PowerPoint.');
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `investor_deck_${idea.id}.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      // Log export (download)
      if (generatedDeck && isCurrentOptionsGenerated) {
        try {
          await logExport({
            user_id: idea.user_id || '',
            idea_id: idea.id,
            deck_id: generatedDeck.id,
            slides: selectedSlides,
            focus_area: selectedFocus,
            style: selectedStyle,
            file_type: 'pptx',
            recipient: recipient || undefined,
          });
        } catch (err: any) {
          setExportLogError('Failed to log export: ' + (err.message || 'Unknown error'));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to download PowerPoint.');
    } finally {
      setPptxLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Investor Deck Exporter</h2>
          <p className="text-gray-600">Generate a professional investor presentation for: <span className="font-semibold">{idea.title}</span></p>
        </div>
        <Button onClick={onClose}>
          Close
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {parsingFailed && rawResponse && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            The AI response couldn't be parsed into structured deck format. Showing the raw response below.
          </AlertDescription>
        </Alert>
      )}

      {exportLogError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{exportLogError}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="slides" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="slides">Slide Selection</TabsTrigger>
          <TabsTrigger value="style">Design Style</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="slides" className="space-y-6">
          {/* Focus Area Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Choose Focus Area
              </CardTitle>
              <p className="text-sm text-gray-600">Select what aspect of your idea to emphasize in the deck</p>
            </CardHeader>
            <CardContent>
              <Select value={selectedFocus} onValueChange={setSelectedFocus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select focus area" />
                </SelectTrigger>
                <SelectContent>
                  {focusAreas.map(focus => (
                    <SelectItem key={focus.id} value={focus.id}>
                      <div className="flex items-center gap-2">
                        {focus.icon}
                        <div>
                          <div className="font-medium">{focus.name}</div>
                          <div className="text-sm text-gray-500">{focus.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Select Slides
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {slideTemplates.map(slide => (
                  <Card 
                    key={slide.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedSlides.includes(slide.id) ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => toggleSlide(slide.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {slide.icon}
                          <CardTitle className="text-lg">{slide.title}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          {slide.required && (
                            <Badge className="text-xs">
                              Required
                            </Badge>
                          )}
                          <Checkbox 
                            checked={selectedSlides.includes(slide.id)}
                            disabled={slide.required}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{slide.description}</p>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="style" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Choose Design Style
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {deckStyles.map(style => (
                  <Card 
                    key={style.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedStyle === style.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedStyle(style.id)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{style.name}</CardTitle>
                      <p className="text-sm text-gray-600">{style.description}</p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">{style.preview}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Deck Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-4"></div>
                  <span className="text-blue-600 font-semibold">Generating deck preview...</span>
                </div>
              ) : generatedDeck && isCurrentOptionsGenerated ? (
                <div className="space-y-4">
                  {generatedDeck.deck_content.slides.map((slide, index) => (
                    <div key={slide.slide_type || slide.title || index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                          </div>
                          <h3 className="font-semibold">{slide.title}</h3>
                        </div>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-1 ml-10">
                        {(slide.key_points || (typeof slide.content === 'string' ? [slide.content] : slide.content || [])).map((item: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 italic">No generated deck yet. Click "Generate Investor Deck" to see a preview here.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Raw Response Display */}
      {parsingFailed && rawResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Raw AI Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm text-gray-700">{rawResponse}</pre>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={generateDeck} disabled={isGenerating}>
                {isGenerating ? 'Regenerating...' : 'Regenerate'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recipient input above export options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Recipient (optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="text"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Enter recipient name or email (optional)"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <Presentation className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <div className="font-semibold">PowerPoint</div>
              <div className="text-sm text-gray-600">Editable .pptx file</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <FileText className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <div className="font-semibold">PDF</div>
              <div className="text-sm text-gray-600">Print-ready format</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Eye className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <div className="font-semibold">Preview</div>
              <div className="text-sm text-gray-600">Web-based view</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              {selectedSlides.length} slides • {deckStyles.find(s => s.id === selectedStyle)?.name} style
            </div>
            <Button 
              onClick={generateDeck}
              disabled={isGenerating}
              className="w-full max-w-md"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating Deck...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Investor Deck
                </>
              )}
            </Button>
          </div>

          <div className="flex gap-2 mt-6">
            <Button onClick={handleDownloadPPTX} disabled={!isCurrentOptionsGenerated || pptxLoading}>
              {pptxLoading ? (
                <span className="flex items-center gap-2"><Download className="w-4 h-4 animate-spin" />Generating...</span>
              ) : (
                <span className="flex items-center gap-2"><Download className="w-4 h-4" />Download as PowerPoint</span>
              )}
            </Button>
            {!isCurrentOptionsGenerated && (
              <span className="text-xs text-gray-500 ml-2">Generate the deck first to enable download.</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Settings className="w-5 h-5" />
            Pro Tips for Investor Decks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-900">Content Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Keep slides simple and focused</li>
                <li>• Use data and metrics to support claims</li>
                <li>• Tell a compelling story</li>
                <li>• Address the "so what?" question</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-900">Presentation Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Practice your pitch multiple times</li>
                <li>• Prepare for tough questions</li>
                <li>• Know your numbers cold</li>
                <li>• Have backup slides ready</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 