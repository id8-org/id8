import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  CheckCircle, 
  MapPin, 
  Upload, 
  FileText, 
  User, 
  Briefcase, 
  Target, 
  Settings,
  Plus,
  Trash2,
  ExternalLink,
  Calendar,
  Award,
  Globe,
  Building2,
  Zap,
  Brain,
  TrendingUp,
  Shield,
  Clock,
  Star,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { uploadResume } from '@/lib/api';
import { BUSINESS_MODEL_GROUPS, BUSINESS_HORIZONTAL_GROUPS, BUSINESS_VERTICAL_GROUPS } from '@/lib/businessOptions';
import AskAIWindow from '../components/ui/AskAIWindow';

// Predefined options
const SKILL_OPTIONS = [
  "Product Management", "Revenue Growth Strategies", "Subscription Models", "UX Optimization", 
  "Data-Driven Decision Making", "Monetization", "Pricing Strategy", "Funnel Optimization", 
  "eCommerce & Marketplace Growth", "Customer Experience", "Customer Lifecycle Management", 
  "Agile Methodologies (SAFe/Scrum)", "Cross-functional Leadership", "Stakeholder Management",
  "Technical Proficiency", "Business Process Optimization", "Growth Experimentation"
];

// For flat arrays:
const BUSINESS_MODELS = BUSINESS_MODEL_GROUPS.flatMap(g => g.options);
const HORIZONTAL_OPTIONS = BUSINESS_HORIZONTAL_GROUPS.flatMap(g => g.options);
const VERTICAL_OPTIONS = BUSINESS_VERTICAL_GROUPS.flatMap(g => g.options);

const RISK_TOLERANCE_OPTIONS = [
  { value: 'low', label: 'Low Risk', description: 'Conservative approach, stable returns' },
  { value: 'medium', label: 'Medium Risk', description: 'Balanced growth and stability' },
  { value: 'high', label: 'High Risk', description: 'Aggressive growth, higher potential returns' }
];

const TIME_AVAILABILITY_OPTIONS = [
  { value: 'part_time', label: 'Part-time', description: '10-20 hours per week' },
  { value: 'full_time', label: 'Full-time', description: '40+ hours per week' },
  { value: 'weekends_only', label: 'Weekends Only', description: 'Weekend availability' }
];

