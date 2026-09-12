export type GameOption = { value: string; label: string };
export type EggMethodOption = { value: number; labelKey: string };
export type EggCompatibilityOption = { value: number; labelKey: string };
export type EggGenderOption = { value: number; labelKey: string };
export type EggIvPresetValue = "6v" | "0a" | "0s" | "0a0s";
export type EggIvPresetOption = { value: EggIvPresetValue; labelKey: string };
export type EggSeedSettings = {
    sound: string;
    buttonMode: string;
    seedButton: string;
    extraButton: string;
};
export type EggSeedWithSettings = { settings?: string };
export type SeedWithInitialSeed = { initialSeed: number };
export type EggCompareTimingRow = {
    heldSeedTime: number;
    pickupSeedTime: number;
    heldAdvances: number;
    pickupAdvances: number;
};
export type EggSeedSearchPhase<T> = {
    heldSeeds: T[];
    pickupSeeds: T[];
    pairOffset: number;
    pairCount: number;
};

export const DEFAULT_FRLG_EGG_METHOD = 12;
export const DEFAULT_FRLG_EGG_COMPATIBILITY = 20;
export const DEFAULT_FRLG_EGG_ADVANCE_RANGE = [1000, 5000] as const;
export const DEFAULT_FRLG_EGG_PARENT_IVS = [31, 31, 31, 31, 31, 31] as const;
export const DEFAULT_FRLG_EGG_MAX_RESULTS = 10;
export const DEFAULT_FRLG_EGG_SEED_SKIP_COUNT = 10;
export const DEFAULT_EGG_SEED_SETTINGS: EggSeedSettings = {
    sound: "mono",
    buttonMode: "h",
    seedButton: "a",
    extraButton: "none",
};

export const FRLG_EGG_METHODS: EggMethodOption[] = [
    { value: 11, labelKey: "options.normal" },
    { value: 12, labelKey: "options.split" },
    { value: 13, labelKey: "options.alternate" },
    { value: 14, labelKey: "options.mixed" },
];

export const FRLG_EGG_COMPATIBILITY_OPTIONS: EggCompatibilityOption[] = [
    { value: 20, labelKey: "options.eggCompatibilityLow" },
    { value: 50, labelKey: "options.eggCompatibilityMedium" },
    { value: 70, labelKey: "options.eggCompatibilityHigh" },
];

export const EGG_GENDER_OPTIONS: EggGenderOption[] = [
    { value: 0, labelKey: "options.male" },
    { value: 1, labelKey: "options.female" },
    { value: 2, labelKey: "options.genderless" },
    { value: 3, labelKey: "options.ditto" },
];

export const FRLG_EGG_IV_PRESETS: EggIvPresetOption[] = [
    { value: "6v", labelKey: "options.ivPreset6v" },
    { value: "0a", labelKey: "options.ivPreset0a" },
    { value: "0s", labelKey: "options.ivPreset0s" },
    { value: "0a0s", labelKey: "options.ivPreset0a0s" },
];

export function isFrlgEggGame(game: string): boolean {
    return game.startsWith("fr") || game.startsWith("lg");
}

export function filterFrlgEggGameOptions(options: GameOption[]): GameOption[] {
    return options.filter((option) => isFrlgEggGame(option.value));
}

export function buildSeedSettingKey(sound: string, buttonMode: string, seedButton: string): string {
    return `${sound}_${buttonMode}_${seedButton}`;
}

export function buildEggSeedSettings(settings: EggSeedSettings): string {
    return `${buildSeedSettingKey(settings.sound, settings.buttonMode, settings.seedButton)}_${settings.extraButton}`;
}

export function parseEggSeedSettings(settings: string | undefined): EggSeedSettings {
    const parts = settings?.split("_") ?? [];
    if (parts.length < 4) {
        return { ...DEFAULT_EGG_SEED_SETTINGS };
    }

    return {
        sound: parts[0] || DEFAULT_EGG_SEED_SETTINGS.sound,
        buttonMode: parts[1] || DEFAULT_EGG_SEED_SETTINGS.buttonMode,
        seedButton: parts[2] || DEFAULT_EGG_SEED_SETTINGS.seedButton,
        extraButton: parts.slice(3).join("_") || DEFAULT_EGG_SEED_SETTINGS.extraButton,
    };
}

export function isCompatibleEggParentPair(parentAGender: number, parentBGender: number): boolean {
    if (parentAGender === 0 && parentBGender === 1) {
        return true;
    }

    if (parentAGender === 1 && parentBGender === 0) {
        return true;
    }

    return parentAGender !== parentBGender && (parentAGender === 3 || parentBGender === 3);
}

export function calculateEggSearchProgress(
    completedNatureFilters: number,
    totalNatureFilters: number,
    checkedSeedPairs: number,
    totalSeedPairs: number
): number {
    if (totalNatureFilters <= 0 || totalSeedPairs <= 0) {
        return 0;
    }

    const completedUnits = Math.max(0, completedNatureFilters) * totalSeedPairs;
    const currentUnits = Math.max(0, checkedSeedPairs);
    const totalUnits = totalNatureFilters * totalSeedPairs;
    const progress = ((completedUnits + currentUnits) / totalUnits) * 100;

    return Math.min(100, Math.max(0, progress));
}

export function isNoExtraButtonEggSeed(seed: EggSeedWithSettings): boolean {
    return seed.settings?.endsWith("_none") === true;
}

