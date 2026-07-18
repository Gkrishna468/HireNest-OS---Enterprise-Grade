# Code Review Checklist

Before modifying any file, the proposal and PR must verify:

1. **File Selection Justification**: Why was this file chosen?
2. **Dependent Files Mapping**: What other files are affected?
3. **API Contract Verification**: Are any public APIs or service contracts changing?
4. **Minimal Modification**: Have the modifications been kept to an absolute minimum?
5. **Dependency Map (>10 files)**: If the PR changes more than 10 files, a dependency map MUST be reviewed and approved by the CTO before merging.
6. **Scope Discipline**: 
   - No silent refactors of unrelated code. 
   - Unrelated technical debt is documented separately, not fixed implicitly.
