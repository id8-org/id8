"""AI service for the Iterating stage"""
from typing import Any, Dict
import json
import time

from app.models import Idea, User, Iterating, IteratingCreate, Iteration, IterationCreate
from app.ai.base import AIService, StageProcessor


class IteratingService(AIService):
    """AI service for processing ideas in the Iterating stage"""
    
    def get_stage_name(self) -> str:
        return "iterating"
    
    def process_stage(
        self, 
        idea: Idea, 
        user: User, 
        current_iteration: str = "",
        feedback: str = "",
        goals: str = "",
        **kwargs
    ) -> Dict[str, Any]:
        """Process an idea in the Iterating stage
        
        This stage:
        - Evaluates proposed iterations and refinements
        - Analyzes feedback and suggests improvements
        - Provides guidance on iteration prioritization
        - Tracks progress and identifies blockers
        
        Args:
            idea: The idea to iterate on
            user: The user requesting the analysis
            current_iteration: Description of current iteration
            feedback: Feedback received on current iteration
            goals: Goals for the next iteration
        """
        start_time = time.time()
        
        # Prepare the prompt context
        stage_context = f"""
        You are helping to iterate and refine an idea. Your task is to:
        1. Evaluate the current iteration and progress
        2. Analyze feedback and identify key insights
        3. Suggest specific improvements and refinements
        4. Prioritize iteration goals and next steps
        5. Identify potential blockers and solutions
        6. Recommend testing and validation approaches
        
        Current context:
        Current Iteration: {current_iteration}
        Feedback Received: {feedback}
        Iteration Goals: {goals}
        
        Please provide:
        - Iteration Assessment: Analysis of current progress
        - Feedback Analysis: Key insights from feedback
        - Improvement Suggestions: Specific actionable improvements
        - Priority Recommendations: What to focus on next
        - Blocker Identification: Potential obstacles and solutions
        - Testing Strategy: How to validate improvements
        """
        
        # Create the stage processor
        processor = StageProcessor(
            stage_name="Iterating",
            custom_instructions="Focus on iterative improvement and actionable refinements."
        )
        
        try:
            # Process the idea
            input_text = f"Title: {idea.title}\nDescription: {idea.description}\nCurrent Iteration: {current_iteration}\nFeedback: {feedback}\nGoals: {goals}"
            
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
                input_type="iteration_analysis",
                output_text=ai_output,
                status="completed",
                processing_time_ms=processing_time
            )
            
            # Store the iteration analysis in the database
            iterating_data = IteratingCreate(
                current_stage="analysis",
                progress_percentage=0.0,  # Will be updated based on actual progress
                notes=ai_output,
                next_steps=f"Follow AI recommendations for iteration improvement",
                blockers=""  # Could extract from AI analysis
            )
            
            iterating_record = Iterating.model_validate(
                iterating_data,
                update={
                    "idea_id": idea.id,
                    "user_id": user.id
                }
            )
            self.session.add(iterating_record)
            
            # Also create an iteration record
            iteration_data = IterationCreate(
                title=f"AI Iteration Analysis - {idea.title}",
                description=ai_output,
                version=1,  # Could be incremented
                status="active",
                goals=goals,
                outcomes=""  # Will be filled when iteration completes
            )
            
            iteration = Iteration.model_validate(
                iteration_data,
                update={
                    "idea_id": idea.id,
                    "author_id": user.id
                }
            )
            self.session.add(iteration)
            self.session.commit()
            
            return {
                "success": True,
                "stage": self.get_stage_name(),
                "ai_output": ai_output,
                "iterating_id": iterating_record.id,
                "iteration_id": iteration.id,
                "processing_time_ms": processing_time
            }
            
        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            
            # Log the error
            self.log_llm_interaction(
                user=user,
                input_text=input_text,
                input_type="iteration_analysis",
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