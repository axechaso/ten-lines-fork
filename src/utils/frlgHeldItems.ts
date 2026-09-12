import {
    COMBINED_WILD_METHOD,
    Game,
    WILD_1,
    WILD_2,
    WILD_4,
} from "../tenLines";
import type { Locale } from "../i18n";

export const FRLG_HELD_ITEM_SOURCE_COMMIT =
    "df4449a27cd78dd747ce269e47d3ab4a0149d8f4";
export const FRLG_HELD_PROFILE_ENGLISH_SWITCH = "frlg-english-switch";
// Kept as an alias for callers created before non-grass encounter support.
export const FRLG_HELD_PROFILE_FIRE_RED_ENGLISH_SWEET_SCENT =
    FRLG_HELD_PROFILE_ENGLISH_SWITCH;

// PokeFinder Encounter enum values. Keep these explicit because the supported
// FRLG categories are not contiguous (Grass=0, RockSmash=3, Surfing=4, rods=6-8).
export const FRLG_HELD_ENCOUNTER_GRASS = 0;
export const FRLG_HELD_ENCOUNTER_ROCK_SMASH = 3;
export const FRLG_HELD_ENCOUNTER_SURFING = 4;
export const FRLG_HELD_ENCOUNTER_OLD_ROD = 6;
export const FRLG_HELD_ENCOUNTER_GOOD_ROD = 7;
export const FRLG_HELD_ENCOUNTER_SUPER_ROD = 8;
export const FRLG_HELD_ENCOUNTER_CATEGORIES = [
    FRLG_HELD_ENCOUNTER_GRASS,
    FRLG_HELD_ENCOUNTER_ROCK_SMASH,
    FRLG_HELD_ENCOUNTER_SURFING,
    FRLG_HELD_ENCOUNTER_OLD_ROD,
    FRLG_HELD_ENCOUNTER_GOOD_ROD,
    FRLG_HELD_ENCOUNTER_SUPER_ROD,
] as const;

export const HELD_ITEM_FILTER_ANY = -2;
export const HELD_ITEM_FILTER_ANY_ITEM = -1;
export const FRLG_HELD_SEARCH_MODE_H1_STABLE = "h1-stable";
export const FRLG_HELD_SEARCH_MODE_ALL_METHODS = "all-methods";
export const FRLG_HELD_SEARCH_MODE_FOUR_TRACKS = "four-tracks";
export const FRLG_HELD_SEARCH_MODE_FIVE_TRACKS = "five-tracks";
const FRLG_MAX_NATIONAL_DEX_SPECIES = 386;

export type FrlgHeldSearchMode =
    | typeof FRLG_HELD_SEARCH_MODE_H1_STABLE
    | typeof FRLG_HELD_SEARCH_MODE_ALL_METHODS
    | typeof FRLG_HELD_SEARCH_MODE_FOUR_TRACKS
    | typeof FRLG_HELD_SEARCH_MODE_FIVE_TRACKS;

export type FrlgHeldItemSlots = {
    common: number;
    rare: number;
};

export type FrlgHeldOffsetProfile = {
    game: number;
    encounterCategory: number;
    location: number;
    method: number;
    baseOffset: number;
    alternateOffset: number;
    status: "verified" | "variable";
    samples?: number;
};

export type FrlgHeldRollPrediction = {
    offset: number;
    seed: number;
    roll: number;
    itemId: number;
};

export type FrlgHeldPrediction = {
    slots: FrlgHeldItemSlots;
    profile: FrlgHeldOffsetProfile;
    baseline: FrlgHeldRollPrediction;
    alternate: FrlgHeldRollPrediction;
};

export type FrlgHeldSearchPrediction = {
    slots: FrlgHeldItemSlots;
    rolls: FrlgHeldRollPrediction[];
};

export type FrlgHeldPredictionContext = {
    profileSet: typeof FRLG_HELD_PROFILE_ENGLISH_SWITCH;
    game: number;
    encounterCategory: number;
    location: number;
};

// Generated from pret/pokefirered species_info.h at the pinned commit above.
// Only species that can hold an item in FRLG are stored. FRLG's obtainable wild
// species use National Dex IDs through 251, which also match PokeFinder here.
export const FRLG_HELD_ITEM_SLOTS: Readonly<
    Record<number, FrlgHeldItemSlots>
