"""AI service for the Building stage"""
from typing import Any, Dict
import json
import time

from app.models import Idea, User, InvestorDeck, InvestorDeckCreate
from app.ai.base import AIService, StageProcessor


class BuildingService(AIService):
    """AI service for processing ideas in the Building stage"""
    
    def get_stage_name(self) -> str:
        return "building"
    
    def process_stage(
        self, 
        idea: Idea, 
        user: User, 
        implementation_plan: str = "",
        resources: str = "",
        timeline: str = "",
        **kwargs
    ) -> Dict[str, Any]:
        """Process an idea in the Building stage
        
        This stage:
        - Validates the implementation plan
        - Provides execution guidance and best practices
        - Identifies potential roadblocks and solutions
        - Suggests milestones and success metrics
        - Recommends resource optimization
        
        Args:
            idea: The idea being built
            user: The user requesting the analysis
            implementation_plan: Current implementation plan
            resources: Available resources
            timeline: Proposed timeline
        """
        start_time = time.time()
        
        # Prepare the prompt context
        stage_context = f"""
        You are providing execution guidance for an idea in the "Building" stage. Your task is to:
        1. Validate and improve the implementation plan
        2. Identify potential execution challenges and solutions
        3. Suggest optimal resource allocation and timeline
        4. Define key milestones and success metrics
        5. Recommend risk mitigation strategies
        6. Provide best practices for execution
        
        Current planning information:
        Implementation Plan: {implementation_plan}
        Available Resources: {resources}
        Proposed Timeline: {timeline}
        
        Please provide:
        - Plan Validation: Assessment of the current implementation plan
        - Execution Guidance: Best practices and recommendations
        - Resource Optimization: How to best use available resources
        - Timeline Analysis: Realistic timeline assessment and suggestions
        - Milestone Definition: Key milestones and deliverables
        - Risk Mitigation: Potential issues and prevention strategies
        - Success Metrics: How to measure progress and success
        - Next Actions: Immediate steps to begin execution
        """
        
        # Create the stage processor
        processor = StageProcessor(
            stage_name="Building",
            custom_instructions="Focus on practical execution guidance and actionable recommendations."
        )
        
        try:
            # Process the idea
            input_text = f"Title: {idea.title}\nDescription: {idea.description}\nImplementation Plan: {implementation_plan}\nResources: {resources}\nTimeline: {timeline}"
            
            result = processor.forward(
                idea_title=idea.title,
                idea_description=idea.description,
                stage_context=stage_context
            )
            
            processing_time = int((time.time() - start_time) * 1000)
            
            # Parse the AI output
            ai_output = result.output if hasattr(result, 'output') else str(result)
            
            # Log the interaction
            self.log_llm_interaction(
                user=user,
                input_text=input_text,
                input_type="building_guidance",
                output_text=ai_output,
                status="completed",
                processing_time_ms=processing_time
            )
            
            # Store the building guidance as an investor deck (execution deck)
            deck_data = InvestorDeckCreate(
                title=f"Execution Plan - {idea.title}",
                content=ai_output,
                deck_type="execution",
                version=1,
                is_finalized=False
            )
            
            deck = InvestorDeck.model_validate(
                deck_data,
                update={
                    "idea_id": idea.id,
                    "author_id": user.id
                }
            )
            self.session.add(deck)
            self.session.commit()
            
            return {
                "success": True,
                "stage": self.get_stage_name(),
                "ai_output": ai_output,
                "deck_id": deck.id,
                "processing_time_ms": processing_time
            }
            
        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            
            # Log the error
            self.log_llm_interaction(
                user=user,
                input_text=input_text,
                input_type="building_guidance",
                status="failed",
                error_message=str(e),
                processing_time_ms=processing_time
            )
            
            return {
                "success": False,
                "stage": self.get_stage_name(),
                "error": str(e),
                "processing_time_ms": processing_time
            }