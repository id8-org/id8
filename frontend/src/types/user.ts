// User-related type definitions

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_verified: boolean;
  tier: 'free' | 'premium';
  account_type: 'solo' | 'team';
  team_id?: string;
  oauth_provider?: string;
  oauth_id?: string;
  oauth_picture?: string;
  created_at: string;
  updated_at: string;
  profile?: UserProfile;
  onboarding_required?: boolean;
}

export interface UserProfile {
  id: string;
  user_id: string;
  background?: string;
  location?: Record<string, any>;
  website?: string;
  linkedin_url?: string;
  github_url?: string;
  skills: string[];
  experience_years?: number;
  industries: string[];
  interests: string[];
  horizontals: string[];
  verticals: string[];
  goals: string[];
  timeline?: string;
  education_level?: string;
  work_style?: string;
  funding_preference?: string;
  location_preference?: string;
  preferred_business_models: string[];
  preferred_industries: string[];
  risk_tolerance?: string;
  time_availability?: string;
  onboarding_completed: boolean;
  onboarding_step: number;
  created_at: string;
  updated_at: string;
}

export interface UserResume {
  id: string;
  user_id: string;
  original_filename?: string;
  file_path?: string;
  file_size?: number;
  content_type?: string;
  parsed_content?: string;
  extracted_skills: string[];
  work_experience: Record<string, any>[];
  education: Record<string, any>[];
  is_processed: boolean;
  processing_error?: string;
  created_at: string;
  updated_at: string;
}

// Auth-related types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}