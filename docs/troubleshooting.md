# Troubleshooting

## No release label on PR

**Symptom:** Version bumped by `patch` unexpectedly.

**Cause:** No `release:*` label was applied before merging. The action falls back to `default-bump` (default: `patch`).

**Fix:** Apply a label before merging. Or set `default-bump: none` to skip releases when no label is present.

---

## Multiple release labels error

**Symptom:** Action fails — `Multiple release labels found: release:major, release:minor`.

**Cause:** PR has more than one `release:*` label and `fail-on-multiple-labels` is `'true'` (default).

**Fix:** Remove the extra label before merging. Or set `fail-on-multiple-labels: 'false'` to use the first matching label.

---

## VERSION.md parse error

**Symptom:** Action fails — `Invalid semver in VERSION.md`.

**Cause:** `VERSION.md` contains something other than a valid semver string. Common causes: `v1.0.0` with a `v` prefix, trailing spaces, blank file, or a markdown heading.

**Fix:** Ensure `VERSION.md` contains exactly a bare semver on a single line:

```
1.0.0
```

---

## dist/ out of sync

**Symptom:** CI fails on `git diff --exit-code dist/`.

**Cause:** `src/` was changed but `npm run build` was not run before committing.

**Fix:** Run `npm run build` and commit the updated `dist/index.js` alongside your source changes.

---

## Action not triggered on merge

**Symptom:** Release workflow does not run after merging a PR.

**Cause:** The workflow trigger requires `types: [closed]` and the job condition `if: github.event.pull_request.merged == true`. If either is missing, the workflow runs but exits early or does not run at all.

**Fix:** Verify your workflow matches the [Quick Start](quick-start.md) example exactly.

---

## Config file not being read

**Symptom:** Action ignores `.versionbot.yml` settings.

**Cause:** The file is not in the repo root, or the action runs in a different working directory.

**Fix:** Ensure `.versionbot.yml` is in the root of the repository (same level as `action.yml`).

---

## Invalid .versionbot.yml

**Symptom:** Action fails with `Invalid .versionbot.yml`.

**Cause:** The file contains invalid YAML syntax, or the root value is not a mapping (e.g. a list or plain string).

**Fix:** Validate your config file with a YAML linter. The root must be a YAML mapping (key-value pairs), not a list or scalar. See `.versionbot.yml.example` for a valid reference.

---

## package.json version not updating

**Symptom:** Release completes but `package.json` version is unchanged.

**Cause 1:** `sync-package-json` input is not set to `'true'` (default is `'false'`).

**Fix:** Add `sync-package-json: 'true'` to your workflow or `syncPackageJson: true` to `.versionbot.yml`.

---

**Cause 2:** `package.json` is not in the repo root.

**Fix:** The action looks for `package.json` in the repository root only. If your `package.json` is in a subdirectory, use the `packages` input for monorepo support — see [configuration.md](configuration.md#packages) for details.

---

## Conventional commits not detected

**Symptom:** Bump type falls back to `default-bump` even though PR commits use `feat:` or `fix:` prefixes.

**Cause 1:** `use-conventional-commits` is not set to `'true'` (default is `'false'`).

**Fix:** Add `use-conventional-commits: 'true'` to your workflow or `useConventionalCommits: true` to `.versionbot.yml`.

---

**Cause 2:** A release label is present on the PR.

**Fix:** Labels always take precedence over commit scanning. Remove the label or use `release:none` to skip.

---

**Cause 3:** The workflow is missing `pull-requests: read` permission.

**Fix:** Add `pull-requests: read` to your workflow permissions block.

---

## Slack or Discord notification not sending

**Symptom:** Release completes but no Slack/Discord message appears.

**Cause 1:** `slack-webhook-url` or `discord-webhook-url` is not configured.

**Fix:** Add the URL as a GitHub secret and pass it to the action:

```yaml
- uses: kaji-labs/pr-version-bot@v0.9.1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    slack-webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

**Cause 2:** The webhook URL uses HTTP instead of HTTPS.

**Fix:** Ensure the webhook URL starts with `https://`. The action rejects HTTP URLs with an error.

---

**Cause 3:** The webhook request returned a non-2xx response (check the workflow logs for the warning).

**Fix:** Verify the webhook URL is still valid and the Slack app or Discord webhook has not been deleted or revoked.

---

## Monorepo: Package VERSION file not found

**Symptom:** Action fails with `Package VERSION file not found: packages/api/VERSION.md`.

**Cause:** The configured package path does not contain a `VERSION.md` file.

**Fix:** Ensure each package in your `packages` list has a `VERSION.md` at its root (e.g. `packages/api/VERSION.md`). Create one with the initial version if it doesn't exist.

---

## Monorepo: Path traversal error

**Symptom:** Action fails with `Package path contains path traversal`.

**Cause:** One of the configured package paths contains `..` or starts with `/`.

**Fix:** Use only relative paths from the repo root, e.g. `packages/api` not `../api` or `/workspace/api`.

---

## Branch protection blocks push

**Symptom:** Action fails with a message like:

```
Push to "main" was rejected. If branch protection is enabled, direct pushes may be blocked.
Enable `use-release-pr: true` to open a release PR instead.
```

**Cause:** Your repository has branch protection rules that block direct pushes to the target branch, including pushes from `github-actions[bot]`.

**Option A — Exempt `github-actions[bot]` from push restrictions**

In your repository, go to **Settings → Branches → Branch protection rules** and edit the rule for your target branch. Under "Restrict who can push to matching branches", add `github-actions[bot]` to the allow list. This lets the action push directly without changing your protection rules for humans.

**Option B — Enable release PR mode**

Add `use-release-pr: 'true'` to your workflow and grant `pull-requests: write` permission:

```yaml
permissions:
  contents: write
  pull-requests: write

steps:
  - uses: kaji-labs/pr-version-bot@v0.9.1
    with:
      github-token: ${{ secrets.GITHUB_TOKEN }}
      use-release-pr: 'true'
```

In this mode, the action commits the release files to a `release/{tag}` branch and opens a PR against your target branch. The `release:none` label is automatically applied to the release PR to prevent recursive release triggering.

**Also required:** GitHub must allow Actions to open PRs. Go to **Settings → Actions → General → Allow GitHub Actions to create and approve pull requests** and enable the checkbox. Without this the action will emit a warning and exit cleanly — the tag and GitHub Release are still created, but you will need to open the release PR manually.

See [`examples/with-branch-protection.yml`](../examples/with-branch-protection.yml) for a complete workflow example.

---

## Checkbox not detected

If `use-pr-template-labels` is enabled but the action falls through to `default-bump` instead of using your checkbox, check these common causes:

1. **Checkbox not checked** — the box must be `- [x]` (with a lowercase or uppercase X). An unchecked `- [ ]` is ignored.
2. **Label text not found** — the checkbox text must contain the configured label value (e.g. `release:minor`) as a substring. Verify the label name matches what is configured in `config.labels` or the default `release:*` names.
3. **PR body is empty** — some Git clients submit PRs without a body. Ensure the PR description includes the checkbox section before merging.
