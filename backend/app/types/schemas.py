# backend/app/schemas.py

from pydantic import BaseModel, EmailStr, validator, field_validator, root_validator, Field, model_validator
from typing import Optional, Dict, Any, Literal, List, Union
from datetime import datetime

# Table-based stage schemas (used by new UI structure)

class DeepDiveItem(BaseModel):
    category: Literal['Market Opportunity', 'Execution Capability', 'Business Viability', 'Strategic Alignment & Risks']
    element: str
    score: int
    narrative: str

class DeepDiveCategoryData(BaseModel):
    scores: Dict[str, Optional[float]] = Field(default_factory=dict)
    narratives: Dict[str, Optional[str]] = Field(default_factory=dict)
    customer_validation_plan: Optional[str] = ""

class DeepDiveIdeaData(BaseModel):
    market_opportunity: DeepDiveCategoryData = DeepDiveCategoryData()
    execution_capability: DeepDiveCategoryData = DeepDiveCategoryData()
    business_viability: DeepDiveCategoryData = DeepDiveCategoryData()
    strategic_alignment_risks: DeepDiveCategoryData = DeepDiveCategoryData()
    overall_score: Optional[float] = None
    summary: Optional[str] = ""
    raw_llm_fields: Optional[Dict[str, Any]] = None

class ValidationLearningData(BaseModel):
    experiments: List[Dict[str, Any]] = Field(default_factory=list)  # Each with experiment, hypothesis, method, results, narrative
    feedback_loops: List[Dict[str, Any]] = Field(default_factory=list)  # Each with source, integration, narrative

class RefinementIterationData(BaseModel):
    iteration_log: List[Dict[str, Any]] = Field(default_factory=list)  # Each with version, changes, rationale, outcome
    rescoring: List[Dict[str, Any]] = Field(default_factory=list)  # Each with score_name, new_score, confidence, rationale
    bmc_updates: List[Dict[str, Any]] = Field(default_factory=list)  # Each with component, change, rationale, outcome

class MarketAlignmentDecisionData(BaseModel):
    market_snapshot: Optional[str] = ""
    analogous_analysis: List[Dict[str, Any]] = Field(default_factory=list)  # Each with comparable, lesson, narrative
    early_traction_plan: Optional[str] = ""
    pivot_framework: Optional[str] = ""

class ValidationMetricsDashboardData(BaseModel):
    metrics: Dict[str, Any] = Field(default_factory=dict)  # e.g., sign-up rates, conversions, retention, etc.

class IteratingIdeaData(BaseModel):
    validation_learning: ValidationLearningData = ValidationLearningData()
    refinement_iteration: RefinementIterationData = RefinementIterationData()
    market_alignment_decision: MarketAlignmentDecisionData = MarketAlignmentDecisionData()
    validation_metrics_dashboard: ValidationMetricsDashboardData = ValidationMetricsDashboardData()
    deep_dive_data: Optional[DeepDiveIdeaData] = None
    summary: Optional[str] = ""

class IteratingItem(BaseModel):
    category: Literal['Validation & Learning', 'Refinement & Iteration', 'Market Alignment & Decision-Making']
    element: str
    details: Dict[str, Any] = Field(default_factory=dict)
    narrative: str
    outcome: str

class ConsideringItem(BaseModel):
    category: Literal['Stakeholder Alignment', 'Execution & Communication']
    element: str
    plan: str
    narrative: str
    action: str

class StakeholderAlignmentData(BaseModel):
    stakeholder_analysis: List[Dict[str, Any]] = Field(default_factory=list)  # Each with stakeholder, key_findings, narrative, action
    risk_mitigation_plan: List[Dict[str, Any]] = Field(default_factory=list)  # Each with risk, mitigation, narrative, action

class ExecutionCommunicationData(BaseModel):
    mvp_definition: Optional[str] = ""
    go_to_market_plan: Optional[str] = ""
    lean_pitch_deck: Optional[str] = ""
    one_pager: Optional[str] = ""
    narratives: Dict[str, str] = Field(default_factory=dict)  # Narrative for each element
    next_steps: Optional[str] = ""

