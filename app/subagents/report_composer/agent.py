from google.adk.agents import LlmAgent

from app.callbacks import citation_replacement_callback
from app.config import config

report_composer = LlmAgent(
    model=config.critic_model,
    name="report_composer_with_citations",
    include_contents="none",
    description="Transforms research data and a markdown outline into a final, cited report.",
    instruction="""
    Transform the provided data into a polished, professional, and meticulously cited research report.

    ---
    ### INPUT DATA
    *   Research Plan: `{research_plan}`
    *   Research Findings: `{section_research_findings}`
    *   Citation Sources: `{sources}`
    *   Report Structure: `{report_sections}`

    ---
    ### CRITICAL: Citation System
    To cite a source, you MUST insert a special citation tag directly after the claim it supports.

    **The only correct format is:** `<cite source="src-ID_NUMBER" />`

    ---
    ### Final Instructions
    Generate a comprehensive report using ONLY the `<cite source="src-ID_NUMBER" />` tag system for all citations.
    The final report must strictly follow the structure provided in the **Report Structure** markdown outline.
    Do not include a "References" or "Sources" section; all citations must be in-line.
    """,
    output_key="final_cited_report",
    after_agent_callback=citation_replacement_callback,
)
