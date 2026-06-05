# Configuration

All inputs and outputs for PR Version Bot.

## Config file

Create `.versionbot.yml` in your repo root to configure the action without changing your workflow file.

```yaml
# .versionbot.yml
versionFile: VERSION.md
changelogFile: CHANGELOG.md
defaultBump: patch
tagPrefix: v
createGithubRelease: true
failOnMultipleLabels: true
dryRun: false
targetBranch: main
commitMessageTemplate: 'chore(release): {tag}'
labels:
  major: release:major
  minor: release:minor
  patch: release:patch
  none: release:none
```

**Precedence:** workflow inputs → config file → built-in defaults.

The config file is optional. The action works identically without it.

**Accepted fields:**

| Field                    | Type                              | Default                                        | Description                                                         |
| ------------------------ | --------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| `versionFile`            | string                            | `VERSION.md`                                   | Path to semver file                                                 |
| `changelogFile`          | string                            | `CHANGELOG.md`                                 | Path to changelog                                                   |
| `defaultBump`            | `major`\|`minor`\|`patch`\|`none` | `patch`                                        | Bump type when no label present                                     |
| `tagPrefix`              | string                            | `v`                                            | Git tag prefix                                                      |
| `createGithubRelease`    | boolean                           | `true`                                         | Create a GitHub Release                                             |
| `failOnMultipleLabels`   | boolean                           | `true`                                         | Fail on multiple release labels                                     |
| `dryRun`                 | boolean                           | `false`                                        | Run without writing changes                                         |
| `targetBranch`           | string                            | `main`                                         | Branch to push release commit to                                    |
| `commitMessageTemplate`  | string                            | `chore(release): {tag}`                        | Release commit message                                              |
| `syncPackageJson`        | boolean                           | `false`                                        | Sync `version` in `package.json`                                    |
| `useConventionalCommits` | boolean                           | `false`                                        | Scan commits for conventional prefixes                              |
| `usePrTemplateLabels`    | boolean                           | `false`                                        | Scan PR body for checked checkboxes matching configured label names |
| `slackWebhookUrl`        | string                            | `''`                                           | Slack webhook URL (HTTPS only)                                      |
| `discordWebhookUrl`      | string                            | `''`                                           | Discord webhook URL (HTTPS only)                                    |
| `notificationTemplate`   | string                            | `'🚀 Released {tag}: {prTitle} (#{prNumber})'` | Notification message template                                       |
| `packages`               | string[]                          | `[]`                                           | Package paths for monorepo (YAML array)                             |
| `labels.major`           | string                            | `release:major`                                | Label name for major bump                                           |
| `labels.minor`           | string                            | `release:minor`                                | Label name for minor bump                                           |
| `labels.patch`           | string                            | `release:patch`                                | Label name for patch bump                                           |
| `labels.none`            | string                            | `release:none`                                 | Label name to skip release                                          |
| `labels.alpha`           | string                            | `release:alpha`                                | Label for alpha pre-release                                         |
| `labels.beta`            | string                            | `release:beta`                                 | Label for beta pre-release                                          |
| `labels.rc`              | string                            | `release:rc`                                   | Label for release candidate                                         |
| `generateBadge`          | boolean                           | `false`                                        | Generate Shields.io badge JSON on release                           |
| `badgeColor`             | string                            | `orange`                                       | Color for the version badge                                         |
| `badgeFile`              | string                            | `.badges/version.json`                         | Path where badge JSON is written                                    |
| `updateReadme`           | boolean                           | `false`                                        | Update README block between markers on release                      |
| `readmeFile`             | string                            | `README.md`                                    | Path to README file to update                                       |
| `readmeStartMarker`      | string                            | `<!-- VERSIONBOT:START -->`                    | Start marker for README block                                       |
| `readmeEndMarker`        | string                            | `<!-- VERSIONBOT:END -->`                      | End marker for README block                                         |
| `useReleasePr`           | boolean                           | `false`                                        | Open a release PR instead of pushing directly to target branch      |
| `tagOnReleasePr`         | boolean                           | `true`                                         | Create git tag and GitHub Release immediately on the release branch |
| `releasePrBase`          | string                            | `''` (uses `targetBranch`)                     | Base branch for the release PR when different from `targetBranch`   |
| `enforceChannelOrder`    | boolean                           | `false`                                        | Throw if a pre-release bump moves to a lower-precedence channel     |

