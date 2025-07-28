import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api, uploadResume, processResume } from '@/lib/api';
import { 
  User, 
  MapPin, 
  Briefcase, 
  Target, 
  Heart, 
  Settings, 
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toSnakeCase } from '@/lib/utils';
import { BUSINESS_MODEL_GROUPS, BUSINESS_HORIZONTAL_GROUPS, BUSINESS_VERTICAL_GROUPS, fetchBusinessOptions, BusinessOptionsResponse } from '@/lib/businessOptions';
import { Checkbox } from '@/components/ui/checkbox';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export const RISK_TOLERANCE_OPTIONS = [
  { value: 'low', label: 'Low Risk', description: 'Prefer stable, proven concepts' },
  { value: 'medium', label: 'Medium Risk', description: 'Balance of innovation and stability' },
  { value: 'high', label: 'High Risk', description: 'Willing to try bold, innovative ideas' }
];

export const TIME_AVAILABILITY_OPTIONS = [
  { value: 'part_time', label: 'Part-time', description: 'Evenings and weekends' },
  { value: 'full_time', label: 'Full-time', description: 'Can dedicate full attention' },
  { value: 'weekends_only', label: 'Weekends Only', description: 'Limited time availability' }
];

const INTERESTS_OPTIONS = BUSINESS_VERTICAL_GROUPS.flatMap(g => g.options);

// Add a short list of skills for onboarding
const SKILLS_OPTIONS = [
  'Product Management',
  'Software Engineering',
  'Marketing',
  'Sales',
  'Design',
  'Finance'
];

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-6 text-center">
    <h2 className="text-2xl font-bold text-gradient bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">{title}</h2>
    {subtitle && <p className="text-slate-600 text-base">{subtitle}</p>}
  </div>
);

