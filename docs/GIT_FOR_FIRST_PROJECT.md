# Git — For Your First Real Project

If you've never used Git on a real project before, this doc is for you. Take it slow. Git feels weird for about a week and then it clicks.

---

## Part 1 — The mental model

### What even is Git?

Git is a **time machine** for your code. Every time you save a "snapshot" (called a **commit**), Git remembers:

- what files changed
- what lines changed in each file
- who changed them
- when
- and a message you wrote about why

You can look at any past snapshot, jump back to it, compare snapshots, or make a parallel copy of the project to experiment in.

### Three places your code lives

Understanding these three places is 80% of Git:

```
┌─────────────────┐   git add    ┌─────────────────┐  git commit   ┌─────────────────┐
│                 │  ─────────►  │                 │  ──────────►  │                 │
│  WORKING DIR    │              │  STAGING AREA   │               │   COMMIT (.git) │
│  (your files)   │              │  (what's ready  │               │   (history)     │
│                 │              │   to commit)    │               │                 │
└─────────────────┘              └─────────────────┘               └─────────────────┘
```

1. **Working directory** — the actual files on your disk. What your editor shows you.
2. **Staging area** (also called the **index**) — a "packing list" of changes you want to include in your next commit. You add files here with `git add`.
3. **Repository** (the `.git/` folder) — the permanent history. You move the staged files into the history with `git commit`.

Plus one more place:

4. **Remote** (GitHub) — a copy of your repo on a server, so teammates can pull your commits and you can back up your work. You move commits there with `git push`.

### Why three places instead of two?

Because sometimes you change five files but only want to commit three of them (say, the feature, not the unrelated typo fix you also made). The staging area lets you pick.

Beginners often ignore staging and just do `git commit -a` (commit everything). That's fine until it isn't — you'll eventually regret bundling unrelated changes.

---

## Part 2 — The daily workflow

Here's what a normal day of coding looks like.

### Morning: start fresh

```bash
git switch main              # jump to the main branch
git pull                     # grab the latest changes from GitHub
```

### Create a branch for today's work

**One feature = one branch.** Never work directly on `main`.

```bash
git switch -c feat/add-export-csv
```

`-c` means "create". The convention for branch names:

- `feat/<short-name>` — a new feature
- `fix/<short-name>` — a bug fix
- `docs/<short-name>` — documentation only
- `refactor/<short-name>` — restructuring without behavior change

Use dashes, not spaces. Keep it short but specific.

### Work on your change

Edit files, run `npm run dev`, see it work. Normal coding.

### Check what you've changed

```bash
git status                   # which files changed / are untracked
git diff                     # exact line-by-line changes (for unstaged files)
git diff --staged            # line-by-line changes for already-staged files
```

`git status` is the most important command in Git. Run it constantly. It tells you where you are and what's going on.

### Stage specific files

```bash
git add app/(app)/transactions/page.tsx
git add components/transactions-panel.tsx
```

Or stage everything that's modified (use with care):

```bash
git add .                    # stage all changes in current dir and below
```

**Never `git add .` if you haven't checked `git status` first.** You might accidentally stage a stray debug file or a `.env` with real secrets.

### Commit with a real message

```bash
git commit -m "feat(transactions): add CSV export button"
```