// Helper function for deduplication
function dedupeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  return skills.filter(skill => {
    const lower = skill.trim().toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

interface ProfileFormData {
  background: string;
  location: string;
  skills: string[];
  interests: string[];
  preferred_business_models: string[];
  risk_tolerance: string;
  time_availability: string;
  horizontals: string[];
  verticals: string[];
  education: string | { degree: string; institution: string }[];
  website?: string;
  linkedin_url?: string;
  github_url?: string;
}

interface ProfileProps {
  openAskAI: (context: { type: 'profile' }) => void;
}

export const Profile = ({ openAskAI }: ProfileProps) => {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Form state
  const [formData, setFormData] = useState<ProfileFormData>({
    background: '',
    location: '',
    skills: [],
    interests: [],
    preferred_business_models: [],
    risk_tolerance: '',
    time_availability: '',
    horizontals: [],
    verticals: [],
    education: [],
    website: '',
    linkedin_url: '',
    github_url: '',
  });

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploadStatus, setResumeUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [resumeError, setResumeError] = useState<string | null>(null);
  
  // Custom input states
  const [customSkill, setCustomSkill] = useState('');
  const [customInterest, setCustomInterest] = useState('');

  // Initialize form data from user profile
  useEffect(() => {
    if (user?.profile) {
      setFormData({
        background: user.profile.background || '',
        location: user.profile.location || '',
        skills: user.profile.skills || [],
        interests: user.profile.interests || [],
        preferred_business_models: user.profile.preferred_business_models || [],
        risk_tolerance: user.profile.risk_tolerance || '',
        time_availability: user.profile.time_availability || '',
        horizontals: user.profile.horizontals || [],
        verticals: user.profile.verticals || [],
        education: user.profile.education || [],
        website: user.profile.website || '',
        linkedin_url: user.profile.linkedin_url || '',
        github_url: user.profile.github_url || '',
      });
    }
  }, [user?.profile]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Authentication Required</h2>
          <p className="text-slate-600">Please log in to view your profile</p>
          <Link to="/auth">
            <Button>Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setLoading(true);
    try {
      const dedupedSkills = dedupeSkills(formData.skills);
      await updateProfile({
        ...formData,
        skills: dedupedSkills,
        preferred_business_models: formData.preferred_business_models || [],
        verticals: formData.verticals || [],
      });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user?.profile) {
      setFormData({
        background: user.profile.background || '',
        location: user.profile.location || '',
        skills: user.profile.skills || [],
        interests: user.profile.interests || [],
        preferred_business_models: user.profile.preferred_business_models || [],
        risk_tolerance: user.profile.risk_tolerance || '',
        time_availability: user.profile.time_availability || '',
        horizontals: user.profile.horizontals || [],
        verticals: user.profile.verticals || [],
        education: user.profile.education || [],
        website: user.profile.website || '',
        linkedin_url: user.profile.linkedin_url || '',
        github_url: user.profile.github_url || '',
      });
    }
    setIsEditing(false);
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setResumeFile(file);
    setResumeUploadStatus('uploading');
    setResumeError(null);
    
    try {
      const data = await uploadResume(file);
      setResumeUploadStatus('success');
      const dedupedSkills = dedupeSkills(data.extracted_skills);
      setFormData(prev => ({
        ...prev,
        background: data.bio || prev.background,
        skills: dedupedSkills,
        location: data.location || prev.location,
        horizontals: Array.isArray(data.extracted_horizontals) ? data.extracted_horizontals : prev.horizontals,
        verticals: Array.isArray(data.extracted_verticals) ? data.extracted_verticals : prev.verticals,
        education: data.education || prev.education,
      }));
      toast({ 
        title: 'Resume Uploaded', 
        description: 'Resume parsed successfully! Review and edit your information below.' 
      });
    } catch (err: unknown) {
      setResumeUploadStatus('error');
      setResumeError(err instanceof Error ? err.message : 'Failed to upload resume');
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload resume. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !formData.skills.includes(customSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: dedupeSkills([...prev.skills, customSkill.trim()])
      }));
      setCustomSkill('');
    }
  };

  const addCustomInterest = () => {
    if (customInterest.trim() && !formData.interests.includes(customInterest.trim())) {
      setFormData(prev => ({
        ...prev,
        interests: dedupeSkills([...prev.interests, customInterest.trim()])
      }));
      setCustomInterest('');
    }
  };

  const removeItem = (type: keyof ProfileFormData, item: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: (prev[type] as string[]).filter(i => i !== item)
    }));
  };

  const addItem = (type: keyof ProfileFormData, item: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: dedupeSkills([...(prev[type] as string[]), item])
    }));
  };

  const toggleBusinessModel = (model: string) => {
    setFormData(prev => ({
      ...prev,
      preferred_business_models: prev.preferred_business_models.includes(model)
        ? prev.preferred_business_models.filter(m => m !== model)
        : dedupeSkills([...prev.preferred_business_models, model])
    }));
  };

  const [removingResume, setRemovingResume] = useState(false);
  const handleRemoveResume = async () => {
    if (!window.confirm('Are you sure you want to remove your resume?')) return;
    setRemovingResume(true);
    try {
      // Implement this API call
      toast({ title: 'Resume removed', description: 'Your resume has been deleted.' });
      // Optionally update user/profile state here
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to remove resume.', variant: 'destructive' });
    } finally {
      setRemovingResume(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button className="text-slate-600 hover:text-slate-900 bg-transparent hover:bg-slate-100 h-9 px-3">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Profile
                </h1>
                <p className="text-slate-600 mt-1">Manage your account and preferences</p>
              </div>
            </div>
            
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleCancel} className="gap-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={loading} className="gap-2">
                  <Save className="h-4 w-4" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-4">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader className="text-center pb-4">
                <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-white shadow-xl ring-4 ring-blue-100">
                  <AvatarImage src={user.oauth_picture} alt={user.first_name} />
                  <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl font-semibold">
                  {user.first_name} {user.last_name}
                </CardTitle>
                <CardDescription className="text-slate-600">{user.email}</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>{user.profile?.location || 'Location not set'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-600">Tier:</span>
                    <Badge className="capitalize">
                      {user.tier || 'Free'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-600">Account:</span>
                    <Badge className="capitalize">
                      {user.account_type || 'Solo'}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Quick Stats */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-900">Quick Stats</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 rounded p-2 text-center">
                      <div className="font-semibold text-slate-900">{user.profile?.skills?.length || 0}</div>
                      <div className="text-slate-500">Skills</div>
                    </div>
                    <div className="bg-slate-50 rounded p-2 text-center">
                      <div className="font-semibold text-slate-900">{user.profile?.interests?.length || 0}</div>
                      <div className="text-slate-500">Interests</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="skills" className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Skills & Interests
                </TabsTrigger>
                <TabsTrigger value="business" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Business
                </TabsTrigger>
                <TabsTrigger value="resume" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Resume
                </TabsTrigger>
                <TabsTrigger value="team" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Basic Information
                    </CardTitle>
                    <CardDescription>Your personal and professional background</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="location">Location</Label>
                            <Input 
                              id="location" 
                              value={formData.location} 
                              onChange={e => setFormData({ ...formData, location: e.target.value })} 
                              placeholder="Enter your location" 
                            />
                          </div>
                          <div>
                            <Label htmlFor="website">Website</Label>
                            <Input 
                              id="website" 
                              value={formData.website || ''} 
                              onChange={e => setFormData({ ...formData, website: e.target.value })} 
                              placeholder="https://yourwebsite.com" 
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="linkedin">LinkedIn</Label>
                            <Input 
                              id="linkedin" 
                              value={formData.linkedin_url || ''} 
                              onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })} 
                              placeholder="https://linkedin.com/in/yourprofile" 
                            />
                          </div>
                          <div>
                            <Label htmlFor="github">GitHub</Label>
                            <Input 
                              id="github" 
                              value={formData.github_url || ''} 
                              onChange={e => setFormData({ ...formData, github_url: e.target.value })} 
                              placeholder="https://github.com/yourusername" 
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="background">Background</Label>
                          <Textarea 
                            id="background" 
                            value={formData.background} 
                            onChange={e => setFormData({ ...formData, background: e.target.value })} 
                            placeholder="Tell us about your background, experience, and what drives you..." 
                            rows={4} 
                            spellCheck={false}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-slate-700">Location</Label>
                            <p className="text-slate-600 mt-1">
                              {user.profile?.location || <span className="italic text-slate-400">Not set</span>}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-700">Website</Label>
                            <p className="text-slate-600 mt-1">
                              {user.profile?.website ? (
                                <a href={user.profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                  {user.profile.website}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="italic text-slate-400">Not set</span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-slate-700">Background</Label>
                          <p className="text-slate-600 mt-1">
                            {user.profile?.background || <span className="italic text-slate-400">No background information provided</span>}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Preferences Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Preferences
                    </CardTitle>
                    <CardDescription>Your business and work preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditing ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Risk Tolerance</Label>
                          <Select value={formData.risk_tolerance} onValueChange={v => setFormData(prev => ({ ...prev, risk_tolerance: v }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select risk tolerance" />
                            </SelectTrigger>
                            <SelectContent>
                              {RISK_TOLERANCE_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div>
                                    <div className="font-medium">{option.label}</div>
                                    <div className="text-xs text-slate-500">{option.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Time Availability</Label>
                          <Select value={formData.time_availability} onValueChange={v => setFormData(prev => ({ ...prev, time_availability: v }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select availability" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_AVAILABILITY_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div>
                                    <div className="font-medium">{option.label}</div>
                                    <div className="text-xs text-slate-500">{option.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-slate-700">Risk Tolerance</Label>
                          {user.profile?.risk_tolerance ? (
                            <Badge className="mt-1 capitalize">
                              {user.profile.risk_tolerance}
                            </Badge>
                          ) : (
                            <span className="italic text-slate-400 text-sm">Not set</span>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-700">Time Availability</Label>
                          {user.profile?.time_availability ? (
                            <Badge className="mt-1 capitalize border border-slate-300 bg-white text-slate-700">
                              {user.profile.time_availability.replace('_', ' ')}
                            </Badge>
                          ) : (
                            <span className="italic text-slate-400 text-sm">Not set</span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Skills & Interests Tab */}
              <TabsContent value="skills" className="space-y-6">
                {/* Skills Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Skills
                    </CardTitle>
                    <CardDescription>Your professional skills and expertise</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {formData.skills.map(skill => (
                            <Badge key={skill} className="flex items-center gap-1">
                              {skill}
                              <button
                                type="button"
                                onClick={() => removeItem('skills', skill)}
                                className="ml-1 hover:text-red-600 focus:outline-none"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {SKILL_OPTIONS.filter(opt => !formData.skills.includes(opt)).map(opt => (
                            <Button
                              key={opt}
                              type="button"
                              onClick={() => addItem('skills', opt)}
                              className="justify-start text-xs h-8 border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {opt}
                            </Button>
                          ))}
                        </div>
                        
                        <div className="flex gap-2">
                          <Input
                            value={customSkill}
                            onChange={e => setCustomSkill(e.target.value)}
                            placeholder="Add custom skill"
                            className="flex-1"
                            onKeyPress={e => e.key === 'Enter' && addCustomSkill()}
                          />
                          <Button onClick={addCustomSkill} disabled={!customSkill.trim()}>
                            Add
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {user.profile?.skills && user.profile.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {user.profile.skills.map((skill, index) => (
                              <Badge key={index} className="bg-slate-100 text-slate-800">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="italic text-slate-400">No skills added yet</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Interests Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Interests
                    </CardTitle>
                    <CardDescription>Topics and areas that interest you</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {formData.interests.map(interest => (
                            <Badge key={interest} className="flex items-center gap-1">
                              {interest}
                              <button
                                type="button"
                                onClick={() => removeItem('interests', interest)}
                                className="ml-1 hover:text-red-600 focus:outline-none"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex gap-2">
                          <Input
                            value={customInterest}
                            onChange={e => setCustomInterest(e.target.value)}
                            placeholder="Add custom interest"
                            className="flex-1"
                            onKeyPress={e => e.key === 'Enter' && addCustomInterest()}
                          />
                          <Button onClick={addCustomInterest} disabled={!customInterest.trim()}>
                            Add
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {user.profile?.interests && user.profile.interests.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {user.profile.interests.map((interest, index) => (
                              <Badge key={index} className="border border-slate-300 bg-white text-slate-700">
                                {interest}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="italic text-slate-400">No interests added yet</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Business Tab */}
              <TabsContent value="business" className="space-y-6">
                {/* Business Models Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Preferred Business Models
                    </CardTitle>
                    <CardDescription>Business models you're most interested in</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {user.profile?.preferred_business_models?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {user.profile.preferred_business_models.map((model, index) => (
                          <Badge key={index} className="bg-slate-100 text-slate-800">{model}</Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="italic text-slate-400">No business models selected</span>
                    )}
                  </CardContent>
                </Card>

                {/* Horizontals Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Business Horizontals
                    </CardTitle>
                    <CardDescription>Functional areas and capabilities you're interested in</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {formData.horizontals.map(horizontal => (
                            <Badge key={horizontal} className="flex items-center gap-1">
                              {horizontal}
                              <button
                                type="button"
                                onClick={() => removeItem('horizontals', horizontal)}
                                className="ml-1 hover:text-red-600 focus:outline-none"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {HORIZONTAL_OPTIONS.filter(opt => !formData.horizontals.includes(opt)).map(opt => (
                            <Button
                              key={opt}
                              type="button"
                              onClick={() => addItem('horizontals', opt)}
                              className="justify-start text-xs h-8 border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {opt}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        {user.profile?.horizontals && user.profile.horizontals.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {user.profile.horizontals.map((horizontal, index) => (
                              <Badge key={index} className="bg-slate-100 text-slate-800">
                                {horizontal}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="italic text-slate-400">No horizontals added yet</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Verticals Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Business Verticals
                    </CardTitle>
                    <CardDescription>Industries and sectors you're interested in</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {user.profile?.verticals && user.profile.verticals.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {user.profile.verticals.map((vertical, index) => (
                          <Badge key={index} className="bg-slate-100 text-slate-800">{vertical}</Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="italic text-slate-400">No verticals added yet</span>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Resume Tab */}
              <TabsContent value="resume" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Resume Upload
                    </CardTitle>
                    <CardDescription>Upload your resume to automatically extract skills and information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                      <Upload className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">Upload Resume</h3>
                      <p className="text-slate-600 mb-4">
                        Upload your resume (PDF, DOC, DOCX) to automatically extract your skills, experience, and background information.
                      </p>
                      
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleResumeUpload}
                        className="hidden"
                        id="resume-upload"
                        disabled={resumeUploadStatus === 'uploading'}
                      />
                      
                      <label
                        htmlFor="resume-upload"
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                          resumeUploadStatus === 'uploading'
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {resumeUploadStatus === 'uploading' ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Choose File
                          </>
                        )}
                      </label>
                      
                      {resumeFile && (
                        <div className="mt-4 text-sm text-slate-600">
                          Selected: {resumeFile.name}
                        </div>
                      )}
                      
                      {resumeError && (
                        <div className="mt-4 text-sm text-red-600">
                          Error: {resumeError}
                        </div>
                      )}
                      
                      {resumeUploadStatus === 'success' && (
                        <div className="mt-4 text-sm text-green-600 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Resume uploaded and parsed successfully!
                        </div>
                      )}
                    </div>
                    
                    {resumeUploadStatus === 'success' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Extracted Information</h4>
                        <p className="text-blue-700 text-sm">
                          Your resume has been processed. Review the extracted information in the other tabs and make any necessary edits.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Team Tab */}
              <TabsContent value="team" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Team Management
                    </CardTitle>
                    <CardDescription>Manage your team members and permissions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {user.account_type !== 'team' ? (
                      <div className="opacity-60 pointer-events-none select-none">
                        <div className="mb-4">
                          <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
                            <thead className="bg-slate-100">
                              <tr>
                                <th className="px-4 py-2">Name</th>
                                <th className="px-4 py-2">Email</th>
                                <th className="px-4 py-2">Role</th>
                                <th className="px-4 py-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="px-4 py-2">(You)</td>
                                <td className="px-4 py-2">{user.email}</td>
                                <td className="px-4 py-2">Owner</td>
                                <td className="px-4 py-2">Active</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="text-center text-slate-500 mt-6">
                          <div className="mb-2 font-medium">Want to turn this into a team account and add team members?</div>
                          <Button variant="outline" className="mt-2" disabled>Upgrade to Team</Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {/* TODO: Implement real team management table for team accounts */}
                        <div className="mb-4">
                          <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
                            <thead className="bg-slate-100">
                              <tr>
                                <th className="px-4 py-2">Name</th>
                                <th className="px-4 py-2">Email</th>
                                <th className="px-4 py-2">Role</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="px-4 py-2">{user.first_name} {user.last_name} (You)</td>
                                <td className="px-4 py-2">{user.email}</td>
                                <td className="px-4 py-2">Owner</td>
                                <td className="px-4 py-2">Active</td>
                                <td className="px-4 py-2">-</td>
                              </tr>
                              {/* More team members here in the future */}
                            </tbody>
                          </table>
                        </div>
                        <Button variant="outline" className="mt-2">Invite Team Member</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 