import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';

export function sanitiseReleaseBranch(tag: string): string {
  // Only keep alphanumeric, ., - characters (no slashes — those would create sub-paths)
  return `release/${tag.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
}

export async function createReleaseBranch(branchName: string): Promise<void> {
  await exec.exec('git', ['checkout', '-b', branchName]);
}

export async function pushReleaseBranch(branchName: string): Promise<void> {
  await exec.exec('git', ['push', 'origin', `HEAD:${branchName}`]);
}

export async function openReleasePr(
  token: string,
  branchName: string,
  targetBranch: string,
  title: string,
  body: string
): Promise<string> {
  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;

  let pr: Awaited<ReturnType<typeof octokit.rest.pulls.create>>;
  try {
    pr = await octokit.rest.pulls.create({
      owner,
      repo,
      title,
      body,
      head: branchName,
      base: targetBranch,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not permitted to create or approve pull requests')) {
      core.warning(
        'Could not open release PR: GitHub Actions is not allowed to create pull requests in this repository. ' +
          'Enable it under Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests". ' +
          'The release tag and GitHub Release were created successfully.'
      );
      return '';
    }
    throw err;
  }

  // Apply release:none label to prevent recursive release triggering
  await octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number: pr.data.number,
    labels: ['release:none'],
  });

  return pr.data.html_url;
}