See [commit messages](#part-4--writing-good-commit-messages) below for what makes a message "good".

### Keep working

Stage and commit in small chunks. One commit per logical change. If you've done three unrelated things, make three commits.

### Push to GitHub

First time pushing a new branch:

```bash
git push -u origin feat/add-export-csv
```

`-u` tells Git "remember this remote branch as the tracking one for this local branch." After the first push, you can just do:

```bash
git push
```

### Open a Pull Request

On GitHub, click "Compare & pull request". Write a description of what you changed and why. Request review if you're working with someone. Merge when ready.

### After the PR is merged

```bash
git switch main
git pull
git branch -d feat/add-export-csv    # delete the local branch (it's merged now)
```

Then start the next branch.

---

## Part 3 — Commands you'll use most

### The seven essentials

| Command | What it does |
|---|---|
| `git status` | What's changed and what's staged |
| `git diff` | Show the actual line changes |
| `git add <file>` | Stage a file for the next commit |
| `git commit -m "msg"` | Create a commit from staged changes |
| `git push` | Send commits to GitHub |
| `git pull` | Grab new commits from GitHub |
| `git switch <branch>` | Move to another branch |

### The next seven

| Command | What it does |
|---|---|
| `git switch -c <branch>` | Create a new branch and switch to it |
| `git log --oneline --graph --decorate -n 20` | Show the last 20 commits as a pretty tree |
| `git restore <file>` | Discard uncommitted changes to a file (**careful**) |
| `git restore --staged <file>` | Unstage a file (but keep your edits) |
| `git stash` | Temporarily shelve all uncommitted changes |
| `git stash pop` | Bring them back |
| `git merge <branch>` | Merge another branch into the current one |

### Commands to be careful with

These change history or delete work. Don't run them until you understand what they do.

| Command | Danger |
|---|---|
| `git reset --hard` | Throws away uncommitted changes **and** recent commits. Work is gone. |
| `git push --force` | Overwrites the remote branch with yours. Teammates lose work. |
| `git rebase -i` | Rewrites history. Powerful but confusing. |
| `git commit --amend` | Changes the most recent commit. Harmless if you haven't pushed yet. |
| `rm -rf .git` | Nukes the whole repo. Do not do this ever. |

---

## Part 4 — Writing good commit messages

A commit message has two parts: a **subject line** (≤ 72 chars) and an optional **body** (explain the "why").

### Subject format (conventional commits)

```
<type>(<scope>): <short summary in imperative mood>
```

Types:
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation only
- `refactor` — code restructuring, no behavior change
- `style` — formatting only
- `test` — adding/fixing tests
- `chore` — tooling, deps, build changes

### Good examples

```
feat(transactions): add inline category creation in add modal
fix(dashboard): clamp year/month to valid ranges
docs: expand beginner guide with worked examples
refactor(finance): extract monthBounds into shared helper
```

### Bad examples

```
stuff
asdf
wip
fixed it
final changes (for real this time)
```

### The "imperative mood" trick

Write commits as if completing the sentence *"If applied, this commit will..."*

- ✅ `If applied, this commit will **add CSV export button**` — good
- ❌ `If applied, this commit will **added CSV export button**` — past tense, bad
- ❌ `If applied, this commit will **adds CSV export button**` — present continuous, also bad

### When to write a body

If the "why" isn't obvious from the diff, explain it. Separate subject and body with a blank line:

```
fix(transactions): reject same-account transfers at API level

Zod already caught this, but the route handler was missing an
explicit check and returned a 500 from the DB constraint. Now it
returns a clean 400 with a helpful error.
```

---

## Part 5 — Common beginner mistakes and how to recover

### "I staged the wrong file"

```bash
git restore --staged <file>
```
Your edits stay; the file just isn't staged anymore.

### "I edited the wrong file and want my edits back"

If you haven't staged or committed yet:
```bash
git restore <file>
```
**This deletes your uncommitted changes.** Make sure that's what you want.

### "I made a commit with a typo in the message"

If you haven't pushed yet:
```bash
git commit --amend -m "new message"
```

If you **have** pushed, you'd have to force-push, which is usually a bad idea unless you're alone on the branch.

### "I made a commit on the wrong branch"

Undo the commit but keep the changes:
```bash
git reset --soft HEAD~1      # undo last commit, keep changes staged
git switch correct-branch
git commit -m "your message"
```

### "I need to switch context but my work isn't done"

```bash
git stash                    # shelve all uncommitted changes
git switch main              # handle the urgent thing
git switch my-branch         # come back
git stash pop                # bring changes back
```

### "I accidentally committed `.env`"

**Do this immediately:**
1. Remove the file from the latest commit:
   ```bash
   git rm --cached .env
   git commit -m "chore: remove .env from tracking"
   ```
2. Add `.env` to `.gitignore` (it probably already is).
3. **Rotate any secrets** that were in the file. Assume they're compromised, because they're now in the commit history even after you remove them.

### "I have merge conflicts"

When `git pull` or `git merge` can't figure out how to combine two sets of changes, it marks the conflicts in the file like this:

```
<<<<<<< HEAD
your version
=======
their version
>>>>>>> main
```

**Don't panic.** Open the file, pick which version you want (or combine them), delete the `<<<`, `===`, `>>>` lines, save, then:

```bash
git add <file>
git commit                   # finishes the merge
```

---

## Part 6 — Branch strategy for solo / small-team projects

Rules of thumb for someone still learning:

1. **`main` is always working.** If someone clones `main` right now, the app should run.
2. **All real work happens on branches.** Even a one-line typo fix gets its own branch.
3. **Branches are short-lived.** Aim to merge within a day or two. A branch that lives for a week has almost definitely drifted from `main` and will have painful conflicts.
4. **One feature = one branch.** Don't bundle "add export CSV" and "fix dashboard colors" into the same branch.
5. **If your branch is getting big, split it.** 10 commits on one topic is fine; 50 commits touching 30 files is a nightmare to review.
6. **Pull before you push.** Always `git pull` before `git push` — someone might have merged something while you were working.

---

## Part 7 — What the `.gitignore` does

`.gitignore` is a list of files Git should **never track**. In this project it already includes:

- `node_modules/` — huge, regenerable with `npm install`
- `.next/` — Next.js build output, regenerable with `npm run build`
- `.env` — your local secrets
- `*.log` — runtime logs

**Rule:** if a file is:
- Generated (build output, compiled files)
- Private (secrets, credentials, API keys)
- Personal (IDE settings specific to you)
- Huge and regenerable

...it should be in `.gitignore`.

**If you accidentally commit something that should have been ignored:** add it to `.gitignore` **and** run `git rm --cached <file>` to stop tracking it going forward. (See the "accidentally committed `.env`" recovery above.)

---

## Part 8 — Before you open a PR, checklist

- [ ] `npm run dev` starts without errors
- [ ] `npm run lint` passes (or known issues are documented)
- [ ] You manually tested the change in the browser
- [ ] `git status` shows nothing unexpected (no stray files)
- [ ] Your commits tell a story — each one is a logical chunk
- [ ] Your commit messages follow the format above
- [ ] Your branch is based on a recent `main` (`git pull` before pushing)
- [ ] You wrote a PR description that explains **what** changed and **why**

---

## Part 9 — What to do when Git scares you

1. **Stop.** Don't run another command in panic. Most Git "disasters" are fixable as long as you don't make them worse.
2. **Run `git status`.** It tells you exactly where you are.
3. **Run `git log --oneline -n 20`.** It tells you what recent commits exist.
4. **If in doubt, make a backup.** Copy the whole project folder somewhere else before trying to fix things. Your `.git` folder comes with it.
5. **`git reflog`** is a hidden superpower. It shows every HEAD change in the last 90 days, including commits you "lost" via `reset --hard` or a broken rebase. You can almost always recover.
6. **Ask for help.** A senior dev can unwind most git messes in 60 seconds. They've seen worse than whatever you did.

---

## Part 10 — The one-page reference

```bash
# see where you are
git status
git log --oneline --graph --decorate -n 15
git branch --show-current

# start a branch
git switch main && git pull
git switch -c feat/my-thing

# work loop
git status
git diff
git add <file>
git commit -m "feat(scope): summary"

# push and PR
git push -u origin feat/my-thing
# ...open PR on GitHub...

# after merge
git switch main && git pull
git branch -d feat/my-thing

# rescue
git restore --staged <file>      # unstage
git restore <file>                # discard uncommitted edits
git stash / git stash pop         # shelve changes
git reflog                        # "oh no" button
```

Print this. Stick it next to your monitor. In two weeks you won't need it.

---

## Final words

Git is a tool for **communicating with your future self** (and your teammates). Every commit message, every branch name, every PR description is you sending a note saying "here's what I changed, here's why, here's how it fits."

Write those notes with care. You're the one who'll read them at 2am six months from now trying to figure out what the hell you were thinking.
