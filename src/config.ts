import * as fs from 'fs';
import * as yaml from 'js-yaml';
import type { BumpType } from './labels';

export interface LabelConfig {
  major: string;
  minor: string;
  patch: string;
  none: string;
  alpha?: string;
  beta?: string;
  rc?: string;
}

export interface BotConfig {
  versionFile?: string;
  changelogFile?: string;
  defaultBump?: BumpType;
  tagPrefix?: string;
  createGithubRelease?: boolean;
  failOnMultipleLabels?: boolean;
  dryRun?: boolean;
  targetBranch?: string;
  commitMessageTemplate?: string;
  syncPackageJson?: boolean;
  useConventionalCommits?: boolean;
  slackWebhookUrl?: string;
  discordWebhookUrl?: string;
  notificationTemplate?: string;
  labels?: Partial<LabelConfig>;
  packages?: string[];
  usePrTemplateLabels?: boolean;
  generateBadge?: boolean;
  badgeColor?: string;
  badgeFile?: string;
  updateReadme?: boolean;
  readmeFile?: string;
  readmeStartMarker?: string;
  readmeEndMarker?: string;
  useReleasePr?: boolean;
  tagOnReleasePr?: boolean;
  releasePrBase?: string;
  enforceChannelOrder?: boolean;
}

export interface ResolvedConfig {
  versionFile: string;
  changelogFile: string;
  defaultBump: BumpType;
  tagPrefix: string;
  createGithubRelease: boolean;
  failOnMultipleLabels: boolean;
  dryRun: boolean;
  targetBranch: string;
  commitMessageTemplate: string;
  syncPackageJson: boolean;
  useConventionalCommits: boolean;
  slackWebhookUrl: string;
  discordWebhookUrl: string;
  notificationTemplate: string;
  labels: LabelConfig;
  packages: string[];
  usePrTemplateLabels: boolean;
  generateBadge: boolean;
  badgeColor: string;
  badgeFile: string;
  updateReadme: boolean;
  readmeFile: string;
  readmeStartMarker: string;
  readmeEndMarker: string;
  useReleasePr: boolean;
  tagOnReleasePr: boolean;
  releasePrBase: string;
  enforceChannelOrder: boolean;
}

const DEFAULT_LABELS: LabelConfig = {
  major: 'release:major',
  minor: 'release:minor',
  patch: 'release:patch',
  none: 'release:none',
  alpha: 'release:alpha',
  beta: 'release:beta',
  rc: 'release:rc',
};

export function loadConfig(configPath = '.versionbot.yml'): BotConfig {
  if (!fs.existsSync(configPath)) return {};

  const raw = fs.readFileSync(configPath, 'utf8') as string;
  const parsed = yaml.load(raw);

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      `Invalid .versionbot.yml: expected a mapping, got ${Array.isArray(parsed) ? 'array' : typeof parsed}`
    );
  }

  return parsed as BotConfig;
}

const VALID_BUMP_TYPES: readonly BumpType[] = [
  'major',
  'minor',
  'patch',
  'none',
  'alpha',
  'beta',
  'rc',
];

function validateBumpType(value: string, source: string): BumpType {
  if ((VALID_BUMP_TYPES as readonly string[]).includes(value)) {
    return value as BumpType;
  }
  throw new Error(
    `Invalid ${source} value "${value}". Must be one of: ${VALID_BUMP_TYPES.join(', ')}`
  );
}

function validateTagPrefix(value: string): string {
  if (!/^[a-zA-Z0-9._-]*$/.test(value)) {
    throw new Error(
      `Invalid tag-prefix "${value}". Only alphanumeric characters, dots, underscores, and hyphens are allowed.`
    );
  }
  return value;
}

