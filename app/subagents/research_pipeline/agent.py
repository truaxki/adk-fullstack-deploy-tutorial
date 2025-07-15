from google.adk.agents import LoopAgent, SequentialAgent

from app.config import config
from app.shared.utilities import EscalationChecker
from app.subagents.enhanced_search_executor.agent import enhanced_search_executor
from app.subagents.report_composer.agent import report_composer
from app.subagents.research_evaluator.agent import research_evaluator
from app.subagents.section_planner.agent import section_planner
from app.subagents.section_researcher.agent import section_researcher

research_pipeline = SequentialAgent(
    name="research_pipeline",
    description="Executes a pre-approved research plan. It performs iterative research, evaluation, and composes a final, cited report.",
    sub_agents=[
        section_planner,
        section_researcher,
        LoopAgent(
            name="iterative_refinement_loop",
            max_iterations=config.max_search_iterations,
            sub_agents=[
                research_evaluator,
                EscalationChecker(name="escalation_checker"),
                enhanced_search_executor,
            ],
        ),
        report_composer,
    ],
)
