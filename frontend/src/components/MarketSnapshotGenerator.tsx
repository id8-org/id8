import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, Target, DollarSign, Users, Globe, Building, ArrowUpRight, ArrowDownRight, Activity, AlertTriangle } from 'lucide-react';
import { useState } from "react";
import type { Idea, MarketSnapshot } from "../lib/api";
import { generateMarketSnapshot as generateMarketSnapshotAPI, getMarketSnapshot as getMarketSnapshotAPI } from "../lib/api";

interface MarketSnapshotGeneratorProps {
  idea: Idea;
  onClose: () => void;
}

interface ParsedMarketData {
  market_size: {
    total: string;
    addressable: string;
    obtainable: string;
  };
  growth_rate: number;
  key_players: Array<{
    name: string;
    market_share: number;
    funding: string;
    status: 'growing' | 'stable' | 'declining';
  }>;
  trends: Array<{
    trend: string;
    impact: 'positive' | 'negative' | 'neutral';
    confidence: number;
  }>;
}

export const MarketSnapshotGenerator = ({ idea, onClose }: MarketSnapshotGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [marketData, setMarketData] = useState<ParsedMarketData | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsingFailed, setParsingFailed] = useState(false);

  const parseMarketData = (marketSnapshot: MarketSnapshot): ParsedMarketData | null => {
    try {
      // Try to parse the structured data from the market snapshot
      if (marketSnapshot.market_size && marketSnapshot.growth_rate && marketSnapshot.key_players) {
        return {
          market_size: {
            total: marketSnapshot.market_size,
            addressable: marketSnapshot.market_size, // Fallback if not available
            obtainable: marketSnapshot.market_size // Fallback if not available
          },
          growth_rate: parseFloat(marketSnapshot.growth_rate) || 0,
          key_players: Array.isArray(marketSnapshot.key_players) 
            ? marketSnapshot.key_players.map((player, index) => ({
                name: typeof player === 'string' ? player : `Player ${index + 1}`,
                market_share: 0,
                funding: 'N/A',
                status: 'stable' as const
              }))
            : [],
          trends: []
        };
      }
      
      // If structured data is not available, try to parse from raw response
      if (marketSnapshot.llm_raw_response) {
        try {
          const parsed = JSON.parse(marketSnapshot.llm_raw_response);
          if (parsed.market_size && parsed.growth_rate) {
            return {
              market_size: {
                total: parsed.market_size.total || parsed.market_size || 'N/A',
                addressable: parsed.market_size.addressable || parsed.market_size || 'N/A',
                obtainable: parsed.market_size.obtainable || parsed.market_size || 'N/A'
              },
              growth_rate: typeof parsed.growth_rate === 'number' ? parsed.growth_rate : parseFloat(parsed.growth_rate) || 0,
              key_players: Array.isArray(parsed.key_players) 
                ? parsed.key_players.map((player: { name?: string; market_share?: number; funding?: string; status?: string }) => ({
                    name: player.name || player || 'Unknown',
                    market_share: player.market_share || 0,
                    funding: player.funding || 'N/A',
                    status: player.status || 'stable'
                  }))
                : [],
              trends: Array.isArray(parsed.trends)
                ? parsed.trends.map((trend: { trend?: string; impact?: string; confidence?: number }) => ({
                    trend: trend.trend || trend || 'Unknown',
                    impact: trend.impact || 'neutral',
                    confidence: trend.confidence || 0
                  }))
                : []
            };
          }
        } catch (parseError) {
          console.warn('Failed to parse market data from raw response:', parseError);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing market data:', error);
      return null;
    }
  };

  const generateMarketSnapshot = async () => {
    setIsGenerating(true);
    setError(null);
    setParsingFailed(false);
    setRawResponse(null);
    
    try {
      const response = await generateMarketSnapshotAPI(idea.id);
      console.log('🔍 DEBUG: Market snapshot generation response:', response);
      
      const { market_snapshot, llm_raw_response } = response;
      setRawResponse(llm_raw_response);
      
      const parsedData = parseMarketData(market_snapshot);
      if (parsedData) {
        setMarketData(parsedData);
      } else {
        setParsingFailed(true);
        console.warn('⚠️ WARNING: Failed to parse market data, showing raw response');
      }
    } catch (error) {
      console.error('❌ ERROR: Failed to generate market snapshot:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate market snapshot');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadExistingMarketSnapshot = async () => {
    try {
      const response = await getMarketSnapshotAPI(idea.id);
      console.log('🔍 DEBUG: Existing market snapshot response:', response);
      
      const { market_snapshot, llm_raw_response } = response;
      setRawResponse(llm_raw_response);
      
      const parsedData = parseMarketData(market_snapshot);
      if (parsedData) {
        setMarketData(parsedData);
      } else {
        setParsingFailed(true);
        console.warn('⚠️ WARNING: Failed to parse existing market data, showing raw response');
      }
    } catch (error) {
      console.error('❌ ERROR: Failed to load existing market snapshot:', error);
      // Don't set error here as it's just trying to load existing data
    }
  };

  // Try to load existing data on component mount
  React.useEffect(() => {
    loadExistingMarketSnapshot();
  }, [idea.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Market Snapshot Generator</h2>
          <p className="text-gray-600">Generate comprehensive market analysis for: <span className="font-semibold">{idea.title}</span></p>
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

      {parsingFailed && rawResponse && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            The AI response couldn't be parsed into structured data. Showing the raw response below.
          </AlertDescription>
        </Alert>
      )}

      {!marketData && !parsingFailed && (
        <Card className="p-8 text-center">
          <Globe className="w-16 h-16 mx-auto mb-4 text-blue-600" />
          <h3 className="text-xl font-semibold mb-2">Generate Market Analysis</h3>
          <p className="text-gray-600 mb-6">
            Get a comprehensive market snapshot including size, growth, competition, and trends
          </p>
          <Button 
            onClick={generateMarketSnapshot} 
            disabled={isGenerating}
            className="w-full max-w-md"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating Market Snapshot...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Generate Market Snapshot
              </>
            )}
          </Button>
        </Card>
      )}

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
              <Button onClick={generateMarketSnapshot} disabled={isGenerating}>
                {isGenerating ? 'Regenerating...' : 'Regenerate'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {marketData && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="competition">Competition</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Market Size</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{marketData.market_size.total}</div>
                  <p className="text-xs text-muted-foreground">Global market opportunity</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Addressable Market</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{marketData.market_size.addressable}</div>
                  <p className="text-xs text-muted-foreground">Realistic target market</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Obtainable Market</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{marketData.market_size.obtainable}</div>
                  <p className="text-xs text-muted-foreground">Realistic revenue potential</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Market Growth Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold text-green-600">
                    {marketData.growth_rate}%
                  </div>
                  <div className="text-sm text-gray-600">Annual growth rate</div>
                </div>
                <Progress value={marketData.growth_rate} className="mt-4" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="competition" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Competitors</CardTitle>
              </CardHeader>
              <CardContent>
                {marketData.key_players.length > 0 ? (
                  <div className="space-y-4">
                    {marketData.key_players.map((player, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                            <Building className="w-6 h-6 text-gray-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{player.name}</h4>
                            <p className="text-sm text-gray-600">Funding: {player.funding}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{player.market_share}%</div>
                          <Badge variant={player.status === 'growing' ? 'default' : 'secondary'}>
                            {player.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No competitor data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Key Market Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                {marketData.trends.length > 0 ? (
                  <div className="space-y-4">
                    {marketData.trends.map((trend, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${trend.impact === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                            {trend.impact === 'positive' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <h4 className="font-semibold">{trend.trend}</h4>
                            <p className="text-sm text-gray-600">Confidence: {trend.confidence}%</p>
                          </div>
                        </div>
                        <Badge variant={trend.impact === 'positive' ? 'default' : 'destructive'}>
                          {trend.impact}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No trend data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}; 