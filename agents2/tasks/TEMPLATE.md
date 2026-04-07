# FEAT-task file

## GitHub Issue
- **Number:** [ISSUE_NUMBER]
- **Title:** [ISSUE_TITLE]
- **URL:** [GITHUB_ISSUE_URL]
- **Labels:** [GITHUB_LABELS]

## Meta
- **Status:** `ready-for-dev` (was auto-generated)
- **Generated:** [TIMESTAMP]
- **Last Updated:** [TIMESTAMP]
- **Assigned Agent:** `coding-agent`

---

## 1. Issue Summary
[Brief one-sentence description of what this feature/fix addresses]

## 2. Acceptance Criteria
- [ ] [Criterion 1: clear, testable]
- [ ] [Criterion 2: clear, testable]
- [ ] [Criterion 3: clear, testable]
- [ ] User-facing: [what the user will see/use]
- [ ] Technical: [backend/frontend/data requirements]

## 3. Implementation Scope
**IN SCOPE:**
- [Specific features/components/files to change]

**OUT OF SCOPE:**
- [Specific features to NOT touch]

## 4. Technical Constraints & Notes
- **Frontend:** Angular 20+, SSR disabled in dev
- **Backend:** FastAPI, Python 3.12, SQLModel
- **Database:** PostgreSQL 18
- **Key URLs:** Front: `http://localhost:4200 | 4202`, Backend: `http://localhost:8020`
- **Test Scripts:** See front/scripts/ for relevant Puppeteer tests
- **Smoke Test:** After changes, run: `<test-script>`
- **Known Issues:** [Link to GH issues affecting this work]

## 5. Implementation Steps
### Phase 1: Planning
1. Read the GH issue details: [URL]
2. Identify affected components (files, components, API endpoints)
3. Plan changes with minimal scope (PRinciple of Least Astonishment)

### Phase 2: Coding
- Start with smallest working change
- Add tests where applicable
- Commit frequently

### Phase 3: Verification
```bash
# Backend smoke test
cd back && uvicorn app.main:app --reload

# Frontend smoke test
cd front && npm run lint && npm test

# Puppeteer test (if applicable)
npm run test:<test-name>

# Smoke test
curl -s http://localhost:4200 | head -5
```

## 6. Files to Modify
**Must modify:**
- [List of files]

**Consider modifying:**
- [List of files]

**Do NOT modify:**
- [List of protected files]

## 7. Testing Checklist
- [ ] Manual: Browse affected screens
- [ ] Automated: Update/Write Puppeteer test
- [ ] Backend: Update/Write unit tests
- [ ] Smoke test passes (landing page + affected flow)

## 8. Notes & Context
[Add technical implementation notes as you develop]
[Add any findings about related code, edge cases, or performance concerns]
[Add any questions or blocks needing resolution]

## 9. References
- **Related GH Issues:** [link 1], [link 2]
- **Related PRs:** [PR link]
- **Design docs:** [link]
- **Test scripts:** front/scripts/

---

## Status Tracker
| Phase | Status | Notes |
|-------|--------|-------|
| Created | ✅ | Auto-generated |
| Reviewed |  |  |
| Implementation |  |  |
| Testing |  |  |
| Deploy |  |  |
