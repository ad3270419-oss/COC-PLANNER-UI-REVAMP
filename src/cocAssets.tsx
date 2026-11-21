import React, { useState, useEffect } from 'react';
import itemNamesJson from '../public/icons/item_names.json';
import artIndexJson from '../public/icons/art_index.json';

export const ITEM_NAMES_BY_ID: Record<string, string> = itemNamesJson as Record<string, string>;
export const ART_FILE_BY_NAME: Record<string, string> = artIndexJson as Record<string, string>;

// Case-insensitive lookup map for item names -> legacy art filename
const LOWERCASE_NAME_TO_ART: Record<string, string> = {};
for (const [name, artFile] of Object.entries(ART_FILE_BY_NAME)) {
  LOWERCASE_NAME_TO_ART[name.trim().toLowerCase()] = artFile;
}

/**
 * Exact verified folder names inside `public/coc-assets/buildings/home-village/`.
 * Only Home Village buildings (including Town Hall and Wall) that have level-wise `.webp` files.
 */
const HOME_VILLAGE_BUILDING_FOLDER_BY_ID: Record<string, string> = {
  '1000000': 'army_camp',
  '1000001': 'town_hall',
  '1000002': 'elixir_collector',
  '1000003': 'elixir_storage',
  '1000004': 'gold_mine',
  '1000005': 'gold_storage',
  '1000006': 'barracks',
  '1000007': 'laboratory',
  '1000008': 'cannon',
  '1000009': 'archer_tower',
  '1000010': 'wall',
  '1000011': 'wizard_tower',
  '1000012': 'air_defense',
  '1000013': 'mortar',
  '1000014': 'clan_castle',
  '1000015': "builder's_hut",
  '1000019': 'hidden_tesla',
  '1000020': 'spell_factory',
  '1000021': 'x-bow',
  '1000023': 'dark_elixir_drill',
  '1000024': 'dark_elixir_storage',
  '1000026': 'dark_barracks',
  '1000027': 'inferno_tower',
  '1000028': 'air_sweeper',
  '1000029': 'dark_spell_factory',
  '1000031': 'eagle_artillery',
  '1000032': 'bomb_tower',
  '1000059': 'workshop',
  '1000064': "bob's_hut",
  '1000067': 'scattershot',
  '1000068': 'pet_house',
  '1000070': 'blacksmith',
  '1000071': 'hero_hall',
  '1000072': 'spell_tower',
  '1000077': 'monolith',
  '1000079': 'multi-gear_tower',
  '1000084': 'multi-archer_tower',
  '1000085': 'ricochet_cannon',
  '1000086': 'revenge_tower',
  '1000089': 'firespitter',
  '1000093': 'helper_hut',
  '1000097': 'crafting_station',
  '1000102': 'super_wizard_tower',
  '1000106': 'squad_barracks',
  '1000107': 'spiky_tower',
  '1000108': 'firecracker_tower',
};

/**
 * Exact verified folder names inside `public/coc-assets/traps/home-village/`.
 */
const HOME_VILLAGE_TRAP_FOLDER_BY_ID: Record<string, string> = {
  '12000000': 'bomb',
  '12000001': 'spring_trap',
  '12000002': 'giant_bomb',
  '12000005': 'air_bomb',
  '12000006': 'seeking_air_mine',
  '12000008': 'skeleton_trap',
  '12000016': 'tornado_trap',
  '12000020': 'giga_bomb',
};

const HOME_VILLAGE_BUILDING_FOLDER_BY_NAME: Record<string, string> = {
  "b.o.b's hut": "bob's_hut",
  "bob's hut": "bob's_hut",
  "builder's hut": "builder's_hut",
  'builders hut': "builder's_hut",
  'multi-archer tower': 'multi-archer_tower',
  'multi-gear tower': 'multi-gear_tower',
  'x-bow': 'x-bow',
  'squad barracks': 'squad_barracks',
  'spiky tower': 'spiky_tower',
  'firecracker tower': 'firecracker_tower',
  'super wizard tower': 'super_wizard_tower',
  'guardian shrine': 'guardian_shrine',
  'town hall': 'town_hall',
  wall: 'wall',
};

