#!/usr/bin/env python3
"""
Cleanup script to remove old memory artifacts and prepare for fresh start.

Run this to clean up:
- Old memory-related files
- Previous deployment artifacts  
- Cached files
"""

import os
import shutil
from pathlib import Path


def cleanup_memory_artifacts():
    """Remove all memory-related artifacts from previous implementations."""
    
    project_root = Path(__file__).parent
    
    # Files to remove
    files_to_remove = [
        "logs/memory_audit.jsonl",
        "app/memory_service.py",
        "app/memory_tools.py",
        "app/audit/memory_audit.py",
        "ai_docs/prep_templates/memory-tool-dev/*",
    ]
    
    # Directories to clean
    dirs_to_remove = [
        "app/memory",
        "app/audit/__pycache__",
        "app/security/__pycache__",
    ]
    
    print("🧹 Starting cleanup for fresh memory system design...\n")
    
    # Remove specific files
    for file_path in files_to_remove:
        full_path = project_root / file_path
        if full_path.exists():
            if full_path.is_file():
                full_path.unlink()
                print(f"  ✅ Removed file: {file_path}")
            elif full_path.is_dir():
                # Handle glob patterns
                for f in full_path.parent.glob(full_path.name):
                    f.unlink()
                    print(f"  ✅ Removed: {f.relative_to(project_root)}")
    
    # Remove directories
    for dir_path in dirs_to_remove:
        full_path = project_root / dir_path
        if full_path.exists() and full_path.is_dir():
            shutil.rmtree(full_path)
            print(f"  ✅ Removed directory: {dir_path}")
    
    # Clean up empty directories
    empty_dirs = [
        "app/audit",
        "app/security",
    ]
    
    for dir_path in empty_dirs:
        full_path = project_root / dir_path
        if full_path.exists() and full_path.is_dir():
            # Check if directory is empty
            if not any(full_path.iterdir()):
                full_path.rmdir()
                print(f"  ✅ Removed empty directory: {dir_path}")
    
    print("\n✨ Cleanup complete! Ready for fresh memory system implementation.\n")


def create_fresh_structure():
    """Create fresh directory structure for new memory system."""
    
    project_root = Path(__file__).parent
    
    # New structure to create
    new_dirs = [
        "app/core",           # Core agent functionality
        "app/memory",         # Fresh memory system (to be designed)
        "app/services",       # Service layer
        "app/models",         # Data models
        "docs/architecture",  # Architecture documentation
        "docs/memory_design", # Memory system design docs
    ]
    
    print("📁 Creating fresh project structure...\n")
    
    for dir_path in new_dirs:
        full_path = project_root / dir_path
        full_path.mkdir(parents=True, exist_ok=True)
        
        # Add __init__.py for Python packages
        if dir_path.startswith("app/"):
            init_file = full_path / "__init__.py"
            if not init_file.exists():
                init_file.write_text('"""Package initialization."""\n')
        
        print(f"  ✅ Created: {dir_path}")
    
    print("\n🎯 Fresh structure created!\n")


def main():
    """Run cleanup and setup fresh structure."""
    print("\n" + "="*60)
    print("   AGENTLOCKER.IO - FRESH START PREPARATION")
    print("="*60 + "\n")
    
    # Step 1: Clean up old artifacts
    cleanup_memory_artifacts()
    
    # Step 2: Create fresh structure
    create_fresh_structure()
    
    print("="*60)
    print("   READY FOR NEW MEMORY SYSTEM DESIGN!")
    print("="*60 + "\n")
    
    print("Next steps:")
    print("1. Review the clean agent_engine_app.py")
    print("2. Design your memory system architecture")
    print("3. Implement in the fresh app/memory/ directory")
    print("4. Document in docs/memory_design/")
    print("\n")


if __name__ == "__main__":
    main()
