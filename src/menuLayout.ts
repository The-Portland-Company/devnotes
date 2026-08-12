import type { CSSProperties } from 'react';
import { menuPalette, type MenuScheme } from './menuTheme';

/** Host sheets outrank Tailwind; these inline + !important CSS rules cannot. */

export const menuPanelStyle: CSSProperties = {
  position: 'absolute',
  display: 'flex',
  flexDirection: 'column',
  flexWrap: 'nowrap',
  alignItems: 'stretch',
  width: 320,
  zIndex: 50,
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  backgroundColor: '#ffffff',
  paddingTop: 8,
  paddingBottom: 8,
  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
  boxSizing: 'border-box',
};

export function menuPanelStyleFor(scheme: MenuScheme): CSSProperties {
  const p = menuPalette[scheme];
  return {
    ...menuPanelStyle,
    backgroundColor: p.panelBg,
    border: `1px solid ${p.panelBorder}`,
    color: p.text,
    boxShadow: p.shadow,
    colorScheme: scheme,
  };
}

export function menuRowStyleFor(scheme: MenuScheme): CSSProperties {
  const p = menuPalette[scheme];
  return {
    ...menuRowStyle,
    color: p.text,
    background: 'transparent',
    border: 'none',
    borderRadius: 0,
    boxShadow: 'none',
    appearance: 'none',
    justifyContent: 'space-between',
    textAlign: 'left',
  };
}

export function menuDividerStyleFor(scheme: MenuScheme): CSSProperties {
  return {
    ...menuDividerStyle,
    background: menuPalette[scheme].divider,
  };
}

export function menuHeadingStyleFor(scheme: MenuScheme): CSSProperties {
  return {
    margin: 0,
    fontSize: 12,
    fontWeight: 600,
    color: menuPalette[scheme].muted,
    letterSpacing: '0.04em',
  };
}

export function menuSwitchStyleFor(scheme: MenuScheme, on: boolean, onColor = '#22c55e'): CSSProperties {
  return {
    ...menuSwitchStyle(on, onColor),
    background: on ? onColor : menuPalette[scheme].switchOff,
  };
}

export const menuRowStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'nowrap',
  flex: '0 0 auto',
  alignSelf: 'stretch',
  width: '100%',
  minWidth: '100%',
  maxWidth: '100%',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 12,
  padding: '8px 12px',
  margin: 0,
  fontSize: 14,
  lineHeight: '20px',
  textAlign: 'left',
  color: '#1f2937',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box',
  float: 'none',
  clear: 'both',
};

export const menuRowLabelStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  whiteSpace: 'nowrap',
};

export const menuDividerStyle: CSSProperties = {
  height: 1,
  margin: '4px 0',
  flex: '0 0 auto',
  alignSelf: 'stretch',
  background: '#e5e7eb',
};

export function menuSwitchStyle(on: boolean, onColor = '#22c55e'): CSSProperties {
  return {
    position: 'relative',
    display: 'inline-block',
    height: 20,
    width: 36,
    minWidth: 36,
    minHeight: 20,
    flexShrink: 0,
    borderRadius: 9999,
    cursor: 'pointer',
    background: on ? onColor : '#d1d5db',
    overflow: 'visible',
    boxSizing: 'border-box',
    transition: 'background-color 200ms',
  };
}

export function menuKnobStyle(on: boolean): CSSProperties {
  return {
    position: 'absolute',
    top: 2,
    left: on ? 18 : 2,
    display: 'block',
    height: 16,
    width: 16,
    minWidth: 16,
    minHeight: 16,
    maxWidth: 16,
    margin: 0,
    borderRadius: 9999,
    background: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
    transform: 'none',
    pointerEvents: 'none',
    transition: 'left 200ms',
  };
}

export type MenuRowBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function parsePxPair(padding: CSSProperties['padding']): { y: number; x: number } {
  if (typeof padding !== 'string') return { y: 0, x: 0 };
  const parts = padding.trim().split(/\s+/);
  const y = Number.parseFloat(parts[0] ?? '0');
  const x = Number.parseFloat(parts[1] ?? parts[0] ?? '0');
  return { y: Number.isFinite(y) ? y : 0, x: Number.isFinite(x) ? x : 0 };
}

function rowHeightFromStyle(row: CSSProperties): number {
  const pad = parsePxPair(row.padding);
  const line = typeof row.lineHeight === 'number' ? row.lineHeight : Number.parseFloat(String(row.lineHeight ?? 0));
  return pad.y * 2 + (Number.isFinite(line) ? line : 0);
}

/**
 * Layout boxes for N menu rows using the shipped panel/row styles.
 * Column flex stacks rows on distinct Y; anything else piles them at y=0 (overlap).
 */
export function computeMenuRowBoxes(rowCount: number, panelWidth = 320): MenuRowBox[] {
  const panel = menuPanelStyle;
  const row = menuRowStyle;
  const height = rowHeightFromStyle(row);
  const stacked = panel.display === 'flex' && panel.flexDirection === 'column';
  const fullWidth = row.width === '100%' || row.minWidth === '100%';
  const boxes: MenuRowBox[] = [];
  for (let i = 0; i < rowCount; i += 1) {
    boxes.push({
      top: stacked ? i * height : 0,
      left: stacked && fullWidth ? 0 : i * panelWidth,
      width: panelWidth,
      height,
    });
  }
  return boxes;
}

export function boxesOverlap(a: MenuRowBox, b: MenuRowBox): boolean {
  return !(
    a.left + a.width <= b.left ||
    b.left + b.width <= a.left ||
    a.top + a.height <= b.top ||
    b.top + b.height <= a.top
  );
}
