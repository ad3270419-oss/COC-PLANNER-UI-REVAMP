export type QuickStatKind = 'builders' | 'free' | 'lab' | 'pet';

export type QuickStatTone = 'active' | 'soon' | 'idle';

export interface QuickStatColorSpec {
  outline: string;
  glow: string;
  text: string;
}

export const QUICK_STAT_COLORS: Record<QuickStatKind, QuickStatColorSpec> = {
  builders: {
    outline: '#E5BA54',
    glow: '#E5BA54',
    text: '#F2CF7C',
  },
  free: {
    outline: '#E5BA54',
    glow: '#E5BA54',
    text: '#F2CF7C',
  },
  lab: {
    outline: '#F472B6',
    glow: '#F472B6',
    text: '#F9A8D4',
  },
  pet: {
    outline: '#8B5CF6',
    glow: '#8B5CF6',
    text: '#B79BFF',
  },
};

export const QUICK_STAT_SOON_THRESHOLD_SECONDS = 3600;

export function getQuickStatTone(
  kind: QuickStatKind,
  remainingSeconds: number | null | undefined
): QuickStatTone {
  if (kind === 'builders') {
    return 'active';
  }
  if (
    typeof remainingSeconds !== 'number' ||
    !Number.isFinite(remainingSeconds) ||
    remainingSeconds <= 0
  ) {
    return 'idle';
  }
  if (remainingSeconds < QUICK_STAT_SOON_THRESHOLD_SECONDS) {
    return 'soon';
  }
  return 'active';
}

function hexToRgbTriplet(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export function getQuickStatCssVars(kind: QuickStatKind): Record<string, string> {
  const palette = QUICK_STAT_COLORS[kind];
  return {
    '--neon': palette.outline,
    '--neon-glow': palette.glow,
    '--neon-text': palette.text,
    '--neon-rgb': hexToRgbTriplet(palette.outline),
  };
}
