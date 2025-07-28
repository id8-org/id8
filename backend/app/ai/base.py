"""Base AI service for idea stage processing"""
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import uuid
from datetime import datetime
from sqlmodel import Session

from app.models import (
    Idea, LLMInputLog, LLMProcessingLog, LLMInputLogCreate, 
    LLMProcessingLogCreate, User
)
from app.llm_center import LLMCenter, PromptType, ProcessingContext
import dspy


class AIService(ABC):
    """Base class for AI services that handle different idea stages"""
    
    def __init__(self, session: Session):
        self.session = session
        self.llm_center = LLMCenter(db_session=session)
    
    @abstractmethod
    def process_stage(self, idea: Idea, user: User, **kwargs) -> Dict[str, Any]:
        """Process an idea for this specific stage
        
        Args:
            idea: The idea to process
            user: The user requesting the processing
            **kwargs: Additional stage-specific parameters
            
        Returns:
            Dict containing the AI processing results
        """
        pass
    
    @abstractmethod
    def get_stage_name(self) -> str:
        """Return the name of this stage"""
        pass
    
    async def call_llm_for_stage(
        self,
        prompt_type: PromptType,
        content: str,
        user: User,
        idea: Optional[Idea] = None,
        **kwargs
    ) -> Any:
        """Call LLM using the centralized service for this stage"""
        context = ProcessingContext(
            user_id=str(user.id),
            idea_id=str(idea.id) if idea else None,
            stage=self.get_stage_name(),
            additional_context=kwargs
        )
        
        response = await self.llm_center.call_llm(
            prompt_type=prompt_type,
            content=content,
            context=context
        )
        
        return response
    
    def log_llm_interaction(
        self, 
        user: User, 
        input_text: str, 
        input_type: str,
        output_text: Optional[str] = None,
        status: str = "processing",
        error_message: Optional[str] = None,
        processing_time_ms: Optional[int] = None,
        tokens_used: Optional[int] = None,
        cost: Optional[float] = None
    ) -> LLMProcessingLog:
        """Log LLM interaction to database"""
        
        # Create input log
        input_log_data = LLMInputLogCreate(
            input_text=input_text,
            input_type=input_type,
            model_name="gpt-4o-mini",  # Default model
            parameters="{}",  # JSON string of parameters
            context="{}"  # JSON string of context
        )
        
        input_log = LLMInputLog.model_validate(
            input_log_data, 
            update={"user_id": user.id, "session_id": str(uuid.uuid4())}
        )
        self.session.add(input_log)
        self.session.flush()  # Get the ID
        
        # Create processing log
        processing_log_data = LLMProcessingLogCreate(
            output_text=output_text,
            status=status,
            error_message=error_message,
            processing_time_ms=processing_time_ms,
            tokens_used=tokens_used,
            cost=cost
        )
        
        processing_log = LLMProcessingLog.model_validate(
            processing_log_data,
            update={"input_log_id": input_log.id}
        )
        self.session.add(processing_log)
        self.session.commit()
        
        return processing_log


class StagePrompt(dspy.Signature):
    """Base signature for stage processing prompts"""
    idea_title: str = dspy.InputField(desc="The title of the idea")
    idea_description: str = dspy.InputField(desc="The description of the idea")
    stage_context: str = dspy.InputField(desc="Context specific to this stage")
    output: str = dspy.OutputField(desc="Stage-specific AI analysis and recommendations")


class StageProcessor(dspy.Module):
    """Base DSPy module for processing idea stages"""
    
    def __init__(self, stage_name: str, custom_instructions: str = "", llm_center: Optional[LLMCenter] = None):
        super().__init__()
        self.stage_name = stage_name
        self.custom_instructions = custom_instructions
        self.llm_center = llm_center or LLMCenter()
        self.generate = dspy.ChainOfThought(StagePrompt)
    
    def forward(self, idea_title: str, idea_description: str, stage_context: str = ""):
        """Process the idea through this stage"""
        enhanced_context = f"{self.custom_instructions}\n\nStage: {self.stage_name}\n{stage_context}"
        
        result = self.generate(
            idea_title=idea_title,
            idea_description=idea_description,
            stage_context=enhanced_context
        )
        
        return result