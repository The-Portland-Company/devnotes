import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const {
  DevNotesMenu,
  DevNotesContext,
  computeMenuRowBoxes,
  boxesOverlap,
  menuPanelStyle,
  menuRowStyle,
  menuPanelStyleFor,
  menuKnobStyle,
  resolveMenuScheme,
  menuPalette,
} = require('../dist/index.js');

const EXPECTED_LABELS = [
  'Create Task',
  'Show Tasks Always',
  'Hide Resolved/Closed',
  'Show Step Dots',
  'Record User Story (Test Case)',
  'View All Tasks',
];

function menuContext(overrides = {}) {
  const noop = () => {};
  const asyncNoop = async () => {};
  return {
    isEnabled: false,
    setIsEnabled: noop,
    showTasksAlways: false,
    setShowTasksAlways: noop,
    hideResolvedClosed: true,
    setHideResolvedClosed: noop,
    showStepDots: true,
    setShowStepDots: noop,
    canRecordUserStory: true,
    isRecordingStory: false,
    recordedSteps: [],
    savingStory: false,
    storyError: null,
    startUserStoryRecording: noop,
    stopUserStoryRecording: noop,
    cancelUserStoryRecording: noop,
    updateRecordedStep: noop,
    deleteRecordedStep: noop,
    moveRecordedStep: noop,
    saveUserStory: async () => false,
    createUserStory: async () => ({ ok: false }),
    userStoryStepDots: [],
    currentPageStepDots: [],
    tasks: [{ id: 't1', title: 'A', status: 'Open', severity: 'Medium', types: [] }],
    taskTypes: [],
    taskLists: [],
    userProfiles: {},
    unreadCounts: {},
    currentPageTasks: [],
    collaborators: [],
    loadTasks: asyncNoop,
    loadTaskTypes: asyncNoop,
    loadTaskLists: asyncNoop,
    createTask: async () => null,
    updateTask: async () => null,
    deleteTask: async () => false,
    createTaskList: async () => null,
    addTaskType: async () => null,
    deleteTaskType: async () => false,
    loadUnreadCounts: asyncNoop,
    markMessagesAsRead: asyncNoop,
    user: { id: 'u1', email: 'a@b.c' },
    adapter: {},
    capabilities: { ai: false, appLink: true },
    appLinkStatus: null,
    refreshCapabilities: asyncNoop,
    refreshAppLinkStatus: asyncNoop,
    requireAi: false,
    role: 'admin',
    loading: false,
    error: null,
    forgeStatus: { connected: true, error: null },
    forgeError: null,
    dotContainer: null,
    compensate: (x, y) => ({ x, y }),
    bugReports: [],
    bugReportTypes: [],
    currentPageBugReports: [],
    loadBugReports: asyncNoop,
    loadBugReportTypes: asyncNoop,
    createBugReport: async () => null,
    updateBugReport: async () => null,
    deleteBugReport: async () => false,
    addBugReportType: async () => null,
    deleteBugReportType: async () => false,
    showBugsAlways: false,
    setShowBugsAlways: noop,
    ...overrides,
  };
}

function renderMenu(overrides = {}) {
  return renderToStaticMarkup(
    React.createElement(
      DevNotesContext.Provider,
      { value: menuContext(overrides) },
      React.createElement(DevNotesMenu, { defaultOpen: true })
    )
  );
}

function decode(html) {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');
}

