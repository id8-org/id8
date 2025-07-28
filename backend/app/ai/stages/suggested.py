"""AI service for the Suggested stage"""
from typing import Any, Dict
import json
import time

from app.models import Idea, User, Suggested, SuggestedCreate
from app.ai.base import AIService, StageProcessor


class SuggestedService(AIService):
    """AI service for processing ideas in the Suggested stage"""
    
    def get_stage_name(self) -> str:
        return "suggested"
    
    def process_stage(self, idea: Idea, user: User, **kwargs) -> Dict[str, Any]:
        """Process an idea in the Suggested stage
        
        This stage:
        - Summarizes the idea
        - Provides initial suggestions for improvement
        - Identifies potential challenges and opportunities
        - Suggests next steps
        """
        start_time = time.time()
        
        # Prepare the prompt context
        stage_context = """
        You are analyzing an idea in its initial "Suggested" stage. Your task is to:
        1. Provide a clear, concise summary of the idea
        2. Identify the core value proposition
        3. Suggest initial improvements or refinements
        4. Highlight potential challenges that should be considered
        5. Recommend immediate next steps for development
        
        Please structure your response as a JSON object with the following fields:
        - summary: A brief summary of the idea
        - value_proposition: The core value the idea provides
        - suggestions: List of improvement suggestions
        - challenges: List of potential challenges
        - next_steps: List of recommended next steps
        """
        
        # Create the stage processor
        processor = StageProcessor(
            stage_name="Suggested",
            custom_instructions="Focus on initial idea evaluation and improvement suggestions."
        )
        
        try:
            # Process the idea
            input_text = f"Title: {idea.title}\nDescription: {idea.description}"
            
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
                input_type="idea_suggestion",
                output_text=ai_output,
                status="completed",
                processing_time_ms=processing_time
            )
            
            # Store the suggestion in the database
            suggestion_data = SuggestedCreate(
                entity_type="idea",
                entity_id=idea.id,
                suggestion_type="initial_analysis",
                score=0.8,  # Default confidence score
                reason=ai_output,
                extra_data=json.dumps({
                    "stage": "suggested",
                    "processing_time_ms": processing_time,
                    "timestamp": time.time()
                })
            )
            
            suggestion = Suggested.model_validate(
                suggestion_data,
                update={"user_id": user.id}
            )
            self.session.add(suggestion)
            self.session.commit()
            
            return {
                "success": True,
                "stage": self.get_stage_name(),
                "ai_output": ai_output,
                "suggestion_id": suggestion.id,
                "processing_time_ms": processing_time
            }
            
        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            
            # Log the error
            self.log_llm_interaction(
                user=user,
                input_text=f"Title: {idea.title}\nDescription: {idea.description}",
                input_type="idea_suggestion",
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