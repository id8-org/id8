"""AI Service Manager for coordinating all stage services"""
from typing import Dict, Any, Type
from sqlmodel import Session

from app.models import Idea, User
from app.ai.base import AIService
from app.ai.stages.suggested import SuggestedService
from app.ai.stages.deep_dive import DeepDiveService
from app.ai.stages.iterating import IteratingService
from app.ai.stages.considering import ConsideringService
from app.ai.stages.building import BuildingService
from app.ai.stages.closed import ClosedService


class AIServiceManager:
    """Manager class for coordinating AI services across different stages"""
    
    # Map stage names to service classes
    STAGE_SERVICES: Dict[str, Type[AIService]] = {
        "suggested": SuggestedService,
        "deep_dive": DeepDiveService,
        "iterating": IteratingService,
        "considering": ConsideringService,
        "building": BuildingService,
        "closed": ClosedService,
    }
    
    def __init__(self, session: Session):
        self.session = session
        self._services: Dict[str, AIService] = {}
    
    def get_service(self, stage: str) -> AIService:
        """Get the AI service for a specific stage"""
        if stage not in self._services:
            if stage not in self.STAGE_SERVICES:
                raise ValueError(f"Unknown stage: {stage}")
            
            service_class = self.STAGE_SERVICES[stage]
            self._services[stage] = service_class(self.session)
        
        return self._services[stage]
    
    def process_idea_stage(
        self, 
        idea: Idea, 
        user: User, 
        stage: str, 
        **kwargs
    ) -> Dict[str, Any]:
        """Process an idea for a specific stage
        
        Args:
            idea: The idea to process
            user: The user requesting the processing
            stage: The stage to process (suggested, deep_dive, etc.)
            **kwargs: Stage-specific parameters
            
        Returns:
            Dict containing the processing results
        """
        service = self.get_service(stage)
        return service.process_stage(idea, user, **kwargs)
    
    def get_available_stages(self) -> list[str]:
        """Get list of available stages"""
        return list(self.STAGE_SERVICES.keys())
    
    def trigger_stage_transition(
        self, 
        idea: Idea, 
        user: User, 
        from_stage: str, 
        to_stage: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Trigger AI processing when an idea transitions between stages
        
        Args:
            idea: The idea transitioning stages
            user: The user triggering the transition
            from_stage: The previous stage
            to_stage: The new stage
            **kwargs: Stage-specific parameters
            
        Returns:
            Dict containing the transition results
        """
        # Process the new stage
        result = self.process_idea_stage(idea, user, to_stage, **kwargs)
        
        # Add transition metadata
        result["transition"] = {
            "from_stage": from_stage,
            "to_stage": to_stage,
            "triggered_by": user.id,
        }
        
        return result