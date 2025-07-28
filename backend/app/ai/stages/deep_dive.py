"""AI service for the Deep Dive stage"""
from typing import Any, Dict
import json
import time

from app.models import Idea, User, DeepDiveVersion, DeepDiveVersionCreate
from app.ai.base import AIService, StageProcessor


class DeepDiveService(AIService):
    """AI service for processing ideas in the Deep Dive stage"""
    
    def get_stage_name(self) -> str:
        return "deep_dive"
    
    def process_stage(
        self, 
        idea: Idea, 
        user: User, 
        background: str = "",
        pros_cons: str = "",
        **kwargs
    ) -> Dict[str, Any]:
        """Process an idea in the Deep Dive stage
        
        This stage:
        - Performs detailed analysis based on provided inputs
        - Evaluates market potential and competitive landscape
        - Analyzes technical feasibility
        - Provides comprehensive recommendations
        
        Args:
            idea: The idea to analyze
            user: The user requesting the analysis
            background: Additional background information
            pros_cons: Pros and cons analysis provided by user
        """
        start_time = time.time()
        
        # Prepare the prompt context
        stage_context = f"""
        You are conducting a deep dive analysis of an idea. Your task is to:
        1. Perform comprehensive market analysis
        2. Evaluate technical feasibility and requirements
        3. Analyze competitive landscape
        4. Assess business model potential
        5. Identify risks and mitigation strategies
        6. Provide detailed recommendations for next steps
        
        Additional context provided:
        Background: {background}
        Pros/Cons: {pros_cons}
        
        Please structure your response as detailed analysis covering:
        - Market Analysis: Size, trends, opportunities
        - Technical Analysis: Feasibility, requirements, challenges
        - Competitive Analysis: Key players, differentiation opportunities
        - Business Model: Revenue streams, cost structure, scalability
        - Risk Assessment: Major risks and mitigation strategies
        - Recommendations: Specific actionable next steps
        """
        
        # Create the stage processor
        processor = StageProcessor(
            stage_name="Deep Dive",
            custom_instructions="Provide comprehensive, detailed analysis with data-driven insights."
        )
        
        try:
            # Process the idea
            input_text = f"Title: {idea.title}\nDescription: {idea.description}\nBackground: {background}\nPros/Cons: {pros_cons}"
            
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
                input_type="deep_dive_analysis",
                output_text=ai_output,
                status="completed",
                processing_time_ms=processing_time
            )
            
            # Store the deep dive analysis in the database
            deep_dive_data = DeepDiveVersionCreate(
                title=f"Deep Dive Analysis - {idea.title}",
                content=ai_output,
                version=1,  # Could be incremented for multiple versions
                status="completed"
            )
            
            deep_dive = DeepDiveVersion.model_validate(
                deep_dive_data,
                update={
                    "idea_id": idea.id,
                    "author_id": user.id
                }
            )
            self.session.add(deep_dive)
            self.session.commit()
            
            return {
                "success": True,
                "stage": self.get_stage_name(),
                "ai_output": ai_output,
                "deep_dive_id": deep_dive.id,
                "processing_time_ms": processing_time
            }
            
        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            
            # Log the error
            self.log_llm_interaction(
                user=user,
                input_text=input_text,
                input_type="deep_dive_analysis",
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