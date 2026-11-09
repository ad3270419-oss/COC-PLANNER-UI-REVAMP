import React, { useState, useEffect } from 'react';
import itemNamesJson from '../public/icons/item_names.json';
import artIndexJson from '../public/icons/art_index.json';

export const ITEM_NAMES_BY_ID: Record<string, string> = itemNamesJson as Record<string, string>;
export const ART_FILE_BY_NAME: Record<string, string> = artIndexJson as Record<string, string>;

// Case-insensitive lookup map for item names -> art filename
const LOWERCASE_NAME_TO_ART: Record<string, string> = {};
for (const [name, artFile] of Object.entries(ART_FILE_BY_NAME)) {
  LOWERCASE_NAME_TO_ART[name.trim().toLowerCase()] = artFile;
}

/**
 * Resolves the Town Hall 3D icon path for a given Town Hall level (1..18).
 */
export function getTownHallIconSrc(thLevel?: number | null): string {
  const validLevel =
    typeof thLevel === 'number' && Number.isFinite(thLevel) && thLevel >= 1 && thLevel <= 18
      ? Math.floor(thLevel)
      : 17;
  return `/icons/art_town_hall_${validLevel}.webp`;
}

/**
 * Resolves primary and fallback .webp icon URLs for any building, trap, hero, troop, spell, siege machine, or pet.
 */
export function resolveUpgradeIconSources(params: {
  rawId?: string | number | null;
  upgradeTitle?: string | null;
  upgradeLevel?: number | null;
  targetLevel?: number | null;
  category?: 'builders' | 'laboratory' | 'pethouse';
}): string[] {
  const { rawId, upgradeTitle, upgradeLevel, targetLevel, category = 'builders' } = params;
  const candidates: string[] = [];

  const cleanedId = rawId !== undefined && rawId !== null ? String(rawId).trim() : '';
  const cleanedTitle = upgradeTitle ? upgradeTitle.trim() : '';
  const lowerTitle = cleanedTitle.toLowerCase();

  // Special handling if the item is Town Hall (1000001)
  if (cleanedId === '1000001' || lowerTitle === 'town hall') {
    if (typeof targetLevel === 'number' && targetLevel >= 1 && targetLevel <= 18) {
      const exactTh = Math.min(18, Math.max(1, Math.floor(targetLevel)));
      candidates.push(`/icons/art_town_hall_${exactTh}.webp`);
    } else if (typeof upgradeLevel === 'number' && upgradeLevel >= 1 && upgradeLevel <= 18) {
      const nextTh = Math.min(18, Math.max(1, Math.floor(upgradeLevel) + 1));
      candidates.push(`/icons/art_town_hall_${nextTh}.webp`);
      candidates.push(`/icons/art_town_hall_${Math.floor(upgradeLevel)}.webp`);
    }
    candidates.push('/icons/art_1000001.webp');
  }

  // 1. Direct ID match: /icons/art_${data_id}.webp
  if (cleanedId) {
    candidates.push(`/icons/art_${cleanedId}.webp`);
  }

  // 2. Match via item_names.json -> art_index.json
  if (cleanedId && ITEM_NAMES_BY_ID[cleanedId]) {
    const mappedName = ITEM_NAMES_BY_ID[cleanedId];
    const artByMappedName =
      ART_FILE_BY_NAME[mappedName] || LOWERCASE_NAME_TO_ART[mappedName.toLowerCase()];
    if (artByMappedName) {
      candidates.push(`/icons/${artByMappedName}.webp`);
    }
  }

  // 3. Direct name match in art_index.json
  if (cleanedTitle) {
    const exactArt = ART_FILE_BY_NAME[cleanedTitle] || LOWERCASE_NAME_TO_ART[lowerTitle];
    if (exactArt) {
      candidates.push(`/icons/${exactArt}.webp`);
    }
  }

  // 4. Category default game asset fallback
  if (category === 'laboratory') {
    candidates.push('/icons/art_1000007.webp'); // Laboratory
  } else if (category === 'pethouse') {
    candidates.push('/icons/art_1000068.webp'); // Pet House
  } else {
    candidates.push('/icons/art_1000015.webp'); // Builder's Hut
  }

  // Deduplicate while preserving order
  return Array.from(new Set(candidates));
}

export const UpgradeAssetIcon: React.FC<{
  rawId?: string | number | null;
  upgradeTitle?: string | null;
  upgradeLevel?: number | null;
  targetLevel?: number | null;
  category?: 'builders' | 'laboratory' | 'pethouse';
  className?: string;
}> = React.memo(
  ({
    rawId,
    upgradeTitle,
    upgradeLevel,
    targetLevel,
    category = 'builders',
    className = '',
  }) => {
    const sources = resolveUpgradeIconSources({
      rawId,
      upgradeTitle,
      upgradeLevel,
      targetLevel,
      category,
    });

  const [sourceIndex, setSourceIndex] = useState(0);
  const [allFailed, setAllFailed] = useState(false);

  const sourcesKey = sources.join('|');
  useEffect(() => {
    setSourceIndex(0);
    setAllFailed(false);
  }, [sourcesKey]);

  const currentSrc = sources[sourceIndex] || sources[0];

  return (
    <div
      className={`w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-2xl bg-[#1E2534] border border-[#2D364A] flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-inner ${className}`}
    >
      {!allFailed && currentSrc ? (
        <img
          src={currentSrc}
          alt={upgradeTitle || 'Upgrade Icon'}
          loading="lazy"
          onError={() => {
            if (sourceIndex + 1 < sources.length) {
              setSourceIndex((prev) => prev + 1);
            } else {
              setAllFailed(true);
            }
          }}
          className="w-full h-full object-contain select-none pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]"
        />
      ) : (
        <span className="text-xl select-none" aria-hidden="true">
          {category === 'laboratory' ? '⚗️' : category === 'pethouse' ? '🐾' : '🔨'}
        </span>
      )}
    </div>
  );
});
