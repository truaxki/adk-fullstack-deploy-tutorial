import logging
import re

from google.adk.agents.callback_context import CallbackContext
from google.genai import types as genai_types


def citation_replacement_callback(
    callback_context: CallbackContext,
) -> genai_types.Content:
    """Replaces citation tags in a report with Markdown-formatted links.

    Processes 'final_cited_report' from context state, converting tags like
    `<cite source="src-N"/>` into hyperlinks using source information from
    `callback_context.state["sources"]`. Also fixes spacing around punctuation.

    Args:
        callback_context (CallbackContext): Contains the report and source information.

    Returns:
        genai_types.Content: The processed report with Markdown citation links.
    """
    final_report = callback_context.state.get("final_cited_report", "")
    sources = callback_context.state.get("sources", {})

    def tag_replacer(match: re.Match) -> str:
        short_id = match.group(1)
        if not (source_info := sources.get(short_id)):
            logging.warning(f"Invalid citation tag found and removed: {match.group(0)}")
            return ""
        display_text = source_info.get("title", source_info.get("domain", short_id))
        return f" [{display_text}]({source_info['url']})"

    processed_report = re.sub(
        r'<cite\s+source\s*=\s*["\']?\s*(src-\d+)\s*["\']?\s*/>',
        tag_replacer,
        final_report,
    )
    processed_report = re.sub(r"\s+([.,;:])", r"\1", processed_report)
    callback_context.state["final_report_with_citations"] = processed_report
    return genai_types.Content(parts=[genai_types.Part(text=processed_report)])
