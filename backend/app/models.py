from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Enum, Float, func, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import uuid
from database import Base
from sqlalchemy.inspection import inspect
from datetime import datetime

def gen_uuid(): return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=True)  # Nullable for OAuth users
    first_name = Column(String)
    last_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Tier and account type
    tier = Column(Enum('free', 'premium', name='user_tier'), default='premium', nullable=False)
    account_type = Column(Enum('solo', 'team', name='user_account_type'), default='solo', nullable=False)
    team_id = Column(String, ForeignKey("teams.id"), nullable=True)
    
    # OAuth fields
    oauth_provider = Column(String, nullable=True)  # 'google', 'email', etc.
    oauth_id = Column(String, nullable=True)  # Google user ID
    oauth_picture = Column(String, nullable=True)  # Profile picture URL
    github_access_token = Column(String, nullable=True)  # GitHub OAuth access token (store securely)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False)
    resume = relationship("UserResume", back_populates="user", uselist=False)
    ideas = relationship("Idea", back_populates="user")
    shortlists = relationship("Shortlist", back_populates="user")
    team = relationship("Team", back_populates="members", foreign_keys=[team_id])

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class UserProfile(Base):
    __tablename__ = "user_profiles"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Personal Information
    background = Column(Text)
    location = Column(JSONB, default=dict)
    website = Column(String)
    linkedin_url = Column(String)
    github_url = Column(String)
    
    # Skills & Experience
    skills = Column(JSONB, default=list)  # List of skill strings
    experience_years = Column(Integer)
    industries = Column(JSONB, default=list)  # List of industry strings
    interests = Column(JSONB, default=list)  # List of interest strings
    horizontals = Column(JSONB, default=list)  # List of business horizontal strings
    verticals = Column(JSONB, default=list)  # List of business vertical strings
    
    # Goals & Preferences
    goals = Column(JSONB, default=list)  # List of goal strings
    preferred_business_models = Column(JSONB, default=list)
    preferred_industries = Column(JSONB, default=list)
    risk_tolerance = Column(String)  # 'low', 'medium', 'high'
    time_availability = Column(String)  # 'part_time', 'full_time', 'weekends_only'
    
    # Onboarding Status
    onboarding_completed = Column(Boolean, default=False)
    onboarding_step = Column(Integer, default=0)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="profile")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class UserResume(Base):
    __tablename__ = "user_resumes"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Resume Data
    original_filename = Column(String)
    file_path = Column(String)
    file_size = Column(Integer)
    content_type = Column(String)
    
    # Parsed Data
    parsed_content = Column(Text)
    extracted_skills = Column(JSONB, default=list)
    work_experience = Column(JSONB, default=list)
    education = Column(JSONB, default=list)
    
    # Processing Status
    is_processed = Column(Boolean, default=False)
    processing_error = Column(Text)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="resume")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class Repo(Base):
    __tablename__ = "repos"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, index=True, nullable=False)
    url = Column(String, unique=True, nullable=False)
    summary = Column(Text)
    language = Column(String, index=True)
    created_at = Column(DateTime, server_default=func.now())
    ideas = relationship("Idea", back_populates="repo")
    trending_period = Column(String, default="daily")  # 'daily', 'weekly', 'monthly'

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class Idea(Base):
    __tablename__ = "ideas"
    id = Column(String, primary_key=True, default=gen_uuid)
    # Let the DB assign a unique, auto-incrementing idea_number
    idea_number = Column(Integer, autoincrement=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)  # Allow NULL for system-generated ideas
    repo_id = Column(String, ForeignKey("repos.id"), nullable=True)  # Allow NULL for manual ideas
    title = Column(String, nullable=False)
    hook = Column(Text)
    value = Column(Text)
    evidence = Column(Text)
    evidence_reference = Column(JSONB, nullable=True)  # MANDATORY for suggested stage
    repo_usage = Column(Text, nullable=True)
    differentiator = Column(Text)
    score = Column(Integer)
    mvp_effort = Column(Integer)
    deep_dive_requested = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    
    # New fields for business vertical and horizontal
    vertical = Column(String, nullable=True)
    horizontal = Column(String, nullable=True)

    # Iteration fields
    business_model = Column(Text)
    market_positioning = Column(Text)
    revenue_streams = Column(Text)
    target_audience = Column(Text)
    competitive_advantage = Column(Text)
    go_to_market_strategy = Column(Text)
    success_metrics = Column(Text)
    risk_factors = Column(Text)
    iteration_notes = Column(Text)
    
    # Assumptions
    assumptions = Column(JSONB, default=list)
    source_type = Column(String(20), nullable=False, default="user")  # 'user', 'system', 'seed', etc.
    
    # New suggested stage fields
    scope_commitment = Column(String, nullable=True)
    problem_statement = Column(Text, nullable=True)
    elevator_pitch = Column(Text, nullable=True)
    core_assumptions = Column(JSONB, default=list)
    riskiest_assumptions = Column(JSONB, default=list)
    generation_notes = Column(Text, nullable=True)
    
    # Iterating fields
    iterating = Column(JSONB, default={})  # Stores all iterating stage fields as a JSON object
    
    # --- Repo pairing and MVP build fields ---
    repo_url = Column(String, nullable=True, index=True)  # Direct URL to the paired repo (for system-generated or paired ideas)
    repo_name = Column(String, nullable=True)  # Name of the paired repo
    repo_description = Column(Text, nullable=True)  # Description/summary of the paired repo
    mvp_steps = Column(JSONB, nullable=True, default=list)  # Step-by-step MVP build plan (list of strings)
    prerequisites = Column(JSONB, nullable=True, default=list)  # Prerequisites or setup steps (list of strings)
    
    # New deep dive table
    deep_dive_table = Column(JSONB, default=list)
    iterating_table = Column(JSONB, default=list)
    considering_table = Column(JSONB, default=list)
    
    # Relationships
    user = relationship("User", back_populates="ideas")
    repo = relationship("Repo", back_populates="ideas")
    shortlists = relationship("Shortlist", back_populates="idea")
    collaborators = relationship("IdeaCollaborator", back_populates="idea")
    change_proposals = relationship("IdeaChangeProposal", back_populates="idea")
    comments = relationship("Comment", back_populates="idea")
    deep_dive_versions = relationship("DeepDiveVersion", back_populates="idea")
    suggested = relationship("Suggested", back_populates="idea")
    iterating = relationship("Iterating", back_populates="idea", cascade="all, delete-orphan")
    llm_raw_response = Column(Text)  # Raw LLM response for idea generation
    deep_dive_raw_response = Column(Text)  # Raw LLM response for deep dive
    status = Column(Enum('suggested', 'deep_dive', 'iterating', 'considering', 'closed', name='idea_status'), default='suggested', nullable=False)
    type = Column(String(20), nullable=True, default=None)
    share_token = Column(String, unique=True, nullable=True, default=lambda: str(uuid.uuid4()))
    llm_outputs = Column(JSON, default=dict)  # Store outputs by stage

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        # Remove source_of_inspiration from output
        result.pop('source_of_inspiration', None)
        # Map table fields to frontend-compatible names
        if 'deep_dive_table' in result:
            result['deep_dive'] = result.pop('deep_dive_table')
        if 'iterating_table' in result:
            result['iterating'] = result.pop('iterating_table')
        if 'considering_table' in result:
            result['considering'] = result.pop('considering_table')
        return result