> = {
    12: { common: 0, rare: 188 },
    15: { common: 0, rare: 211 },
    20: { common: 139, rare: 142 },
    22: { common: 0, rare: 210 },
    24: { common: 0, rare: 211 },
    28: { common: 0, rare: 203 },
    35: { common: 0, rare: 94 },
    36: { common: 0, rare: 94 },
    37: { common: 136, rare: 0 },
    38: { common: 136, rare: 0 },
    39: { common: 139, rare: 0 },
    40: { common: 139, rare: 0 },
    46: { common: 103, rare: 104 },
    47: { common: 103, rare: 104 },
    49: { common: 0, rare: 188 },
    52: { common: 0, rare: 110 },
    58: { common: 136, rare: 0 },
    59: { common: 136, rare: 0 },
    63: { common: 0, rare: 214 },
    64: { common: 0, rare: 214 },
    65: { common: 0, rare: 214 },
    67: { common: 0, rare: 196 },
    68: { common: 0, rare: 196 },
    75: { common: 0, rare: 204 },
    76: { common: 0, rare: 204 },
    82: { common: 0, rare: 208 },
    83: { common: 0, rare: 225 },
    85: { common: 0, rare: 210 },
    86: { common: 137, rare: 0 },
    87: { common: 137, rare: 212 },
    90: { common: 106, rare: 107 },
    91: { common: 106, rare: 107 },
    93: { common: 0, rare: 213 },
    94: { common: 0, rare: 213 },
    95: { common: 0, rare: 204 },
    104: { common: 0, rare: 224 },
    105: { common: 0, rare: 224 },
    113: { common: 0, rare: 197 },
    120: { common: 108, rare: 109 },
    121: { common: 108, rare: 109 },
    132: { common: 0, rare: 223 },
    143: { common: 134, rare: 134 },
    148: { common: 0, rare: 216 },
    149: { common: 0, rare: 216 },
    152: { common: 141, rare: 141 },
    161: { common: 0, rare: 139 },
    162: { common: 139, rare: 142 },
    170: { common: 0, rare: 50 },
    171: { common: 0, rare: 50 },
    173: { common: 0, rare: 94 },
    174: { common: 139, rare: 0 },
    186: { common: 0, rare: 187 },
    199: { common: 0, rare: 187 },
    200: { common: 0, rare: 213 },
    203: { common: 0, rare: 140 },
    208: { common: 0, rare: 199 },
    213: { common: 44, rare: 44 },
    216: { common: 139, rare: 142 },
    217: { common: 139, rare: 142 },
    220: { common: 137, rare: 0 },
    221: { common: 137, rare: 212 },
    222: { common: 0, rare: 48 },
    227: { common: 0, rare: 210 },
    230: { common: 0, rare: 201 },
    233: { common: 218, rare: 218 },
    241: { common: 29, rare: 29 },
    242: { common: 0, rare: 197 },
    251: { common: 141, rare: 141 },
};

const ITEM_NAMES: Readonly<
    Record<number, { en: string; zh: string }>
> = {
    0: { en: "None", zh: "无道具" },
    29: { en: "Moomoo Milk", zh: "哞哞鲜奶" },
    44: { en: "Berry Juice", zh: "树果汁" },
    48: { en: "Red Shard", zh: "红色碎片" },
    50: { en: "Yellow Shard", zh: "黄色碎片" },
    94: { en: "Moon Stone", zh: "月之石" },
    103: { en: "Tiny Mushroom", zh: "小蘑菇" },
    104: { en: "Big Mushroom", zh: "大蘑菇" },
    106: { en: "Pearl", zh: "珍珠" },
    107: { en: "Big Pearl", zh: "大珍珠" },
    108: { en: "Stardust", zh: "星星沙子" },
    109: { en: "Star Piece", zh: "星星碎片" },
    110: { en: "Nugget", zh: "金珠" },
    134: { en: "Chesto Berry", zh: "零余果" },
    136: { en: "Rawst Berry", zh: "莓莓果" },
    137: { en: "Aspear Berry", zh: "利木果" },
    139: { en: "Oran Berry", zh: "橙橙果" },
    140: { en: "Persim Berry", zh: "柿仔果" },
    141: { en: "Lum Berry", zh: "木子果" },
    142: { en: "Sitrus Berry", zh: "文柚果" },
    187: { en: "King's Rock", zh: "王者之证" },
    188: { en: "Silver Powder", zh: "银粉" },
    196: { en: "Focus Band", zh: "气势头带" },
    197: { en: "Lucky Egg", zh: "幸运蛋" },
    199: { en: "Metal Coat", zh: "金属膜" },
    201: { en: "Dragon Scale", zh: "龙之鳞片" },
    203: { en: "Soft Sand", zh: "柔软沙子" },
    204: { en: "Hard Stone", zh: "硬石头" },
    208: { en: "Magnet", zh: "磁铁" },
    210: { en: "Sharp Beak", zh: "锐利鸟嘴" },
    211: { en: "Poison Barb", zh: "毒针" },
    212: { en: "Never-Melt Ice", zh: "不融冰" },
    213: { en: "Spell Tag", zh: "咒术之符" },
    214: { en: "Twisted Spoon", zh: "弯曲的汤匙" },
    216: { en: "Dragon Fang", zh: "龙之牙" },
    218: { en: "Up-Grade", zh: "升级数据" },
    223: { en: "Metal Powder", zh: "金属粉" },
    224: { en: "Thick Club", zh: "粗骨头" },
    225: { en: "Stick", zh: "大葱" },
};

