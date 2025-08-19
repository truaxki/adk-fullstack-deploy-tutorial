# Documentation Convention Guide
*Established: August 19, 2025*

## 📁 Directory Structure

All project documentation should follow this organizational structure:

```
notes/
├── DOCUMENTATION-CONVENTION.md (this file)
├── YYYY-MM-DD/                 (date folders)
│   ├── status/                 (project status and progress)
│   ├── analysis/               (technical analysis and research)
│   ├── implementation/         (code changes and solutions)
│   ├── deployment/             (deployment issues and fixes)
│   └── schema/                 (database and architecture)
└── [special-topics]/           (persistent topic folders)
    ├── desktop-migration-plan/
    └── supabase-auth-integration/
```

## 📝 File Naming Convention

### Format
```
[NUMBER]-[TITLE].md
```

### Rules
1. **NUMBER**: Two-digit prefix (01, 02, 03...) for ordering within category
2. **TITLE**: Descriptive kebab-case (lowercase with hyphens)
3. **Extension**: Always `.md` for markdown files

### Examples
- `01-daily-summary.md`
- `02-build-status.md`
- `03-typescript-fixes.md`

## 📂 Category Definitions

### status/
Daily summaries, progress reports, and current state documentation
- Daily summaries
- Build status reports
- Feature completion tracking
- Work in progress updates

### analysis/
Technical deep-dives and architectural reviews
- Code analysis
- Performance reviews
- Architecture decisions
- Comparison studies

### implementation/
Actual code changes and implementation guides
- Feature implementations
- Bug fixes
- Code solutions
- Integration guides

### deployment/
Deployment-related documentation
- Build errors and fixes
- CI/CD configuration
- Environment setup
- Production issues

### schema/
Database and data structure documentation
- Database schemas
- API structures
- Data flow diagrams
- Migration scripts

## 📋 Document Templates

### Status Document Template
```markdown
# [Title]
*Date: YYYY-MM-DD*
*Status: [In Progress | Complete | Blocked]*

## Summary
Brief overview of current state

## Accomplishments
- ✅ Completed item 1
- ✅ Completed item 2

## Work in Progress
- 🔄 Current task 1
- 🔄 Current task 2

## Blockers
- ❌ Issue 1
- ❌ Issue 2

## Next Steps
1. Priority action 1
2. Priority action 2
```

### Implementation Document Template
```markdown
# [Feature/Fix Name]
*Date: YYYY-MM-DD*
*Type: [Feature | Fix | Refactor]*

## Problem
Description of the issue or requirement

## Solution
Technical approach taken

## Implementation
Code changes and file modifications

## Testing
How to verify the changes

## Result
Outcome and any remaining issues
```

## 🎯 Best Practices

1. **Date Folders**: Create a new date folder for each day with significant work
2. **Sequential Numbering**: Number files within categories for chronological ordering
3. **Descriptive Names**: Use clear, searchable names that describe content
4. **Category Placement**: Put documents in the most appropriate category
5. **Cross-References**: Link between related documents using relative paths
6. **Status Indicators**: Use emoji for visual status (✅ ❌ 🔄 🎯 📊 🚀)

## 🔄 Migration Process

When organizing existing documentation:
1. Create date folder for the original creation date
2. Create category subfolders
3. Move files to appropriate categories
4. Rename files with number prefixes
5. Update any internal links
6. Create an index file if needed

## 📊 Status Emoji Legend

- ✅ Complete
- 🔄 In Progress
- ❌ Blocked/Failed
- 🎯 Next Priority
- 📊 Analysis/Review
- 🚀 Ready for Deployment
- 🚧 Under Construction
- ⚠️ Warning/Caution
- 💡 Idea/Proposal
- 📝 Documentation

## 🔍 Searchability Tips

To make documentation easily searchable:
- Include key terms in file names
- Use consistent terminology
- Add tags in document headers
- Create index files for complex topics
- Use descriptive commit messages when updating

---

*This convention ensures our documentation remains organized, searchable, and scalable as the project grows.*
