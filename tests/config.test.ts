import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';

vi.mock('fs');

import { loadConfig, mergeConfig } from '../src/config';

const DEFAULT_INPUTS: Record<string, string> = {
  'github-token': 'fake-token',
  'version-file': '',
  'changelog-file': '',
  'default-bump': '',
  'tag-prefix': '',
  'create-github-release': '',
  'fail-on-multiple-labels': '',
  'dry-run': '',
  'target-branch': '',
  'commit-message-template': '',
  'sync-package-json': '',
  'use-conventional-commits': '',
  'use-pr-template-labels': '',
  'slack-webhook-url': '',
  'discord-webhook-url': '',
  'notification-template': '',
  packages: '',
  'generate-badge': '',
  'badge-color': '',
  'badge-file': '',
  'update-readme': '',
  'readme-file': '',
  'readme-start-marker': '',
  'readme-end-marker': '',
  'use-release-pr': '',
  'tag-on-release-pr': '',
  'release-pr-base': '',
  'enforce-channel-order': '',
};

describe('loadConfig', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty object when config file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(loadConfig()).toEqual({});
  });

  it('parses a valid config file', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('versionFile: VERSION.md\ndefaultBump: minor\n');
    const config = loadConfig();
    expect(config.versionFile).toBe('VERSION.md');
    expect(config.defaultBump).toBe('minor');
  });

  it('throws on invalid YAML', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(': bad: yaml: [');
    expect(() => loadConfig()).toThrow();
  });

  it('throws when config root is not an object', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('- just a list\n');
    expect(() => loadConfig()).toThrow('Invalid .versionbot.yml');
  });
});