class ConsideringIdeaData(BaseModel):
    stakeholder_alignment: StakeholderAlignmentData = StakeholderAlignmentData()
    execution_communication: ExecutionCommunicationData = ExecutionCommunicationData()
    summary: Optional[str] = ""
    progress: Optional[float] = None

class RepoOut(BaseModel):
    id: str
    name: str
    url: str
    summary: Optional[str] = None
    language: Optional[str] = None
    created_at: Optional[datetime] = None
    trending_period: str = "daily"

    class Config:
        from_attributes = True

class DeepDiveStage(BaseModel):
    product_market_fit_score: Optional[float] = None
    product_market_fit_narrative: Optional[str] = None
    market_size_score: Optional[float] = None
    market_size_narrative: Optional[str] = None
    market_timing_score: Optional[float] = None
    market_timing_narrative: Optional[str] = None
    founders_execution_score: Optional[float] = None
    founders_execution_narrative: Optional[str] = None
    technical_feasibility_score: Optional[float] = None
    technical_feasibility_narrative: Optional[str] = None
    competitive_moat_score: Optional[float] = None
    competitive_moat_narrative: Optional[str] = None
    profitability_potential_score: Optional[float] = None
    profitability_potential_narrative: Optional[str] = None
    strategic_exit_score: Optional[float] = None
    strategic_exit_narrative: Optional[str] = None
    regulatory_risk_score: Optional[float] = None
    regulatory_risk_narrative: Optional[str] = None
    customer_validation_plan: Optional[str] = None
    go_to_market_score: Optional[float] = None
    go_to_market_narrative: Optional[str] = None
    overall_investor_attractiveness_score: Optional[float] = None
    overall_investor_attractiveness_narrative: Optional[str] = None
    generation_notes: Optional[str] = None

class IteratingStage(BaseModel):
    validate_assumptions: Optional[List[Dict[str, Any]]] = None
    iteration_log: Optional[List[Dict[str, Any]]] = None
    rescore: Optional[List[Dict[str, Any]]] = None
    business_model_canvas_updates: Optional[str] = None
    market_snapshot: Optional[str] = None
    analogous_success_failure_analysis: Optional[List[Dict[str, Any]]] = None
    early_traction_plan: Optional[str] = None
    feedback_loops: Optional[str] = None
    pivot_persevere_kill_framework: Optional[str] = None
    validation_metrics_dashboard: Optional[List[Dict[str, Any]]] = None
    generation_notes: Optional[str] = None

class IdeaOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    repo_id: Optional[str] = None
    title: str
    hook: Optional[str] = None
    value: Optional[str] = None
    evidence: Optional[str] = None
    evidence_reference: Optional[Dict[str, Any]] = None  # MANDATORY for suggested stage
    differentiator: Optional[str] = None
    score: Optional[int] = None
    mvp_effort: Optional[int] = None
    deep_dive_requested: bool = False
    created_at: Optional[datetime] = None
    llm_raw_response: Optional[str] = None
    deep_dive_raw_response: Optional[str] = None
    deep_dive: Optional[Dict[str, Any]] = None
    status: Literal['suggested', 'deep_dive', 'iterating', 'considering', 'closed']
    type: Optional[str] = None
    # Iteration fields
    business_model: Optional[str] = None
    market_positioning: Optional[str] = None
    revenue_streams: Optional[str] = None
    target_audience: Optional[str] = None
    competitive_advantage: Optional[str] = None
    go_to_market_strategy: Optional[str] = None
    success_metrics: Optional[str] = None
    risk_factors: Optional[str] = None
    iteration_notes: Optional[str] = None
    # New fields
    vertical: Optional[str] = None
    horizontal: Optional[str] = None
    repo_usage: Optional[str] = None
    assumptions: Optional[List[str]] = None
    source_type: Optional[str] = None
    scope_commitment: Optional[str] = None
    problem_statement: Optional[str] = None
    elevator_pitch: Optional[str] = None
    core_assumptions: Optional[List[str]] = None
    riskiest_assumptions: Optional[List[str]] = None
    generation_notes: Optional[str] = None
    iterating: Optional[IteratingIdeaData] = None
    # --- Repo pairing and MVP build fields ---
    repo_url: Optional[str] = None
    repo_name: Optional[str] = None
    repo_description: Optional[str] = None
    mvp_steps: Optional[List[str]] = None
    prerequisites: Optional[List[str]] = None

    @field_validator('evidence_reference', mode='before')
    @classmethod
    def check_evidence_reference_for_high_score(cls, v, values):
        import warnings
        score = values.data.get('score') if hasattr(values, 'data') else values.get('score')
        if score is not None and score >= 9:
            if not (isinstance(v, dict) and v.get('url') and v.get('stat')):
                warnings.warn("For ideas with score >= 9, evidence_reference should include both a non-empty 'url' and 'stat'. Saving anyway.")
        return v

    class Config:
        from_attributes = True

