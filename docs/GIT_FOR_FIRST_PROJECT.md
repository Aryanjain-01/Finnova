# Git For First Project (Simple Guide)

You are not late. Every developer learns Git this way.

## 1) Core idea

Git is your project history + safety net.

You do work on a branch, commit snapshots, then push to remote.

## 2) Daily workflow

1. Check branch
```bash
git branch --show-current
```

2. Pull latest main
```bash
git switch main
git pull
```

3. Create feature branch
```bash
git switch -c feat/short-feature-name
```

4. Work and check changes
```bash
git status
git diff
```

5. Stage files
```bash
git add <file1> <file2>
```

6. Commit
```bash
git commit -m "feat: add inline category creation in transaction modal"
```

7. Push branch
```bash
git push -u origin feat/short-feature-name
```

8. Open PR to `main`.

## 3) Commands you will use most

- `git status` -> what changed
- `git diff` -> exact line changes
- `git log --oneline --graph --decorate -n 15` -> recent history
- `git restore --staged <file>` -> unstage file
- `git switch <branch>` -> move branches
- `git stash` -> temporary shelve changes

## 4) Commit message tips

Good format:
- `feat: ...`
- `fix: ...`
- `docs: ...`
- `refactor: ...`

Good commit examples:
- `fix: validate transfer destination account`
- `docs: add beginner guide for codebase architecture`

## 5) What to avoid (important)

- Do not commit `.env`
- Do not work directly on `main`
- Do not make huge mixed commits
- Do not run destructive git commands unless you understand them

## 6) How to recover from common mistakes

### Staged wrong file
```bash
git restore --staged <file>
```

### Edited wrong file and want to discard local edits
```bash
git restore <file>
```

### Want to keep current edits but switch context quickly
```bash
git stash
git switch main
```
Later:
```bash
git switch your-branch
git stash pop
```

## 7) Beginner-friendly branch strategy

- one feature = one branch
- one bugfix = one branch
- one doc improvement = one branch

Names:
- `feat/add-recurring-ui`
- `fix/dashboard-savings-goal-table`
- `docs/beginner-handbook`

## 8) Before opening PR checklist

- App runs (`npm run dev`)
- Lint passes (or known existing lint issues documented)
- Feature tested manually
- Commit messages are clear
- PR description includes what changed and why