// Empirical English Switch FRLG profiles. Every entry is deliberately scoped
// by game, encounter category, location and Method; no global offset is
// assumed. Add future measurements here only. `alternateOffset` is the
// observed/possible asynchronous +1 path, not a second guaranteed result.
const HELD_OFFSET_PROFILES: readonly FrlgHeldOffsetProfile[] = [
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 8, method: WILD_1, baseOffset: 164, alternateOffset: 165, status: "verified", samples: 48 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 9, method: WILD_1, baseOffset: 164, alternateOffset: 165, status: "verified" },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 10, method: WILD_1, baseOffset: 164, alternateOffset: 165, status: "verified", samples: 57 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 10, method: WILD_2, baseOffset: 163, alternateOffset: 164, status: "verified", samples: 3 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 10, method: WILD_4, baseOffset: 163, alternateOffset: 164, status: "verified", samples: 19 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 13, method: WILD_1, baseOffset: 170, alternateOffset: 171, status: "variable", samples: 21 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 13, method: WILD_4, baseOffset: 169, alternateOffset: 170, status: "variable" },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 14, method: WILD_1, baseOffset: 170, alternateOffset: 171, status: "variable" },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 20, method: WILD_1, baseOffset: 170, alternateOffset: 171, status: "variable" },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 20, method: WILD_4, baseOffset: 169, alternateOffset: 170, status: "verified", samples: 6 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 27, method: WILD_1, baseOffset: 181, alternateOffset: 182, status: "verified", samples: 103 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 28, method: WILD_1, baseOffset: 165, alternateOffset: 166, status: "verified", samples: 43 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 34, method: WILD_1, baseOffset: 168, alternateOffset: 169, status: "verified", samples: 87 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 34, method: WILD_4, baseOffset: 167, alternateOffset: 168, status: "verified", samples: 12 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 38, method: WILD_1, baseOffset: 168, alternateOffset: 169, status: "variable" },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 38, method: WILD_2, baseOffset: 167, alternateOffset: 168, status: "variable" },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 38, method: WILD_4, baseOffset: 167, alternateOffset: 168, status: "variable" },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 39, method: WILD_1, baseOffset: 170, alternateOffset: 171, status: "verified", samples: 27 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 91, method: WILD_1, baseOffset: 166, alternateOffset: 167, status: "verified", samples: 24 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 99, method: WILD_1, baseOffset: 166, alternateOffset: 167, status: "verified", samples: 15 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 100, method: WILD_1, baseOffset: 166, alternateOffset: 167, status: "verified", samples: 7 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 100, method: WILD_2, baseOffset: 165, alternateOffset: 166, status: "verified", samples: 2 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 100, method: WILD_4, baseOffset: 165, alternateOffset: 166, status: "verified", samples: 5 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 101, method: WILD_1, baseOffset: 166, alternateOffset: 167, status: "verified" },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 101, method: WILD_4, baseOffset: 165, alternateOffset: 166, status: "verified" },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 110, method: WILD_1, baseOffset: 170, alternateOffset: 171, status: "verified", samples: 62 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 110, method: WILD_4, baseOffset: 169, alternateOffset: 170, status: "verified", samples: 16 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 111, method: WILD_1, baseOffset: 166, alternateOffset: 167, status: "verified", samples: 9 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 112, method: WILD_1, baseOffset: 166, alternateOffset: 167, status: "verified", samples: 29 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_GRASS, location: 112, method: WILD_4, baseOffset: 165, alternateOffset: 166, status: "verified", samples: 8 },

    // Safari Zone entrance/center Super Rod (Dragonair field tests).
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_SUPER_ROD, location: 20, method: WILD_1, baseOffset: 170, alternateOffset: 171, status: "variable", samples: 9 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_SUPER_ROD, location: 20, method: WILD_2, baseOffset: 169, alternateOffset: 170, status: "variable", samples: 1 },
    { game: Game.FireRed, encounterCategory: FRLG_HELD_ENCOUNTER_SUPER_ROD, location: 20, method: WILD_4, baseOffset: 169, alternateOffset: 170, status: "variable", samples: 3 },
];