const isGroupFullySelected = (selected: string[], group: string[]) => group.every(opt => selected.includes(opt));
const isGroupPartiallySelected = (selected: string[], group: string[]) => group.some(opt => selected.includes(opt)) && !isGroupFullySelected(selected, group);

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    background: '',
    location: '',
    skills: [] as string[],
    interests: [] as string[],
    horizontals: [] as string[],
    preferredBusinessModels: [] as string[],
    riskTolerance: '',
    timeAvailability: '',
    intent: '',
    accountType: 'solo',
    teamInvites: [] as string[],
    _inviteInput: '',
    education: [] as Array<{ degree: string; institution: string }>,
    education_string: '',
    businessModels: [] as string[],
    // New comprehensive profile fields
    goals: [] as string[],
    timeline: '',
    experienceYears: '',
    industries: [] as string[],
    educationLevel: '',
    workStyle: '',
    fundingPreference: '',
    locationPreference: '',
  });

  const { user, updateProfile, config } = useAuth();
  const { toast } = useToast();

  const totalSteps = 10;
  const progress = (currentStep / totalSteps) * 100;

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploadStatus, setResumeUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error' | 'skipped'>('idle');
  const [resumeError, setResumeError] = useState<string | null>(null);

  const [customSkill, setCustomSkill] = useState('');

  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  
  // Add state for idea generation progress
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);

  const resumeUploaded = resumeUploadStatus === 'success';

  const [businessOptions, setBusinessOptions] = useState<BusinessOptionsResponse | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchBusinessOptions()
      .then((opts) => { if (mounted) setBusinessOptions(opts); })
      .catch(() => { if (mounted) setBusinessOptions(null); })
      .finally(() => { if (mounted) setOptionsLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Use fetched options if available, otherwise fallback to static imports
  const verticalGroups = businessOptions?.business_vertical_groups || BUSINESS_VERTICAL_GROUPS;
  const horizontalGroups = businessOptions?.business_horizontal_groups || BUSINESS_HORIZONTAL_GROUPS;
  const modelGroups = businessOptions?.business_model_groups || BUSINESS_MODEL_GROUPS;

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: string, item: string) => {
    setFormData(prev => {
      const currentArray = prev[field as keyof typeof prev] as string[];
      const newArray = currentArray.includes(item)
        ? currentArray.filter(i => i !== item)
        : [...currentArray, item];
      return { ...prev, [field]: newArray };
    });
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFile(file);
    setResumeUploadStatus('uploading');
    setResumeError(null);
    try {
      await uploadResume(file);
      // Now process the resume and get extracted fields
      const processed = await processResume();
      setResumeUploadStatus('success');
      const extracted = processed.extracted || {};
      setFormData(prev => ({
        ...prev,
        firstName: extracted.first_name || prev.firstName,
        lastName: extracted.last_name || prev.lastName,
        location: extracted.location || prev.location,
        background: extracted.background || prev.background,
        skills: Array.isArray(extracted.skills) ? extracted.skills : prev.skills,
        education: Array.isArray(extracted.education) ? extracted.education : prev.education,
      }));
    } catch (err: unknown) {
      setResumeUploadStatus('error');
      setResumeError(err instanceof Error ? err.message : 'Failed to process resume');
    }
  };

  const renderMappedSummary = () => (
    <div className="mb-1">
      {(formData.skills.length > 0 || formData.interests.length > 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded p-1 mb-1 text-[11px] text-blue-900">
          <b className="font-medium">We mapped these skills from your resume.</b> You can add, remove, or edit as needed.
        </div>
      )}
      {formData.skills.length > 0 && (
        <div className="mb-0.5">
          <Label className="text-xs mb-0.5">Skills</Label>
          <div className="flex flex-wrap gap-1 mb-0.5">
            {formData.skills.map(skill => (
              <Badge key={skill} className="bg-blue-100 text-blue-800 cursor-pointer px-2 py-0.5 text-[11px] h-6" onClick={() => toggleArrayItem('skills', skill)}>
                {skill} <span className="ml-1">×</span>
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 mb-0.5">
            {SKILLS_OPTIONS.filter(skill => !formData.skills.includes(skill)).map(skill => (
              <Button
                key={skill}
                type="button"
                className="h-6 px-2 text-xs rounded-full border border-blue-400 bg-white text-blue-700 hover:bg-blue-50"
                onClick={() => toggleArrayItem('skills', skill)}
              >
                + {skill}
              </Button>
            ))}
            <div className="flex items-center gap-1">
              <Input
                value={customSkill}
                onChange={e => setCustomSkill(e.target.value)}
                placeholder="Add custom skill"
                className="h-6 text-xs px-2 py-0.5 w-32"
              />
              <Button
                type="button"
                className="h-6 px-2 text-xs rounded-full border border-blue-400 bg-white text-blue-700 hover:bg-blue-50"
                onClick={() => {
                  if (customSkill && !formData.skills.includes(customSkill)) {
                    toggleArrayItem('skills', customSkill);
                    setCustomSkill('');
                  }
                }}
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      )}
      {formData.interests.length > 0 && (
        <div className="mb-0.5">
          <Label className="text-xs mb-0.5">Interests</Label>
          <div className="flex flex-wrap gap-1 mb-0.5">
            {formData.interests.map(interest => (
              <Badge key={interest} className="bg-green-100 text-green-800 cursor-pointer px-2 py-0.5 text-[11px] h-6" onClick={() => toggleArrayItem('interests', interest)}>
                {interest} <span className="ml-1">×</span>
              </Badge>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1 mb-0.5">
            {INTERESTS_OPTIONS.filter(industry => !formData.interests.includes(industry)).map(industry => (
              <Button
                key={industry}
                type="button"
                className="h-6 px-2 text-xs"
                onClick={() => toggleArrayItem('interests', industry)}
              >
                {`+ ${industry}`}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStep1 = () => {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-2">
          Let's get to know your background. Upload your resume for best results.
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:gap-4 mb-2">
          <div className="flex-1">
            <Label htmlFor="resume-upload">Upload Resume (suggested)</Label>
            <div className="flex items-center gap-2 mt-2">
              <Button
                type="button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                aria-label="Choose file to upload"
              >
                Choose File
              </Button>
              <Input
                id="resume-upload"
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleResumeUpload}
                disabled={resumeUploadStatus === 'uploading'}
                className="hidden"
              />
              {resumeUploadStatus === 'uploading' && <span className="text-xs text-blue-600 ml-2">Uploading...</span>}
              {resumeUploadStatus === 'success' && <span className="text-xs text-green-600 ml-2">Uploaded!</span>}
              {resumeUploadStatus === 'skipped' && <span className="text-xs text-yellow-600 ml-2">Skipped (manual entry)</span>}
              {resumeError && <span className="text-xs text-red-600 ml-2">{resumeError}</span>}
            </div>
          </div>
          <div className="flex-1 text-xs text-muted-foreground mt-2 md:mt-0">
            <span>Uploading your resume will help us personalize your experience and generate better ideas.</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Button
            type="button"
            onClick={() => setResumeUploadStatus('skipped')}
            className="bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200 focus:ring-yellow-400 focus:border-yellow-400"
          >
            Skip (not advised)
          </Button>
          <span className="text-xs text-yellow-700">You will need to enter all information manually Not cool.</span>
        </div>
      </div>
    );
  };

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-2">
        Here's what we collected and will store from your resume. Feel free to edit or add details.
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            placeholder="Your first name"
            autoComplete="given-name"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            placeholder="Your last name"
            autoComplete="family-name"
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="location">Location</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="City, State/Country"
              className="pl-10"
              autoComplete="address-level2"
            />
          </div>
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Background & Experience</Label>
          <Textarea
            value={formData.background}
            onChange={e => handleInputChange('background', e.target.value)}
            placeholder="Describe your background, experience, and expertise..."
            className="min-h-[80px] text-xs"
            spellCheck={false}
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Education</Label>
          <div className="flex flex-col gap-2">
            {(Array.isArray(formData.education) ? formData.education : []).map((edu: { degree: string; institution: string }, idx: number) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  className="text-xs flex-1"
                  placeholder="Degree (e.g. B.S. in Computer Science)"
                  value={typeof edu === 'object' ? edu.degree : ''}
                  onChange={e => {
                    const newEd = formData.education.map((item, i) =>
                      i === idx ? { ...item, degree: e.target.value } : (typeof item === 'object' ? item : { degree: '', institution: '' })
                    );
                    handleInputChange('education', newEd);
                  }}
                />
                <Input
                  className="text-xs flex-1"
                  placeholder="Institution (e.g. MIT)"
                  value={typeof edu === 'object' ? edu.institution : ''}
                  onChange={e => {
                    const newEd = formData.education.map((item, i) =>
                      i === idx ? { ...item, institution: e.target.value } : (typeof item === 'object' ? item : { degree: '', institution: '' })
                    );
                    handleInputChange('education', newEd);
                  }}
                />
                <Button type="button" className="text-xs px-2" onClick={() => {
                  const newEd = formData.education.filter((_, i) => i !== idx).map(item =>
                    typeof item === 'object' ? item : { degree: '', institution: '' }
                  );
                  handleInputChange('education', newEd);
                }}>Remove</Button>
              </div>
            ))}
            <Button type="button" className="w-fit text-xs px-2" onClick={() => handleInputChange('education', [...(Array.isArray(formData.education) ? formData.education.map(item => typeof item === 'object' ? item : { degree: '', institution: '' }) : []), { degree: '', institution: '' }])}>
              + Add Education
            </Button>
          </div>
        </div>
      </div>
      {renderMappedSummary()}
    </div>
  );

  const renderAccountTypeStep = () => (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-2">
        Are you part of a team or are you solo? This helps us tailor your experience.
      </div>
      <Label>Account Type</Label>
      <div className="flex gap-4">
        <Button
          type="button"
          variant={formData.accountType === 'solo' ? 'default' : 'outline'}
          onClick={() => setFormData(prev => ({ ...prev, accountType: 'solo' }))}
        >
          Solo (Just Me)
        </Button>
        <Button
          type="button"
          variant={formData.accountType === 'team' ? 'default' : 'outline'}
          onClick={() => setFormData(prev => ({ ...prev, accountType: 'team' }))}
        >
          Team (Invite Others)
        </Button>
      </div>
      {formData.accountType === 'team' && (
        <div className="mt-4">
          <Label>Invite Team Members (by email)</Label>
          <div className="text-xs text-gray-500 mb-2">You can invite up to {config?.max_team_members || 5} team members. They'll receive an email to join your workspace.</div>
          <div className="flex gap-2 mb-2 flex-wrap">
            <Input
              type="email"
              placeholder="Enter email address"
              value={formData._inviteInput || ''}
              onChange={e => setFormData(prev => ({ ...prev, _inviteInput: e.target.value }))}
              className="w-64"
            />
            <Button
              type="button"
              onClick={() => {
                if (formData._inviteInput && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData._inviteInput)) {
                  if (formData.teamInvites.length < (config?.max_team_members || 5)) {
                    setFormData(prev => ({
                      ...prev,
                      teamInvites: [...prev.teamInvites, prev._inviteInput],
                      _inviteInput: '',
                    }));
                  } else {
                    toast({ title: 'Team limit reached', description: `You can invite up to ${config?.max_team_members || 5} members.`, variant: 'destructive' });
                  }
                } else {
                  toast({ title: 'Invalid email', description: 'Please enter a valid email address.', variant: 'destructive' });
                }
              }}
            >
              Add
            </Button>
          </div>
          <ul className="list-disc pl-6">
            {formData.teamInvites.map((email, idx) => (
              <li key={email} className="flex items-center gap-2">
                <span className="text-sm">{email}</span>
                <Button type="button" size="sm" variant="ghost" onClick={() => setFormData(prev => ({ ...prev, teamInvites: prev.teamInvites.filter((e, i) => i !== idx) }))}>Remove</Button>
              </li>
            ))}
          </ul>
          {/* TODO: Show invite status from backend if available */}
        </div>
      )}
    </div>
  );

  const renderBusinessVerticalsStep = () => (
    <div className="space-y-4">
      <div className="text-base font-semibold mb-1">What business verticals are you interested in?</div>
      <div className="text-sm text-muted-foreground mb-2">
        Select all that apply. This helps us match you with the most relevant ideas and opportunities.
      </div>
      {verticalGroups.map(group => {
        const allSelected = isGroupFullySelected(formData.interests, group.options);
        const someSelected = isGroupPartiallySelected(formData.interests, group.options);
        return (
          <div key={group.label} className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={() => {
                  setFormData(prev => ({
                    ...prev,
                    interests: allSelected
                      ? prev.interests.filter(opt => !group.options.includes(opt))
                      : Array.from(new Set([...prev.interests, ...group.options]))
                  }));
                }}
              />
              <span className="font-semibold text-xs">{group.label}</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-1">
              {group.options.map(option => (
                <Badge
                  key={option}
                  className={`border cursor-pointer px-2 py-0.5 text-xs h-6 rounded transition-colors duration-150 min-w-[90px] flex items-center justify-between ${formData.interests.includes(option)
                    ? 'bg-blue-700 text-white border-blue-700 font-bold shadow'
                    : 'bg-white text-blue-900 border-blue-300 hover:bg-blue-50 font-bold'}
                  `}
                  onClick={() => toggleArrayItem('interests', option)}
                >
                  <span className="flex-1 text-left">{option}</span>
                  <span className={formData.interests.includes(option) ? 'ml-1' : 'ml-1 opacity-0 select-none'}>×</span>
                </Badge>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderBusinessHorizontalsStep = () => (
    <div className="space-y-4">
      <div className="text-base font-semibold mb-1">What business horizontals (functional areas) are you interested in?</div>
      <div className="text-sm text-muted-foreground mb-2">
        Select all that apply. This helps us further personalize your experience and idea recommendations.
      </div>
      {horizontalGroups.map(group => {
        const allSelected = isGroupFullySelected(formData.horizontals, group.options);
        const someSelected = isGroupPartiallySelected(formData.horizontals, group.options);
        return (
          <div key={group.label} className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={() => {
                  setFormData(prev => ({
                    ...prev,
                    horizontals: allSelected
                      ? prev.horizontals.filter(opt => !group.options.includes(opt))
                      : Array.from(new Set([...(prev.horizontals || []), ...group.options]))
                  }));
                }}
              />
              <span className="font-semibold text-xs">{group.label}</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-1">
              {group.options.map(option => (
                <Badge
                  key={option}
                  className={`border cursor-pointer px-2 py-0.5 text-xs h-6 rounded transition-colors duration-150 min-w-[90px] flex items-center justify-between ${formData.horizontals && formData.horizontals.includes(option)
                    ? 'bg-blue-700 text-white border-blue-700 font-bold shadow'
                    : 'bg-white text-blue-900 border-blue-300 hover:bg-blue-50 font-bold'}
                  `}
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      horizontals: prev.horizontals && prev.horizontals.includes(option)
                        ? prev.horizontals.filter((h: string) => h !== option)
                        : [...(prev.horizontals || []), option]
                    }));
                  }}
                >
                  <span className="flex-1 text-left">{option}</span>
                  <span className={formData.horizontals && formData.horizontals.includes(option) ? 'ml-1' : 'ml-1 opacity-0 select-none'}>×</span>
                </Badge>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderGoalsStep = () => (
    <div className="space-y-4">
      <SectionHeader 
        title="Your Goals" 
        subtitle="What are your primary goals for starting a business?"
      />
      <div className="space-y-4">
        <div>
          <Label htmlFor="goals">What do you want to achieve? (Select all that apply)</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {[
              'Financial Freedom',
              'Solve a Problem',
              'Build Something Meaningful',
              'Learn New Skills',
              'Create Jobs',
              'Make an Impact',
              'Work for Myself',
              'Scale a Business'
            ].map((goal) => (
              <div key={goal} className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.goals?.includes(goal) || false}
                  onCheckedChange={() => toggleArrayItem('goals', goal)}
                />
                <Label className="text-sm">{goal}</Label>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <Label htmlFor="timeline">What's your timeline for starting?</Label>
          <Select value={formData.timeline} onValueChange={(value) => handleInputChange('timeline', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select your timeline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">Immediately (within 3 months)</SelectItem>
              <SelectItem value="short_term">Short term (3-6 months)</SelectItem>
              <SelectItem value="medium_term">Medium term (6-12 months)</SelectItem>
              <SelectItem value="long_term">Long term (1+ years)</SelectItem>
              <SelectItem value="exploring">Just exploring for now</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderExperienceStep = () => (
    <div className="space-y-4">
      <SectionHeader 
        title="Your Experience" 
        subtitle="Tell us about your background and experience"
      />
      <div className="space-y-4">
        <div>
          <Label htmlFor="experience_years">Years of professional experience</Label>
          <Select value={formData.experienceYears} onValueChange={(value) => handleInputChange('experienceYears', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select years of experience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0-1">0-1 years</SelectItem>
              <SelectItem value="2-3">2-3 years</SelectItem>
              <SelectItem value="4-6">4-6 years</SelectItem>
              <SelectItem value="7-10">7-10 years</SelectItem>
              <SelectItem value="10+">10+ years</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="industries">Industries you've worked in</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {[
              'Technology',
              'Healthcare',
              'Finance',
              'Education',
              'Retail',
              'Manufacturing',
              'Consulting',
              'Marketing',
              'Real Estate',
              'Non-profit',
              'Government',
              'Other'
            ].map((industry) => (
              <div key={industry} className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.industries?.includes(industry) || false}
                  onCheckedChange={() => toggleArrayItem('industries', industry)}
                />
                <Label className="text-sm">{industry}</Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="education">Highest level of education</Label>
          <Select value={formData.educationLevel} onValueChange={(value) => handleInputChange('educationLevel', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select education level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high_school">High School</SelectItem>
              <SelectItem value="associate">Associate's Degree</SelectItem>
              <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
              <SelectItem value="master">Master's Degree</SelectItem>
              <SelectItem value="phd">PhD</SelectItem>
              <SelectItem value="self_taught">Self-taught</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderPreferencesStep = () => (
    <div className="space-y-4">
      <SectionHeader 
        title="Your Preferences" 
        subtitle="Help us understand your working style and preferences"
      />
      <div className="space-y-4">
        <div>
          <Label htmlFor="work_style">Preferred work style</Label>
          <Select value={formData.workStyle} onValueChange={(value) => handleInputChange('workStyle', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select your work style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solo">Solo entrepreneur</SelectItem>
              <SelectItem value="team">Team collaboration</SelectItem>
              <SelectItem value="hybrid">Mix of both</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="funding_preference">Funding preference</Label>
          <Select value={formData.fundingPreference} onValueChange={(value) => handleInputChange('fundingPreference', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select funding preference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bootstrap">Bootstrap (self-funded)</SelectItem>
              <SelectItem value="investors">Seek investors</SelectItem>
              <SelectItem value="crowdfunding">Crowdfunding</SelectItem>
              <SelectItem value="grants">Grants</SelectItem>
              <SelectItem value="undecided">Not sure yet</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="location_preference">Location preference</Label>
          <Select value={formData.locationPreference} onValueChange={(value) => handleInputChange('locationPreference', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select location preference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="remote">Fully remote</SelectItem>
              <SelectItem value="hybrid">Hybrid (remote + office)</SelectItem>
              <SelectItem value="local">Local/regional focus</SelectItem>
              <SelectItem value="global">Global from day one</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderBusinessModelsStep = () => (
    <div className="space-y-4">
      <div className="text-base font-semibold mb-1">Which business models are you interested in?</div>
      <div className="text-sm text-muted-foreground mb-2">
        Select all that apply. This helps us match you with the most relevant ideas and opportunities. Business models can be grouped by their operational or revenue-generating approach.
      </div>
      {modelGroups.map(group => {
        const allSelected = isGroupFullySelected(formData.businessModels, group.options);
        const someSelected = isGroupPartiallySelected(formData.businessModels, group.options);
        return (
          <div key={group.label} className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={() => {
                  setFormData(prev => ({
                    ...prev,
                    businessModels: allSelected
                      ? prev.businessModels.filter(opt => !group.options.includes(opt))
                      : Array.from(new Set([...prev.businessModels, ...group.options]))
                  }));
                }}
              />
              <span className="font-semibold text-xs">{group.label}</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-1">
              {group.options.map(option => (
                <Badge
                  key={option}
                  className={`border cursor-pointer px-2 py-0.5 text-xs h-6 rounded transition-colors duration-150 min-w-[90px] flex items-center justify-between ${formData.businessModels.includes(option)
                    ? 'bg-blue-700 text-white border-blue-700 font-bold shadow'
                    : 'bg-white text-blue-900 border-blue-300 hover:bg-blue-50 font-bold'}
                  `}
                  onClick={() => toggleArrayItem('businessModels', option)}
                >
                  <span className="flex-1 text-left">{option}</span>
                  <span className={formData.businessModels.includes(option) ? 'ml-1' : 'ml-1 opacity-0 select-none'}>×</span>
                </Badge>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderFinalStep = () => (
    <div className="space-y-6">
      <div>
        <div className="text-base font-semibold mb-1">Final Details</div>
        <div className="text-sm text-muted-foreground mb-2">
          To personalize your experience, please select your risk tolerance and time availability. Then accept our terms to complete your profile.
        </div>
        <div className="space-y-1">
          <Label>Risk Tolerance</Label>
          <Select value={formData.riskTolerance} onValueChange={value => handleInputChange('riskTolerance', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select your risk tolerance" />
            </SelectTrigger>
            <SelectContent>
              {RISK_TOLERANCE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{opt.label}</span>
                    <span className="text-xs text-muted-foreground leading-tight">{opt.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Time Availability</Label>
          <Select value={formData.timeAvailability} onValueChange={value => handleInputChange('timeAvailability', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select your time availability" />
            </SelectTrigger>
            <SelectContent>
              {TIME_AVAILABILITY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Agreements</Label>
        <div className="flex items-center gap-2 mt-2">
          <input type="checkbox" id="privacy" checked={privacyChecked} onChange={e => setPrivacyChecked(e.target.checked)} />
          <label htmlFor="privacy">I agree to the <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</a></label>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input type="checkbox" id="terms" checked={termsChecked} onChange={e => setTermsChecked(e.target.checked)} />
          <label htmlFor="terms">I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms of Service</a></label>
        </div>
        <div className="text-xs text-muted-foreground mt-2">You must agree to both to complete your profile.</div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderAccountTypeStep();
      case 2: return renderStep1();
      case 3: return renderStep2();
      case 4: return renderGoalsStep();
      case 5: return renderExperienceStep();
      case 6: return renderBusinessVerticalsStep();
      case 7: return renderBusinessHorizontalsStep();
      case 8: return renderBusinessModelsStep();
      case 9: return renderPreferencesStep();
      case 10: return renderFinalStep();
      default: return null;
    }
  };

  const handleStepSubmit = async (step: number, data: Record<string, unknown>) => {
    try {
      setIsLoading(true);
      let updateData = { ...formData, ...data };

      // Convert keys to snake_case for the API
      updateData = Object.fromEntries(
        Object.entries(updateData).map(([key, value]) => [toSnakeCase(key), value])
      );

      // Update the form data state
      setFormData(updateData);

      // API call to update profile
      await api.put('/auth/profile', updateData);

      // After the final step, refresh the user data and automatically generate ideas
      if (step === totalSteps) {
        await updateProfile(); // Call refreshUser here
        // Automatically generate ideas without requiring user input
        await handleGenerateIdeasAutomatically();
      }

      setCurrentStep(step + 1);
    } catch (error) {
      console.error('Error submitting step:', error);
      // Handle error appropriately
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!formData.accountType;
      case 2:
        return resumeUploadStatus === 'success' || resumeUploadStatus === 'skipped';
      case 3:
        return formData.firstName && formData.lastName && formData.location;
      case 4:
        return formData.goals && formData.goals.length > 0 && formData.timeline; // Require goals and timeline
      case 5:
        return formData.experienceYears && formData.educationLevel; // Require experience and education
      case 6:
        return formData.interests.length > 0; // at least one vertical selected
      case 7:
        return formData.horizontals && formData.horizontals.length > 0;
      case 8:
        return formData.businessModels && formData.businessModels.length > 0; // Require at least one business model
      case 9:
        return formData.workStyle && formData.fundingPreference && formData.locationPreference; // Require all preferences
      case 10:
        return (
          !!formData.riskTolerance &&
          !!formData.timeAvailability &&
          privacyChecked &&
          termsChecked
        );
      default:
        return false;
    }
  };

  // Automatically generate ideas after onboarding completion
  const handleGenerateIdeasAutomatically = async () => {
    setIsGeneratingIdeas(true);
    try {
      // Generate personalized ideas based on the completed profile
      const response = await api.post('/api/ideas/generate', {
        industry: formData.industries?.[0] || '',
        business_model: formData.businessModels?.[0] || '',
        vertical: formData.interests?.[0] || '',
        horizontal: formData.horizontals?.[0] || '',
        context: `User goals: ${formData.goals?.join(', ') || ''}. Background: ${formData.background || ''}. Experience: ${formData.experienceYears || ''} years.`,
        use_personalization: true,
        flow_type: 'onboarding_completion',
      });

      toast({
        title: "Ideas Generated!",
        description: `Generated ${response.data.ideas?.length || 0} personalized ideas based on your profile. You'll see them on your dashboard.`,
      });
      
      // Complete onboarding
      onComplete?.();
    } catch (error) {
      console.error('Error generating ideas:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate ideas, but your profile is saved. You can generate ideas later from your dashboard.",
        variant: "destructive"
      });
      
      // Still complete onboarding even if idea generation fails
      onComplete?.();
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  if (optionsLoading) {
    return <div className="flex items-center justify-center min-h-[300px]">Loading business options...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex flex-col items-center mb-6">
        <img src="/id8logo.png" alt="ID8 Logo" style={{ width: 64, height: 64, marginBottom: 8 }} />
        <h2 className="text-2xl font-bold text-blue-900 mb-2">Welcome to ID8</h2>
      </div>
      <Progress value={progress} className="mb-6" />
      {renderCurrentStep()}
      
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1 || isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <Button
          onClick={() => handleStepSubmit(currentStep, {})}
          disabled={!canProceed() || isLoading}
        >
          {isLoading ? (
            "Saving..."
          ) : currentStep === totalSteps ? (
            isGeneratingIdeas ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Generating Ideas...
              </>
            ) : (
              <>
                Complete Setup & Generate Ideas
                <Sparkles className="w-4 h-4 ml-2" />
              </>
            )
          ) : (
            <>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};