for (const [id, folder] of Object.entries(HOME_VILLAGE_BUILDING_FOLDER_BY_ID)) {
  const mappedName = ITEM_NAMES_BY_ID[id];
  if (mappedName) {
    HOME_VILLAGE_BUILDING_FOLDER_BY_NAME[mappedName.trim().toLowerCase()] = folder;
  }
}

const HOME_VILLAGE_TRAP_FOLDER_BY_NAME: Record<string, string> = {};
for (const [id, folder] of Object.entries(HOME_VILLAGE_TRAP_FOLDER_BY_ID)) {
  const mappedName = ITEM_NAMES_BY_ID[id];
  if (mappedName) {
    HOME_VILLAGE_TRAP_FOLDER_BY_NAME[mappedName.trim().toLowerCase()] = folder;
  }
}

function buildLevelWiseAssetUrl(
  kind: 'buildings' | 'traps',
  folderName: string,
  level: number
): string {
  const safeLevel = Math.max(1, Math.floor(level));
  return encodeURI(`/coc-assets/${kind}/home-village/${folderName}/level_${safeLevel}.webp`);
}

function resolveHomeVillageLevelFolder(
  cleanedId: string,
  lowerTitle: string
): { kind: 'buildings' | 'traps'; folder: string } | null {
  if (cleanedId && HOME_VILLAGE_BUILDING_FOLDER_BY_ID[cleanedId]) {
    return { kind: 'buildings', folder: HOME_VILLAGE_BUILDING_FOLDER_BY_ID[cleanedId] };
  }
  if (cleanedId && HOME_VILLAGE_TRAP_FOLDER_BY_ID[cleanedId]) {
    return { kind: 'traps', folder: HOME_VILLAGE_TRAP_FOLDER_BY_ID[cleanedId] };
  }
  if (lowerTitle && HOME_VILLAGE_BUILDING_FOLDER_BY_NAME[lowerTitle]) {
    return { kind: 'buildings', folder: HOME_VILLAGE_BUILDING_FOLDER_BY_NAME[lowerTitle] };
  }
  if (lowerTitle && HOME_VILLAGE_TRAP_FOLDER_BY_NAME[lowerTitle]) {
    return { kind: 'traps', folder: HOME_VILLAGE_TRAP_FOLDER_BY_NAME[lowerTitle] };
  }
  return null;
}

/**
 * Legacy Town Hall 3D icon path for a given Town Hall level (1..19).
 * Kept intact for Android native widget sync and guaranteed fallback.
 */
export function getTownHallIconSrc(thLevel?: number | null): string {
  const validLevel =
    typeof thLevel === 'number' && Number.isFinite(thLevel) && thLevel >= 1 && thLevel <= 19
      ? Math.floor(thLevel)
      : 17;
  return `/icons/art_town_hall_${validLevel}.webp`;
}

/**
 * Ordered Town Hall icon candidates:
 * 1. Level-wise `/coc-assets/buildings/home-village/town_hall/level_<lvl>.webp`
 * 2. Legacy `/icons/art_town_hall_<lvl>.webp`
 * 3. Legacy generic `/icons/art_1000001.webp`
 */
export function getTownHallIconSources(thLevel?: number | null): string[] {
  const validLevel =
    typeof thLevel === 'number' && Number.isFinite(thLevel) && thLevel >= 1 && thLevel <= 19
      ? Math.floor(thLevel)
      : 17;
  return Array.from(
    new Set([
      buildLevelWiseAssetUrl('buildings', 'town_hall', validLevel),
      `/icons/art_town_hall_${validLevel}.webp`,
      '/icons/art_1000001.webp',
    ])
  );
}

