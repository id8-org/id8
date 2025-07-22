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
  AlertCircle
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
    education: [] as any[],
    education_string: '',
    businessModels: [] as string[],
  });

  const { user, updateProfile, config } = useAuth();
  const { toast } = useToast();

  const totalSteps = 8;
  const progress = (currentStep / totalSteps) * 100;

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploadStatus, setResumeUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error' | 'skipped'>('idle');
  const [resumeError, setResumeError] = useState<string | null>(null);

  const [customSkill, setCustomSkill] = useState('');

  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

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
            {(Array.isArray(formData.education) ? formData.education : []).map((edu: any, idx: number) => (
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
      case 4: return renderBusinessVerticalsStep();
      case 5: return renderBusinessHorizontalsStep();
      case 6: return renderBusinessModelsStep();
      case 7: return renderFinalStep();
      default: return null;
    }
  };

  const handleStepSubmit = async () => {
    setIsLoading(true);
    try {
      switch (currentStep) {
        case 1:
          if (!formData.accountType) {
            setIsLoading(false);
            return;
          }
          setCurrentStep(2);
          setIsLoading(false);
          return;
        case 2:
          if (resumeUploadStatus !== 'success' && resumeUploadStatus !== 'skipped') {
            setIsLoading(false);
            return;
          }
          setCurrentStep(3);
          setIsLoading(false);
          return;
        case 3: {
          let locationToSend: string = '';
          if (typeof formData.location === 'object' && formData.location !== null) {
            const loc = formData.location as { city?: string; state?: string; country?: string };
            locationToSend = [loc.city, loc.state, loc.country].filter(Boolean).join(', ');
          } else if (typeof formData.location === 'string') {
            locationToSend = formData.location;
          }
          await api.post('/auth/onboarding/step1', toSnakeCase({
            firstName: formData.firstName,
            lastName: formData.lastName,
            location: locationToSend,
            background: formData.background
          }));
          break;
        }
        case 4:
          await api.post('/auth/onboarding/step2', toSnakeCase({
            skills: formData.skills || [],
            interests: formData.interests
          }));
          break;
        case 5:
          await api.post('/auth/onboarding/step3', toSnakeCase({
            horizontals: formData.horizontals,
            interests: formData.interests
          }));
          break;
        case 6:
          // Business Models step: optionally POST to backend if needed
          // await api.post('/auth/onboarding/step_business_models', toSnakeCase({ businessModels: formData.businessModels }));
          break;
        case 7:
          if (!privacyChecked || !termsChecked) {
            toast({
              title: "Agreement Required",
              description: "You must agree to the Privacy Policy and Terms of Service to complete onboarding.",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
          if (!formData.riskTolerance || !formData.timeAvailability) {
            toast({
              title: "Missing Information",
              description: "Please select your risk tolerance and time availability.",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
          // Ensure preferredBusinessModels and verticals are always sent
          const payload = {
            ...formData,
            teamInvites: formData.accountType === 'team' ? formData.teamInvites : [],
            preferredBusinessModels: formData.businessModels.length
              ? formData.businessModels
              : formData.businessModels,
            verticals: formData.interests.length
              ? formData.interests
              : formData.interests,
          };
          await api.post('/auth/onboarding/complete', toSnakeCase(payload));
          onComplete();
          setIsLoading(false);
          return;
      }
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({
        title: "Error",
        description: "Failed to save your information. Please try again.",
        variant: "destructive",
      });
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
        return formData.interests.length > 0; // at least one vertical selected
        case 5:
          return formData.horizontals && formData.horizontals.length > 0;
      case 6:
        return formData.businessModels && formData.businessModels.length > 0; // Require at least one business model
      case 7:
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
          onClick={handleStepSubmit}
          disabled={!canProceed() || isLoading}
        >
          {isLoading ? (
            "Saving..."
          ) : currentStep === totalSteps ? (
            <>
              Complete Setup
              <CheckCircle className="w-4 h-4 ml-2" />
            </>
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