export function getPreferredEggSeedSettings(
    seeds: EggSeedWithSettings[]
): string | null {
    return (
        seeds.find(isNoExtraButtonEggSeed)?.settings ??
        seeds.find((seed) => seed.settings !== undefined)?.settings ??
        null
    );
}

export function skipEggSeedTableEntries<T extends EggSeedWithSettings>(
    seeds: T[],
    skipCount: number
): T[] {
    if (skipCount <= 0) {
        return seeds;
    }

    const settingCounts = new Map<string, number>();
    return seeds.filter((seed) => {
        const settings = seed.settings ?? "";
        const settingIndex = settingCounts.get(settings) ?? 0;
        settingCounts.set(settings, settingIndex + 1);
        return settingIndex >= skipCount;
    });
}

export function countMatchingInitialSeedPairs<
    T extends SeedWithInitialSeed,
    U extends SeedWithInitialSeed,
>(heldSeeds: T[], pickupSeeds: U[]): number {
    const pickupCounts = new Map<number, number>();
    for (const seed of pickupSeeds) {
        pickupCounts.set(
            seed.initialSeed,
            (pickupCounts.get(seed.initialSeed) ?? 0) + 1
        );
    }

    return heldSeeds.reduce(
        (total, seed) => total + (pickupCounts.get(seed.initialSeed) ?? 0),
        0
    );
}

export function buildEggSeedSearchPhases<
    T extends EggSeedWithSettings & SeedWithInitialSeed,
>(
    seeds: T[],
    sameInitialSeedOnly = false
): EggSeedSearchPhase<T>[] {
    const noExtraSeeds = seeds.filter(isNoExtraButtonEggSeed);
    const extraSeeds = seeds.filter((seed) => !isNoExtraButtonEggSeed(seed));
    const orderedGroups: [T[], T[]][] = [
        [noExtraSeeds, noExtraSeeds],
        [noExtraSeeds, extraSeeds],
        [extraSeeds, noExtraSeeds],
        [extraSeeds, extraSeeds],
    ];
    const phases: EggSeedSearchPhase<T>[] = [];
    let pairOffset = 0;

    for (const [heldSeeds, pickupSeeds] of orderedGroups) {
        const pairCount = sameInitialSeedOnly
            ? countMatchingInitialSeedPairs(heldSeeds, pickupSeeds)
            : heldSeeds.length * pickupSeeds.length;
        if (pairCount === 0) {
            continue;
        }
        phases.push({ heldSeeds, pickupSeeds, pairOffset, pairCount });
        pairOffset += pairCount;
    }

    return phases;
}

export function getSeedRangeAroundTarget<T extends SeedWithInitialSeed>(
    seeds: T[],
    targetSeed: number,
    leeway: number
): T[] {
    const targetIndex = seeds.findIndex((seed) => seed.initialSeed === targetSeed);
    if (targetIndex === -1) {
        return [];
    }

    return seeds.slice(
        Math.max(0, targetIndex - leeway),
        Math.min(seeds.length, targetIndex + leeway + 1)
    );
}

export function buildFrameLeewayRange(frame: number, leeway: number): [number, number] {
    return [Math.max(0, frame - leeway), frame + leeway];
}

export function applyEggIvPreset(
    preset: EggIvPresetValue
): [string, string][] {
    const ranges: [string, string][] = DEFAULT_FRLG_EGG_PARENT_IVS.map(() => [
        "31",
        "31",
    ]);

    if (preset === "0a" || preset === "0a0s") {
        ranges[1] = ["0", "0"];
    }
    if (preset === "0s" || preset === "0a0s") {
        ranges[5] = ["0", "0"];
    }

    return ranges;
}

export function paginateEggResults<T>(
    rows: T[],
    page: number,
    rowsPerPage: number
): T[] {
    return rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
}

export function formatEggSeedTime(
    seedTime: number,
    gameConsole: string,
    frameToMs: (frame: number, system: string) => number
): number {
    return frameToMs(seedTime / 16, gameConsole);
}

export function formatEggSearchError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === "string") {
        return error;
    }
    if (error && typeof error === "object") {
        const message = Reflect.get(error, "message");
        if (typeof message === "string" && message.length > 0) {
            return message;
        }
        try {
            return JSON.stringify(error);
        } catch {
            return String(error);
        }
    }
    return String(error);
}

export function getEggSeedTimeOffset(
    seedTime: number,
    targetSeedTime: number,
    gameConsole: string,
    frameToMs: (frame: number, system: string) => number
): number {
    return (
        formatEggSeedTime(seedTime, gameConsole, frameToMs) -
        formatEggSeedTime(targetSeedTime, gameConsole, frameToMs)
    );
}

export function getEggCompareDeltas(
    row: EggCompareTimingRow,
    baseline: EggCompareTimingRow,
    gameConsole: string,
    frameToMs: (frame: number, system: string) => number
) {
    return {
        heldSeedTime: getEggSeedTimeOffset(
            row.heldSeedTime,
            baseline.heldSeedTime,
            gameConsole,
            frameToMs
        ),
        pickupSeedTime: getEggSeedTimeOffset(
            row.pickupSeedTime,
            baseline.pickupSeedTime,
            gameConsole,
            frameToMs
        ),
        heldAdvances: row.heldAdvances - baseline.heldAdvances,
        pickupAdvances: row.pickupAdvances - baseline.pickupAdvances,
    };
}

export function formatInheritanceSlot(value: number): string {
    if (value === 1) {
        return "A";
    }

    if (value === 2) {
        return "B";
    }

    return "";
}