/**
 * Renders a Town Hall icon using level-wise `/coc-assets/` with safe fallback to `/icons/`.
 */
export const TownHallAssetImage: React.FC<{
  thLevel?: number | null;
  alt?: string;
  className?: string;
}> = React.memo(({ thLevel, alt, className = 'w-full h-full object-contain' }) => {
  const sources = getTownHallIconSources(thLevel);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [allFailed, setAllFailed] = useState(false);

  const sourcesKey = sources.join('|');
  useEffect(() => {
    setSourceIndex(0);
    setAllFailed(false);
  }, [sourcesKey]);

  const currentSrc = sources[sourceIndex] || sources[0];

  if (allFailed || !currentSrc) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-xl bg-[#1E2534] border border-[#2D364A] text-xs font-black text-[#F3CA65] px-2 py-1 select-none"
        aria-label={alt || `Town Hall ${thLevel ?? ''}`}
      >
        TH{typeof thLevel === 'number' && Number.isFinite(thLevel) ? Math.floor(thLevel) : ''}
      </span>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt || `Town Hall ${thLevel ?? ''}`}
      onError={() => {
        if (sourceIndex + 1 < sources.length) {
          setSourceIndex((prev) => prev + 1);
        } else {
          setAllFailed(true);
        }
      }}
      className={className}
    />
  );
});

/**
 * Resolves primary and fallback `.webp` icon URLs:
 * - Primary: level-wise `/coc-assets/` ONLY for Home Village Buildings, Town Hall, and Home Village Traps.
 * - Fallback 1: existing `/icons/` path (used directly for Heroes, Troops, Pets, Spells, Guardians,
 *   and automatically on 404 for any missing level image).
 * - Fallback 2: category default icon in `/icons/`.
 */
