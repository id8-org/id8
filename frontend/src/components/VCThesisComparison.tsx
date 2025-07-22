import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertTriangle, Target, TrendingUp, DollarSign, Users, Building, FileText, Plus } from 'lucide-react';
import { useState } from "react";
import type { Idea, VCThesisComparison as VCThesisComparisonType } from "../lib/api";
import { generateVCThesisComparison as generateVCThesisComparisonAPI, getVCThesisComparisons as getVCThesisComparisonsAPI } from "../lib/api";

interface VCThesisComparisonProps {
  idea: Idea;
  onClose: () => void;
}

interface ParsedVCThesis {
  id: string;
  name: string;
  firm: string;
  focus_areas: string[];
  investment_stage: string;
  check_size: string;
  thesis_points: string[];
  success_criteria: string[];
  alignment_score: number;
  notes: string;
}

export const VCThesisComparison = ({ idea, onClose }: VCThesisComparisonProps) => {
  const [selectedThesis, setSelectedThesis] = useState<string | null>(null);
  const [theses, setTheses] = useState<ParsedVCThesis[]>([]);
  const [rawResponses, setRawResponses] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [parsingFailed, setParsingFailed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const parseVCThesisData = (vcThesisComparison: VCThesisComparisonType): ParsedVCThesis | null => {
    try {
      // Try to parse from structured fields first
      if (vcThesisComparison.vc_firm && vcThesisComparison.thesis_focus) {
        return {
          id: vcThesisComparison.id,
          name: vcThesisComparison.thesis_focus,
          firm: vcThesisComparison.vc_firm,
          focus_areas: vcThesisComparison.thesis_focus ? [vcThesisComparison.thesis_focus] : [],
          investment_stage: 'Series A', // Default fallback
          check_size: '$5M - $20M', // Default fallback
          thesis_points: vcThesisComparison.key_alignment_points ? [vcThesisComparison.key_alignment_points] : [],
          success_criteria: [],
          alignment_score: vcThesisComparison.alignment_score || 0,
          notes: vcThesisComparison.potential_concerns || ''
        };
      }
      
      // If structured data is not available, try to parse from raw response
      if (vcThesisComparison.llm_raw_response) {
        try {
          const parsed = JSON.parse(vcThesisComparison.llm_raw_response);
          if (parsed.firm || parsed.name) {
            return {
              id: vcThesisComparison.id,
              name: parsed.name || parsed.thesis_focus || 'Unknown Thesis',
              firm: parsed.firm || parsed.vc_firm || 'Unknown Firm',
              focus_areas: Array.isArray(parsed.focus_areas) ? parsed.focus_areas : 
                         parsed.focus_areas ? [parsed.focus_areas] : [],
              investment_stage: parsed.investment_stage || 'Series A',
              check_size: parsed.check_size || '$5M - $20M',
              thesis_points: Array.isArray(parsed.thesis_points) ? parsed.thesis_points : 
                           parsed.thesis_points ? [parsed.thesis_points] : [],
              success_criteria: Array.isArray(parsed.success_criteria) ? parsed.success_criteria : 
                              parsed.success_criteria ? [parsed.success_criteria] : [],
              alignment_score: typeof parsed.alignment_score === 'number' ? parsed.alignment_score : 
                             parseFloat(parsed.alignment_score) || 0,
              notes: parsed.notes || parsed.potential_concerns || ''
            };
          }
        } catch (parseError) {
          console.warn('Failed to parse VC thesis from raw response:', parseError);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing VC thesis data:', error);
      return null;
    }
  };

  const generateVCThesisComparison = async (vcFirm?: string) => {
    setIsGenerating(true);
    setError(null);
    setParsingFailed(false);
    
    try {
      const response = await generateVCThesisComparisonAPI(idea.id, vcFirm);
      console.log('🔍 DEBUG: VC thesis comparison generation response:', response);
      
      const { vc_thesis_comparison, llm_raw_response } = response;
      setRawResponses(prev => ({ ...prev, [vc_thesis_comparison.id]: llm_raw_response }));
      
      const parsedData = parseVCThesisData(vc_thesis_comparison);
      if (parsedData) {
        setTheses(prev => [...prev, parsedData]);
        setSelectedThesis(parsedData.id);
      } else {
        setParsingFailed(true);
        console.warn('⚠️ WARNING: Failed to parse VC thesis data, showing raw response');
      }
    } catch (error) {
      console.error('❌ ERROR: Failed to generate VC thesis comparison:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate VC thesis comparison');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadExistingVCTheses = async () => {
    try {
      const response = await getVCThesisComparisonsAPI(idea.id);
      console.log('🔍 DEBUG: Existing VC thesis comparisons response:', response);
      
      const { vc_thesis_comparisons, llm_raw_responses } = response;
      setRawResponses(llm_raw_responses);
      
      const parsedTheses: ParsedVCThesis[] = [];
      let hasParsingFailures = false;
      
      for (const thesis of vc_thesis_comparisons) {
        const parsedData = parseVCThesisData(thesis);
        if (parsedData) {
          parsedTheses.push(parsedData);
        } else {
          hasParsingFailures = true;
        }
      }
      
      if (parsedTheses.length > 0) {
        setTheses(parsedTheses);
        setSelectedThesis(parsedTheses[0].id);
      }
      
      if (hasParsingFailures) {
        setParsingFailed(true);
        console.warn('⚠️ WARNING: Some VC thesis data failed to parse, showing raw responses');
      }
    } catch (error) {
      console.error('❌ ERROR: Failed to load existing VC thesis comparisons:', error);
      // Don't set error here as it's just trying to load existing data
    }
  };

  // Try to load existing data on component mount
  React.useEffect(() => {
    loadExistingVCTheses();
  }, [idea.id]);

  const getAlignmentColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getAlignmentIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-4 h-4" />;
    if (score >= 60) return <AlertTriangle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">VC Investment Thesis Comparison</h2>
          <p className="text-gray-600">Compare your idea against VC investment theses: <span className="font-semibold">{idea.title}</span></p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {parsingFailed && Object.keys(rawResponses).length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Some AI responses couldn't be parsed into structured data. Raw responses are available below.
          </AlertDescription>
        </Alert>
      )}

      {/* Thesis Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Investment Theses
            </CardTitle>
            <Button 
              onClick={() => generateVCThesisComparison()} 
              disabled={isGenerating}
              size="sm"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate New Thesis
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {theses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {theses.map(thesis => (
                <Card 
                  key={thesis.id} 
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedThesis === thesis.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedThesis(thesis.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{thesis.name}</CardTitle>
                        <p className="text-sm text-gray-600">{thesis.firm}</p>
                      </div>
                      <Badge className={getAlignmentColor(thesis.alignment_score)}>
                        {getAlignmentIcon(thesis.alignment_score)}
                        <span className="ml-1">{thesis.alignment_score}%</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span>{thesis.check_size}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>{thesis.investment_stage}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {thesis.focus_areas.slice(0, 2).map(area => (
                          <Badge key={area} variant="outline" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No VC Theses Generated</h3>
              <p className="text-gray-600 mb-4">
                Generate VC investment thesis comparisons to see how your idea aligns with different investment strategies
              </p>
              <Button onClick={() => generateVCThesisComparison()} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : 'Generate First Thesis'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Raw Responses Display */}
      {parsingFailed && Object.keys(rawResponses).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Raw AI Responses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(rawResponses)[0]} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                {Object.keys(rawResponses).map((id, index) => (
                  <TabsTrigger key={id} value={id}>
                    Thesis {index + 1}
                  </TabsTrigger>
                ))}
              </TabsList>
              {Object.entries(rawResponses).map(([id, rawResponse]) => (
                <TabsContent key={id} value={id}>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700">{rawResponse}</pre>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Thesis Comparison */}
      {selectedThesis && theses.length > 0 && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="thesis">Thesis Points</TabsTrigger>
            <TabsTrigger value="criteria">Success Criteria</TabsTrigger>
            <TabsTrigger value="alignment">Alignment</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {(() => {
              const thesis = theses.find(t => t.id === selectedThesis);
              if (!thesis) return null;

              return (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">{thesis.name}</CardTitle>
                        <p className="text-sm text-gray-600">{thesis.firm}</p>
                      </div>
                      <Badge className={getAlignmentColor(thesis.alignment_score)}>
                        {getAlignmentIcon(thesis.alignment_score)}
                        <span className="ml-1">{thesis.alignment_score}% Alignment</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="text-center p-4 border rounded-lg">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <div className="font-semibold">{thesis.check_size}</div>
                        <div className="text-sm text-gray-600">Check Size</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <div className="font-semibold">{thesis.investment_stage}</div>
                        <div className="text-sm text-gray-600">Investment Stage</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <Target className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                        <div className="font-semibold">{thesis.focus_areas.length}</div>
                        <div className="text-sm text-gray-600">Focus Areas</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Focus Areas</h4>
                      <div className="flex flex-wrap gap-2">
                        {thesis.focus_areas.map(area => (
                          <Badge key={area} variant="secondary">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {thesis.notes && (
                      <div>
                        <h4 className="font-semibold mb-2">Alignment Notes</h4>
                        <p className="text-gray-600">{thesis.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>

          <TabsContent value="thesis" className="space-y-6">
            {(() => {
              const thesis = theses.find(t => t.id === selectedThesis);
              if (!thesis) return null;

              return (
                <Card>
                  <CardHeader>
                    <CardTitle>Thesis Points</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {thesis.thesis_points.length > 0 ? (
                      <div className="space-y-4">
                        {thesis.thesis_points.map((point, index) => (
                          <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{point}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                How this relates to your idea: {idea.title}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No thesis points available</p>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>

          <TabsContent value="criteria" className="space-y-6">
            {(() => {
              const thesis = theses.find(t => t.id === selectedThesis);
              if (!thesis) return null;

              return (
                <Card>
                  <CardHeader>
                    <CardTitle>Success Criteria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {thesis.success_criteria.length > 0 ? (
                      <div className="space-y-4">
                        {thesis.success_criteria.map((criterion, index) => (
                          <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-medium">{criterion}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                How your idea measures up against this criterion
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No success criteria available</p>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>

          <TabsContent value="alignment" className="space-y-6">
            {(() => {
              const thesis = theses.find(t => t.id === selectedThesis);
              if (!thesis) return null;

              return (
                <Card>
                  <CardHeader>
                    <CardTitle>Alignment Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold mb-2">{thesis.alignment_score}%</div>
                      <div className="text-lg text-gray-600 mb-4">Overall Alignment</div>
                      <Progress value={thesis.alignment_score} className="w-full" />
                      <Badge className={`mt-4 ${getAlignmentColor(thesis.alignment_score)}`}>
                        {getAlignmentIcon(thesis.alignment_score)}
                        <span className="ml-1">
                          {thesis.alignment_score >= 80 ? 'Excellent Fit' : 
                           thesis.alignment_score >= 60 ? 'Good Fit' : 'Poor Fit'}
                        </span>
                      </Badge>
                    </div>

                    {thesis.notes && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold mb-2">Alignment Notes</h4>
                        <p className="text-sm text-gray-700">{thesis.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}; 