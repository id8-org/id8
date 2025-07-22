import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, RefreshCw, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getRepoHealth, getRepoStats } from '@/lib/api';

interface DateNavigationProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  'data-tour'?: string;
}

export const DateNavigation: React.FC<DateNavigationProps> = ({ currentDate, onDateChange, onRefresh, isRefreshing = false, ...props }) => {
  const [serviceStatus, setServiceStatus] = React.useState<'healthy' | 'unhealthy' | 'loading'>('loading');
  const [repoStats, setRepoStats] = React.useState<{ total_repos: number; service: string } | null>(null);

  React.useEffect(() => {
    const checkServiceHealth = async () => {
      try {
        const health = await getRepoHealth();
        setServiceStatus(health.status === 'healthy' ? 'healthy' : 'unhealthy');
        
        const stats = await getRepoStats();
        setRepoStats(stats);
      } catch (error) {
        console.error('Error checking service health:', error);
        setServiceStatus('unhealthy');
      }
    };

    checkServiceHealth();
  }, []);

  const goToPreviousDay = () => {
    const previousDay = new Date(currentDate);
    previousDay.setDate(previousDay.getDate() - 1);
    onDateChange(previousDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    onDateChange(nextDay);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isFuture = (date: Date) => {
    const today = new Date();
    return date > today;
  };

  return (
    <div className="flex items-center justify-between bg-white rounded-lg border p-4 mb-6" {...props}>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-slate-800">Trending Repositories</span>
          
          {/* Service Status Indicator */}
          <div className="flex items-center gap-1">
            {serviceStatus === 'loading' && (
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
            )}
            {serviceStatus === 'healthy' && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            {serviceStatus === 'unhealthy' && (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-xs font-medium ${
              serviceStatus === 'healthy' ? 'text-green-600' : 
              serviceStatus === 'unhealthy' ? 'text-red-600' : 
              'text-gray-500'
            }`}>
              {serviceStatus === 'healthy' ? 'Enhanced Service' : 
               serviceStatus === 'unhealthy' ? 'Service Issues' : 
               'Checking...'}
            </span>
          </div>
        </div>
        
        <Badge variant={isToday(currentDate) ? "default" : "outline"}>
          {isToday(currentDate) ? "Today" : formatDate(currentDate)}
        </Badge>
        
        {/* Repository Stats */}
        {repoStats && (
          <Badge variant="secondary" className="text-xs">
            {repoStats.total_repos} repos
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousDay}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous Day
        </Button>
        
        {!isToday(currentDate) && (
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
          >
            Today
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextDay}
          disabled={isFuture(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000))}
          className="flex items-center gap-1"
        >
          Next Day
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