describe('mergeConfig', () => {
  it('uses file config when inputs are empty', () => {
    const result = mergeConfig({ versionFile: 'CUSTOM.md', defaultBump: 'minor' }, DEFAULT_INPUTS);
    expect(result.versionFile).toBe('CUSTOM.md');
    expect(result.defaultBump).toBe('minor');
  });

  it('workflow inputs override file config', () => {
    const result = mergeConfig(
      { versionFile: 'CUSTOM.md', defaultBump: 'minor' },
      { ...DEFAULT_INPUTS, 'version-file': 'OVERRIDE.md' }
    );
    expect(result.versionFile).toBe('OVERRIDE.md');
  });

  it('uses defaults when both file config and inputs are empty', () => {
    const result = mergeConfig({}, DEFAULT_INPUTS);
    expect(result.versionFile).toBe('VERSION.md');
    expect(result.changelogFile).toBe('CHANGELOG.md');
    expect(result.defaultBump).toBe('patch');
    expect(result.tagPrefix).toBe('v');
    expect(result.createGithubRelease).toBe(true);
    expect(result.failOnMultipleLabels).toBe(true);
    expect(result.dryRun).toBe(false);
    expect(result.commitMessageTemplate).toBe('chore(release): {tag}');
  });

  it('includes default labels when not configured', () => {
    const result = mergeConfig({}, DEFAULT_INPUTS);
    expect(result.labels.major).toBe('release:major');
    expect(result.labels.minor).toBe('release:minor');
    expect(result.labels.patch).toBe('release:patch');
    expect(result.labels.none).toBe('release:none');
  });

  it("resolves create-github-release: 'false' string to boolean false", () => {
    const result = mergeConfig({}, { ...DEFAULT_INPUTS, 'create-github-release': 'false' });
    expect(result.createGithubRelease).toBe(false);
  });

  it("resolves dry-run: 'true' string to boolean true", () => {
    const result = mergeConfig({}, { ...DEFAULT_INPUTS, 'dry-run': 'true' });
    expect(result.dryRun).toBe(true);
  });

  it("resolves fail-on-multiple-labels: 'false' string to boolean false", () => {
    const result = mergeConfig({}, { ...DEFAULT_INPUTS, 'fail-on-multiple-labels': 'false' });
    expect(result.failOnMultipleLabels).toBe(false);
  });

  it("resolves sync-package-json: 'true' string to boolean true", () => {
    const result = mergeConfig({}, { ...DEFAULT_INPUTS, 'sync-package-json': 'true' });
    expect(result.syncPackageJson).toBe(true);
  });

  it('defaults syncPackageJson to false', () => {
    const result = mergeConfig({}, DEFAULT_INPUTS);
    expect(result.syncPackageJson).toBe(false);
  });

  it('uses syncPackageJson from file config when input is empty', () => {
    const result = mergeConfig({ syncPackageJson: true }, DEFAULT_INPUTS);
    expect(result.syncPackageJson).toBe(true);
  });

  it("resolves use-conventional-commits: 'true' string to boolean true", () => {
    const result = mergeConfig({}, { ...DEFAULT_INPUTS, 'use-conventional-commits': 'true' });
    expect(result.useConventionalCommits).toBe(true);
  });

  it('defaults useConventionalCommits to false', () => {
    const result = mergeConfig({}, DEFAULT_INPUTS);
    expect(result.useConventionalCommits).toBe(false);
  });

  it('uses useConventionalCommits from file config when input is empty', () => {
    const result = mergeConfig({ useConventionalCommits: true }, DEFAULT_INPUTS);
    expect(result.useConventionalCommits).toBe(true);
  });

  it('uses notification template from file config when input is empty', () => {
    const result = mergeConfig({ notificationTemplate: 'Released {tag}!' }, DEFAULT_INPUTS);
    expect(result.notificationTemplate).toBe('Released {tag}!');
  });

  it('defaults notificationTemplate to emoji template', () => {
    const result = mergeConfig({}, DEFAULT_INPUTS);
    expect(result.notificationTemplate).toBe('🚀 Released {tag}: {prTitle} (#{prNumber})');
  });

  it('defaults slackWebhookUrl and discordWebhookUrl to empty string', () => {
    const result = mergeConfig({}, DEFAULT_INPUTS);
    expect(result.slackWebhookUrl).toBe('');
    expect(result.discordWebhookUrl).toBe('');
  });

  it('defaults packages to empty array', () => {
    const result = mergeConfig({}, DEFAULT_INPUTS);
    expect(result.packages).toEqual([]);
  });

  it('parses comma-separated packages input into array', () => {
    const result = mergeConfig({}, { ...DEFAULT_INPUTS, packages: 'packages/api,packages/web' });
    expect(result.packages).toEqual(['packages/api', 'packages/web']);
  });

  it('uses packages from file config when input is empty', () => {
    const result = mergeConfig({ packages: ['packages/core'] }, DEFAULT_INPUTS);
    expect(result.packages).toEqual(['packages/core']);
  });

  it('uses packages YAML array from file config when input is empty', () => {
    const result = mergeConfig({ packages: ['packages/api', 'packages/web'] }, DEFAULT_INPUTS);
    expect(result.packages).toEqual(['packages/api', 'packages/web']);
  });

  it('resolves usePrTemplateLabels default to false', () => {
    expect(mergeConfig({}, DEFAULT_INPUTS).usePrTemplateLabels).toBe(false);
  });

  it('resolves usePrTemplateLabels from input', () => {
    expect(
      mergeConfig({}, { ...DEFAULT_INPUTS, 'use-pr-template-labels': 'true' }).usePrTemplateLabels
    ).toBe(true);
  });

  it('resolves usePrTemplateLabels from fileConfig', () => {
    expect(mergeConfig({ usePrTemplateLabels: true }, DEFAULT_INPUTS).usePrTemplateLabels).toBe(
      true
    );
  });

  it('resolves generateBadge from input', () => {
    const r = mergeConfig({}, { ...DEFAULT_INPUTS, 'generate-badge': 'true' });
    expect(r.generateBadge).toBe(true);
  });

  it('resolves generateBadge default to false', () => {
    const r = mergeConfig({}, DEFAULT_INPUTS);
    expect(r.generateBadge).toBe(false);
  });

  it('resolves badgeColor from input', () => {
    const r = mergeConfig({}, { ...DEFAULT_INPUTS, 'badge-color': 'blue' });
    expect(r.badgeColor).toBe('blue');
  });

  it('resolves badgeColor default to orange', () => {
    const r = mergeConfig({}, DEFAULT_INPUTS);
    expect(r.badgeColor).toBe('orange');
  });

  it('resolves badgeFile default', () => {
    const r = mergeConfig({}, DEFAULT_INPUTS);
    expect(r.badgeFile).toBe('.badges/version.json');
  });

  it('resolves updateReadme default to false', () => {
    expect(mergeConfig({}, DEFAULT_INPUTS).updateReadme).toBe(false);
  });

  it('resolves readmeFile default', () => {
    expect(mergeConfig({}, DEFAULT_INPUTS).readmeFile).toBe('README.md');
  });

  it('resolves readmeStartMarker default', () => {
    expect(mergeConfig({}, DEFAULT_INPUTS).readmeStartMarker).toBe('<!-- VERSIONBOT:START -->');
  });

  it('resolves generateBadge from fileConfig', () => {
    expect(mergeConfig({ generateBadge: true }, DEFAULT_INPUTS).generateBadge).toBe(true);
  });

  it('resolves badgeColor from fileConfig', () => {
    expect(mergeConfig({ badgeColor: 'blue' }, DEFAULT_INPUTS).badgeColor).toBe('blue');
  });

  it('resolves badgeFile from fileConfig', () => {
    expect(mergeConfig({ badgeFile: 'custom/badge.json' }, DEFAULT_INPUTS).badgeFile).toBe(
      'custom/badge.json'
    );
  });

  it('input overrides fileConfig for generateBadge', () => {
    const result = mergeConfig(
      { generateBadge: false },
      { ...DEFAULT_INPUTS, 'generate-badge': 'true' }
    );
    expect(result.generateBadge).toBe(true);
  });

  it('resolves updateReadme from fileConfig', () => {
    expect(mergeConfig({ updateReadme: true }, DEFAULT_INPUTS).updateReadme).toBe(true);
  });

  it('resolves readmeFile from fileConfig', () => {
    expect(mergeConfig({ readmeFile: 'docs/README.md' }, DEFAULT_INPUTS).readmeFile).toBe(
      'docs/README.md'
    );
  });

  it('input overrides fileConfig for readmeFile', () => {
    const result = mergeConfig(
      { readmeFile: 'docs/README.md' },
      { ...DEFAULT_INPUTS, 'readme-file': 'OTHER.md' }
    );
    expect(result.readmeFile).toBe('OTHER.md');
  });

  it('resolves useReleasePr default to false', () => {
    expect(mergeConfig({}, DEFAULT_INPUTS).useReleasePr).toBe(false);
  });

  it('resolves tagOnReleasePr default to true', () => {
    expect(mergeConfig({}, DEFAULT_INPUTS).tagOnReleasePr).toBe(true);
  });

  it('resolves releasePrBase default to empty string', () => {
    expect(mergeConfig({}, DEFAULT_INPUTS).releasePrBase).toBe('');
  });

  it('resolves enforceChannelOrder default to false', () => {
    expect(mergeConfig({}, DEFAULT_INPUTS).enforceChannelOrder).toBe(false);
  });

  // S-003: tagPrefix validation
  it('accepts valid tagPrefix with alphanumeric, dots, underscores, hyphens', () => {
    const r = mergeConfig({}, { ...DEFAULT_INPUTS, 'tag-prefix': 'v1_beta-' });
    expect(r.tagPrefix).toBe('v1_beta-');
  });

  it('throws on tagPrefix containing invalid characters', () => {
    expect(() => mergeConfig({}, { ...DEFAULT_INPUTS, 'tag-prefix': 'v@bad!' })).toThrow(
      'Invalid tag-prefix'
    );
  });

  it('throws on tagPrefix containing slash', () => {
    expect(() => mergeConfig({}, { ...DEFAULT_INPUTS, 'tag-prefix': 'release/' })).toThrow(
      'Invalid tag-prefix'
    );
  });

  it('accepts empty tagPrefix (defaults to v)', () => {
    const r = mergeConfig({}, { ...DEFAULT_INPUTS, 'tag-prefix': '' });
    expect(r.tagPrefix).toBe('v');
  });

  // S-004: commitMessageTemplate length validation (cap: 1000 chars)
  it('accepts commitMessageTemplate of exactly 1000 characters', () => {
    const template = 'a'.repeat(1000);
    const r = mergeConfig({}, { ...DEFAULT_INPUTS, 'commit-message-template': template });
    expect(r.commitMessageTemplate).toBe(template);
  });

  it('throws when commitMessageTemplate exceeds 1000 characters', () => {
    const template = 'a'.repeat(1001);
    expect(() =>
      mergeConfig({}, { ...DEFAULT_INPUTS, 'commit-message-template': template })
    ).toThrow('commit-message-template must be 1000 characters or fewer');
  });

  it('includes actual length in commitMessageTemplate error', () => {
    const template = 'a'.repeat(1100);
    expect(() =>
      mergeConfig({}, { ...DEFAULT_INPUTS, 'commit-message-template': template })
    ).toThrow('1100');
  });

  // S-022: validateBumpType error path
  it('throws a clear error when default-bump is an invalid value', () => {
    expect(() => mergeConfig({}, { ...DEFAULT_INPUTS, 'default-bump': 'hotfix' })).toThrow(
      'Invalid default-bump value "hotfix"'
    );
  });

  it('throws listing all valid bump types when default-bump is invalid', () => {
    expect(() => mergeConfig({}, { ...DEFAULT_INPUTS, 'default-bump': 'PATCH' })).toThrow(
      'major, minor, patch'
    );
  });
});