class ShortlistOut(BaseModel):
    id: str
    user_id: str
    idea_id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DeepDiveVersionOut(BaseModel):
    id: str
    idea_id: str
    version_number: int
    fields: Dict[str, Any]
    llm_raw_response: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Authentication schemas
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class GoogleAuthRequest(BaseModel):
    id_token: str

class GoogleCodeRequest(BaseModel):
    code: str

class GoogleUserInfo(BaseModel):
    sub: str  # Google user ID
    email: EmailStr
    email_verified: bool
    name: str
    given_name: str
    family_name: str
    picture: str
    locale: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str

class TokenData(BaseModel):
    user_id: Optional[str] = None

# User profile schemas
class UserProfileBase(BaseModel):
    background: Optional[str] = None
    location: Union[str, Dict[str, Any], None] = None
    website: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    experience_years: Optional[int] = None
    industries: List[str] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)
    goals: List[str] = Field(default_factory=list)
    horizontals: List[str] = Field(default_factory=list)
    verticals: List[str] = Field(default_factory=list)
    preferred_business_models: List[str] = Field(default_factory=list)
    preferred_industries: List[str] = Field(default_factory=list)
    risk_tolerance: Optional[str] = None
    time_availability: Optional[str] = None
    education: List[Any] = Field(default_factory=list)

    @field_validator('location', mode='before')
    @classmethod
    def coerce_location(cls, v):
        if v is None:
            return 'Not entered'
        if isinstance(v, dict):
            # Join city/state/country if present, else fallback to str
            city = v.get('city', '')
            state = v.get('state', '')
            country = v.get('country', '')
            parts = [p for p in [city, state, country] if p]
            return ', '.join(parts) if parts else 'Not entered'
        if isinstance(v, str):
            return v or 'Not entered'
        return str(v)

class UserProfileCreate(UserProfileBase):
    pass

class UserProfileUpdate(UserProfileBase):
    onboarding_completed: Optional[bool] = None
    onboarding_step: Optional[int] = None

class UserProfile(UserProfileBase):
    id: str
    user_id: str
    onboarding_completed: bool
    onboarding_step: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserProfileResponse(BaseModel):
    profile: UserProfile
    tier: str
    account_type: str
    config: Dict[str, Any]

# User schemas
class TeamBase(BaseModel):
    id: str
    owner_id: str
    name: Optional[str] = None
    created_at: datetime

class InviteBase(BaseModel):
    id: str
    email: str
    team_id: str
    inviter_id: str
    expires_at: datetime
    accepted: bool
    accepted_at: Optional[datetime] = None
    revoked: bool
    created_at: datetime

class Team(TeamBase):
    pass

class Invite(InviteBase):
    pass

class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    is_active: bool = True
    is_verified: bool = False
    team_id: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime
    profile: Optional[UserProfile] = None
    tier: str
    account_type: str
    config: Optional[Dict[str, Any]] = None
    team: Optional[Team] = None

    class Config:
        from_attributes = True

# Resume schemas
class UserResumeBase(BaseModel):
    original_filename: str
    file_size: int
    content_type: str

class UserResumeCreate(UserResumeBase):
    pass