---

## Inputs

### `github-token`

- **Type:** string
- **Required:** yes
- **Default:** `${{ github.token }}`

GitHub token used for API access (creating releases) and git push. The built-in `github.token` works for most cases. If you need to trigger downstream workflows, use a personal access token with `repo` scope.

---

### `version-file`

- **Type:** string
- **Required:** no
- **Default:** `VERSION.md`

Path to the file containing the current semver string. Must contain a bare semver (e.g. `1.2.3`) with no prefix and no extra content.

---

### `changelog-file`

- **Type:** string
- **Required:** no
- **Default:** `CHANGELOG.md`

Path to the changelog file. New entries are prepended above existing content.

---

### `default-bump`

- **Type:** `major` | `minor` | `patch` | `none`
- **Required:** no
- **Default:** `patch`

Bump type applied when the PR has no release label. Set to `none` to skip releases for unlabelled PRs.

---

### `tag-prefix`

- **Type:** string
- **Required:** no
- **Default:** `v`

Prefix prepended to the version number when creating git tags and releases. With the default, version `1.2.3` produces tag `v1.2.3`.

---

### `create-github-release`

- **Type:** `'true'` | `'false'`
- **Required:** no
- **Default:** `'true'`

Whether to create a GitHub Release after tagging. Set to `'false'` to create only the git tag.

---

### `fail-on-multiple-labels`

- **Type:** `'true'` | `'false'`
- **Required:** no
- **Default:** `'true'`

Whether to fail the action when a PR has more than one `release:*` label. When `'false'`, the first matching label wins.

---

### `dry-run`

- **Type:** `'true'` | `'false'`
- **Required:** no
- **Default:** `'false'`

When `'true'`, the action logs what it would do but writes nothing — no file changes, no commit, no tag, no release.

---

### `target-branch`

- **Type:** string
- **Required:** no
- **Default:** `main`

Branch the release commit is pushed to.

---

### `commit-message-template`

- **Type:** string
- **Required:** no
- **Default:** `chore(release): {tag}`

Template for the release commit message. Use `{tag}` as a placeholder for the tag name (e.g. `v1.2.3`).

---

### `sync-package-json`

- **Type:** `'true'` | `'false'`
- **Required:** no
- **Default:** `'false'`

When `'true'`, the action reads `package.json` from the repo root and updates its `version` field to match the new semver. The updated `package.json` is committed alongside `VERSION.md` and `CHANGELOG.md`.

If `package.json` does not exist, a warning is logged and the step is skipped without failing the action.

---

### `use-conventional-commits`

- **Type:** `'true'` | `'false'`
- **Required:** no
- **Default:** `'false'`

When `'true'`, scans PR commit messages for conventional commit prefixes when no
release label is present. Bump type is inferred from commit messages using these rules:

| Commit prefix                         | Bump    |
| ------------------------------------- | ------- |
| `feat:` or `feat(scope):`             | `minor` |
| `fix:` or `fix(scope):`               | `patch` |
| `feat!:`, `fix!:`, or `feat(scope)!:` | `major` |
| `BREAKING CHANGE:` in commit body     | `major` |

When multiple commits are found, the highest bump type wins.
If no matching commits are found, falls back to `default-bump`.

Requires `pull-requests: read` permission on the workflow token.

---

### `use-pr-template-labels`

- **Type:** `'true'` | `'false'`
- **Required:** no
- **Default:** `'false'`

When `'true'`, scans the merged PR body for checked Markdown checkboxes (`- [x]` or `* [x]`). Any checkbox whose text contains a configured label name (substring match) determines the bump type.

If no checkbox is found, falls back to conventional commits (if enabled) or `default-bump`.

See [docs/labels.md](labels.md) for checkbox examples.

---

### PR template checkbox detection

When `use-pr-template-labels: 'true'`, the action scans the merged PR body for checked Markdown checkboxes (`- [x]` or `* [x]`). Any checkbox whose text contains a configured label name (substring match) determines the bump type.

