"""Callback functions for the research agent pipeline.

This module exposes callback functions that handle source collection
and citation replacement for the research pipeline.
"""

from .citation_replacement import citation_replacement_callback
from .collect_research_sources import collect_research_sources_callback

__all__ = [
    "citation_replacement_callback",
    "collect_research_sources_callback",
]
