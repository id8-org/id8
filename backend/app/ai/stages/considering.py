"""AI service for the Considering stage"""
from typing import Any, Dict
import json
import time

from app.models import Idea, User, Comment, CommentCreate
from app.ai.base import AIService, StageProcessor


class ConsideringService(AIService):
    """AI service for processing ideas in the Considering stage"""
    
    def get_stage_name(self) -> str:
        return "considering"
    
    def process_stage(
        self, 
        idea: Idea, 
        user: User, 
        stakeholder_feedback: str = "",
        feasibility_data: str = "",
        business_case: str = "",
        **kwargs
    ) -> Dict[str, Any]:
        """Process an idea in the Considering stage
        
        This stage:
        - Analyzes stakeholder feedback and concerns
        - Evaluates feasibility from multiple perspectives
        - Assesses business case and ROI potential
        - Provides go/no-go recommendation with reasoning
        
        Args:
            idea: The idea to consider
            user: The user requesting the analysis
            stakeholder_feedback: Feedback from stakeholders
            feasibility_data: Technical/resource feasibility data
            business_case: Business case information
        """
        start_time = time.time()
        
        # Prepare the prompt context
        stage_context = f"""
        You are analyzing an idea in the "Considering" stage for a final decision. Your task is to:
        1. Synthesize all stakeholder feedback and concerns
        2. Evaluate feasibility from technical, resource, and timeline perspectives
        3. Analyze the business case and potential ROI
        4. Consider market timing and competitive factors
        5. Identify key success factors and requirements
        6. Provide a clear go/no-go recommendation with detailed reasoning
        
        Available information:
        Stakeholder Feedback: {stakeholder_feedback}
        Feasibility Data: {feasibility_data}
        Business Case: {business_case}
        
        Please provide:
        - Stakeholder Analysis: Summary of key feedback and concerns
        - Feasibility Assessment: Technical, resource, and timeline evaluation
        - Business Case Review: ROI potential and financial considerations
        - Risk Analysis: Major risks and mitigation strategies
        - Success Factors: Key requirements for success
        - Final Recommendation: Clear go/no-go with detailed reasoning
        - Next Steps: If go, what are the immediate next actions
        """
        
        # Create the stage processor
        processor = StageProcessor(
            stage_name="Considering",
            custom_instructions="Provide balanced analysis and clear decision recommendation."
        )
        
        try:
            # Process the idea
            input_text = f"Title: {idea.title}\nDescription: {idea.description}\nStakeholder Feedback: {stakeholder_feedback}\nFeasibility: {feasibility_data}\nBusiness Case: {business_case}"
            
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
                input_type="consideration_analysis",
                output_text=ai_output,
                status="completed",
                processing_time_ms=processing_time
            )
            
            # Store the consideration analysis as a comment
            comment_data = CommentCreate(
                content=f"## AI Consideration Analysis\n\n{ai_output}",
                is_edited=False
            )
            
            comment = Comment.model_validate(
                comment_data,
                update={
                    "idea_id": idea.id,
                    "author_id": user.id,
                    "parent_id": None
                }
            )
            self.session.add(comment)
            self.session.commit()
            
            return {
                "success": True,
                "stage": self.get_stage_name(),
                "ai_output": ai_output,
                "comment_id": comment.id,
                "processing_time_ms": processing_time
            }
            
        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            
            # Log the error
            self.log_llm_interaction(
                user=user,
                input_text=input_text,
                input_type="consideration_analysis",
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