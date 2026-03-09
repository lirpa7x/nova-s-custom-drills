import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outFile = path.join(rootDir, 'js', 'main.js');
const indexTemplatePath = path.join(rootDir, 'index.template.html');
const indexOutputPath = path.join(rootDir, 'index.html');
const watchMode = process.argv.includes('--watch');

async function collectFiles(relativeDir) {
  const absoluteDir = path.join(rootDir, relativeDir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) {
        return collectFiles(relativePath);
      }
      return [relativePath];
    })
  );
  return files.flat().sort();
}

function readGitValue(args) {
  try {
    return execFileSync('git', args, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

async function computeBuildMeta() {
  const filesToHash = [
    ...(await collectFiles('src')),
    ...(await collectFiles('scripts')),
    'package.json',
    'index.template.html',
  ];
  const hash = createHash('sha256');
  for (const relativePath of filesToHash) {
    const contents = await readFile(path.join(rootDir, relativePath));
    hash.update(relativePath);
    hash.update('\0');
    hash.update(contents);
    hash.update('\0');
  }

  const packageJson = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8'));
  const sourceHash = hash.digest('hex').slice(0, 12);
  const gitShortHash = readGitValue(['rev-parse', '--short', 'HEAD']) || 'nogit';
  const dirty = readGitValue(['status', '--porcelain']) ? 'dirty' : 'clean';
  const builtAt = new Date().toISOString();
  const buildId = `${gitShortHash}-${sourceHash}${dirty === 'dirty' ? '-dirty' : ''}`;
  const buildLabel = `v${packageJson.version} ${buildId}`;

  return {
    buildId,
    buildLabel,
    builtAt,
    dirty,
    gitShortHash,
    sourceHash,
    version: packageJson.version,
  };
}

async function writeIndexHtml(meta) {
  const template = await readFile(indexTemplatePath, 'utf8');
  const rendered = template.replaceAll('__BUILD_ID__', meta.buildId);
  await writeFile(indexOutputPath, rendered);
}

function buildMetaModule(meta) {
  return `
export const BUILD_ID = ${JSON.stringify(meta.buildId)};
export const BUILD_LABEL = ${JSON.stringify(meta.buildLabel)};
export const BUILD_TIME = ${JSON.stringify(meta.builtAt)};
export const BUILD_GIT_HASH = ${JSON.stringify(meta.gitShortHash)};
export const BUILD_SOURCE_HASH = ${JSON.stringify(meta.sourceHash)};
export const BUILD_DIRTY = ${JSON.stringify(meta.dirty)};
export const BUILD_VERSION = ${JSON.stringify(meta.version)};
`;
}

function buildMetaPlugin() {
  let currentMeta = null;

  async function ensureMeta() {
    currentMeta = await computeBuildMeta();
    return currentMeta;
  }

  return {
    name: 'build-meta',
    setup(build) {
      build.onStart(async () => {
        await ensureMeta();
      });

      build.onResolve({ filter: /^virtual:build-meta$/ }, () => ({
        path: 'virtual:build-meta',
        namespace: 'build-meta',
      }));

      build.onLoad({ filter: /.*/, namespace: 'build-meta' }, async () => {
        const meta = currentMeta || (await ensureMeta());
        return {
          contents: buildMetaModule(meta),
          loader: 'js',
        };
      });

      build.onEnd(async (result) => {
        if (result.errors.length) {
          return;
        }
        const meta = currentMeta || (await ensureMeta());
        await writeIndexHtml(meta);
        console.log(`[build] ${meta.buildLabel} (${meta.builtAt})`);
      });
    },
  };
}

const buildOptions = {
  absWorkingDir: rootDir,
  bundle: true,
  entryPoints: ['src/main.jsx'],
  format: 'iife',
  outfile: outFile,
  plugins: [buildMetaPlugin()],
  target: 'es2020',
  logLevel: 'info',
  minify: !watchMode,
};

await mkdir(path.join(rootDir, 'js'), { recursive: true });

if (watchMode) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('[watch] Waiting for changes...');
} else {
  await esbuild.build(buildOptions);
}
