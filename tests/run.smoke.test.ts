import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

vi.mock('@actions/core');
vi.mock('@actions/exec');
vi.mock('@actions/github');
vi.mock('../src/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/config')>();
  return {
    ...actual,
    loadConfig: vi.fn().mockReturnValue({}),
  };
});

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import { run } from '../src/index';

// ─── Temp directory setup ────────────────────────────────────────────────────
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'versionbot-smoke-'));

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── Fixtures ────────────────────────────────────────────────────────────────
const mockPr = {
  merged: true,
  number: 99,
  title: 'feat: add thing',
  body: null,
  html_url: 'https://github.com/owner/repo/pull/99',
  user: { login: 'testuser' },
  labels: [{ name: 'release:patch' }],
};

const versionFilePath = path.join(tmpDir, 'VERSION.md');
const changelogFilePath = path.join(tmpDir, 'CHANGELOG.md');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function configureCoreInputs(overrides: Record<string, string> = {}): void {
  const inputs: Record<string, string> = {
    'github-token': 'fake-token',
    'version-file': versionFilePath,
    'changelog-file': changelogFilePath,
    'default-bump': '',
    ...overrides,
  };
  vi.mocked(core.getInput).mockImplementation((name: string) => inputs[name] ?? '');
}

function configureGithubContext(pr: typeof mockPr | { merged: false } = mockPr): void {
  vi.mocked(github).context = {
    payload: { pull_request: pr },
    repo: { owner: 'owner', repo: 'repo' },
    eventName: 'pull_request',
    sha: 'abc123',
    ref: 'refs/heads/main',
    workflow: 'CI',
    action: 'run',
    actor: 'testuser',
    job: 'build',
    runNumber: 1,
    runId: 1,
    apiUrl: 'https://api.github.com',
    serverUrl: 'https://github.com',
    graphqlUrl: 'https://api.github.com/graphql',
  } as typeof github.context;
}

function configureMockOctokit(): ReturnType<typeof github.getOctokit> {
  const mockCreateRelease = vi.fn().mockResolvedValue({
    data: { html_url: 'https://github.com/owner/repo/releases/tag/v1.2.4' },
  });
  const octokit = {
    rest: {
      repos: { createRelease: mockCreateRelease },
      pulls: {
        listCommits: vi.fn().mockResolvedValue({ data: [] }),
      },
    },
  } as unknown as ReturnType<typeof github.getOctokit>;
  vi.mocked(github.getOctokit).mockReturnValue(octokit);
  return octokit;
}

function configureSummaryMock(): void {
  const summaryMock = {
    addHeading: vi.fn().mockReturnThis(),
    addTable: vi.fn().mockReturnThis(),
    write: vi.fn().mockResolvedValue(undefined),
  };
  Object.defineProperty(core, 'summary', {
    value: summaryMock,
    writable: true,
    configurable: true,
  });
}

function configureExecMock(): void {
  vi.mocked(exec.exec).mockImplementation(
    async (cmd: string, args?: string[], _opts?: object): Promise<number> => {
      // git diff --staged --quiet exits 1 = changes are staged
      if (
        cmd === 'git' &&
        args &&
        args[0] === 'diff' &&
        args.includes('--staged') &&
        args.includes('--quiet')
      ) {
        return 1;
      }
      return 0;
    }
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('run() smoke test — full happy path patch release', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset fixture files before each test
    fs.writeFileSync(versionFilePath, '1.2.3\n');
    fs.writeFileSync(changelogFilePath, '');

    configureCoreInputs();
    configureGithubContext();
    configureMockOctokit();
    configureSummaryMock();
    configureExecMock();
  });

  it('bumps VERSION.md from 1.2.3 to 1.2.4 on a patch release', async () => {
    await run();

    const version = fs.readFileSync(versionFilePath, 'utf8');
    expect(version).toBe('1.2.4\n');
  });

  it('prepends a CHANGELOG entry for the new version', async () => {
    await run();

    const changelog = fs.readFileSync(changelogFilePath, 'utf8');
    expect(changelog).toMatch(/^## \[1\.2\.4\]/);
  });

  it('sets version, tag, bump, skipped outputs', async () => {
    await run();

    expect(core.setOutput).toHaveBeenCalledWith('version', '1.2.4');
    expect(core.setOutput).toHaveBeenCalledWith('tag', 'v1.2.4');
    expect(core.setOutput).toHaveBeenCalledWith('bump', 'patch');
    expect(core.setOutput).toHaveBeenCalledWith('skipped', 'false');
  });

  it('skips when PR is not merged', async () => {
    configureGithubContext({ merged: false });

    await run();

    expect(core.setOutput).toHaveBeenCalledWith('skipped', 'true');

    // VERSION.md must be unchanged
    const version = fs.readFileSync(versionFilePath, 'utf8');
    expect(version).toBe('1.2.3\n');

    // CHANGELOG.md must be unchanged (empty)
    const changelog = fs.readFileSync(changelogFilePath, 'utf8');
    expect(changelog).toBe('');
  });

  it('skips when bump is none (release:none label)', async () => {
    const nonePr = {
      ...mockPr,
      labels: [{ name: 'release:none' }],
    };
    configureGithubContext(nonePr);

    await run();

    expect(core.setOutput).toHaveBeenCalledWith('bump', 'none');
    expect(core.setOutput).toHaveBeenCalledWith('skipped', 'true');

    // VERSION.md must be unchanged
    const version = fs.readFileSync(versionFilePath, 'utf8');
    expect(version).toBe('1.2.3\n');

    // CHANGELOG.md must be unchanged (empty)
    const changelog = fs.readFileSync(changelogFilePath, 'utf8');
    expect(changelog).toBe('');
  });
});
