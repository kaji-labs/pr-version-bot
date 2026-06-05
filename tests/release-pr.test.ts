import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitiseReleaseBranch, openReleasePr } from '../src/release-pr';

vi.mock('@actions/core');
vi.mock('@actions/github', () => ({
  getOctokit: vi.fn(),
  context: { repo: { owner: 'kaji-labs', repo: 'pr-version-bot' } },
}));

describe('sanitiseReleaseBranch', () => {
  it('creates release/ prefixed branch name from tag', () => {
    expect(sanitiseReleaseBranch('v1.2.3')).toBe('release/v1.2.3');
  });

  it('replaces invalid characters with hyphens', () => {
    expect(sanitiseReleaseBranch('v1.2.3-rc.1')).toBe('release/v1.2.3-rc.1');
  });

  it('handles simple tags', () => {
    expect(sanitiseReleaseBranch('v2.0.0')).toBe('release/v2.0.0');
  });

  it('replaces special characters with hyphens', () => {
    const result = sanitiseReleaseBranch('v1.0.0+build.1');
    // S-009: slashes are now also disallowed in the tag portion
    expect(result).not.toMatch(/[^a-zA-Z0-9/.-]/);
  });

  // S-009: slash in tag → hyphen
  it('replaces slash in tag with hyphen', () => {
    expect(sanitiseReleaseBranch('releases/v1.0.0')).toBe('release/releases-v1.0.0');
  });

  it('keeps v1.2.3-rc.1 unchanged (no slashes in semver)', () => {
    expect(sanitiseReleaseBranch('v1.2.3-rc.1')).toBe('release/v1.2.3-rc.1');
  });
});

describe('openReleasePr', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty string and warns when Actions cannot create PRs', async () => {
    const core = await import('@actions/core');
    const github = await import('@actions/github');
    vi.mocked(github.getOctokit).mockReturnValue({
      rest: {
        pulls: {
          create: vi
            .fn()
            .mockRejectedValue(
              new Error('GitHub Actions is not permitted to create or approve pull requests.')
            ),
        },
        issues: { addLabels: vi.fn() },
      },
    } as never);

    const result = await openReleasePr(
      'token',
      'release/v1.0.0',
      'main',
      'chore(release): v1.0.0',
      ''
    );

    expect(result).toBe('');
    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('Settings → Actions → General')
    );
  });

  it('re-throws unexpected errors', async () => {
    const github = await import('@actions/github');
    vi.mocked(github.getOctokit).mockReturnValue({
      rest: {
        pulls: {
          create: vi.fn().mockRejectedValue(new Error('Network timeout')),
        },
        issues: { addLabels: vi.fn() },
      },
    } as never);

    await expect(
      openReleasePr('token', 'release/v1.0.0', 'main', 'chore(release): v1.0.0', '')
    ).rejects.toThrow('Network timeout');
  });
});