class UserResume(UserResumeBase):
    id: str
    user_id: str
    file_path: str
    parsed_content: Optional[str] = None
    extracted_skills: List[str] = []
    work_experience: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    is_processed: bool
    processing_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Onboarding schemas
class OnboardingStep1(BaseModel):
    first_name: str
    last_name: str
    location: Optional[str] = None
    industry: Optional[str] = None
    years_experience: Optional[int] = None

class OnboardingStep2(BaseModel):
    skills: List[str]

class OnboardingStep3(BaseModel):
    interests: List[str]

class OnboardingStep4(BaseModel):
    goals: List[str]

class OnboardingStep5(BaseModel):
    preferred_business_models: List[str]
    preferred_industries: List[str]
    risk_tolerance: Optional[str] = None
    time_availability: Optional[str] = None

# Idea generation schemas
class IdeaGenerationRequest(BaseModel):
    industry: Optional[str] = None
    business_model: Optional[str] = None
    context: str = ""
    use_personalization: bool = True
    vertical: Optional[str] = None
    horizontal: Optional[str] = None
    user_context: Optional[str] = None
    flow_type: str # Required, must be one of 'ai', 'byoi', 'repo'

    @model_validator(mode="before")
    @classmethod
    def at_least_two_fields_required(cls, values):
        fields = [values.get('industry'), values.get('business_model'), values.get('vertical'), values.get('horizontal')]
        non_empty = [f for f in fields if f and isinstance(f, str) and f.strip()]
        if len(non_empty) < 2:
            raise ValueError('At least two of industry, business_model, vertical, or horizontal must be provided.')
        return values

# Idea creation schemas
class IdeaBase(BaseModel):
    title: str
    hook: Optional[str] = None
    value: Optional[str] = None
    evidence: Optional[str] = None
    evidence_reference: Optional[Dict[str, Any]] = None  # MANDATORY for suggested stage
    differentiator: Optional[str] = None
    score: Optional[int] = None
    mvp_effort: Optional[int] = None
    type: Optional[str] = None
    status: Optional[str] = None
    repo_id: Optional[str] = None
    repo_usage: Optional[str] = None
    assumptions: Optional[List[str]] = None
    source_type: Optional[str] = None
    scope_commitment: Optional[str] = None
    problem_statement: Optional[str] = None
    elevator_pitch: Optional[str] = None
    core_assumptions: Optional[List[str]] = None
    riskiest_assumptions: Optional[List[str]] = None
    generation_notes: Optional[str] = None
    iterating: Optional[IteratingIdeaData] = None
    repo_url: Optional[str] = None
    repo_name: Optional[str] = None
    repo_description: Optional[str] = None
    mvp_steps: Optional[List[str]] = None
    prerequisites: Optional[List[str]] = None

    @field_validator('evidence_reference', mode='before')
    @classmethod
    def check_evidence_reference_for_high_score(cls, v, values):
        import warnings
        score = values.data.get('score') if hasattr(values, 'data') else values.get('score')
        if score is not None and score >= 9:
            if not (isinstance(v, dict) and v.get('url') and v.get('stat')):
                warnings.warn("For ideas with score >= 9, evidence_reference should include both a non-empty 'url' and 'stat'. Saving anyway.")
        return v

class IdeaCreate(IdeaBase):
    repo_id: Optional[str] = None

class IdeaUpdate(IdeaBase):
    deep_dive_requested: Optional[bool] = None
    status: Optional[str] = None
    # Iteration fields
    business_model: Optional[str] = None
    market_positioning: Optional[str] = None
    revenue_streams: Optional[str] = None
    target_audience: Optional[str] = None
    competitive_advantage: Optional[str] = None
    go_to_market_strategy: Optional[str] = None
    success_metrics: Optional[str] = None
    risk_factors: Optional[str] = None
    iteration_notes: Optional[str] = None
    repo_usage: Optional[str] = None