export function resolveUpgradeIconSources(params: {
  rawId?: string | number | null;
  upgradeTitle?: string | null;
  upgradeLevel?: number | null;
  targetLevel?: number | null;
  isUpgrading?: boolean;
  category?: 'builders' | 'laboratory' | 'pethouse';
}): string[] {
  const {
    rawId,
    upgradeTitle,
    upgradeLevel,
    targetLevel,
    isUpgrading = true,
    category = 'builders',
  } = params;
  const candidates: string[] = [];

  const cleanedId = rawId !== undefined && rawId !== null ? String(rawId).trim() : '';
  const cleanedTitle = upgradeTitle ? upgradeTitle.trim() : '';
  const lowerTitle = cleanedTitle.toLowerCase();

  const isKnownNonTownHallTitle =
    cleanedTitle.length > 0 &&
    lowerTitle !== 'town hall' &&
    Boolean(ART_FILE_BY_NAME[cleanedTitle] || LOWERCASE_NAME_TO_ART[lowerTitle]);

  // Determine the level to display (target level when upgrading, current level when idle, min 1)
  let primaryLevel: number | null = null;
  let secondaryCurrentLevel: number | null = null;

  if (typeof targetLevel === 'number' && Number.isFinite(targetLevel) && targetLevel >= 1) {
    primaryLevel = Math.max(1, Math.floor(targetLevel));
    if (typeof upgradeLevel === 'number' && Number.isFinite(upgradeLevel) && upgradeLevel >= 1) {
      const cur = Math.floor(upgradeLevel);
      if (cur !== primaryLevel) {
        secondaryCurrentLevel = cur;
      }
    }
  } else if (typeof upgradeLevel === 'number' && Number.isFinite(upgradeLevel) && upgradeLevel >= 0) {
    const cur = Math.floor(upgradeLevel);
    primaryLevel = isUpgrading ? Math.max(1, cur + 1) : Math.max(1, cur);
    if (isUpgrading && cur >= 1 && cur !== primaryLevel) {
      secondaryCurrentLevel = cur;
    }
  }

  // 0. Primary: Level-wise `/coc-assets/` ONLY for Home Village Buildings, Town Hall & Traps
  const effectiveIdForLevelLookup =
    isKnownNonTownHallTitle && cleanedId === '1000001' ? '' : cleanedId;
  const levelAssetInfo = resolveHomeVillageLevelFolder(effectiveIdForLevelLookup, lowerTitle);

  if (levelAssetInfo && primaryLevel !== null) {
    const clampedPrimary =
      levelAssetInfo.folder === 'town_hall' ? Math.min(19, Math.max(1, primaryLevel)) : primaryLevel;
    candidates.push(
      buildLevelWiseAssetUrl(levelAssetInfo.kind, levelAssetInfo.folder, clampedPrimary)
    );
    if (secondaryCurrentLevel !== null) {
      const clampedSecondary =
        levelAssetInfo.folder === 'town_hall'
          ? Math.min(19, Math.max(1, secondaryCurrentLevel))
          : secondaryCurrentLevel;
      if (clampedSecondary !== clampedPrimary) {
        candidates.push(
          buildLevelWiseAssetUrl(levelAssetInfo.kind, levelAssetInfo.folder, clampedSecondary)
        );
      }
    }
  }

  // Fallback 1 (Town Hall legacy): /icons/art_town_hall_<level>.webp -> /icons/art_1000001.webp
  if (!isKnownNonTownHallTitle && (cleanedId === '1000001' || lowerTitle === 'town hall')) {
    if (typeof targetLevel === 'number' && targetLevel >= 1 && targetLevel <= 19) {
      const exactTh = Math.min(19, Math.max(1, Math.floor(targetLevel)));
      candidates.push(`/icons/art_town_hall_${exactTh}.webp`);
    } else if (typeof upgradeLevel === 'number' && upgradeLevel >= 1 && upgradeLevel <= 19) {
      const nextTh = isUpgrading
        ? Math.min(19, Math.max(1, Math.floor(upgradeLevel) + 1))
        : Math.min(19, Math.max(1, Math.floor(upgradeLevel)));
      candidates.push(`/icons/art_town_hall_${nextTh}.webp`);
      candidates.push(`/icons/art_town_hall_${Math.floor(upgradeLevel)}.webp`);
    }
    candidates.push('/icons/art_1000001.webp');
  }

  // 1. Direct name match in art_index.json (guarantees icon always matches displayed title)
  if (cleanedTitle && lowerTitle !== 'town hall') {
    const exactArt = ART_FILE_BY_NAME[cleanedTitle] || LOWERCASE_NAME_TO_ART[lowerTitle];
    if (exactArt) {
      candidates.push(`/icons/${exactArt}.webp`);
    }
  }

  // 2. Direct ID match: /icons/art_${data_id}.webp
  if (cleanedId && (!isKnownNonTownHallTitle || cleanedId !== '1000001')) {
    candidates.push(`/icons/art_${cleanedId}.webp`);
  }

  // 3. Match via item_names.json -> art_index.json
  if (cleanedId && ITEM_NAMES_BY_ID[cleanedId]) {
    const mappedName = ITEM_NAMES_BY_ID[cleanedId];
    const artByMappedName =
      ART_FILE_BY_NAME[mappedName] || LOWERCASE_NAME_TO_ART[mappedName.toLowerCase()];
    if (artByMappedName) {
      candidates.push(`/icons/${artByMappedName}.webp`);
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
  isUpgrading?: boolean;
  category?: 'builders' | 'laboratory' | 'pethouse';
  className?: string;
}> = React.memo(
  ({
    rawId,
    upgradeTitle,
    upgradeLevel,
    targetLevel,
    isUpgrading = true,
    category = 'builders',
    className = '',
  }) => {
    const sources = resolveUpgradeIconSources({
      rawId,
      upgradeTitle,
      upgradeLevel,
      targetLevel,
      isUpgrading,
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
  }
);