export function mergeConfig(fileConfig: BotConfig, inputs: Record<string, string>): ResolvedConfig {
  const inp = (key: string) => inputs[key] || '';

  const rawDefaultBump = inp('default-bump') || fileConfig.defaultBump || 'patch';

  return {
    versionFile: inp('version-file') || fileConfig.versionFile || 'VERSION.md',
    changelogFile: inp('changelog-file') || fileConfig.changelogFile || 'CHANGELOG.md',
    defaultBump: validateBumpType(String(rawDefaultBump), 'default-bump'),
    tagPrefix: validateTagPrefix(inp('tag-prefix') || fileConfig.tagPrefix || 'v'),
    createGithubRelease: inp('create-github-release')
      ? inp('create-github-release') !== 'false'
      : (fileConfig.createGithubRelease ?? true),
    failOnMultipleLabels: inp('fail-on-multiple-labels')
      ? inp('fail-on-multiple-labels') !== 'false'
      : (fileConfig.failOnMultipleLabels ?? true),
    dryRun: inp('dry-run') ? inp('dry-run') === 'true' : (fileConfig.dryRun ?? false),
    targetBranch: inp('target-branch') || fileConfig.targetBranch || 'main',
    commitMessageTemplate: (() => {
      const commitMessageTemplate =
        inp('commit-message-template') ||
        fileConfig.commitMessageTemplate ||
        'chore(release): {tag}';
      if (commitMessageTemplate.length > 1000) {
        throw new Error(
          `commit-message-template must be 1000 characters or fewer (got ${commitMessageTemplate.length})`
        );
      }
      return commitMessageTemplate;
    })(),
    syncPackageJson: inp('sync-package-json')
      ? inp('sync-package-json') === 'true'
      : (fileConfig.syncPackageJson ?? false),
    useConventionalCommits: inp('use-conventional-commits')
      ? inp('use-conventional-commits') === 'true'
      : (fileConfig.useConventionalCommits ?? false),
    slackWebhookUrl: inp('slack-webhook-url') || fileConfig.slackWebhookUrl || '',
    discordWebhookUrl: inp('discord-webhook-url') || fileConfig.discordWebhookUrl || '',
    notificationTemplate:
      inp('notification-template') ||
      fileConfig.notificationTemplate ||
      '🚀 Released {tag}: {prTitle} (#{prNumber})',
    labels: {
      ...DEFAULT_LABELS,
      ...fileConfig.labels,
    },
    packages: inp('packages')
      ? inp('packages')
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      : (fileConfig.packages ?? []),
    usePrTemplateLabels: inp('use-pr-template-labels')
      ? inp('use-pr-template-labels') === 'true'
      : (fileConfig.usePrTemplateLabels ?? false),
    generateBadge: inp('generate-badge')
      ? inp('generate-badge') === 'true'
      : (fileConfig.generateBadge ?? false),
    badgeColor: inp('badge-color') || fileConfig.badgeColor || 'orange',
    badgeFile: inp('badge-file') || fileConfig.badgeFile || '.badges/version.json',
    updateReadme: inp('update-readme')
      ? inp('update-readme') === 'true'
      : (fileConfig.updateReadme ?? false),
    readmeFile: inp('readme-file') || fileConfig.readmeFile || 'README.md',
    readmeStartMarker:
      inp('readme-start-marker') || fileConfig.readmeStartMarker || '<!-- VERSIONBOT:START -->',
    readmeEndMarker:
      inp('readme-end-marker') || fileConfig.readmeEndMarker || '<!-- VERSIONBOT:END -->',
    useReleasePr: inp('use-release-pr')
      ? inp('use-release-pr') === 'true'
      : (fileConfig.useReleasePr ?? false),
    tagOnReleasePr: inp('tag-on-release-pr')
      ? inp('tag-on-release-pr') !== 'false'
      : (fileConfig.tagOnReleasePr ?? true),
    releasePrBase: inp('release-pr-base') || fileConfig.releasePrBase || '',
    enforceChannelOrder: inp('enforce-channel-order')
      ? inp('enforce-channel-order') === 'true'
      : (fileConfig.enforceChannelOrder ?? false),
  };
}
