import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import type { TabContentProps } from '@/types/business-intelligence';

export function RoadmapTab({ businessIntelligence }: TabContentProps) {
  const roadmap = businessIntelligence?.roadmap || {
    phase_1: {
      title: "MVP Development",
      duration: "2-3 months",
      tasks: ["Core feature development", "Basic UI/UX", "Initial testing"],
      progress: 75
    },
    phase_2: {
      title: "Beta Launch",
      duration: "1-2 months", 
      tasks: ["User feedback collection", "Bug fixes", "Performance optimization"],
      progress: 25
    },
    phase_3: {
      title: "Full Launch",
      duration: "Ongoing",
      tasks: ["Marketing campaign", "User acquisition", "Feature expansion"],
      progress: 0
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(roadmap).map(([phase, data]) => (
        <Card key={phase} className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {data.title}
                </CardTitle>
                <CardDescription>{data.duration}</CardDescription>
              </div>
              <Badge variant={data.progress === 100 ? "default" : "secondary"}>
                {data.progress}% Complete
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <ProgressBar 
                progress={data.progress} 
                showPercentage={false}
                height="md"
              />
              <div className="space-y-2">
                {data.tasks.map((task, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{task}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}