test('shipped menu render lists each action once and stacks non-overlapping row boxes', () => {
  const html = decode(renderMenu());
  assert.match(html, /data-devnotes-menu-panel/);
  assert.match(html, /flex-direction:column/);

  const items = [...html.matchAll(/data-menu-item/g)];
  assert.equal(items.length, 6);

  for (const label of EXPECTED_LABELS) {
    const hits = html.split(label).length - 1;
    assert.equal(hits, 1, `label "${label}" should appear once, got ${hits}`);
  }

  const rowChunks = html.split('data-menu-item').slice(1);
  for (const chunk of rowChunks) {
    const styleMatch = chunk.match(/style="([^"]+)"/);
    assert.ok(styleMatch, 'each menu item has an inline style');
    const style = styleMatch[1];
    assert.match(style, /display:flex/);
    assert.match(style, /width:100%/);
    assert.match(style, /min-width:100%/);
  }

  const panel = html.match(/data-devnotes-menu-panel[^>]*style="([^"]+)"/);
  assert.ok(panel);
  assert.match(panel[1], /display:flex/);
  assert.match(panel[1], /flex-direction:column/);

  const boxes = computeMenuRowBoxes(EXPECTED_LABELS.length);
  assert.equal(boxes.length, EXPECTED_LABELS.length);
  assert.equal(menuPanelStyle.flexDirection, 'column');
  assert.equal(menuRowStyle.width, '100%');
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      assert.equal(
        boxesOverlap(boxes[i], boxes[j]),
        false,
        `row ${i} overlaps row ${j}`
      );
    }
  }
  for (let i = 1; i < boxes.length; i += 1) {
    assert.ok(boxes[i].top >= boxes[i - 1].top + boxes[i - 1].height);
  }
});

test('menu scheme follows html.dark, data-theme, then prefers-color-scheme', () => {
  const darkHtml = { classList: { contains: (c) => c === 'dark' }, getAttribute: () => null };
  const lightHtml = { classList: { contains: (c) => c === 'light' }, getAttribute: () => null };
  const themed = { classList: { contains: () => false }, getAttribute: (n) => (n === 'data-theme' ? 'dark' : null) };
  const empty = { classList: { contains: () => false }, getAttribute: () => null };
  assert.equal(resolveMenuScheme(darkHtml, false), 'dark');
  assert.equal(resolveMenuScheme(lightHtml, true), 'light');
  assert.equal(resolveMenuScheme(themed, false), 'dark');
  assert.equal(resolveMenuScheme(empty, true), 'dark');
  assert.equal(resolveMenuScheme(empty, false), 'light');
});

test('themed panel surfaces are distinct and readable for light vs dark', () => {
  const light = menuPanelStyleFor('light');
  const dark = menuPanelStyleFor('dark');
  assert.equal(light.backgroundColor, menuPalette.light.panelBg);
  assert.equal(dark.backgroundColor, menuPalette.dark.panelBg);
  assert.notEqual(light.backgroundColor, dark.backgroundColor);
  assert.equal(light.color, menuPalette.light.text);
  assert.equal(dark.color, menuPalette.dark.text);
  assert.match(String(dark.border), /#333333/);
});

test('shipped menu markup carries a scheme hook for host-proof CSS', () => {
  const html = decode(renderMenu());
  assert.match(html, /data-dn-scheme="/);
  assert.match(html, /data-devnotes-menu-heading/);
});

test('dropdown hangs from the trigger left edge and rows keep a real switch knob', () => {
  const html = decode(renderMenu());
  assert.match(html, /data-dn-align="start"/);
  assert.match(html, /left:0/);
  assert.doesNotMatch(html, /data-dn-align="end"/);
  const switches = [...html.matchAll(/data-menu-switch/g)];
  const knobs = [...html.matchAll(/data-menu-knob/g)];
  assert.equal(switches.length, 4);
  assert.equal(knobs.length, 4);
  assert.equal(menuKnobStyle(false).left, 2);
  assert.equal(menuKnobStyle(true).left, 18);
  assert.equal(menuKnobStyle(true).background, '#ffffff');
});

test('host-proof menu CSS uses !important column + full-width rows', () => {
  const cssPath = join(dirname(fileURLToPath(import.meta.url)), '../dist/styles.css');
  const css = readFileSync(cssPath, 'utf8');
  assert.match(css, /data-devnotes-menu-panel/);
  assert.match(css, /flex-direction:column!important|flex-direction:\s*column\s*!important/);
  assert.match(css, /\[data-menu-item\]/);
  assert.match(css, /width:100%!important|width:\s*100%\s*!important/);
  assert.match(css, /data-dn-scheme/);
  assert.match(css, /html\.dark/);
  assert.match(css, /#161616/);
  assert.match(css, /appearance:none!important|-webkit-appearance:none!important/);
  assert.match(css, /justify-content:space-between!important|justify-content:\s*space-between\s*!important/);
  assert.match(css, /data-menu-knob/);
  assert.match(css, /left:18px!important|left:\s*18px\s*!important/);
  assert.match(css, /data-dn-align/);
});