# Advanced Features Schemas
class CaseStudyBase(BaseModel):
    company_name: str
    industry: Optional[str] = None
    business_model: Optional[str] = None
    success_factors: Optional[str] = None
    challenges: Optional[str] = None
    lessons_learned: Optional[str] = None
    market_size: Optional[str] = None
    funding_raised: Optional[str] = None
    exit_value: Optional[str] = None

class CaseStudyCreate(CaseStudyBase):
    pass

class CaseStudy(CaseStudyBase):
    id: str
    idea_id: str
    llm_raw_response: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class MarketSnapshotBase(BaseModel):
    market_size: Optional[str] = None
    growth_rate: Optional[str] = None
    key_players: List[str] = []
    market_trends: Optional[str] = None
    regulatory_environment: Optional[str] = None
    competitive_landscape: Optional[str] = None
    entry_barriers: Optional[str] = None

class MarketSnapshotCreate(MarketSnapshotBase):
    pass

class MarketSnapshot(MarketSnapshotBase):
    id: str
    idea_id: str
    llm_raw_response: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class LensInsightBase(BaseModel):
    lens_type: str  # 'founder', 'investor', 'customer'
    insights: Optional[str] = None
    opportunities: Optional[str] = None
    risks: Optional[str] = None
    recommendations: Optional[str] = None

class LensInsightCreate(LensInsightBase):
    pass

class LensInsight(LensInsightBase):
    id: str
    idea_id: str
    llm_raw_response: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class VCThesisComparisonBase(BaseModel):
    vc_firm: str
    thesis_focus: Optional[str] = None
    alignment_score: Optional[int] = None
    key_alignment_points: Optional[str] = None
    potential_concerns: Optional[str] = None
    investment_likelihood: Optional[str] = None

class VCThesisComparisonCreate(VCThesisComparisonBase):
    pass

class VCThesisComparison(VCThesisComparisonBase):
    id: str
    idea_id: str
    llm_raw_response: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class InvestorDeckBase(BaseModel):
    deck_content: Dict[str, Any] = {}
    slides: List[str] = []
    focus_area: str = "general"
    style: str = "modern"

class InvestorDeckCreate(InvestorDeckBase):
    pass

class InvestorDeck(InvestorDeckBase):
    id: str
    idea_id: str
    generated_at: datetime
    llm_raw_response: Optional[str] = None

    class Config:
        from_attributes = True

# Request schemas for advanced features
class CaseStudyRequest(BaseModel):
    idea_id: str
    company_name: Optional[str] = None  # If provided, analyze specific company

class MarketSnapshotRequest(BaseModel):
    idea_id: str

class LensInsightRequest(BaseModel):
    idea_id: str
    lens_type: str  # 'founder', 'investor', 'customer'

class VCThesisComparisonRequest(BaseModel):
    idea_id: str
    vc_firm: Optional[str] = None  # If provided, compare to specific VC

class InvestorDeckRequest(BaseModel):
    idea_id: str
    include_case_studies: bool = True
    include_market_analysis: bool = True
    include_financial_projections: bool = True
    focus_area: str = "general"  # "general", "configuration", "technology", "market", "team", "traction"
    slides: List[str] = []
    style: str = "modern"

# Collaboration Schemas

# IdeaCollaborator Schemas
class IdeaCollaboratorBase(BaseModel):
    user_id: str
    role: Literal['editor', 'viewer']

class IdeaCollaboratorCreate(IdeaCollaboratorBase):
    pass

class IdeaCollaboratorOut(IdeaCollaboratorBase):
    id: str
    idea_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# IdeaChangeProposal Schemas
class IdeaChangeProposalBase(BaseModel):
    changes: Dict[str, Any]
    
class IdeaChangeProposalCreate(IdeaChangeProposalBase):
    pass

class IdeaChangeProposalOut(IdeaChangeProposalBase):
    id: str
    idea_id: str
    proposer_id: str
    status: Literal['pending', 'approved', 'rejected']
    created_at: datetime
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Comment Schemas
class CommentBase(BaseModel):
    content: str
    parent_comment_id: Optional[str] = None

class CommentCreate(CommentBase):
    pass

class CommentOut(CommentBase):
    id: str
    idea_id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class IdeaVersionQnACreate(BaseModel):
    question: str
    context_fields: Optional[List[str]] = None

