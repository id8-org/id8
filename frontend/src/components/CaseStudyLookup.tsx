import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Loader2, Search, Building, TrendingUp, AlertTriangle, CheckCircle, DollarSign, Users, Target } from 'lucide-react';
import { generateCaseStudy, getCaseStudy, CaseStudy } from '../lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CaseStudyLookupProps {
  ideaId: string;
  ideaTitle: string;
  onClose?: () => void;
}

export const CaseStudyLookup: React.FC<CaseStudyLookupProps> = ({ ideaId, ideaTitle }) => {
  const [caseStudy, setCaseStudy] = useState<CaseStudy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [rawResponse, setRawResponse] = useState<string | null>(null);

  useEffect(() => {
    loadExistingCaseStudy();
  }, [ideaId]);

  const loadExistingCaseStudy = async () => {
    try {
      const response = await getCaseStudy(ideaId);
      setCaseStudy(response.case_study);
      setRawResponse(response.llm_raw_response || null);
    } catch (error) {
      // Case study doesn't exist yet, which is fine
      console.log('No existing case study found');
    }
  };

  const generateCaseStudyData = async (specificCompany?: string) => {
    setLoading(true);
    setError(null);
    setRawResponse(null);

    try {
      const response = await generateCaseStudy(ideaId, specificCompany);
      setCaseStudy(response.case_study);
      setRawResponse(response.llm_raw_response || null);
      setSearchMode(false);
    } catch (error) {
      console.error('Error generating case study:', error);
      setError('Failed to generate case study. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (companyName.trim()) {
      generateCaseStudyData(companyName.trim());
    }
  };

  // Check if we have a valid case study with structured data
  const hasValidCaseStudy = caseStudy && (
    caseStudy.company_name || 
    caseStudy.industry || 
    caseStudy.business_model || 
    caseStudy.success_factors
  );

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Generating case study...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Case Study Analysis</h2>
        <p className="text-gray-600">Find relevant case studies and success stories for your idea</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {!hasValidCaseStudy && !searchMode && (
        <Card className="mb-6 bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
          <CardContent className="p-6">
            <div className="text-center">
              <Building className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Find Relevant Case Study</h3>
              <p className="text-gray-600 mb-6">
                Discover how similar companies succeeded or failed with comparable ideas
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => generateCaseStudyData()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Find Best Match
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setSearchMode(true)}
                  className="w-full"
                >
                  Search Specific Company
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {searchMode && !hasValidCaseStudy && (
        <Card className="mb-6 bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <div className="flex gap-2">
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name (e.g., Airbnb, Uber, Slack)"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={!companyName.trim()}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button 
                variant="outline"
                onClick={() => setSearchMode(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {hasValidCaseStudy && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building className="h-6 w-6 text-blue-600" />
              <h3 className="text-xl font-semibold">{caseStudy.company_name}</h3>
              <Badge variant="secondary">AI Generated</Badge>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => generateCaseStudyData()}
            >
              Regenerate
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Company Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {caseStudy.industry && (
                  <div>
                    <span className="text-xs font-medium text-blue-700">Industry:</span>
                    <p className="text-sm text-blue-800">{caseStudy.industry}</p>
                  </div>
                )}
                {caseStudy.business_model && (
                  <div>
                    <span className="text-xs font-medium text-blue-700">Business Model:</span>
                    <p className="text-sm text-blue-800">{caseStudy.business_model}</p>
                  </div>
                )}
                {caseStudy.market_size && (
                  <div>
                    <span className="text-xs font-medium text-blue-700">Market Size:</span>
                    <p className="text-sm text-blue-800">{caseStudy.market_size}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Success Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {caseStudy.funding_raised && (
                  <div>
                    <span className="text-xs font-medium text-green-700">Funding Raised:</span>
                    <p className="text-sm text-green-800">{caseStudy.funding_raised}</p>
                  </div>
                )}
                {caseStudy.exit_value && (
                  <div>
                    <span className="text-xs font-medium text-green-700">Exit Value:</span>
                    <p className="text-sm text-green-800">{caseStudy.exit_value}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6">
            {caseStudy.success_factors && (
              <Card className="bg-green-50 border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Success Factors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {caseStudy.success_factors}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {caseStudy.challenges && (
              <Card className="bg-red-50 border-red-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-red-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Challenges Faced
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {caseStudy.challenges}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {caseStudy.lessons_learned && (
              <Card className="bg-purple-50 border-purple-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-purple-800 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Lessons Learned
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {caseStudy.lessons_learned}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Show raw response if parsing failed but we have raw data */}
      {!hasValidCaseStudy && rawResponse && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm mb-2">
              <strong>Note:</strong> The AI analysis couldn't be parsed into structured sections, but the raw response is available below.
            </p>
          </div>
          <Card className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
            <CardHeader>
              <CardTitle className="text-lg">Raw AI Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {rawResponse}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}; 