**Precedence:** actual PR label > PR body checkbox > conventional commits > `default-bump`

See [docs/labels.md](labels.md) for checkbox examples.

---

### `slack-webhook-url`

- **Type:** string
- **Required:** no
- **Default:** `''` (disabled)

Slack incoming webhook URL. When provided, a message is posted to Slack after a successful release. Must use HTTPS. If the webhook request fails, a warning is logged and the release continues.

Accepts a **comma-separated list** of URLs to notify multiple Slack channels at once (e.g. `https://hooks.slack.com/a,https://hooks.slack.com/b`). Failures for individual URLs are logged as warnings without halting the release.

Store the URL in a GitHub secret and pass it via `${{ secrets.SLACK_WEBHOOK_URL }}`.

---

### `discord-webhook-url`

- **Type:** string
- **Required:** no
- **Default:** `''` (disabled)

Discord webhook URL. When provided, a release embed is posted to Discord after a successful release. Must use HTTPS. Failure is non-fatal.

Accepts a **comma-separated list** of URLs to notify multiple Discord channels at once. Failures for individual URLs are logged as warnings without halting the release.

Store the URL in a GitHub secret: `${{ secrets.DISCORD_WEBHOOK_URL }}`.

---

### `notification-template`

- **Type:** string
- **Required:** no
- **Default:** `'🚀 Released {tag}: {prTitle} (#{prNumber})'`

Message template used for both Slack and Discord notifications. Supports these placeholders:

| Placeholder  | Value                                   |
| ------------ | --------------------------------------- |
| `{tag}`      | Git tag e.g. `v1.2.3`                   |
| `{bump}`     | Bump type: `major`, `minor`, or `patch` |
| `{prTitle}`  | PR title                                |
| `{prNumber}` | PR number                               |

---

### `packages`

- **Type:** string (comma-separated paths)
- **Required:** no
- **Default:** `''` (single-package mode)

Comma-separated list of package paths for monorepo support. When set, the action bumps the version and updates the changelog for each package in a single release commit.

Each path must contain its own `VERSION.md`. The changelog is updated at `{package}/CHANGELOG.md`.

```yaml
- uses: kaji-labs/pr-version-bot@v0.9.1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    packages: 'packages/api,packages/web,packages/sdk'
```

**Restrictions:** Paths must be relative to the repo root. Path traversal (`..`) is not allowed.

---

## Monorepo mode

When `packages` is set, the action operates in monorepo mode and bumps all listed packages together in a single release commit.

### Per-package changelog files

Each package gets its own changelog file at `{packageDir}/CHANGELOG.md`. The changelog filename is derived from the root `changelog-file` setting — only the filename portion is used, not the directory.

**Example:** if `changelog-file` is set to `docs/HISTORY.md`, each package's changelog will be written to `{packageDir}/HISTORY.md` (not `{packageDir}/docs/HISTORY.md`).

| `changelog-file` value   | Per-package changelog path  |
| ------------------------ | --------------------------- |
| `CHANGELOG.md` (default) | `packages/api/CHANGELOG.md` |
| `docs/HISTORY.md`        | `packages/api/HISTORY.md`   |
| `CHANGES.md`             | `packages/api/CHANGES.md`   |

This means all packages share the same changelog filename, controlled by the root `changelog-file` setting.

---

### `generate-badge`

- **Type:** `'true'` | `'false'`
- **Required:** no
- **Default:** `'false'`

When `'true'`, generates a Shields.io endpoint badge JSON file after each release. The file is written to the path specified in `badge-file` (default: `.badges/version.json`). The badge displays the current version with the color specified in `badge-color`.

Use the badge in your README with a Shields.io endpoint URL:

```markdown
![Version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/YOUR_ORG/YOUR_REPO/main/.badges/version.json)
```

---

### `badge-color`

- **Type:** string
- **Required:** no
- **Default:** `orange`

Color used for the version badge. Accepts any Shields.io color string (e.g. `blue`, `green`, `red`, `orange`, `yellow`, `brightgreen`).

---

### `badge-file`

- **Type:** string
- **Required:** no
- **Default:** `.badges/version.json`