export function getFrlgHeldItemSlots(
    species: number
): FrlgHeldItemSlots | undefined {
    const nationalDexSpecies = species & 0x7ff;
    if (
        nationalDexSpecies < 1 ||
        nationalDexSpecies > FRLG_MAX_NATIONAL_DEX_SPECIES
    ) {
        return undefined;
    }
    return (
        FRLG_HELD_ITEM_SLOTS[nationalDexSpecies] ?? { common: 0, rare: 0 }
    );
}

export function getFrlgHeldItemName(locale: Locale, itemId: number): string {
    return ITEM_NAMES[itemId]?.[locale] ?? `#${itemId}`;
}

export function getFrlgHeldItemForRoll(
    slots: FrlgHeldItemSlots,
    roll: number
): number {
    if (slots.common === slots.rare) {
        return slots.common;
    }
    if (roll >= 95) {
        return slots.rare;
    }
    if (roll >= 45) {
        return slots.common;
    }
    return 0;
}

export function getFrlgHeldItemProbabilities(
    slots: FrlgHeldItemSlots
): { itemId: number; percent: number }[] {
    const counts = new Map<number, number>();
    for (let roll = 0; roll < 100; roll += 1) {
        const itemId = getFrlgHeldItemForRoll(slots, roll);
        counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
    }
    return [...counts.entries()]
        .map(([itemId, percent]) => ({ itemId, percent }))
        .sort((left, right) => left.itemId - right.itemId);
}

export function advancePokeRng(seed: number, advances: number): number {
    let remaining = Math.max(0, Math.floor(advances));
    let accumulatedMultiplier = 1;
    let accumulatedIncrement = 0;
    let currentMultiplier = 0x41c64e6d;
    let currentIncrement = 0x6073;

    while (remaining > 0) {
        if (remaining % 2 === 1) {
            accumulatedIncrement =
                (Math.imul(currentMultiplier, accumulatedIncrement) +
                    currentIncrement) >>>
                0;
            accumulatedMultiplier = Math.imul(
                currentMultiplier,
                accumulatedMultiplier
            ) >>> 0;
        }

        currentIncrement =
            (Math.imul(currentMultiplier, currentIncrement) +
                currentIncrement) >>>
            0;
        currentMultiplier = Math.imul(
            currentMultiplier,
            currentMultiplier
        ) >>> 0;
        remaining = Math.floor(remaining / 2);
    }

    return (
        Math.imul(accumulatedMultiplier, seed >>> 0) +
        accumulatedIncrement
    ) >>> 0;
}

export function getFrlgHeldOffsetProfile(
    profileSet: string,
    game: number,
    encounterCategory: number,
    location: number,
    method: number
): FrlgHeldOffsetProfile | undefined {
    if (
        profileSet !== FRLG_HELD_PROFILE_ENGLISH_SWITCH
    ) {
        return undefined;
    }
    return HELD_OFFSET_PROFILES.find(
        (profile) =>
            profile.game === game &&
            profile.encounterCategory === encounterCategory &&
            profile.location === location &&
            profile.method === method
    );
}

export function getFrlgHeldOffsetProfiles(
    profileSet: string,
    game: number,
    encounterCategory: number,
    location: number,
    method: number
): FrlgHeldOffsetProfile[] {
    const methods =
        method === COMBINED_WILD_METHOD
            ? [WILD_1, WILD_2, WILD_4]
            : [method];
    return methods
        .map((candidateMethod) =>
            getFrlgHeldOffsetProfile(
                profileSet,
                game,
                encounterCategory,
                location,
                candidateMethod
            )
        )
        .filter(
            (profile): profile is FrlgHeldOffsetProfile =>
                profile !== undefined
        );
}

