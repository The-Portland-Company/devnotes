#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(message) {
  console.log(message);
}

function ok(message) {
  log(`${GREEN}✓${RESET} ${message}`);
}

function warn(message) {
  log(`${YELLOW}⚠${RESET} ${message}`);
}

function title(message) {
  log(`\n${BOLD}${CYAN}${message}${RESET}`);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function detectProject(projectRoot) {
  const pkg = readJson(path.join(projectRoot, 'package.json')) || {};
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  if (deps.next) return 'next';
  if (deps.express || deps.fastify || deps.koa || deps.hono) return 'server-react';
  return 'unknown';
}

function resolveTemplate(projectRoot, fileName) {
  try {
    const pkgDir = path.dirname(
      require.resolve('@the-portland-company/devnotes/package.json', { paths: [projectRoot] })
    );
    return path.join(pkgDir, 'templates', fileName);
  } catch {
    return path.join(__dirname, '..', 'templates', fileName);
  }
}

function writeIfMissing(targetPath, content) {
  if (fs.existsSync(targetPath)) {
    warn(`Skipped existing file: ${path.relative(process.cwd(), targetPath)}`);
    return;
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content);
  ok(`Created ${path.relative(process.cwd(), targetPath)}`);
}

function copyTemplate(projectRoot, templateName, destination) {
  const source = resolveTemplate(projectRoot, templateName);
  const content = fs.readFileSync(source, 'utf8');
  writeIfMissing(path.join(projectRoot, destination), content);
}

async function main() {
  const projectRoot = process.cwd();
  const projectType = detectProject(projectRoot);

  title('@the-portland-company/devnotes setup');
  log(`Detected project type: ${BOLD}${projectType}${RESET}`);

  if (projectType === 'next') {
    copyTemplate(projectRoot, 'NextDevNotesRoute.ts', 'app/api/devnotes/[...slug]/route.ts');
    copyTemplate(projectRoot, 'DevNotesWrapper.tsx', 'src/components/DevNotesWrapper.tsx');
  } else if (projectType === 'server-react') {
    copyTemplate(projectRoot, 'ExpressDevNotesProxy.ts', 'src/server/devnotesProxy.ts');
    copyTemplate(projectRoot, 'DevNotesWrapper.tsx', 'src/components/DevNotesWrapper.tsx');
  } else {
    warn('Could not detect Next.js or a server-capable React app.');
    warn('Copy the templates manually from node_modules/@the-portland-company/devnotes/templates.');
  }

  title('Required configuration');
  log('- Add a server-side Forge integration behind `/api/devnotes`.');
  log('- Provide a host auth token via `getAuthToken()` in `DevNotesWrapper.tsx`.');
  log('- Set server env vars like `FOCUS_FORGE_BASE_URL`, `FOCUS_FORGE_PAT`, and `FOCUS_FORGE_PROJECT_NAME`.');
  log('- Import `@the-portland-company/devnotes/styles.css` once in your client bundle.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
