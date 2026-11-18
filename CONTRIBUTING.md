# Working together on Sobremesa

How Tomás and Daniela change the site without stepping on each other.

**First: do you need code at all?** Dinners, descriptions, speakers, photos, students and flyers are all managed in the admin at https://sobremesa-dinners.vercel.app/admin. Use the repo only to change the site itself: copy, design, forms, new features.

## One-time setup

1. Accept the GitHub invite to `tomas10k/sobremesa-dinners` (it arrives by email).
2. Install [Git](https://git-scm.com/downloads), [Node.js 24](https://nodejs.org) and the [GitHub CLI](https://cli.github.com), then run `gh auth login`.
3. Get the code:
   ```bash
   git clone https://github.com/tomas10k/sobremesa-dinners.git
   cd sobremesa-dinners
   npm install
   ```
4. Ask Tomás for the `.env.local` file. Pass it in person or through a password manager, not by email, WhatsApp or chat: it contains the database's secret key. Put it in the project folder. Git already ignores it.
5. Run `npm run dev` and open http://localhost:3000. Forms you send locally write to the real database, so delete test entries in the admin afterwards.

## The loop, every time

```bash
git switch main && git pull                 # 1. start from the latest version
git switch -c daniela/student-count         # 2. a new branch, named <you>/<what>
# 3. make the change, check it at http://localhost:3000
npm run lint && npm run typecheck && npm test && npm run build   # 4. the checks
git add -A && git commit -m "Change student count to 10–12"      # 5. save a step
git push -u origin daniela/student-count    # 6. upload the branch
gh pr create --fill                         # 7. open a pull request
```

8. The other person looks at the pull request, comments or approves.
9. **Tomás** merges it on GitHub with **"Create a merge commit"**, then deletes the branch. The live site updates about a minute later.

Using Claude Code? Say what you want, e.g. "on a new branch, change the student count to 10–12 and open a pull request". It follows the same steps (see `CLAUDE.md`).

## Rules of thumb

- **Never commit straight to `main`.** GitHub can't enforce this on our plan, so it's on us. `main` is what's live.
- **One change per branch**, kept small. Two small pull requests are easier to review than one big one.
- **Pull before you start** (`git switch main && git pull`), and again if your branch is a few days old: `git merge main` while on your branch.
- **Commit messages say what changed**, in plain words: "Add LAHBA logo to the footer", not "fixes".
- **Copy lives in `src/lib/i18n.ts`.** Change Spanish and English together.
- **Database changes** are new files in `supabase/migrations/`, applied with `supabase db push` *before* merging code that needs them. Tomás runs these.
- **Never commit `.env.local`** or paste keys anywhere.

## If something goes wrong

- **"Your branch is behind" or a push is rejected:** run `git pull`, then push again.
- **Merge conflict** (Git marks a file with `<<<<<<<` and `>>>>>>>`): both of you edited the same lines. Keep the version you want, delete the markers, then `git add -A && git commit`. If unsure, stop and ask the other person, or ask Claude Code to resolve it and explain what it kept.
- **Broke something locally:** `git restore .` throws away uncommitted changes. Committed but not pushed? Ask before doing anything with `reset`.
- **Broke the live site:** on GitHub, open the merged pull request and click **Revert**, then merge that. The previous version comes back in a minute.

## Why Tomás merges

The site is hosted on Vercel's free plan, which only deploys commits from the account owner on a private repo. When Daniela's pull request is merged by Tomás with "Create a merge commit", the commit Vercel deploys is Tomás's, so it goes live. A squash merge, or Daniela merging herself, can leave the deploy blocked. Upgrading Vercel to Pro or making the repo public would remove this limit.
