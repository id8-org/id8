"""Unified type definitions for the Idea8 backend application"""

# Import all types for easy access
from .schemas import *
from .llm_types import *

# Export all types
__all__ = [
    # Core schemas
    "DeepDiveItem",
    "DeepDiveCategoryData", 
    "DeepDiveIdeaData",
    "ValidationLearningData",
    "RefinementIterationData",
    "MarketAlignmentDecisionData",
    "ValidationMetricsDashboardData",
    "IteratingIdeaData",
    "IdeaGenerationRequest",
    "UserRegister",
    "UserLogin",
    "User",
    "UserProfile",
    "UserResume",
    "Token",
    "IdeaOut",
    "IdeaCreate",
    "IdeasOut",
    "RepoOut",
    "ShortlistOut",
    "DeepDiveRequest",
    "DeepDiveVersionOut",
    "IdeaVersionQnACreate",
    "IdeaVersionQnAOut",
    "ProfileQnACreate",
    "ProfileQnAOut",
    "CaseStudy",
    "CaseStudyCreate",
    "CaseStudyRequest",
    "MarketSnapshot",
    "MarketSnapshotCreate",
    "MarketSnapshotRequest",
    "LensInsightOut",
    "VCThesisComparisonOut",
    "InvestorDeckOut",
    "NotificationOut",
    "AuditLogCreate",
    "AuditLogOut",
    "IteratingExperiment",
    
    # LLM types
    "LLMProvider",
    "PromptType", 
    "ProcessingContext",
    "LLMRequest",
    "LLMResponse",
    "ParsedResponse",
]