class IdeaVersionQnAOut(BaseModel):
    id: str
    idea_id: str
    version_number: int
    question: str
    answer: Optional[str] = None
    llm_raw_response: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditLogBase(BaseModel):
    action_type: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Dict[str, Any] = {}
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class AuditLogCreate(AuditLogBase):
    pass

class AuditLogOut(AuditLogBase):
    id: str
    user_id: str
    created_at: datetime
    user: Optional[User] = None

    class Config:
        from_attributes = True

class DeepDiveRequest(BaseModel):
    user_context: Optional[Dict[str, Any]] = None

class ProfileQnACreate(BaseModel):
    question: str
    context_fields: Optional[List[str]] = None

class ProfileQnAOut(BaseModel):
    id: str
    user_id: str
    question: str
    answer: Optional[str] = None
    llm_raw_response: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationBase(BaseModel):
    type: str
    message: str
    read: bool = False

class NotificationCreate(NotificationBase):
    user_id: str

class NotificationOut(NotificationBase):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class IdeasOut(BaseModel):
    ideas: List[IdeaOut]
    config: Dict[str, Any] = {}

class ExportRecordBase(BaseModel):
    user_id: str
    idea_id: str
    deck_id: str
    slides: List[str] = []
    focus_area: str = "general"
    style: str = "modern"
    file_type: str = "pptx"
    recipient: Optional[str] = None

class ExportRecordCreate(ExportRecordBase):
    pass

class ExportRecordOut(ExportRecordBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class ClosedStage(BaseModel):
    stage: str
    generation_method: str
    closure_reason: str
    post_mortem: str
    next_actions: List[str]
    generation_notes: str

class IteratingExperiment(BaseModel):
    proposed_experiment_summary: str = Field(..., description="Concise description of the proposed experiment")
    hypothesis: str = Field(..., description="The key assumption this experiment is testing")
    validation_method: str = Field(..., description="How to test this hypothesis")
    success_metrics: str = Field(..., description="Metrics to evaluate success")
    timeline: str = Field(..., description="How long this experiment will run")
    rationale: str = Field(..., description="Why this experiment was selected")
    user_feedback_action: str = Field(..., description="User action: 'accept', 'edit', or 'replace'")
    edited_or_replacement_details: Optional[str] = Field("", description="If user edited or replaced, capture new version")
    next_steps: str = Field(..., description="What the user should do after confirming the experiment")

class IterationBase(BaseModel):
    idea_id: str
    version: str
    risk_focus: str
    hypothesis: str
    method: str
    tools: List[str]
    task_list: List[str]
    success_metric: str
    target: str
    confidence_score_before: float
    confidence_score_after: Optional[float] = None
    raw_results: Optional[Dict[str, Any]] = None
    learnings: Optional[List[str]] = None
    hypothesis_supported: Optional[bool] = None
    decision: Optional[Literal["Pivot", "Persevere", "Kill"]] = None
    next_action: Optional[str] = None
    rationale: Optional[str] = None

class IterationCreate(IterationBase):
    pass

class IterationOut(IterationBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DeepDiveBase(BaseModel):
    idea_id: str
    data: Dict[str, Any]
    version: int = 1
    llm_raw_response: Optional[str] = None

class DeepDiveCreate(DeepDiveBase):
    pass

class DeepDiveOut(DeepDiveBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SuggestedBase(BaseModel):
    idea_id: str
    data: Dict[str, Any]
    version: int = 1
    llm_raw_response: Optional[str] = None
class SuggestedCreate(SuggestedBase):
    pass
class SuggestedOut(SuggestedBase):
    id: str
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True
class IteratingBase(BaseModel):
    idea_id: str
    data: Union[IteratingExperiment, dict[str, Any]]  # Accepts new structure or legacy dict
    version: int
    llm_raw_response: Optional[str] = None
class IteratingCreate(IteratingBase):
    pass
class IteratingUpdate(IteratingBase):
    pass
class IteratingOut(IteratingBase):
    id: str
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True
