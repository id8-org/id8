"""AI service for the Closed stage"""
from typing import Any, Dict
import json
import time

from app.models import Idea, User, CaseStudy, CaseStudyCreate
from app.ai.base import AIService, StageProcessor


class ClosedService(AIService):
    """AI service for processing ideas in the Closed stage"""
    
    def get_stage_name(self) -> str:
        return "closed"
    
    def process_stage(
        self, 
        idea: Idea, 
        user: User, 
        outcome: str = "",
        lessons_learned: str = "",
        metrics: str = "",
        **kwargs
    ) -> Dict[str, Any]:
        """Process an idea in the Closed stage
        
        This stage:
        - Summarizes the overall outcome and results
        - Analyzes lessons learned and key insights
        - Evaluates success/failure factors
        - Provides recommendations for future projects
        - Creates a comprehensive case study
        
        Args:
            idea: The completed idea
            user: The user requesting the analysis
            outcome: Final outcome description
            lessons_learned: Key lessons learned
            metrics: Performance metrics and results
        """
        start_time = time.time()
        
        # Prepare the prompt context
        stage_context = f"""
        You are creating a comprehensive summary and analysis for an idea that has reached the "Closed" stage. Your task is to:
        1. Summarize the overall journey and final outcome
        2. Analyze what worked well and what didn't
        3. Extract key lessons learned and insights
        4. Evaluate success/failure factors
        5. Provide recommendations for similar future projects
        6. Create a comprehensive case study for knowledge sharing
        
        Project completion information:
        Final Outcome: {outcome}
        Lessons Learned: {lessons_learned}
        Metrics/Results: {metrics}
        
        Please provide:
        - Executive Summary: High-level overview of the project and outcome
        - Journey Analysis: Key phases and turning points
        - Success Factors: What contributed to success (or prevented it)
        - Lessons Learned: Key insights and takeaways
        - Recommendations: Guidance for similar future projects
        - Case Study: Comprehensive documentation for knowledge sharing
        - Future Implications: How this experience informs future innovation
        """
        
        # Create the stage processor
        processor = StageProcessor(
            stage_name="Closed",
            custom_instructions="Create comprehensive analysis and case study for knowledge sharing."
        )
        
        try:
            # Process the idea
            input_text = f"Title: {idea.title}\nDescription: {idea.description}\nOutcome: {outcome}\nLessons: {lessons_learned}\nMetrics: {metrics}"
            
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
                input_type="closure_analysis",
                output_text=ai_output,
                status="completed",
                processing_time_ms=processing_time
            )
            
            # Store as a case study
            case_study_data = CaseStudyCreate(
                title=f"Case Study: {idea.title}",
                content=ai_output,
                company_name="",  # Could be extracted from context
                industry="",  # Could be extracted from idea
                funding_stage=""  # Could be extracted from context
            )
            
            case_study = CaseStudy.model_validate(
                case_study_data,
                update={
                    "idea_id": idea.id,
                    "author_id": user.id
                }
            )
            self.session.add(case_study)
            self.session.commit()
            
            return {
                "success": True,
                "stage": self.get_stage_name(),
                "ai_output": ai_output,
                "case_study_id": case_study.id,
                "processing_time_ms": processing_time
            }
            
        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            
            # Log the error
            self.log_llm_interaction(
                user=user,
                input_text=input_text,
                input_type="closure_analysis",
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