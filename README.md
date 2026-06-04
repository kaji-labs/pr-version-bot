# PR Version Bot

[![CI](https://github.com/kaji-labs/pr-version-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/kaji-labs/pr-version-bot/actions/workflows/ci.yml)
[![CodeQL](https://github.com/kaji-labs/pr-version-bot/actions/workflows/codeql.yml/badge.svg)](https://github.com/kaji-labs/pr-version-bot/actions/workflows/codeql.yml)
[![Version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/kaji-labs/pr-version-bot/main/.badges/version.json)](https://github.com/kaji-labs/pr-version-bot/releases)
[![License: Source-Available](https://img.shields.io/badge/License-Source--Available-blue.svg)](LICENSE)

> Reusable GitHub Action for automatic semantic versioning from merged pull requests.

Automatically bumps your semver, updates `CHANGELOG.md`, creates a git tag, and publishes a GitHub Release — triggered by a label on your PR.

## How it works

1. Apply a `release:minor` label to your PR
2. Merge it
3. The action reads the label, bumps `VERSION.md`, prepends a `CHANGELOG.md` entry, commits both, creates a `v1.1.0` tag, and publishes a GitHub Release

## Quick start

See [docs/quick-start.md](docs/quick-start.md) — full setup in under 5 minutes.

## Required labels

Create these labels in your repository:

| Label           | Effect                 |
| --------------- | ---------------------- |
| `release:major` | `1.0.0` → `2.0.0`      |
| `release:minor` | `1.0.0` → `1.1.0`      |
| `release:patch` | `1.0.0` → `1.0.1`      |
| `release:none`  | Skips release entirely |

## Install

<!-- VERSIONBOT:START -->

> Current stable release: **v0.6.0**

**Pinned version (recommended):**

```yaml
- uses: kaji-labs/pr-version-bot@v0.6.0
```

**Major version alias:**

```yaml
- uses: kaji-labs/pr-version-bot@v0
```

<!-- VERSIONBOT:END -->

## Example workflow

```yaml
name: Release

on:
  pull_request:
    types: [closed]
    branches: [main]

permissions:
  contents: write
  pull-requests: read

jobs:
  release:
    runs-on: ubuntu-latest
    if: github.event.pull_request.merged == true
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - uses: kaji-labs/pr-version-bot@v0.6.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input                     | Default                 | Description                           |
| ------------------------- | ----------------------- | ------------------------------------- |
| `github-token`            | `${{ github.token }}`   | GitHub token for API access           |
| `version-file`            | `VERSION.md`            | Path to semver file                   |
| `changelog-file`          | `CHANGELOG.md`          | Path to changelog                     |
| `default-bump`            | `patch`                 | Bump type when no label present       |
| `tag-prefix`              | `v`                     | Git tag prefix                        |
| `create-github-release`   | `true`                  | Create a GitHub Release               |
| `fail-on-multiple-labels` | `true`                  | Fail if multiple release labels found |
| `dry-run`                 | `false`                 | Run without writing changes           |
| `target-branch`           | `main`                  | Branch to push release commit to      |
| `commit-message-template` | `chore(release): {tag}` | Release commit message                |

## Outputs

| Output    | Description                          |
| --------- | ------------------------------------ |
| `version` | New version e.g. `1.2.3`             |
| `tag`     | Created tag e.g. `v1.2.3`            |
| `bump`    | `major`, `minor`, `patch`, or `none` |
| `skipped` | `true` if release was skipped        |

## Documentation

- [Quick Start](docs/quick-start.md)
- [Configuration](docs/configuration.md)
- [Labels Reference](docs/labels.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Versioning Policy](docs/versioning-policy.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
