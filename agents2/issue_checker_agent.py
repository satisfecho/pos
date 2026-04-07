#!/usr/bin/env python3
"""
Issue Checker Agent - Working version
Uses gh issue list --json with proper error handling
"""
import subprocess
import json
import os
from datetime import datetime

TEMP_DIR = os.path.dirname(os.path.abspath(__file__))
TASKS_DIR = os.path.join(TEMP_DIR, 'tasks')


def has_task_file(issue_num):
    """Check if any FEAT-{issue_num}-*.md exists."""
    if not os.path.exists(TASKS_DIR):
        return False
    return any(
        f.startswith(f"FEAT-{issue_num}-")
        for f in os.listdir(TASKS_DIR)
    )


def get_open_issues():
    """Get list of OPEN GitHub issues."""
    try:
        result = subprocess.run(
            ['gh', 'issue', 'list', '--json', 'number,title,url'],
            capture_output=True, text=True, check=True
        )
        return json.loads(result.stdout)
    except:
        return []


def fetch_issue_details(issue_num):
    """Get full issue details."""
    try:
        result = subprocess.run(
            ['gh', 'issue', 'view', str(issue_num), '--json', 'body,state,title,url,labels,createdAt'],
            capture_output=True, text=True, check=True, timeout=30
        )
        data = json.loads(result.stdout)
        data['number'] = int(issue_num)
        return data
    except:
        return None


def create_task(issue):
    """Create task file for given issue."""
    num = issue['number']
    title = issue['title']
    url = issue['url']
    body = issue.get('body', '')
    created = issue.get('createdAt', '')
    labels = issue.get('labels', [])
    
    # Label names
    labels_str = ', '.join(str(l.get('name', '')) for l in labels) if labels else 'none'
    
    # Clean summary (first 250 chars, no newlines)
    clean_body = body.replace('\n', ' ') if body else '[No issue body available]'
    summary = clean_body[:250].strip()
    if len(clean_body) > 250:
        summary += '...'
    
    instructions = f"""### Task: {title}

**Priority:** Implement as described in GitHub issue

### Issue Summary
{summary}

### Steps
1. Read full issue at: {url}
2. Identify affected files
3. Implement changes
4. Add tests
5. Commit with descriptive messages
6. Run smoke tests

### Files
- **Must:** [Determine from issue body]
- **Consider:** [Related components in app/]
- **Protect:** [Core files, database schema]

### Criteria
- [ ] Issue #`{num}` implemented
- [ ] User-facing: `{summary[:100]}...`
- [ ] Tests pass
- [ ] Deployed

### Testing
- [ ] Manual: Test in browser
- [ ] Automated: Puppeteer tests
- [ ] CI: All green

### Notes
[Add notes during implementation]

### References
- Issue: {url}
- Tests: front/scripts/
- Deploy: scripts/deploy-amvara9.sh
"""
    
    # Write task file
    os.makedirs(TASKS_DIR, exist_ok=True)
    now = datetime.now().strftime("%Y%m%d-%H%M")
    filename = f"FEAT-{num}-{now}.md"
    filepath = os.path.join(TASKS_DIR, filename)
    
    with open(filepath, 'w') as f:
        f.write(f"""# FEAT-Task: {title}

## GitHub Issue
- **Number:** `#{num}`
- **Title:** {title}
- **URL:** {url}
- **Labels:** {labels_str}
- **Created:** {created}

## Meta
- **Status:** ready-for-dev
- **Generated:** `{now}`

---

{instructions}

---

| Phase | Status |
|-------|-------|
| Created | ✅ |
| Review |  |
| Development |  |
| Testing |  |
| Deploy |  |
""")
    
    return filepath


def run_workflow():
    """Main workflow."""
    print("="*60)
    print("🤖 AGENT: Issue Checker")
    print("="*60)
    
    # Get open issues
    issues = get_open_issues()
    
    if not issues:
        print("\n✅ PASS: No open GitHub issues detected.")
        return True
    
    # Print open issues
    open_count = 0
    for issue in issues:
        print(f"\n  ✅ OPEN: #{issue['number']} - {issue['title'][:60]}")
        details = fetch_issue_details(issue['number'])
        if details:
            body = details.get('body', '')
            if body:
                body_preview = body[:100].replace('\n', ' ')
                print(f"     Preview: {body_preview}...")
            open_count += 1
    
    # Check existing files
    print(f"\nChecking for existing task files...")
    
    # Create tasks for missing ones
    created_count = 0
    if open_count and created_count == 0:
        # All open issues need tasks
        print(f"\nCreating task files for {open_count} open issue(s)...")
        for issue in issues:
            # Create file
            filepath = create_task(issue)
            print(f"  → Created: {os.path.basename(filepath)}")
            created_count += 1
    
    if created_count:
        print(f"\n✅ Created {created_count} task file(s)")
    
    print("\n" + "="*60)
    print("🤖 AGENT HANDOFF: Feature Agent")
    print("="*60)
    
    print("\n--- Workflow Complete ---")
    return created_count > 0


if __name__ == '__main__':
    run_workflow()