Path where the badge JSON file is written. The directory is created if it does not exist.

---

### `update-readme`

- **Type:** `'true'` | `'false'`
- **Required:** no
- **Default:** `'false'`

When `'true'`, updates the README file between VERSIONBOT markers on each release. The markers must be added manually to your README (see "Setting up README auto-sync" below). The action replaces the content between the markers with an auto-generated block showing the current version, a pinned install snippet, and the major version alias.

---

### `readme-file`

- **Type:** string
- **Required:** no
- **Default:** `README.md`

Path to the README file to update. Only used when `update-readme` is `'true'`.

---

### `readme-start-marker`

- **Type:** string
- **Required:** no
- **Default:** `<!-- VERSIONBOT:START -->`

Start marker for the README block. Only used when `update-readme` is `'true'`. The marker text must match exactly in your README file.

---

### `readme-end-marker`

- **Type:** string
- **Required:** no
- **Default:** `<!-- VERSIONBOT:END -->`

End marker for the README block. Only used when `update-readme` is `'true'`. The marker text must match exactly in your README file.

---

### `use-release-pr`

- **Type:** `'true'` | `'false'`
- **Required:** no
- **Default:** `'false'`

When `'true'`, commits release files to a `release/{tag}` branch and opens a PR against the target branch instead of pushing directly. Useful when branch protection rules block direct pushes by the `github-actions[bot]` user.

Requires `pull-requests: write` permission on the workflow token.

Also requires the repository to allow GitHub Actions to open pull requests: **Settings → Actions → General → Allow GitHub Actions to create and approve pull requests**. If this setting is off the action will emit a warning and exit cleanly — the tag and GitHub Release are still created successfully.

See [docs/troubleshooting.md](troubleshooting.md#branch-protection-blocks-push) for setup instructions.

---

### `tag-on-release-pr`

- **Type:** `'true'` | `'false'`
- **Required:** no
- **Default:** `'true'`

When `'true'` (default) and `use-release-pr` is enabled, creates the git tag and GitHub Release immediately on the release branch rather than waiting for the PR to merge.

Set to `'false'` to defer tagging until the release PR is merged.

---

### `release-pr-base`

- **Type:** string
- **Required:** no
- **Default:** `''` (uses `target-branch`)

Base branch for the release PR when `use-release-pr` is `'true'`. Defaults to `target-branch` when not set. Use this if you want the release PR to target a different branch than the one commits are normally pushed to (e.g. `develop` vs `main`).

---

### `enforce-channel-order`

- **Type:** `'true'` | `'false'`
- **Required:** no
- **Default:** `'false'`

When `'true'`, throws an error if a pre-release bump attempts to move to a lower-precedence channel than the current one. Channel precedence order is: `alpha` < `beta` < `rc` < stable.

For example, if the current version is `1.0.0-beta.2`, attempting a bump labelled `alpha` will fail with an error. This prevents accidental channel regressions during a release train.

---

## Setting up README auto-sync

Add the following markers to your README where you want the version block to appear:

```markdown
<!-- VERSIONBOT:START -->
<!-- VERSIONBOT:END -->
```

On every release, PR Version Bot will replace the content between these markers with an auto-generated block showing the current version, a pinned install snippet, and the major version alias.

---

## Outputs

### `version`

New semantic version string, e.g. `1.2.3`.

### `tag`

Created git tag, e.g. `v1.2.3`.

### `bump`

Bump type applied: `major`, `minor`, `patch`, or `none`.

### `skipped`

`'true'` if the release was skipped (`release:none` label or `default-bump: none`). `'false'` otherwise.

### `release-pr-url`

URL of the pull request opened by the action when `use-release-pr` is `'true'`. Empty string when release PR mode is disabled.

### `release-url`

URL of the GitHub Release page (e.g. `https://github.com/owner/repo/releases/tag/v1.2.3`). Only set when `create-github-release` is `'true'`. Empty string otherwise.

## Using outputs in downstream steps

```yaml
- id: version
  uses: kaji-labs/pr-version-bot@v0.9.1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Deploy
  if: steps.version.outputs.skipped != 'true'
  run: echo "Deploying ${{ steps.version.outputs.tag }}"
```
