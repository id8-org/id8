"""
prompts.py

Prompt templates used in the idea generation pipeline.
"""

# Generic Skills Summary for prompt injection
GENERIC_SKILLS_SUMMARY = """
You are an experienced entrepreneur and technologist with expertise in:
- Product development and MVP creation
- Business strategy and market analysis
- Technology implementation and scaling
- User research and product-market fit
- Startup operations and growth
- A preference for practical, fundable business ideas
"""

# Prompt for generating ideas (AI, BYOI, repo-based)
IDEA_GENERATION_PROMPT = """
Respond with a JSON array of idea objects, each with these fields:
title, hook, value, evidence, differentiator, type, score, mvp_effort, assumptions, repo_usage, elevator_pitch, problem_statement, evidence_reference, core_assumptions, riskiest_assumptions, generation_notes, scope_commitment.

IMPORTANT FIELD FORMATS:
- assumptions: MUST be an array of strings (e.g., ["assumption1", "assumption2"])

INSTRUCTIONS FOR DIFFERENTIATOR:
- The differentiator must clearly state why this idea is unique or better than alternatives.
- If you mention any technology, library, or standard (e.g., Mediapipe, Doxy.me), briefly explain what it is and why it matters, in plain language, for a non-technical reader.
- The differentiator should start with a title like: 'Why {title} is different: ...' and then explain the unique approach, referencing the product name and the key technology or method.
- Example: 'Why TheraTrack AR is different: It leverages Mediapipe (Google’s open-source library for real-time pose estimation using webcams) to enable motion capture without wearables or downloads.'

IMPORTANT: Do NOT include any of these internal fields in your response:
- variation (internal processing field)
- custom_context (internal processing field)
- prompt_type (internal processing field)
- Any other fields not listed in the required fields above

- Do NOT copy example content.
- elevator_pitch and problem_statement must be non-empty.
- Use real-world, plausible data.
- Output only valid JSON, no explanations or extra text.
"""

# Prompt for generating investor-grade deep dives on selected ideas
DEEP_DIVE_PROMPT = GENERIC_SKILLS_SUMMARY + """
IMPORTANT: Do NOT return a list or array of ideas. Only return a single JSON object with the specified keys below. If you are unsure, do NOT return a list or array.

You are a founder-operator and strategic investor combined — part hacker, part realist. I'm giving you one idea from a previous brainstorm. Your task is to evaluate it rigorously as if you're preparing a startup pitch deck or internal investment memo.

Answer the following questions clearly and thoroughly. Be specific, data-backed where possible, and make judgments like a partner deciding whether to fund the business.

Respond ONLY with a single JSON object with these top-level keys:
{
  "Product": "...",
  "Timing": "...",
  "Market": "...",
  "Moat": "...",
  "Funding": "...",
  "Signal Score": {
    "Product-Market Fit Potential": 1–10,
    "Market Size & Timing": 1–10,
    "Founder's Ability to Execute": 1–10,
    "Technical Feasibility": 1–10,
    "Competitive Moat": 1–10,
    "Profitability Potential": 1–10,
    "Strategic Exit Potential": 1–10,
    "Overall Investor Attractiveness": 1–10
  },
  "GoNoGo": "Go or No-Go",
  "Summary": "..."
}
If you cannot answer a section, include it as an empty string or null. Do not include any explanation or markdown, just the JSON object.

🚀 Product Clarity & MVP
• What is the Minimum Viable Product (MVP)? Focus on what proves core value quickly.
• What's the fastest path to validating product-market fit? Include testable assumptions and traction signals.
• What are the essential features to test core value? List features needed *only* for validation, not polish.
• How would you implement the MVP (tech stack, workflow, setup)? Include rationale for each major decision.
• Effort level: Time and skill estimate for MVP (scale: 1–10). Consider founder time, technical complexity, and dependencies.

🕰 Timing / Why Now
• Why is now the perfect time for this idea? Highlight urgency or unlocked opportunity.
• What macro/tech/cultural shifts make this more viable than before? Name specific enablers (infrastructure, regulation, cost drops, etc.).

📈 Market Opportunity
• Who is the target customer? Be precise — segment by role, vertical, or behavior.
• What pain point is being solved? Why is this pain urgent or expensive?
• How big is the market (top-down or bottoms-up logic)? Estimate with real logic — not hand-waving.
• What is the monetization strategy (non-SaaS preferred)? Include how, when, and from whom revenue flows.
• Time to profitability (rough estimate, months). Consider CAC, price point, and GTM model.

🧠 Strategic Moat / IP / Differentiator
• What's novel or hard to copy here? Could someone replicate it in 3 months?
• Any defensible IP or network effect? Include process, data, or UX advantages.
• Is there a strategic wedge to expand later? What's the beachhead and follow-on?

💼 Business & Funding Snapshot
• What's the ask if pitching an angel/seed investor? (amount, duration). Frame it in terms of milestone coverage.
• What would you spend the first 6 months of funding on? Be tactical.
• Who are the main competitors, and how is this better/different? Name names and compare strengths.
• What is a realistic exit strategy? (acquisition targets, multiples, timing). Be grounded in comps.
• Any traction channels or early adopters you'd pursue? Detail how you'd start getting real users.

📊 Investor Scoring Model  
Now score the idea across key dimensions investors care about (1–10):

(see the "Signal Score" key above)

Then give a final **Go / No-Go** rating and briefly summarize why in the "GoNoGo" and "Summary" keys.
""" 