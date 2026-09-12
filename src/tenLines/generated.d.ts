/* eslint-disable @typescript-eslint/no-explicit-any */
export interface FRLGContiguousSeedEntry {
    seedTime: number;
    initialSeed: number;
    settings?: string;
    [key: string]: any;
}
export interface IVRange {
    min: number;
    max: number;
}

export interface InitialSeedResult {
    advances: number;
    seedTime: number;
    seed: number;
    [key: string]: any;
}

export interface InitialSeedReachability {
    reachable: boolean;
    advances: number;
    [key: string]: any;
}

export interface EnumeratedStaticTemplate3 {
    index: number;
    version: number;
    species: number;
    form: number;
    shiny: number;
    level: number;
    [key: string]: any;
}

export interface ExtendedGeneratorState {
    advances: number;
    pid: number;
    nature: number;
    ability: number;
    abilityIndex: number;
    gender: number;
    ivs: [number, number, number, number, number, number];
    stats: [number, number, number, number, number, number];
    shiny: number;
    seedTime: number;
    initialSeed: number;
    ttvAdvances: number;
    hiddenPower: number;
    hiddenPowerStrength: number;
    [key: string]: any;
}

export interface ExtendedWildGeneratorState extends ExtendedGeneratorState {
    iv2EndSeed: number;
    encounterSlot: number;
    species: number;
    form: number;
    level: number;
    method: number;
}

export interface ExtendedEggGeneratorState {
    heldInitialSeed: number;
    heldSeedTime: number;
    heldSettings: string;
    pickupInitialSeed: number;
    pickupSeedTime: number;
    pickupSettings: string;
    heldAdvances: number;
    pickupAdvances: number;
    pid: number;
    nature: number;
    ability: number;
    abilityIndex: number;
    gender: number;
    ivs: [number, number, number, number, number, number];
    stats: [number, number, number, number, number, number];
    shiny: number;
    hiddenPower: number;
    hiddenPowerStrength: number;
    inheritance: [number, number, number, number, number, number];
    [key: string]: any;
}

export interface ExtendedSearcherState {
    seed: number;
    pid: number;
    nature: number;
    ability: number;
    abilityIndex: number;
    gender: number;
    ivs: [number, number, number, number, number, number];
    shiny: number;
    hiddenPower: number;
    hiddenPowerStrength: number;
    [key: string]: any;
}

export interface ExtendedWildSearcherState extends ExtendedSearcherState {
    iv2EndSeed: number;
    encounterSlot: number;
    species: number;
    form: number;
    level: number;
    method: number;
}

export interface ExtendedIDState {
    advances: number;
    tid: number;
    sid: number;
    tsv: number;
    [key: string]: any;
}

export interface StatsOcrResult {
    hp: string;
    attack: string;
    defense: string;
    specialAttack: string;
    specialDefense: string;
    speed: string;
    recognizedCount: number;
}

export interface MainModule {
    check_seeds_static: (...args: any[]) => any;
    check_seeds_wild: (...args: any[]) => any;
    check_seeds_wild_limited: (...args: any[]) => any;
    check_seeds_frlg_egg: (...args: any[]) => any;
    calc_ivs_static: (...args: any[]) => IVRange[] | Promise<IVRange[]>;
    calc_ivs_generic: (...args: any[]) => IVRange[] | Promise<IVRange[]>;
    get_contiguous_seed_list: (...args: any[]) => FRLGContiguousSeedEntry[] | Promise<FRLGContiguousSeedEntry[]>;
    get_all_contiguous_seed_list: (...args: any[]) => FRLGContiguousSeedEntry[] | Promise<FRLGContiguousSeedEntry[]>;
    search_seeds_static: (...args: any[]) => any;
    search_seeds_wild: (...args: any[]) => any;
    search_frlge_id_combos: (...args: any[]) => any;
    filter_reachable_target_seeds: (...args: any[]) => InitialSeedReachability[] | Promise<InitialSeedReachability[]>;
    filter_reachable_target_seeds_with_sound: (...args: any[]) => InitialSeedReachability[] | Promise<InitialSeedReachability[]>;
    get_static_template_info: (...args: any[]) => EnumeratedStaticTemplate3[] | Promise<EnumeratedStaticTemplate3[]>;
    get_wild_locations: (...args: any[]) => any;
    get_area_species: (...args: any[]) => any;
    ten_lines_painting: (...args: any[]) => any;
    ten_lines_frlg: (...args: any[]) => any;
    recognize_stats_roi: (
        rgbaPixels: Uint8Array,
        width: number,
        height: number
    ) => StatsOcrResult | Promise<StatsOcrResult>;
}
