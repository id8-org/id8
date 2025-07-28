// Repository-related type definitions

export interface Repo {
  id: string;
  name: string;
  url: string;
  summary?: string;
  language?: string;
  created_at: string;
  trending_period: 'daily' | 'weekly' | 'monthly';
  stargazers_count?: number;
  forks_count?: number;
  watchers_count?: number;
}

export interface RepoStats {
  id: string;
  stars: number;
  forks: number;
  watchers: number;
  language: string;
  last_updated: string;
}