class Shortlist(Base):
    __tablename__ = "shortlists"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    idea_id = Column(String, ForeignKey("ideas.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="shortlists")
    idea = relationship("Idea", back_populates="shortlists")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class DeepDiveVersion(Base):
    __tablename__ = "deep_dive_versions"
    id = Column(String, primary_key=True, default=gen_uuid)
    idea_id = Column(String, ForeignKey("ideas.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    fields = Column(JSONB, default={})
    llm_raw_response = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    share_token = Column(String, unique=True, nullable=True, default=lambda: str(uuid.uuid4()))

    idea = relationship("Idea", back_populates="deep_dive_versions")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class CaseStudy(Base):
    __tablename__ = "case_studies"
    id = Column(String, primary_key=True, default=gen_uuid)
    idea_id = Column(String, ForeignKey("ideas.id"), nullable=False)
    company_name = Column(String, nullable=False)
    industry = Column(String)
    business_model = Column(String)
    success_factors = Column(Text)
    challenges = Column(Text)
    lessons_learned = Column(Text)
    market_size = Column(String)
    funding_raised = Column(String)
    exit_value = Column(String)
    llm_raw_response = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    idea = relationship("Idea")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class MarketSnapshot(Base):
    __tablename__ = "market_snapshots"
    id = Column(String, primary_key=True, default=gen_uuid)
    idea_id = Column(String, ForeignKey("ideas.id"), nullable=False)
    market_size = Column(String)
    growth_rate = Column(String)
    key_players = Column(JSONB, default=list)
    market_trends = Column(Text)
    regulatory_environment = Column(Text)
    competitive_landscape = Column(Text)
    entry_barriers = Column(Text)
    llm_raw_response = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    idea = relationship("Idea")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class LensInsight(Base):
    __tablename__ = "lens_insights"
    id = Column(String, primary_key=True, default=gen_uuid)
    idea_id = Column(String, ForeignKey("ideas.id"), nullable=False)
    lens_type = Column(String, nullable=False)  # 'founder', 'investor', 'customer'
    insights = Column(Text)
    opportunities = Column(Text)
    risks = Column(Text)
    recommendations = Column(Text)
    llm_raw_response = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    idea = relationship("Idea")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class VCThesisComparison(Base):
    __tablename__ = "vc_thesis_comparisons"
    id = Column(String, primary_key=True, default=gen_uuid)
    idea_id = Column(String, ForeignKey("ideas.id"), nullable=False)
    vc_firm = Column(String, nullable=False)
    thesis_focus = Column(String)
    alignment_score = Column(Integer)  # 1-10
    key_alignment_points = Column(Text)
    potential_concerns = Column(Text)
    investment_likelihood = Column(String)  # 'high', 'medium', 'low'
    llm_raw_response = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    idea = relationship("Idea")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class InvestorDeck(Base):
    __tablename__ = "investor_decks"
    id = Column(String, primary_key=True, default=gen_uuid)
    idea_id = Column(String, ForeignKey("ideas.id"), nullable=False)
    deck_content = Column(JSONB, default={})  # Structured deck content
    generated_at = Column(DateTime, server_default=func.now())
    llm_raw_response = Column(Text)
    slides = Column(JSONB, default=list)  # List of slide IDs used for this deck
    focus_area = Column(String, default="general")  # Audience/focus area
    style = Column(String, default="modern")  # Deck style
    
    # Relationships
    idea = relationship("Idea")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class IdeaCollaborator(Base):
    __tablename__ = "idea_collaborators"
    id = Column(String, primary_key=True, default=gen_uuid)
    idea_id = Column(String, ForeignKey("ideas.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    role = Column(Enum('editor', 'viewer', name='collaborator_role'), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    idea = relationship("Idea", back_populates="collaborators")
    user = relationship("User")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class IdeaChangeProposal(Base):
    __tablename__ = "idea_change_proposals"
    id = Column(String, primary_key=True, default=gen_uuid)
    idea_id = Column(String, ForeignKey("ideas.id"), nullable=False)
    proposer_id = Column(String, ForeignKey("users.id"), nullable=False)
    changes = Column(JSONB, nullable=False)  # JSON diff of the changes
    status = Column(Enum('pending', 'approved', 'rejected', name='proposal_status'), default='pending', nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    reviewed_at = Column(DateTime, nullable=True)

    idea = relationship("Idea", back_populates="change_proposals")
    proposer = relationship("User")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class Comment(Base):
    __tablename__ = "comments"
    id = Column(String, primary_key=True, default=gen_uuid)
    idea_id = Column(String, ForeignKey("ideas.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    parent_comment_id = Column(String, ForeignKey("comments.id"), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    idea = relationship("Idea", back_populates="comments")
    user = relationship("User")
    parent_comment = relationship("Comment", remote_side=[id], back_populates="replies")
    replies = relationship("Comment", back_populates="parent_comment")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class Team(Base):
    __tablename__ = "teams"
    id = Column(String, primary_key=True, default=gen_uuid)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    # Relationships
    members = relationship("User", back_populates="team", foreign_keys="User.team_id")
    invites = relationship("Invite", back_populates="team")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class Invite(Base):
    __tablename__ = "invites"
    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, nullable=False, index=True)
    team_id = Column(String, ForeignKey("teams.id"), nullable=False)
    inviter_id = Column(String, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    accepted = Column(Boolean, default=False)
    accepted_at = Column(DateTime, nullable=True)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    # Relationships
    team = relationship("Team", back_populates="invites")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class IdeaVersionQnA(Base):
    __tablename__ = "idea_version_qna"
    id = Column(String, primary_key=True, default=gen_uuid)
    idea_id = Column(String, ForeignKey("ideas.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    llm_raw_response = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    idea = relationship("Idea")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    action_type = Column(String, nullable=False)  # e.g., 'idea_created', 'status_changed', 'deep_dive_triggered', 'idea_deleted', 'profile_updated', etc.
    resource_type = Column(String, nullable=False)  # e.g., 'idea', 'profile', 'team', 'collaboration', etc.
    resource_id = Column(String, nullable=True)  # ID of the affected resource (idea_id, etc.)
    details = Column(JSONB, default={})  # Additional context about the action
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class ProfileQnA(Base):
    __tablename__ = "profile_qna"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    llm_raw_response = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)  # e.g., 'new_ideas', 'system', 'team', etc.
    message = Column(Text, nullable=False)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class ExportRecord(Base):
    __tablename__ = "export_records"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    idea_id = Column(String, ForeignKey("ideas.id"), nullable=False)
    deck_id = Column(String, ForeignKey("investor_decks.id"), nullable=False)
    slides = Column(JSONB, default=list)
    focus_area = Column(String, default="general")
    style = Column(String, default="modern")
    file_type = Column(String, default="pptx")
    recipient = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")
    idea = relationship("Idea")
    deck = relationship("InvestorDeck")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class Iteration(Base):
    __tablename__ = "iterations"
    id = Column(String, primary_key=True, default=gen_uuid)
    idea_id = Column(String, ForeignKey("ideas.id"), nullable=False, index=True)
    version = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    risk_focus = Column(Text, nullable=False)
    hypothesis = Column(Text, nullable=False)
    method = Column(Text, nullable=False)
    tools = Column(JSONB, default=list)
    task_list = Column(JSONB, default=list)
    success_metric = Column(Text, nullable=False)
    target = Column(Text, nullable=False)
    confidence_score_before = Column(Float, nullable=False)
    confidence_score_after = Column(Float, nullable=True)
    raw_results = Column(JSONB, nullable=True)
    learnings = Column(JSONB, default=list)
    hypothesis_supported = Column(Boolean, nullable=True)
    decision = Column(Enum('Pivot', 'Persevere', 'Kill', name='iteration_decision'), nullable=True)
    next_action = Column(Text, nullable=True)
    rationale = Column(Text, nullable=True)

    idea = relationship("Idea", backref="iterations")

    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class Suggested(Base):
    __tablename__ = "suggested"
    id = Column(String, primary_key=True, default=gen_uuid)
    idea_id = Column(String, ForeignKey("ideas.id"), nullable=False)
    data = Column(JSONB, default={})
    version = Column(Integer, nullable=False, default=1)
    llm_raw_response = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    idea = relationship("Idea", back_populates="suggested")
    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class Iterating(Base):
    __tablename__ = "iterating"
    id = Column(String, primary_key=True, default=gen_uuid)
    idea_id = Column(String, ForeignKey("ideas.id"), nullable=False)
    data = Column(JSONB, default={})
    version = Column(Integer, nullable=False, default=1)
    llm_raw_response = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    idea = relationship("Idea", back_populates="iterating")
    def as_dict(self):
        result = {}
        for c in inspect(self).mapper.column_attrs:
            value = getattr(self, c.key)
            if hasattr(value, 'isoformat'):
                result[c.key] = value.isoformat()
            else:
                result[c.key] = value
        return result

class LLMInputLog(Base):
    __tablename__ = 'llm_input_log'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    stage = Column(String, index=True)
    reason = Column(String)
    context_json = Column(Text)  # JSON as text
    raw_output = Column(String)  # Store as string for linter compatibility
    cleaned_output = Column(String)  # Store as string for linter compatibility
    created_at = Column(DateTime, default=datetime.utcnow)
    processing_logs = relationship('LLMProcessingLog', back_populates='input_log')

class LLMProcessingLog(Base):
    __tablename__ = 'llm_processing_log'
    id = Column(Integer, primary_key=True, index=True)
    input_id = Column(Integer, ForeignKey('llm_input_log.id'))
    error = Column(Text)
    step = Column(String)
    raw_output = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    input_log = relationship('LLMInputLog', back_populates='processing_logs')
