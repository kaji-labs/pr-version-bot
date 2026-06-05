import * as core from '@actions/core';
import * as github from '@actions/github';
import * as semver from 'semver';
import { detectBump } from './labels';
import {
  bumpPrerelease,
  readVersion,
  bumpVersion,
  writeVersion,
  assertChannelOrder,
} from './version';
import type { PrereleaseChannel } from './version';
import { prependEntry, buildEntry } from './changelog';
import { configureGit, commitRelease, createTag, pushWithProtectionCheck } from './git';
import {
  sanitiseReleaseBranch,
  createReleaseBranch,
  pushReleaseBranch,
  openReleasePr,
} from './release-pr';
import { createRelease } from './github-release';
import { loadConfig, mergeConfig } from './config';
import { updatePackageVersion } from './package-json';
import { detectBumpFromCommits } from './conventional';
import { detectBumpFromPrBody } from './pr-template';
import { sendSlackNotifications, sendDiscordNotifications } from './notify';
import { resolvePackagePaths } from './monorepo';
import { generateBadgeJson, writeBadgeFile } from './badge';
import { applyReadmeUpdate, extractMajorAlias } from './readme';

export async function run(): Promise<void> {
  try {
    const pr = github.context.payload.pull_request;
    if (!pr?.merged) {
      core.info('PR not merged — skipping');
      core.setOutput('skipped', 'true');
      return;
    }

    const token = core.getInput('github-token', { required: true });
    const octokit = github.getOctokit(token);

    const inputs: Record<string, string> = {
      'version-file': core.getInput('version-file'),
      'changelog-file': core.getInput('changelog-file'),
      'default-bump': core.getInput('default-bump'),
      'tag-prefix': core.getInput('tag-prefix'),
      'create-github-release': core.getInput('create-github-release'),
      'fail-on-multiple-labels': core.getInput('fail-on-multiple-labels'),
      'dry-run': core.getInput('dry-run'),
      'target-branch': core.getInput('target-branch'),
      'commit-message-template': core.getInput('commit-message-template'),
      'sync-package-json': core.getInput('sync-package-json'),
      'use-conventional-commits': core.getInput('use-conventional-commits'),
      'use-pr-template-labels': core.getInput('use-pr-template-labels'),
      'generate-badge': core.getInput('generate-badge'),
      'badge-color': core.getInput('badge-color'),
      'badge-file': core.getInput('badge-file'),
      'update-readme': core.getInput('update-readme'),
      'readme-file': core.getInput('readme-file'),
      'readme-start-marker': core.getInput('readme-start-marker'),
      'readme-end-marker': core.getInput('readme-end-marker'),
      'use-release-pr': core.getInput('use-release-pr'),
      'tag-on-release-pr': core.getInput('tag-on-release-pr'),
      'release-pr-base': core.getInput('release-pr-base'),
      'enforce-channel-order': core.getInput('enforce-channel-order'),
    };

    const fileConfig = loadConfig();
    const config = mergeConfig(fileConfig, inputs);

    const labels = (pr.labels as Array<{ name: string }>).map((l) => l.name);
    const releaseLabels = labels.filter((l) => Object.values(config.labels).includes(l));
    let bump = detectBump(labels, config.defaultBump, config.failOnMultipleLabels, config.labels);

    // PR body checkbox detection (lower priority than actual PR labels)
    if (releaseLabels.length === 0 && config.usePrTemplateLabels) {
      const prBodyBump = detectBumpFromPrBody(
        pr.body as string | null,
        config.labels,
        config.failOnMultipleLabels
      );
      if (prBodyBump !== null) {
        bump = prBodyBump;
        core.info(`PR body checkbox detected bump: ${bump}`);
      }
    }

    if (
      releaseLabels.length === 0 &&
      bump === config.defaultBump &&
      config.useConventionalCommits
    ) {
      const { owner, repo } = github.context.repo;
      const commits = await octokit.rest.pulls.listCommits({
        owner,
        repo,
        pull_number: pr.number as number,
        per_page: 100,
      });
      const messages = commits.data.map((c) => c.commit.message);
      const conventionalBump = detectBumpFromCommits(messages);
      if (conventionalBump !== null) {
        bump = conventionalBump;
        core.info(`Conventional commits detected bump: ${bump}`);
      }
    }

    if (bump === 'none') {
      core.info('release:none label — skipping release');
      core.setOutput('bump', 'none');
      core.setOutput('skipped', 'true');
      return;
    }

    // Resolve package paths (empty = single-package mode)
    const packageVersionFiles =
      config.packages.length > 0
        ? resolvePackagePaths(config.packages, config.versionFile)
        : [config.versionFile];

    const isPrereleaseChannel = (b: typeof bump): b is PrereleaseChannel =>
      b === 'alpha' || b === 'beta' || b === 'rc';

    // Use first package (or root) to determine the "canonical" next version for the tag
    const current = readVersion(packageVersionFiles[0]);

    if (config.enforceChannelOrder && isPrereleaseChannel(bump)) {
      assertChannelOrder(current, bump);
    }

    if (isPrereleaseChannel(bump)) {
      const sv = semver.parse(current);
      if (sv && sv.prerelease.length >= 2) {
        const currentChan = String(sv.prerelease[0]);
        if (currentChan !== bump) {
          core.warning(
            `Pre-release channel changed from "${currentChan}" to "${bump}". ` +
              `The patch number has been reset to reflect the new channel.`
          );
        }
      }
    }

    const next = isPrereleaseChannel(bump)
      ? bumpPrerelease(current, bump)
      : bumpVersion(current, bump as Exclude<typeof bump, PrereleaseChannel | 'none'>);
    const tag = `${config.tagPrefix}${next}`;
    const message = config.commitMessageTemplate.replace('{tag}', tag);

    core.info(`Current version: ${current}`);
    core.info(`Detected bump: ${bump}`);
    core.info(`Next version: ${next}`);
    core.info(`Creating tag: ${tag}`);

    if (config.dryRun) {
      const dryRunEntry = buildEntry({
        version: next,
        date: new Date().toISOString().split('T')[0],
        prTitle: pr.title as string,
        prNumber: pr.number as number,
        bump,
      });
      core.info(`Dry run — no changes written`);
      core.info(`Changelog entry that would be written:\n${dryRunEntry}`);
      core.setOutput('version', next);
      core.setOutput('tag', tag);
      core.setOutput('bump', bump);
      core.setOutput('skipped', 'false');
      return;
    }

    const date = new Date().toISOString().split('T')[0];
    const filesToCommit: string[] = [];

    if (config.packages.length > 0) {
      // Monorepo: bump each package independently
      for (const pkgVersionFile of packageVersionFiles) {
        const pkgCurrent = readVersion(pkgVersionFile);
        const pkgNext = isPrereleaseChannel(bump)
          ? bumpPrerelease(pkgCurrent, bump)
          : bumpVersion(pkgCurrent, bump as Exclude<typeof bump, PrereleaseChannel | 'none'>);
        writeVersion(pkgVersionFile, pkgNext);
        filesToCommit.push(pkgVersionFile);

        // Changelog at package/CHANGELOG.md
        const pkgDir = pkgVersionFile.replace(/\/[^/]+$/, '');
        const pkgChangelogFile = `${pkgDir}/${config.changelogFile.replace(/.*\//, '')}`;
        prependEntry(pkgChangelogFile, {
          version: pkgNext,
          date,
          prTitle: pr.title as string,
          prNumber: pr.number as number,
          bump,
          prUrl: pr.html_url as string,
        });
        filesToCommit.push(pkgChangelogFile);
      }

      if (config.generateBadge) {
        const badge = generateBadgeJson(tag, config.badgeColor);
        writeBadgeFile(config.badgeFile, badge);
        filesToCommit.push(config.badgeFile);
      }
    } else {
      // Single-package mode (original behaviour)
      writeVersion(config.versionFile, next);
      filesToCommit.push(config.versionFile);

      prependEntry(config.changelogFile, {
        version: next,
        date,
        prTitle: pr.title as string,
        prNumber: pr.number as number,
        bump,
        prUrl: pr.html_url as string,
      });
      filesToCommit.push(config.changelogFile);

      if (config.syncPackageJson) {
        updatePackageVersion('package.json', next);
        filesToCommit.push('package.json');
      }

      if (config.generateBadge) {
        const badge = generateBadgeJson(tag, config.badgeColor);
        writeBadgeFile(config.badgeFile, badge);
        filesToCommit.push(config.badgeFile);
      }
    }

    if (config.updateReadme) {
      const { owner, repo } = github.context.repo;
      const repoFullName = `${owner}/${repo}`;
      const majorAlias = extractMajorAlias(tag, config.tagPrefix);
      const updated = applyReadmeUpdate(
        config.readmeFile,
        config.readmeStartMarker,
        config.readmeEndMarker,
        repoFullName,
        tag,
        majorAlias,
        `${config.tagPrefix}${current}`
      );
      if (updated) {
        filesToCommit.push(config.readmeFile);
      } else {
        core.info('VERSIONBOT markers not found in README — skipping');
      }
    }

    core.info(`Files to commit: ${filesToCommit.join(', ')}`);
    await configureGit();

    if (config.useReleasePr) {
      const releaseBranch = sanitiseReleaseBranch(tag);
      await createReleaseBranch(releaseBranch);
      await commitRelease(filesToCommit, message);
      await pushReleaseBranch(releaseBranch);

      if (config.tagOnReleasePr) {
        await createTag(tag);
        if (config.createGithubRelease) {
          const releaseUrl = await createRelease(token, tag, next, {
            bump,
            prTitle: pr.title as string,
            prNumber: pr.number as number,
            prUrl: pr.html_url as string,
            authorLogin: (pr.user as { login: string }).login,
            previousTag: `${config.tagPrefix}${current}`,
          });
          core.setOutput('release-url', releaseUrl);
        }
      }

      const prTitle = message;
      const prBody = `This PR was automatically created by PR Version Bot.\n\n## Changes\n\n- Version bumped to \`${next}\`\n- \`${config.versionFile}\` updated\n- \`${config.changelogFile}\` updated`;
      const prBase = config.releasePrBase || config.targetBranch;
      const prUrl = await openReleasePr(token, releaseBranch, prBase, prTitle, prBody);

      if (prUrl) {
        core.info(`Release PR created: ${prUrl}`);
        core.setOutput('release-pr-url', prUrl);
      }
    } else {
      await commitRelease(filesToCommit, message);
      await createTag(tag);
      await pushWithProtectionCheck(config.targetBranch);

      if (config.createGithubRelease) {
        const releaseUrl = await createRelease(token, tag, next, {
          bump,
          prTitle: pr.title as string,
          prNumber: pr.number as number,
          prUrl: pr.html_url as string,
          authorLogin: (pr.user as { login: string }).login,
          previousTag: `${config.tagPrefix}${current}`,
        });
        core.setOutput('release-url', releaseUrl);
      }
    }

    const notifMessage = config.notificationTemplate
      .replace('{tag}', tag)
      .replace('{bump}', bump)
      .replace('{prTitle}', pr.title as string)
      .replace('{prNumber}', String(pr.number));

    if (config.slackWebhookUrl) {
      await sendSlackNotifications(config.slackWebhookUrl, notifMessage);
    }
    if (config.discordWebhookUrl) {
      await sendDiscordNotifications(config.discordWebhookUrl, notifMessage, tag);
    }

    await core.summary
      .addHeading(`Released ${tag}`, 2)
      .addTable([
        [
          { data: 'Field', header: true },
          { data: 'Value', header: true },
        ],
        ['Previous version', current],
        ['New version', next],
        ['Bump type', bump],
        ['Tag', tag],
        ['PR', `#${pr.number as number} — ${pr.title as string}`],
      ])
      .write();

    core.setOutput('version', next);
    core.setOutput('tag', tag);
    core.setOutput('bump', bump);
    core.setOutput('skipped', 'false');
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
