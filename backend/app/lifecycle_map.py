# lifecycle_map.py

from watchdog.events import FileSystemEventHandler

lifecycle_map = [
    {
        "stage": "suggested",
        "description": "The Suggested phase is where new ideas are generated, typically by the system or AI, based on trending GitHub repositories and user context. The goal is to surface high-potential, fundable startup concepts that are tailored to user interests and market needs. Only the most promising, actionable ideas are advanced for further evaluation.",
        "inputs": [
            {"label": "Vertical", "field": "vertical", "prompt_var": "vertical"},
            {"label": "Horizontal", "field": "horizontal", "prompt_var": "horizontal"},
            {"label": "Repo ID", "field": "repo_id", "prompt_var": "repo_id"},
            {"label": "User ID", "field": "user_id", "prompt_var": "user_id"},
            {"label": "Target Audience", "field": "target_audience", "prompt_var": "target_audience"},
            {"label": "Market Positioning", "field": "market_positioning", "prompt_var": "market_positioning"},
            {"label": "Assumptions", "field": "assumptions", "prompt_var": "assumptions"},
        ],
        "outputs": [
            {"label": "Idea Title", "field": "title", "prompt_var": "title"},
            {"label": "Idea Hook", "field": "hook", "prompt_var": "hook"},
            {"label": "Value Proposition", "field": "value", "prompt_var": "value"},
            {"label": "Score", "field": "score", "prompt_var": "score"},
            {"label": "MVP Effort", "field": "mvp_effort", "prompt_var": "mvp_effort"},
            {"label": "Status", "field": "status", "prompt_var": "status"},
        ],
        "prompt": "AI_IDEA_PROMPT",
        "api_route": "/ideas/generate",
        "db_tables": ["ideas"],
        "ui_trigger": "AddIdeaModal, Dashboard, IdeaList",
        "actions": [
            "View idea details",
            "Shortlist idea",
            "Edit idea (if user-submitted)",
            "Advance to Deep Dive"
        ],
        "orchestration": [
            {"function": "generate_idea_pitches", "prompt": "AI_IDEA_PROMPT", "output": "ideas"}
        ]
    },
    {
        "stage": "deep_dive",
        "description": "In the Deep Dive phase, a selected idea is rigorously analyzed and structured into a clear, pitch-ready concept. The LLM evaluates the idea as if preparing a startup pitch deck or investment memo, providing detailed feedback on product, market, timing, risks, and more. This phase helps founders and teams understand the strengths, weaknesses, and real-world viability of the idea before investing further.",
        "inputs": [
            {"label": "Idea ID", "field": "id", "prompt_var": "idea_id"},
            {"label": "User Edits/Refinements", "field": "deep_dive", "prompt_var": "user_edits"},
            {"label": "Iteration Notes", "field": "iteration_notes", "prompt_var": "iteration_notes"}
        ],
        "outputs": [
            {"label": "Market Opportunity (Tab)", "field": "market_opportunity", "prompt_var": "market_opportunity"},
            {"label": "Execution Capability (Tab)", "field": "execution_capability", "prompt_var": "execution_capability"},
            {"label": "Business Viability (Tab)", "field": "business_viability", "prompt_var": "business_viability"},
            {"label": "Strategic Alignment & Risks (Tab)", "field": "strategic_alignment_risks", "prompt_var": "strategic_alignment_risks"},
            {"label": "Overall Score", "field": "overall_score", "prompt_var": "overall_score"},
            {"label": "Summary", "field": "summary", "prompt_var": "summary"}
        ],
        "prompt": "DEEP_DIVE_PROMPT",
        "api_route": "/ideas/{id}/deepdive",
        "db_tables": ["ideas", "deep_dive_versions"],
        "ui_trigger": "IdeaDetail, DeepDiveModal",
        "actions": [
            "Edit/refine idea",
            "Trigger deep dive analysis",
            "View deep dive results",
            "Advance to Iterating"
        ],
        "orchestration": [
            {"function": "generate_deep_dive", "prompt": "DEEP_DIVE_PROMPT", "output": "deep_dive"}
        ]
    },
    {
        "stage": "iterating",
        "description": "The Iterating phase is where the idea is refined, challenged, and improved through multiple expert lenses. The goal is to polish the concept, address risks, and strengthen the business model, market positioning, and go-to-market strategy. This phase produces investor-ready materials and actionable next steps.",
        "inputs": [
            {"label": "Idea ID", "field": "id", "prompt_var": "idea_id"},
            {"label": "Business Model", "field": "business_model", "prompt_var": "business_model"},
            {"label": "Market Positioning", "field": "market_positioning", "prompt_var": "market_positioning"},
            {"label": "Revenue Streams", "field": "revenue_streams", "prompt_var": "revenue_streams"},
            {"label": "Target Audience", "field": "target_audience", "prompt_var": "target_audience"},
            {"label": "Competitive Advantage", "field": "competitive_advantage", "prompt_var": "competitive_advantage"},
            {"label": "Go To Market Strategy", "field": "go_to_market_strategy", "prompt_var": "go_to_market_strategy"},
            {"label": "Success Metrics", "field": "success_metrics", "prompt_var": "success_metrics"},
            {"label": "Risk Factors", "field": "risk_factors", "prompt_var": "risk_factors"},
            {"label": "Iteration Notes", "field": "iteration_notes", "prompt_var": "iteration_notes"}
        ],
        "outputs": [
            {"label": "Validation & Learning (Tab)", "field": "validation_learning", "prompt_var": "validation_learning"},
            {"label": "Refinement & Iteration (Tab)", "field": "refinement_iteration", "prompt_var": "refinement_iteration"},
            {"label": "Market Alignment & Decision-Making (Tab)", "field": "market_alignment_decision", "prompt_var": "market_alignment_decision"},
            {"label": "Validation Metrics Dashboard (Tab)", "field": "validation_metrics_dashboard", "prompt_var": "validation_metrics_dashboard"},
            {"label": "Summary", "field": "summary", "prompt_var": "summary"}
        ],
        "prompt": "ITERATING_STAGE_PROMPT",
        "api_route": "/ideas/{id}/iterate",
        "db_tables": ["ideas", "lens_insights", "vc_thesis_comparisons", "investor_decks"],
        "ui_trigger": "IdeaDetail, IterationPanel",
        "actions": [
            "Edit/refine business model",
            "Request investor lens feedback",
            "Request customer lens feedback",
            "Request VC thesis comparison",
            "Generate investor deck",
            "Advance to Considering"
        ],
        "orchestration": [
            {"function": "generate_iterating_stage", "prompt": "ITERATING_STAGE_PROMPT", "output": "iterating"}
        ]
    },
    {
        "stage": "considering",
        "description": "The Considering phase is decision time. All analyses and iterations are reviewed to make a clear go/no-go decision: should the team commit to building this idea, or archive it? This phase includes a final risk assessment, strengths/weaknesses summary, and a one-pager pitch for stakeholders.",
        "inputs": [
            {"label": "Idea ID", "field": "id", "prompt_var": "idea_id"},
            {"label": "Iteration/Analysis Results", "field": "success_metrics", "prompt_var": "analysis_results"},
            {"label": "Risk Factors", "field": "risk_factors", "prompt_var": "risk_factors"}
        ],
        "outputs": [
            {"label": "Stakeholder Alignment (Tab)", "field": "stakeholder_alignment", "prompt_var": "stakeholder_alignment"},
            {"label": "Execution & Communication (Tab)", "field": "execution_communication", "prompt_var": "execution_communication"},
            {"label": "Summary", "field": "summary", "prompt_var": "summary"},
            {"label": "Progress", "field": "progress", "prompt_var": "progress"}
        ],
        "prompt": "CONSIDERING_STAGE_PROMPT",
        "api_route": "/ideas/{id}/consider",
        "db_tables": ["ideas", "investor_decks", "lens_insights", "vc_thesis_comparisons"],
        "ui_trigger": "IdeaDetail, ConsiderationPanel",
        "actions": [
            "Review all analyses",
            "Make go/no-go decision",
            "Archive idea",
            "Commit to build (Go)"
        ],
        "orchestration": [
            {"function": "generate_considering_stage", "prompt": "CONSIDERING_STAGE_PROMPT", "output": "considering"}
        ]
    },
    {
        "stage": "closed",
        "description": "The Closed phase is for ideas that have been archived, either because they were not selected for development or have completed their lifecycle. This phase allows for post-mortem analysis, learnings, and the option to reactivate or clone the idea in the future.",
        "inputs": [
            {"label": "Idea ID", "field": "id", "prompt_var": "idea_id"},
            {"label": "Closure Reason", "field": "iteration_notes", "prompt_var": "closure_reason"}
        ],
        "outputs": [
            {"label": "Archived Idea", "field": "status", "prompt_var": "archived_status"},
            {"label": "Optional Post-Mortem Summary", "field": "iteration_notes", "prompt_var": "post_mortem"}
        ],
        "prompt": "(none by default; optional post-mortem)",
        "api_route": "/ideas/{id}/close",
        "db_tables": ["ideas"],
        "ui_trigger": "IdeaDetail, ClosedPanel",
        "actions": [
            "View archived idea",
            "View post-mortem summary",
            "Reactivate idea",
            "Clone idea"
        ],
        "orchestration": [
            {"function": "(none by default; optional post-mortem)", "prompt": "(none)", "output": "post_mortem"}
        ]
    }
]