function predictAtOffset(
    iv2EndSeed: number,
    offset: number,
    slots: FrlgHeldItemSlots
): FrlgHeldRollPrediction {
    const seed = advancePokeRng(iv2EndSeed, offset);
    const roll = (seed >>> 16) % 100;
    return {
        offset,
        seed,
        roll,
        itemId: getFrlgHeldItemForRoll(slots, roll),
    };
}

export function getFrlgHeldSearchOffsets(
    h1StandardOffset: number,
    searchMode: FrlgHeldSearchMode
): number[] {
    if (!Number.isInteger(h1StandardOffset) || h1StandardOffset <= 0) {
        return [];
    }
    if (searchMode === FRLG_HELD_SEARCH_MODE_FIVE_TRACKS) {
        return [
            h1StandardOffset - 1,
            h1StandardOffset,
            h1StandardOffset + 1,
            h1StandardOffset + 2,
            h1StandardOffset + 3,
        ];
    }
    if (searchMode === FRLG_HELD_SEARCH_MODE_FOUR_TRACKS) {
        return [
            h1StandardOffset - 1,
            h1StandardOffset,
            h1StandardOffset + 1,
            h1StandardOffset + 2,
        ];
    }
    if (searchMode === FRLG_HELD_SEARCH_MODE_ALL_METHODS) {
        return [
            h1StandardOffset - 1,
            h1StandardOffset,
            h1StandardOffset + 1,
        ];
    }
    return [h1StandardOffset, h1StandardOffset + 1];
}

export function predictFrlgHeldItemAtOffsets({
    species,
    iv2EndSeed,
    offsets,
}: {
    species: number;
    iv2EndSeed: number;
    offsets: readonly number[];
}): FrlgHeldSearchPrediction | undefined {
    if (iv2EndSeed === 0 || offsets.length === 0) {
        return undefined;
    }
    const slots = getFrlgHeldItemSlots(species);
    if (!slots || offsets.some((offset) => offset < 0)) {
        return undefined;
    }
    return {
        slots,
        rolls: offsets.map((offset) =>
            predictAtOffset(iv2EndSeed, offset, slots)
        ),
    };
}

export function matchesFrlgHeldItemSearchFilter(
    prediction: FrlgHeldSearchPrediction | undefined,
    filter: number
): boolean {
    if (filter === HELD_ITEM_FILTER_ANY) {
        return true;
    }
    if (!prediction) {
        return false;
    }
    if (filter === HELD_ITEM_FILTER_ANY_ITEM) {
        return prediction.rolls.every((roll) => roll.itemId !== 0);
    }
    return prediction.rolls.every((roll) => roll.itemId === filter);
}

export function matchesFrlgHeldShinyFilter(
    row: { shiny: number },
    shiny: number
): boolean {
    // PokeFinder marks Gen 3 shinies as 1 (star) or 2 (square); "yes" must
    // match any shiny value, not just the star variant.
    if (shiny === 0) {
        return row.shiny === 0;
    }
    return row.shiny !== 0;
}

export function predictFrlgHeldItem({
    profileSet,
    game,
    encounterCategory,
    location,
    method,
    species,
    iv2EndSeed,
}: FrlgHeldPredictionContext & {
    method: number;
    species: number;
    iv2EndSeed: number;
}): FrlgHeldPrediction | undefined {
    const profile = getFrlgHeldOffsetProfile(
        profileSet,
        game,
        encounterCategory,
        location,
        method
    );
    if (!profile || iv2EndSeed === 0) {
        return undefined;
    }

    const slots = getFrlgHeldItemSlots(species);
    if (!slots) {
        return undefined;
    }
    return {
        slots,
        profile,
        baseline: predictAtOffset(iv2EndSeed, profile.baseOffset, slots),
        alternate: predictAtOffset(
            iv2EndSeed,
            profile.alternateOffset,
            slots
        ),
    };
}

export function matchesHeldItemFilter(
    prediction: FrlgHeldPrediction | undefined,
    filter: number
): boolean {
    if (filter === HELD_ITEM_FILTER_ANY) {
        return true;
    }
    if (!prediction) {
        return false;
    }
    if (filter === HELD_ITEM_FILTER_ANY_ITEM) {
        return prediction.baseline.itemId !== 0;
    }
    return prediction.baseline.itemId === filter;
}