# --- Live reload for development: auto-reload lifecycle_map on file changes ---
import os
import threading
import time
Observer = None
FileSystemEvent = None
try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler, FileSystemEvent
    watchdog_available = True
except ImportError:
    watchdog_available = False

_lifecycle_map_cache = lifecycle_map

# Function to reload the lifecycle_map
def reload_lifecycle_map():
    global _lifecycle_map_cache
    from importlib import reload
    import sys
    if 'app.lifecycle_map' in sys.modules:
        reload(sys.modules['app.lifecycle_map'])
    # Re-import lifecycle_map
    from app.lifecycle_map import lifecycle_map as new_map
    _lifecycle_map_cache = new_map

# Watchdog handler
class LifecycleMapChangeHandler(FileSystemEventHandler):
    # pyright: ignore[reportImplicitOverride]
    def on_modified(self, event):
        if FileSystemEvent is not None and not isinstance(event, FileSystemEvent):
            return
        path = str(event.src_path)
        if (
            path.endswith("lifecycle_map.py")
            or path.endswith(".md")
            or path.endswith(".prompt")
        ):
            print('[LifecycleMap] Detected change, reloading lifecycle_map...')
            _ = reload_lifecycle_map()

# Start the watcher in a background thread (dev only)
def start_lifecycle_map_watcher():
    if not watchdog_available or Observer is None:
        print('[LifecycleMap] Watchdog not installed, live reload disabled.')
        return
    observer = Observer()
    handler = LifecycleMapChangeHandler()
    watch_dir = os.path.dirname(os.path.abspath(__file__))
    _ = observer.schedule(handler, watch_dir, recursive=True)
    observer.start()
    print(f'[LifecycleMap] Watching {watch_dir} for changes...')
    # Keep thread alive
    def keep_alive():
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            observer.stop()
        observer.join()
    threading.Thread(target=keep_alive, daemon=True).start()

if os.environ.get('LIFECYCLE_DEV_WATCH', '0') == '1':
    start_lifecycle_map_watcher()

def get_lifecycle_map():
    return _lifecycle_map_cache

# For FastAPI route
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/lifecycle-map", tags=["lifecycle"])
def lifecycle_map_route():
    return JSONResponse(content={"lifecycle": lifecycle_map}) 