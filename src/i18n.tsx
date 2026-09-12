import { createContext, useContext } from "react";

import abilities_en_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/en/abilities_en.txt?raw";
import e_en_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/en/e_en.txt?raw";
import forms_en_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/en/forms_en.txt?raw";
import frlg_en_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/en/frlg_en.txt?raw";
import natures_en_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/en/natures_en.txt?raw";
import powers_en_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/en/powers_en.txt?raw";
import rs_en_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/en/rs_en.txt?raw";
import species_en_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/en/species_en.txt?raw";
import natures_ja_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/ja/natures_ja.txt?raw";
import abilities_zh_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/zh/abilities_zh.txt?raw";
import e_zh_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/zh/e_zh.txt?raw";
import forms_zh_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/zh/forms_zh.txt?raw";
import frlg_zh_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/zh/frlg_zh.txt?raw";
import natures_zh_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/zh/natures_zh.txt?raw";
import powers_zh_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/zh/powers_zh.txt?raw";
import rs_zh_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/zh/rs_zh.txt?raw";
import species_zh_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/zh/species_zh.txt?raw";
import useLocalStorage from "./hooks/useLocalStorage";
import {
    POKE_FINDER_ZH_ABILITY_OVERRIDES_BY_ID,
    POKE_FINDER_ZH_FRLG_LOCATION_OVERRIDES,
    POKE_FINDER_ZH_SPECIES_OVERRIDES,
} from "./pokeFinderZhOverrides";
import {
    COMBINED_WILD_METHOD,
    Game,
    STATIC_1,
    STATIC_2,
    STATIC_4,
    WILD_1,
    WILD_2,
    WILD_4,
} from "./tenLines";

export type Locale = "en" | "zh";

type TranslationValue = string | { [key: string]: TranslationValue };

type I18nContextValue = {
    locale: Locale;
    setLocale: (locale: Locale) => void;
};

type ResourceBundle = {
    methods: Record<number, string>;
    genders: string[];
    shininess: string[];
    natures: string[];
    abilities: string[];
    species: string[];
    forms: Record<string, string>;
    types: string[];
    frlgLocations: Record<string, string>;
    rsLocations: Record<string, string>;
    eLocations: Record<string, string>;
    games: Record<number, string>;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const parseList = (text: string) =>
    text
        .replace(/^\uFEFF/, "")
        .split("\n")
        .map((line) => line.trim().replace(/^\uFEFF/, ""))
        .filter((line) => line !== "");

const parseMap = (text: string) =>
    Object.fromEntries(
        parseList(text).map((line) => {
            const [key, ...rest] = line.split(",");
            return [key, rest.join(",")];
        })
    );

const applyListOverrides = (
    values: string[],
    overrides: Record<number, string>
) => {
    const result = [...values];
    for (const [index, value] of Object.entries(overrides)) {
        result[Number(index)] = value;
    }
    return result;
};

const applyOneBasedListOverrides = (
    values: string[],
    overrides: Record<number, string>
) => {
    const result = [...values];
    for (const [id, value] of Object.entries(overrides)) {
        result[Number(id) - 1] = value;
    }
    return result;
};

const applyMapOverrides = (
    values: Record<string, string>,
    overrides: Record<number, string>
) => ({
    ...values,
    ...overrides,
});

export const EN_NATURES = parseList(natures_en_txt);
export const JA_NATURES = parseList(natures_ja_txt);
export const ZH_NATURES_RAW = parseList(natures_zh_txt);
export const ZH_NATURES = ZH_NATURES_RAW.map((nature, index) => {
    const english = EN_NATURES[index];
    return english ? `${nature} (${english})` : nature;
});
const ZH_ABILITIES = applyOneBasedListOverrides(
    parseList(abilities_zh_txt),
    POKE_FINDER_ZH_ABILITY_OVERRIDES_BY_ID
);
const ZH_SPECIES = applyListOverrides(
    ["\u86cb", ...parseList(species_zh_txt)],
    POKE_FINDER_ZH_SPECIES_OVERRIDES
);
const ZH_FRLG_LOCATIONS = applyMapOverrides(
    parseMap(frlg_zh_txt),
    POKE_FINDER_ZH_FRLG_LOCATION_OVERRIDES
);

const RESOURCES: Record<Locale, ResourceBundle> = {
    en: {
        methods: {
            [STATIC_1]: "Static 1",
            [STATIC_2]: "Static 2",
            [STATIC_4]: "Static 4",
            [WILD_1]: "Wild 1",
            [WILD_2]: "Wild 2",
            [WILD_4]: "Wild 4",
            [COMBINED_WILD_METHOD]: "All Wild Methods",
        },
        genders: ["\u2642", "\u2640", "-"],
        shininess: ["No", "Star", "Square"],
        natures: parseList(natures_en_txt),
        abilities: parseList(abilities_en_txt),
        species: ["Egg", ...parseList(species_en_txt)],
        forms: Object.fromEntries(
            parseList(forms_en_txt).map((line) => {
                const [species, form, name] = line.split(",");
                return [`${species}-${form}`, name];
            })
        ),
        types: parseList(powers_en_txt),
        frlgLocations: parseMap(frlg_en_txt),
        rsLocations: parseMap(rs_en_txt),
        eLocations: parseMap(e_en_txt),
        games: {
            [Game.None]: "None",
            [Game.Ruby]: "Ruby",
            [Game.Sapphire]: "Sapphire",
            [Game.RS]: "Ruby & Sapphire",
            [Game.Emerald]: "Emerald",
            [Game.Ruby | Game.Emerald]: "Ruby & Emerald",
            [Game.Sapphire | Game.Emerald]: "Sapphire & Emerald",
            [Game.RSE]: "Ruby, Sapphire & Emerald",
            [Game.FireRed]: "FireRed",
            [Game.LeafGreen]: "LeafGreen",
            [Game.FRLG]: "FireRed & LeafGreen",
            [Game.FRLG | Game.Emerald]: "FireRed, LeafGreen & Emerald",
            [Game.Gen3]: "Generation 3",
        },
    },
    zh: {
        methods: {
            [STATIC_1]: "\u9759\u6001 1",
            [STATIC_2]: "\u9759\u6001 2",
            [STATIC_4]: "\u9759\u6001 4",
            [WILD_1]: "\u91ce\u751f 1",
            [WILD_2]: "\u91ce\u751f 2",
            [WILD_4]: "\u91ce\u751f 4",
            [COMBINED_WILD_METHOD]: "\u5168\u90e8\u91ce\u751f\u65b9\u6cd5",
        },
        genders: ["\u2642", "\u2640", "-"],
        shininess: ["\u5426", "\u661f\u95ea", "\u65b9\u95ea"],
        natures: ZH_NATURES,
        abilities: ZH_ABILITIES,
        species: ZH_SPECIES,
        forms: Object.fromEntries(
            parseList(forms_zh_txt).map((line) => {
                const [species, form, name] = line.split(",");
                return [`${species}-${form}`, name];
            })
        ),
        types: parseList(powers_zh_txt),
        frlgLocations: ZH_FRLG_LOCATIONS,
        rsLocations: parseMap(rs_zh_txt),
        eLocations: parseMap(e_zh_txt),
        games: {
            [Game.None]: "\u65e0",
            [Game.Ruby]: "\u7ea2\u5b9d\u77f3",
            [Game.Sapphire]: "\u84dd\u5b9d\u77f3",
            [Game.RS]: "\u7ea2\u5b9d\u77f3 / \u84dd\u5b9d\u77f3",
            [Game.Emerald]: "\u7eff\u5b9d\u77f3",
            [Game.Ruby | Game.Emerald]:
                "\u7ea2\u5b9d\u77f3 / \u7eff\u5b9d\u77f3",
            [Game.Sapphire | Game.Emerald]:
                "\u84dd\u5b9d\u77f3 / \u7eff\u5b9d\u77f3",
            [Game.RSE]:
                "\u7ea2\u5b9d\u77f3 / \u84dd\u5b9d\u77f3 / \u7eff\u5b9d\u77f3",
            [Game.FireRed]: "\u706b\u7ea2",
            [Game.LeafGreen]: "\u53f6\u7eff",
            [Game.FRLG]: "\u706b\u7ea2 / \u53f6\u7eff",
            [Game.FRLG | Game.Emerald]:
                "\u706b\u7ea2 / \u53f6\u7eff / \u7eff\u5b9d\u77f3",
            [Game.Gen3]: "\u7b2c\u4e09\u4e16\u4ee3",
        },
    },
};

const TRANSLATIONS: Record<Locale, TranslationValue> = {
    en: {
        tabs: {
            searcher: "Searcher",
            heldItems: "Held Items",
            idCombo: "ID Combo",
            initialSeed: "Initial Seed",
            calibration: "Calibration",
            bingo: "Bingo",
            egg: "Egg",
            eggSearch: "Egg Searcher",
            eggCalibration: "Egg Calibration",
        },
        language: {
            chinese: "中文",
            english: "English",
        },
        common: {
            submit: "Submit",
            searching: "Searching...",
            loadingResources:
                "Loading resources. The first load may take a moment...",
            resourceLoadFailed:
                "Failed to load resources. Refresh the page to retry.",
            noOptions: "No options available",
            any: "Any",
            none: "None",
            filter: "Filter",
            showSeeds: "Show Seeds",
            reset: "Reset",
            close: "Close",
            mono: "Mono",
            stereo: "Stereo",
        },
        footer: {
            credit:
                'Original "10 lines" was created by Shao, FRLG seeds farmed by blisy, po, HunarPG, 10Ben, Real96, Papa Jefé, and トノ',
            poweredBy: "Powered by",
            siteUpdatedAt: "Website updated at",
            seedDataAsOf: "FRLG seed data as of",
        },
        labels: {
            minimum: "Minimum",
            maximum: "Maximum",
            game: "Game",
            sound: "Sound",
            buttonMode: "Button Mode",
            seedButton: "Seed Button",
            extraButton: "Extra Button",
            console: "Console",
            targetSeed: "Target Seed",
            seedLeeway: "Seed +/-",
            advances: "Advances",
            finalAPressFrame: "Final A Press Frame",
            offset: "Offset",
            teachyTvAdvances: "TeachyTV Advances",
            requiredOverworldFrames: "Required Overworld Frames",
            teachyTvMode: "TeachyTV Mode",
            trainerId: "Trainer ID",
            secretId: "Secret ID",
            method: "Method",
            shininess: "Shininess",
            nature: "Nature",
            gender: "Gender",
            hiddenPower: "Hidden Power",
            ability: "Ability",
            perfectIvCount: "Perfect IV Count",
            perfectIvPreset: "Perfect IV Preset",
            category: "Category",
            pokemon: "Pokemon",
            location: "Location",
            lead: "Lead",
            resultCount: "Result Count",
            allowedAdvances: "Allowed Advances",
            maxResults: "Max Results",
            tidFilter: "TID Filter",
            sidFilter: "SID Filter",
            ivCalculator: "IV Calculator",
            minimumAdvancesOutsideTeachyTv:
                "Minimum Advances Outside of TeachyTV",
            heldSeedSettings: "Egg Generation Seed Settings",
            pickupSeedSettings: "Egg Pickup Seed Settings",
            heldAdvances: "Egg Generation Advances",
            pickupAdvances: "Egg Pickup Advances",
            heldOffset: "Egg Generation Offset",
            pickupOffset: "Egg Pickup Offset",
            eggSettings: "Egg Settings",
            eggGeneration: "Egg Generation",
            eggPickup: "Egg Pickup",
            eggMethod: "Egg Method",
            eggSpecies: "Egg Species",
            childInfo: "Child Info",
            seedPairCount: "Seed Pair Count",
            usePidFilter: "Filter by PID",
            parentA: "Parent A",
            parentB: "Parent B",
            compatibility: "Compatibility",
            parentIvs: "Parent IVs",
            parentGender: "Parent Gender",
            ivPreset: "IV Preset",
            bingoTvFluctuationMode: "TV Fluctuation Mode",
            showInheritance: "Show Inheritance",
            skipEarlyEggSeeds:
                "Skip the first {count} seeds in each seed table",
            sameEggInitialSeed:
                "Use the same seed for egg generation and pickup",
        },
        options: {
            rubyPaintingSeed: "Ruby Painting Seed",
            sapphirePaintingSeed: "Sapphire Painting Seed",
            emeraldPaintingSeed: "Emerald Painting Seed",
            emerald: "Emerald",
            fireRedEng: "FireRed (ENG)",
            fireRedEu: "FireRed (SPA/FRE/ITA/GER)",
            fireRedJpn10: "FireRed (JPN) (1.0)",
            fireRedJpn11: "FireRed (JPN) (1.1)",
            switchFireRed: "Switch FireRed (ENG/SPA/FRE/ITA/GER)",
            switchFireRedJpn: "Switch FireRed (JPN)",
            fireRedMgba: "FireRed (ENG) (MGBA 10.5)",
            leafGreenEng: "LeafGreen (ENG)",
            leafGreenEu: "LeafGreen (SPA/FRE/ITA/GER)",
            leafGreenJpn: "LeafGreen (JPN)",
            switchLeafGreen: "Switch LeafGreen (ENG/SPA/FRE/ITA/GER)",
            switchLeafGreenJpn: "Switch LeafGreen (JPN)",
            leafGreenMgba: "LeafGreen (ENG) (MGBA 10.5)",
            help: "Help",
            startupSelect: "Startup Select",
            startupA: "Startup A",
            blackoutR: "Blackout R",
            blackoutA: "Blackout A",
            blackoutL: "Blackout L",
            blackoutAL: "Blackout A+L",
            switch1: "Nintendo Switch 1",
            switch2: "Nintendo Switch 2",
            gba: "Game Boy Advance",
            gbp: "Game Boy Player",
            nds: "Nintendo DS",
            firm3ds: "Nintendo 3DS (open_agb_firm)",
            star: "Star",
            square: "Square",
            starSquare: "Star/Square",
            starters: "Starters",
            fossils: "Fossils",
            gifts: "Gifts",
            gameCorner: "Game Corner",
            stationary: "Stationary",
            legends: "Legends",
            events: "Events",
            roamers: "Roamers",
            blisyEvents: "Blisy's E-Reader Events",
            grass: "Grass",
            rockSmash: "Rock Smash",
            surfing: "Surfing",
            oldRod: "Old Rod",
            goodRod: "Good Rod",
            superRod: "Super Rod",
            femaleCuteCharm: "Female Cute Charm",
            maleCuteCharm: "Male Cute Charm",
            magnetPull: "Magnet Pull",
            static: "Static",
            hustlePressureVitalSpirit: "Hustle/Pressure/Vital Spirit",
            matchingSynchronize: "Matching Synchronize",
            perfect1v: "1V",
            perfect2v: "2V",
            perfect3v: "3V",
            perfect4v: "4V",
            perfect5v: "5V",
            perfect6v: "6V",
            ivPreset6v: "6V",
            ivPreset0a: "0A",
            ivPreset0s: "0S",
            ivPreset0a0s: "0A0S",
            shinyLocked: "Shiny Locked",
            lockBreak: "Lock Break",
            start: "Start",
            select: "Select",
            startup: "Startup",
            blackout: "Blackout",
            yes: "Yes",
            no: "No",
            normal: "Normal",
            split: "Split",
            alternate: "Alternate",
            mixed: "Mixed",
            eggCompatibilityLow:
                "The two don't seem to like each other",
            eggCompatibilityMedium: "The two seem to get along",
            eggCompatibilityHigh:
                "The two seem to get along very well",
            rsfrlgBred: "RS/FRLG Bred",
            rsfrlgBredSplit: "RS/FRLG Bred Split",
            rsfrlgBredAlternate: "RS/FRLG Bred Alternate",
            rsfrlgBredMixed: "RS/FRLG Bred Mixed",
            male: "Male",
            female: "Female",
            genderless: "Genderless",
            ditto: "Ditto",
        },
        table: {
            actions: "Actions",
            seed: "Seed",
            advances: "Advances",
            method: "Method",
            finalAPressFrame: "Final A Press Frame",
            teachyTvAdvances: "TeachyTV Advances",
            continueScreenFrames: "Continue Screen Frames",
            slot: "Slot",
            level: "Level",
            pid: "PID",
            shiny: "Shiny",
            nature: "Nature",
            stats: "Stats",
            ability: "Ability",
            ivs: "IVs",
            hidden: "Hidden",
            power: "Power",
            gender: "Gender",
            rowsPerPage: "Rows per page",
            minReachableAdvances: "Min Reachable Advances",
            openInInitialSeed: "Open In Initial Seed",
            openInCalibration: "Open In Calibration",
            openInEggCalibration: "Open In Egg Calibration",
            matchingTargets: "Matching Targets",
            exampleSeed: "Example Seed",
            examplePid: "Example PID",
            seedDec: "Seed (dec)",
            seedHex: "Seed (hex)",
            estimatedTotalFrames: "Estimated Total Frames",
            estimatedTotalTime: "Estimated Total Time",
            seedTime: "Seed Time",
            settings: "Calibration Page Settings",
            calibration: "Calibration",
            initialSeed: "Initial Seed",
            heldSeed: "Egg Generation Seed",
            heldSeedTime: "Egg Generation Seed Time",
            heldSettings: "Egg Generation Settings",
            heldAdvances: "Egg Generation Advances",
            pickupSeed: "Egg Pickup Seed",
            pickupSeedTime: "Egg Pickup Seed Time",
            pickupSettings: "Egg Pickup Settings",
            pickupAdvances: "Egg Pickup Advances",
            inheritance: "Inheritance",
            heldItem: "Held Item (Experimental)",
            heldRng: "Held-item RNG",
        },
        heldItems: {
            pageTitle: "FRLG Wild Held Items",
            pageDescription:
                "Search English Switch FireRed or LeafGreen H1 frames for grass/caves, Rock Smash, Surfing, and all three rods. Tested Offset presets currently apply to FireRed only.",
            separatePageNotice:
                "Search-specific settings and results stay independent. Game, console, TID, and SID are shared across pages.",
            seedAndAdvanceInstruction:
                "Held-item prediction does not require TID, SID, or IV filters. Enter an initial seed and an Advance range; IVs remain visible in the results only.",
            advanceSearchTooLarge:
                "The selected range contains {count} Advances. Limit one search to {limit} Advances or fewer.",
            searchMode: "Search mode",
            searchModeH1Stable: "H1 stable (O / O+1)",
            searchModeAllMethods: "H1/H2/H4 coverage (O-1 / O / O+1)",
            searchModeFourTracks:
                "Four-track coverage: O-1 / O / O+1 / O+2",
            searchModeFiveTracks:
                "Five-track coverage: O-1 / O / O+1 / O+2 / O+3",
            searchModeFiveTracksSymmetric:
                "Five-track symmetric: O-2 / O-1 / O / O+1 / O+2",
            searchModeH1StableHelp:
                "Uses the standard H1 offset O and its possible +1 path O+1. During held-item filtering, both tracks must match the selected item.",
            searchModeAllMethodsHelp:
                "Uses O-1, O, and O+1 to cover the observed H2/H4 = H1-1 rule and the possible +1 path. During held-item filtering, all three tracks must match.",
            searchModeFourTracksHelp:
                "Uses O-1, O, O+1, and O+2 for wider adjacent-path coverage. During held-item filtering, all four tracks must match.",
            searchModeFiveTracksHelp:
                "Uses O-1, O, O+1, O+2, and O+3 for the widest adjacent-path coverage. During held-item filtering, all five tracks must match.",
            searchModeFiveTracksSymmetricHelp:
                "Uses O-2, O-1, O, O+1, and O+2 for symmetric adjacent-path coverage. During held-item filtering, all five tracks must match.",
            searchModeShinyHelp:
                "In shiny + frame range mode, this selection controls the held-item tracks shown in results but does not filter any result.",
            standardOffset: "H1 standard Offset (O)",
            offsetPresetAvailable:
                "Preset H1 Offset: +{offset}. This mode checks {offsets}; you may edit the preset.",
            offsetPresetUnknown:
                "No tested preset exists for this location. Offset 0 means unknown; enter the H1 standard Offset before searching.",
            offsetRequired:
                "Enter an H1 standard Offset greater than 0 before filtering or searching.",
            enableSweetScentProfile:
                "Use English Switch FRLG held-item profiles (experimental)",
            sourceData: "FRLG source item rates:",
            profileAvailable:
                "FireRed field-tested profile: {profiles}.",
            profileUnavailable:
                "No field-tested FireRed H1 Offset exists for this location. It defaults to 0 and can be entered manually.",
            interferenceWarning:
                "NPC or asynchronous RNG can move the held-item call. The selected search mode explicitly checks its required adjacent paths.",
            samples: "{count} samples",
            baseline: "Baseline",
            alternate: "Possible +1",
            verifiedProfile: "Field-tested baseline",
            variableProfile: "Observed dual-path profile",
            filter: "Held-item filter (experimental)",
            filterAny: "Any result",
            filterAnyItem: "Any held item",
            filterUnavailable:
                "Exact filtering requires a stable field-tested baseline; variable dual-path profiles stay display-only.",
            searchFailed: "Held-item search failed: {error}",
            noResults: "No matching held-item results were found.",
            resultCount: "Showing {count} results (up to {limit}).",
            shinyOnlyMode: "Shiny + frame range mode",
            shinyOnlyModeHelp:
                "Searches the entire seed library ({count} seeds) and filters only by shiny status and the Advance range based on the entered TID/SID. The selected Offset coverage is display-only. WASM stops after {limit} matching results.",
            shinyFilter: "Shiny filter",
            noResultsShiny: "No matching shiny results were found.",
            shinySearchWorkload:
                "This search covers {frames} frames ({seeds} seeds × {advances} Advances per seed) and may take a long time.",
        },
        compare: {
            title: "Calibration Compare",
            target: "Target",
            history: "History",
            record: "Record",
            settings: "Calibration Page Settings",
            floatWindow: "Float Window",
            minimize: "Minimize",
            settingsShort: "Set",
            clearAll: "Clear All",
            clearHistory: "Clear History",
            clearShort: "Clr",
            delete: "Delete",
            deleteTarget: "Delete Target",
            emptyTarget: "Add a result as the target to start comparing.",
            emptyHistory: "Historical results added later will appear here.",
            display: "Display",
            enable: "Enable compare table",
            enableCalculator: "Enable calculator",
            autoAddTarget: "Auto-add calibration target",
            position: "Panel Position",
            positionLeft: "Left",
            positionRight: "Right",
            compareMode: "Comparison Mode",
            modeTarget: "Always compare with target",
            modePrevious: "Compare with previous history entry",
            visibleColumns: "Visible Columns",
            resultVisibleColumns: "Result Table Columns",
            addToTarget: "Add to Target",
            addToHistory: "Add to History",
            reAddHistory: "Add to History Again",
            addedTarget: "Added as target",
            addedHistory: "Added to history",
            resultsTitle: "Calibration Results",
            calculator: "Calculator",
            wildLevelFilter: "Filter wild results by the first IV line level",
            historyWildDetails: "Pokemon / Level",
            historyWildDetailsToggle:
                "Show Pokemon species and level in history",
            manualTeachyTVToggle:
                "Allow manual TeachyTV mode toggle in calibration",
            wildLevelFilterStaticHint:
                "This filter is only available when the calibration method is wild.",
            wildLevelFilterHint:
                "When enabled, only wild results matching the first IV input line level are shown. Current first-line level: {level}",
        },
        dynamicTool: {
            title: "FRLG Dynamic Calibration Tool",
            showTool: "Show Dynamic Tool",
            hideTool: "Hide Dynamic Tool",
            toggleInSettings: "Show dynamic calibration tool",
            modeSection: "Mode And Input",
            modeLabel: "Mode",
            modeTv: "TV Mode",
            modeNoTv: "Normal Mode",
            currentResultSection: "Current Script Parameters",
            historySection: "Adjustment Log",
            targetAdv: "Target Advances",
            tvParams: "TV Parameters",
            noTvParams: "Normal Parameters",
            baseTimeInput: "Base Time ms",
            baseTimeTv: "TV Base Time (ms)",
            baseTimeNoTv: "Normal Base Time (ms)",
            baseTimeTvHint: "Default is 30000 ms",
            baseTimeNoTvHint: "Default is 13500 ms",
            parityAutoHint: "",
            calculateAction: "Calculate",
            actualHit: "Actual Hit Advances",
            actualHitPlaceholder: "Optional",
            actualHitHint: "Leave empty to initialize",
            currentTvLabel: "_TV Time",
            currentWaitLabel: "_Remaining Wait",
            currentParityLabel: "_Parity Time",
            currentBaseLabel: "Current Base Time",
            lastDiff: "Last Diff",
            invalidCalculation: "Please enter valid initialization values.",
            invalidCorrection: "Please enter valid current parameters and hit advances.",
            calculateCompleted: "Initialization completed.",
            correctionCompleted: "Correction completed.",
            perfectAligned: "Perfect alignment.",
            clearedState: "All cached state has been cleared.",
            clearAll: "Clear All",
            notUsedShort: "Not used",
            seedQuestion: "Seed Hit Status",
            seedStatusLabel: "Seed Hit Status",
            seedHit: "Yes",
            seedMiss: "No",
            historyUnit: "Unit: ms",
            historyRound: "Round",
            historyTvShort: "TV",
            historyWaitShort: "Remaining",
            historyParityShort: "Parity",
            rollbackHint: "Click to roll back",
            rollbackAction: "Rollback",
            rollbackDialogTitle: "Rollback Parameters",
            rollbackDialogBody:
                "Roll back to the full parameter state of round {round}?",
            rollbackConfirm: "Confirm rollback",
            rollbackCompleted: "Rolled back to the selected round.",
            emptyHistory:
                "Each calculation will append the resulting parameters here.",
        },
        messages: {
            noKnownSeeds: "No known seeds for this game & settings",
            incompatibleEggParents:
                "Gender of selected parents are not compatible for breeding.",
            noEggSeeds: "No egg seeds found for the selected game.",
            noHeldEggSeeds:
                "No egg generation seeds found for the selected game and settings.",
            noPickupEggSeeds:
                "No egg pickup seeds found for the selected game and settings.",
            eggResultsCapHit:
                "Result cap reached. Narrow the filters or raise max results.",
            noEggResults: "No egg results found for the selected filters.",
            eggSearchProgress:
                "Progress: {percent}% ({checked}/{total} seed pairs, filter {current}/{filters})",
            requiredForIvCalculation: "Required for IV calculation",
            ivCalculationDisabled:
                "IV calculation disabled. Searching all Natures.",
            filterByReachableAdvances: "Filter by reachable advances",
            usePerfectIvFilter: "Use perfect IV filter",
            idComboIntro:
                "Search for TID/SID combinations whose TSV makes the matching static target shiny.",
            noMatchingStaticTargets:
                "No matching static targets found for the selected filters.",
            noMatchingAdvances:
                "No matching targets fall within the selected advances range.",
            emptyBingoBoard:
                "No Bingo board has been generated yet. Return to Calibration and run Bingo after the calibration inputs are valid.",
            bingoRequiresValidCalibration:
                "Complete valid calibration inputs before generating a Bingo board.",
            calibrationNoResultsTitle:
                "No calibration results were found. Please check:",
            calibrationNoResultsCheck1:
                "Whether sound, button mode, seed button, extra button, and device all match each other.",
            calibrationNoResultsCheck2:
                "Whether the Pokemon's gender or IV values were entered incorrectly.",
            calibrationNoResultsCheck3:
                "Whether the seed range and advance range should be expanded. If TeachyTV / TV advances are being used, expand the advance search range further.",
            exactIdSummary:
                "Found {candidateCount} matching target seed(s), {tsvCount} unique TSV(s), and {resultCount} matching target(s) for the selected TID/SID.",
            comboSummary:
                "Found {candidateCount} matching target seed(s), {tsvCount} unique TSV(s), and {resultCount} TID/SID combo(s).",
            resultsCapHit: "Results hit the max-results cap.",
            optionalExactTidFilter: "Optional exact TID filter",
            optionalExactSidFilter: "Optional exact SID filter",
            leaveBlankOrEnterId: "Leave blank or enter 0-65535",
            findTidSidCombos: "Find TID/SID Combos",
            ms: "ms",
            settingsSeedButton: "Seed Button",
            settingsExtraButton: "Extra Button",
            matchingSynchronizeSuffix: "Synchronize",
            invalidTargetSeed:
                "Please enter an existing target seed from the current seed list.",
        },
        imageImport: {
            title: "Import From Screenshot",
            description:
                "Paste or upload a Pokemon Skills screenshot. The tool reads the six stat values from the upper-right panel and lets you append them as a new IV line.",
            queueHint:
                "Current lines: {count}. Import will append line {nextCount}.",
            imageLoaded:
                "Screenshot loaded. Select one ROI for HP and one ROI for the other five stats before starting recognition.",
            noImage: "Paste or upload a screenshot first.",
            requiresRoi: "Select a manual ROI before starting recognition.",
            requiresDualRoi:
                "Select both ROI regions before starting recognition: one for HP and one for the other five stats.",
            recognizing: "Recognizing...",
            recognize: "Recognize Stats",
            recognitionComplete:
                "Recognition complete. Review the values below before appending.",
            recognitionFailed:
                "Recognition failed. Try a clearer screenshot or enter the values manually.",
            noStatsFound:
                "No stat values were detected inside the selected ROI regions.",
            partialRecognition:
                "Detected {count}/{total} values. Please review and fill in any missing fields.",
            requiresNature:
                "Select a Nature in the calibration form before appending a screenshot entry.",
            invalidLevel: "Enter a valid level between 1 and 100.",
            invalidStats: "Enter all six stat values before appending.",
            appendAction: "Append As New Line",
            appended: "Appended a new IV line. Total lines: {nextCount}.",
            appendFailed:
                "Could not append this screenshot entry. Please verify the values and try again.",
            clear: "Clear",
            dropzoneTitle:
                "Click to upload, drag a screenshot here, or press Ctrl+V",
            dropzoneHint:
                "Suggested flow: set Nature, enter Level, paste a screenshot, recognize, then append.",
            previewTitle: "Recognition Preview",
            adjustHint:
                "Manual ROI only: select one ROI for HP and another ROI for the other five stats. Click a selection button, choose the top-left corner, then choose the bottom-right corner.",
            startRoiSelection: "Select ROI",
            startHpRoiSelection: "Select HP ROI",
            startStatsRoiSelection: "Select 5-Stat ROI",
            roiSelectionModeActive:
                "ROI selection mode is active. Click once for the top-left corner, then click again for the bottom-right corner.",
            hpRoiSelectionModeActive:
                "HP ROI selection mode is active. Click once for the top-left corner, then click again for the bottom-right corner.",
            statsRoiSelectionModeActive:
                "5-stat ROI selection mode is active. Click once for the top-left corner, then click again for the bottom-right corner.",
            roiFirstPointSet:
                "Top-left corner recorded. Click again to set the bottom-right corner.",
            roiApplied:
                "ROI applied. Recognition will use only this selected region.",
            hpRoiApplied:
                "HP ROI applied. Recognition will use this region for HP only.",
            statsRoiApplied:
                "5-stat ROI applied. Recognition will use this region for Attack, Defense, Sp. Atk, Sp. Def, and Speed.",
        },
        errors: {
            invalidInput: "Invalid input",
            valueMustBeBetween: "Value must be between {min} and {max}",
            lineMissing: "Line {line} Missing {field}",
            lineInvalid: "Line {line} Invalid {field}",
            noPossibleIv: "No Possible {stat} IV",
        },
        stats: {
            hp: "HP",
            attack: "Attack",
            defense: "Defense",
            specialAttack: "Special Attack",
            specialDefense: "Special Defense",
            speed: "Speed",
        },
    },
    zh: {
        tabs: {
            searcher: "\u641c\u7d22\u5668",
            heldItems: "\u643a\u5e26\u7269",
            idCombo: "ID \u7ec4\u5408",
            initialSeed: "\u521d\u59cb Seed",
            calibration: "\u6821\u51c6",
            bingo: "\u5bbe\u679c",
            egg: "\u5b75\u5316",
            eggSearch: "\u5b75\u86cb\u641c\u7d22\u5668",
            eggCalibration: "\u5b75\u86cb\u6821\u51c6",
        },
        language: {
            chinese: "\u4e2d\u6587",
            english: "English",
        },
        common: {
            submit: "\u63d0\u4ea4",
            searching: "\u641c\u7d22\u4e2d...",
            loadingResources:
                "\u8d44\u6e90\u52a0\u8f7d\u4e2d\uff0c\u9996\u6b21\u52a0\u8f7d\u53ef\u80fd\u9700\u8981\u4e00\u4e9b\u65f6\u95f4\u2026",
            resourceLoadFailed:
                "\u8d44\u6e90\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u5237\u65b0\u9875\u9762\u91cd\u8bd5",
            noOptions: "\u6682\u65e0\u53ef\u7528\u9009\u9879",
            any: "\u4efb\u610f",
            none: "\u65e0",
            filter: "\u7b5b\u9009",
            showSeeds: "\u663e\u793a Seed",
            reset: "\u91cd\u7f6e",
            close: "\u5173\u95ed",
            mono: "\u5355\u58f0\u9053",
            stereo: "\u7acb\u4f53\u58f0",
        },
        footer: {
            credit:
                '\u539f\u59cb "10 lines" \u7531 Shao \u5236\u4f5c\uff0cFRLG seed \u6570\u636e\u7531 blisy\u3001po\u3001HunarPG\u300110Ben\u3001Real96\u3001Papa Jef\u00e9 \u4e0e \u30c8\u30ce \u6536\u96c6',
            poweredBy: "\u6280\u672f\u652f\u6301",
            siteUpdatedAt: "\u7f51\u7ad9\u6700\u65b0\u66f4\u65b0\u65f6\u95f4",
            seedDataAsOf: "FRLG seed \u6570\u636e\u66f4\u65b0\u65f6\u95f4",
        },
        labels: {
            minimum: "\u6700\u5c0f",
            maximum: "\u6700\u5927",
            game: "\u6e38\u620f",
            sound: "\u58f0\u97f3",
            buttonMode: "\u6309\u952e\u6a21\u5f0f",
            seedButton: "Seed \u6309\u952e",
            extraButton: "\u989d\u5916\u6309\u952e",
            console: "\u8bbe\u5907",
            targetSeed: "\u76ee\u6807 Seed",
            seedLeeway: "Seed \u5bb9\u5dee +/-",
            advances: "\u6d88\u8017\u5e27",
            finalAPressFrame: "\u6700\u7ec8 A \u6309\u4e0b\u5e27",
            offset: "\u504f\u79fb",
            teachyTvAdvances: "\u6559\u5b66\u7535\u89c6\u6d88\u8017\u5e27",
            requiredOverworldFrames: "\u6240\u9700\u5927\u5730\u56fe\u5e27\u6570",
            teachyTvMode: "\u6559\u5b66\u7535\u89c6\u6a21\u5f0f",
            trainerId: "\u8bad\u7ec3\u5bb6ID No.",
            secretId: "\u91ccID No.",
            method: "\u65b9\u6cd5",
            shininess: "\u5f02\u8272",
            nature: "\u6027\u683c",
            gender: "\u6027\u522b",
            hiddenPower: "\u89c9\u9192\u529b\u91cf",
            ability: "\u7279\u6027",
            perfectIvCount: "\u6ee1\u4e2a\u4f53\u503c\u6570\u91cf",
            perfectIvPreset: "\u6ee1\u4e2a\u4f53\u9884\u8bbe",
            category: "\u5206\u7c7b",
            pokemon: "\u5b9d\u53ef\u68a6",
            location: "\u5730\u70b9",
            lead: "\u9996\u53d1\u7279\u6027",
            resultCount: "\u7ed3\u679c\u6570\u91cf",
            allowedAdvances: "\u5141\u8bb8\u7684\u6d88\u8017\u5e27\u8303\u56f4",
            maxResults: "\u6700\u5927\u7ed3\u679c\u6570",
            tidFilter: "TID \u7b5b\u9009",
            sidFilter: "SID \u7b5b\u9009",
            ivCalculator: "\u4e2a\u4f53\u503c\u8ba1\u7b97\u5668",
            minimumAdvancesOutsideTeachyTv:
                "\u6559\u5b66\u7535\u89c6\u5916\u7684\u6700\u5c11\u6d88\u8017\u5e27",
            heldSeedSettings: "\u86cb\u751f\u6210 Seed \u8bbe\u7f6e",
            pickupSeedSettings: "\u86cb\u9886\u53d6 Seed \u8bbe\u7f6e",
            heldAdvances: "\u86cb\u751f\u6210\u6d88\u8017\u5e27",
            pickupAdvances: "\u86cb\u9886\u53d6\u6d88\u8017\u5e27",
            heldOffset: "\u86cb\u751f\u6210\u504f\u79fb",
            pickupOffset: "\u86cb\u9886\u53d6\u504f\u79fb",
            eggSettings: "\u86cb\u8bbe\u7f6e",
            eggGeneration: "\u86cb\u751f\u6210",
            eggPickup: "\u86cb\u9886\u53d6",
            eggMethod: "\u86cb\u751f\u6210\u65b9\u6cd5",
            eggSpecies: "\u86cb\u79cd\u7c7b",
            childInfo: "\u5b50\u4ee3\u4fe1\u606f",
            seedPairCount: "Seed \u7ec4\u5408\u6570",
            usePidFilter: "\u6309 PID \u7b5b\u9009",
            parentA: "\u4eb2\u4ee3 A",
            parentB: "\u4eb2\u4ee3 B",
            compatibility: "\u76f8\u6027",
            parentIvs: "\u4eb2\u4ee3\u4e2a\u4f53\u503c",
            parentGender: "\u4eb2\u4ee3\u6027\u522b",
            ivPreset: "\u4e2a\u4f53\u9884\u8bbe",
            bingoTvFluctuationMode: "TV\u6ce2\u52a8\u6a21\u5f0f",
            showInheritance: "\u663e\u793a\u9057\u4f20",
            skipEarlyEggSeeds:
                "\u5ffd\u7565\u6bcf\u4e2a Seed \u8868\u524d {count} \u4e2a Seed",
            sameEggInitialSeed:
                "\u86cb\u751f\u6210\u4e0e\u86cb\u9886\u53d6\u4f7f\u7528\u76f8\u540c Seed",
        },
        options: {
            rubyPaintingSeed: "\u7ea2\u5b9d\u77f3\u7ed8\u753b Seed",
            sapphirePaintingSeed: "\u84dd\u5b9d\u77f3\u7ed8\u753b Seed",
            emeraldPaintingSeed: "\u7eff\u5b9d\u77f3\u7ed8\u753b Seed",
            emerald: "\u7eff\u5b9d\u77f3",
            fireRedEng: "\u706b\u7ea2\uff08\u82f1\u6587\uff09",
            fireRedEu: "\u706b\u7ea2\uff08\u897f/\u6cd5/\u610f/\u5fb7\uff09",
            fireRedJpn10: "\u706b\u7ea2\uff08\u65e5\u7248\uff091.0",
            fireRedJpn11: "\u706b\u7ea2\uff08\u65e5\u7248\uff091.1",
            switchFireRed:
                "Switch \u706b\u7ea2\uff08\u82f1/\u897f/\u6cd5/\u610f/\u5fb7\uff09",
            switchFireRedJpn: "Switch \u706b\u7ea2\uff08\u65e5\u7248\uff09",
            fireRedMgba:
                "\u706b\u7ea2\uff08\u82f1\u6587\uff09\uff08mGBA 10.5\uff09",
            leafGreenEng: "\u53f6\u7eff\uff08\u82f1\u6587\uff09",
            leafGreenEu: "\u53f6\u7eff\uff08\u897f/\u6cd5/\u610f/\u5fb7\uff09",
            leafGreenJpn: "\u53f6\u7eff\uff08\u65e5\u7248\uff09",
            switchLeafGreen:
                "Switch \u53f6\u7eff\uff08\u82f1/\u897f/\u6cd5/\u610f/\u5fb7\uff09",
            switchLeafGreenJpn: "Switch \u53f6\u7eff\uff08\u65e5\u7248\uff09",
            leafGreenMgba:
                "\u53f6\u7eff\uff08\u82f1\u6587\uff09\uff08mGBA 10.5\uff09",
            help: "\u5e2e\u52a9",
            startupSelect: "\u542f\u52a8\u65f6 Select",
            startupA: "\u542f\u52a8\u65f6 A",
            blackoutR: "\u9ed1\u5c4f\u540e R",
            blackoutA: "\u9ed1\u5c4f\u540e A",
            blackoutL: "\u9ed1\u5c4f\u540e L",
            blackoutAL: "\u9ed1\u5c4f\u540e A+L",
            switch1: "Nintendo Switch 1",
            switch2: "Nintendo Switch 2",
            gba: "Game Boy Advance",
            gbp: "Game Boy Player",
            nds: "Nintendo DS",
            firm3ds: "Nintendo 3DS\uff08open_agb_firm\uff09",
            star: "\u661f\u661f\u7279\u6548",
            square: "\u65b9\u5757\u7279\u6548",
            starSquare: "\u661f\u661f\uff0f\u65b9\u5757\u7279\u6548",
            starters: "\u6700\u521d\u7684\u4f19\u4f34",
            fossils: "\u5316\u77f3\u590d\u539f\u5b9d\u53ef\u68a6",
            gifts: "\u793c\u7269\u5b9d\u53ef\u68a6",
            gameCorner: "\u6e38\u620f\u57ce",
            stationary: "\u5b9a\u70b9",
            legends: "\u4f20\u8bf4\u7684\u5b9d\u53ef\u68a6",
            events: "\u6d3b\u52a8\u8d60\u9001",
            roamers: "\u6e38\u8d70\u5b9d\u53ef\u68a6",
            blisyEvents: "Blisy e-Reader \u6d3b\u52a8\u8d60\u9001",
            grass: "\u8349\u4e1b",
            rockSmash: "\u788e\u5ca9",
            surfing: "\u51b2\u6d6a",
            oldRod: "\u7834\u65e7\u9493\u7aff",
            goodRod: "\u597d\u9493\u7aff",
            superRod: "\u5389\u5bb3\u9493\u7aff",
            femaleCuteCharm: "\u8ff7\u4eba\u4e4b\u8eaf\uff08\u96cc\u6027\uff09",
            maleCuteCharm: "\u8ff7\u4eba\u4e4b\u8eaf\uff08\u96c4\u6027\uff09",
            magnetPull: "\u78c1\u529b",
            static: "\u9759\u7535",
            hustlePressureVitalSpirit:
                "\u6d3b\u529b/\u538b\u8feb\u611f/\u5e72\u52b2",
            matchingSynchronize: "\u5339\u914d\u540c\u6b65",
            perfect1v: "1V",
            perfect2v: "2V",
            perfect3v: "3V",
            perfect4v: "4V",
            perfect5v: "5V",
            perfect6v: "6V",
            ivPreset6v: "6V",
            ivPreset0a: "0A",
            ivPreset0s: "0S",
            ivPreset0a0s: "0A0S",
            shinyLocked: "\u5f02\u8272\u9501\u5b9a",
            lockBreak: "\u7834\u9501",
            start: "\u5f00\u59cb",
            select: "\u9009\u62e9",
            startup: "\u542f\u52a8",
            blackout: "\u9ed1\u5c4f",
            yes: "\u662f",
            no: "\u5426",
            normal: "Normal",
            split: "Split",
            alternate: "Alternate",
            mixed: "Mixed",
            eggCompatibilityLow:
                "\u4e24\u53ea\u4f3c\u4e4e\u4e0d\u559c\u6b22\u5bf9\u65b9",
            eggCompatibilityMedium:
                "\u4e24\u53ea\u4f3c\u4e4e\u76f8\u5904\u5f97\u6765",
            eggCompatibilityHigh:
                "\u4e24\u53ea\u4f3c\u4e4e\u76f8\u5904\u5f97\u5f88\u597d",
            rsfrlgBred: "RS/FRLG \u5b75\u5316",
            rsfrlgBredSplit: "RS/FRLG \u5b75\u5316 Split",
            rsfrlgBredAlternate: "RS/FRLG \u5b75\u5316 Alternate",
            rsfrlgBredMixed: "RS/FRLG \u5b75\u5316 Mixed",
            male: "\u96c4\u6027",
            female: "\u96cc\u6027",
            genderless: "\u65e0\u6027\u522b",
            ditto: "\u767e\u53d8\u602a",
        },
        table: {
            actions: "\u64cd\u4f5c",
            seed: "Seed",
            advances: "\u6d88\u8017\u5e27",
            method: "\u65b9\u6cd5",
            finalAPressFrame: "\u6700\u7ec8 A \u6309\u4e0b\u5e27",
            teachyTvAdvances: "\u6559\u5b66\u7535\u89c6\u6d88\u8017\u5e27",
            continueScreenFrames: "\u7ee7\u7eed\u754c\u9762\u5e27\u6570",
            slot: "\u69fd\u4f4d",
            level: "\u7b49\u7ea7",
            pid: "PID",
            shiny: "\u5f02\u8272",
            nature: "\u6027\u683c",
            stats: "\u80fd\u529b\u503c",
            ability: "\u7279\u6027",
            ivs: "\u4e2a\u4f53\u503c",
            hidden: "\u89c9\u9192\u529b\u91cf\u5c5e\u6027",
            power: "\u5a01\u529b",
            gender: "\u6027\u522b",
            rowsPerPage: "\u6bcf\u9875\u884c\u6570",
            minReachableAdvances: "\u6700\u5c0f\u53ef\u8fbe\u6d88\u8017\u5e27",
            openInInitialSeed: "\u5728\u521d\u59cb Seed \u4e2d\u6253\u5f00",
            openInCalibration: "\u5728\u6821\u51c6\u4e2d\u6253\u5f00",
            openInEggCalibration: "\u5728\u5b75\u86cb\u6821\u51c6\u4e2d\u6253\u5f00",
            matchingTargets: "\u5339\u914d\u76ee\u6807\u6570",
            exampleSeed: "\u793a\u4f8b Seed",
            examplePid: "\u793a\u4f8b PID",
            seedDec: "Seed\uff08\u5341\u8fdb\u5236\uff09",
            seedHex: "Seed\uff08\u5341\u516d\u8fdb\u5236\uff09",
            estimatedTotalFrames: "\u4f30\u8ba1\u603b\u5e27\u6570",
            estimatedTotalTime: "\u4f30\u8ba1\u603b\u65f6\u95f4",
            seedTime: "Seed \u65f6\u95f4",
            settings: "\u6821\u51c6\u9875\u9762\u8bbe\u7f6e",
            calibration: "\u6821\u51c6",
            initialSeed: "\u521d\u59cb Seed",
            heldSeed: "\u86cb\u751f\u6210 Seed",
            heldSeedTime: "\u86cb\u751f\u6210 Seed \u65f6\u95f4",
            heldSettings: "\u86cb\u751f\u6210\u8bbe\u7f6e",
            heldAdvances: "\u86cb\u751f\u6210\u6d88\u8017\u5e27",
            pickupSeed: "\u86cb\u9886\u53d6 Seed",
            pickupSeedTime: "\u86cb\u9886\u53d6 Seed \u65f6\u95f4",
            pickupSettings: "\u86cb\u9886\u53d6\u8bbe\u7f6e",
            pickupAdvances: "\u86cb\u9886\u53d6\u6d88\u8017\u5e27",
            inheritance: "\u9057\u4f20",
            heldItem: "携带道具（实验）",
            heldRng: "携带物 RNG",
        },
        heldItems: {
            pageTitle: "FRLG \u91ce\u751f\u643a\u5e26\u7269",
            pageDescription:
                "\u641c\u7d22 Switch \u82f1\u6587\u7248\u706b\u7ea2\u6216\u53f6\u7eff\u7684\u8349\u4e1b/\u6d1e\u7a9f\u3001\u788e\u5ca9\u3001\u51b2\u6d6a\u548c\u4e09\u79cd\u9493\u7aff H1 \u5e27\u3002\u5f53\u524d\u5b9e\u6d4b Offset \u9884\u8bbe\u4ec5\u9002\u7528\u4e8e\u706b\u7ea2\u3002",
            separatePageNotice:
                "\u641c\u7d22\u4e13\u7528\u8bbe\u7f6e\u548c\u7ed3\u679c\u4ecd\u4fdd\u6301\u72ec\u7acb\uff1b\u6e38\u620f\u3001\u673a\u578b\u3001TID \u548c SID \u4f1a\u5728\u5404\u9875\u9762\u540c\u6b65\u3002",
            seedAndAdvanceInstruction:
                "\u643a\u5e26\u7269\u9884\u6d4b\u4e0d\u9700\u8981 TID\u3001SID \u6216\u4e2a\u4f53\u503c\u7b5b\u9009\u3002\u53ea\u9700\u8f93\u5165\u521d\u59cb Seed \u548c Advance \u8303\u56f4\uff1b\u4e2a\u4f53\u503c\u4ec5\u5728\u7ed3\u679c\u4e2d\u663e\u793a\u3002",
            advanceSearchTooLarge:
                "\u5f53\u524d\u8303\u56f4\u5305\u542b {count} \u4e2a Advance\uff0c\u5355\u6b21\u641c\u7d22\u8bf7\u9650\u5236\u5728 {limit} \u4e2a\u4ee5\u5185\u3002",
            searchMode: "\u641c\u7d22\u6a21\u5f0f",
            searchModeH1Stable: "H1 \u7a33\u5b9a\uff08O / O+1\uff09",
            searchModeAllMethods:
                "H1/H2/H4 \u5168\u8986\u76d6\uff08O-1 / O / O+1\uff09",
            searchModeFourTracks:
                "\u56db\u8f68\u5e7f\u8986\u76d6\uff1aO-1 / O / O+1 / O+2",
            searchModeFiveTracks:
                "\u4e94\u8f68\u5e7f\u8986\u76d6\uff1aO-1 / O / O+1 / O+2 / O+3",
            searchModeFiveTracksSymmetric:
                "\u4e94\u8f68\u5bf9\u79f0\u8986\u76d6\uff1aO-2 / O-1 / O / O+1 / O+2",
            searchModeH1StableHelp:
                "\u4f7f\u7528 H1 \u6807\u51c6 O \u4e0e\u53ef\u80fd\u7684 +1 \u8f68\u8ff9 O+1\u3002\u8fdb\u884c\u643a\u5e26\u7269\u7b5b\u9009\u65f6\uff0c\u4e24\u8f68\u90fd\u5fc5\u987b\u7b26\u5408\u6240\u9009\u9053\u5177\u3002",
            searchModeAllMethodsHelp:
                "\u4f7f\u7528 O-1\u3001O\u3001O+1 \u8986\u76d6\u5df2\u89c2\u5bdf\u5230\u7684 H2/H4 = H1-1 \u89c4\u5219\u53ca\u5176 +1 \u8f68\u8ff9\u3002\u8fdb\u884c\u643a\u5e26\u7269\u7b5b\u9009\u65f6\uff0c\u4e09\u8f68\u90fd\u5fc5\u987b\u7b26\u5408\u3002",
            searchModeFourTracksHelp:
                "\u4f7f\u7528 O-1\u3001O\u3001O+1\u3001O+2 \u6269\u5927\u76f8\u90bb\u8f68\u8ff9\u8986\u76d6\u3002\u8fdb\u884c\u643a\u5e26\u7269\u7b5b\u9009\u65f6\uff0c\u56db\u8f68\u90fd\u5fc5\u987b\u7b26\u5408\u3002",
            searchModeFiveTracksHelp:
                "\u4f7f\u7528 O-1\u3001O\u3001O+1\u3001O+2\u3001O+3 \u6269\u5927\u76f8\u90bb\u8f68\u8ff9\u8986\u76d6\u3002\u8fdb\u884c\u643a\u5e26\u7269\u7b5b\u9009\u65f6\uff0c\u4e94\u8f68\u90fd\u5fc5\u987b\u7b26\u5408\u3002",
            searchModeFiveTracksSymmetricHelp:
                "\u4f7f\u7528 O-2\u3001O-1\u3001O\u3001O+1\u3001O+2 \u8fdb\u884c\u5bf9\u79f0\u7684\u76f8\u90bb\u8f68\u8ff9\u8986\u76d6\u3002\u8fdb\u884c\u643a\u5e26\u7269\u7b5b\u9009\u65f6\uff0c\u4e94\u8f68\u90fd\u5fc5\u987b\u7b26\u5408\u3002",
            searchModeShinyHelp:
                "\u5728\u95ea\u5149 + \u5e27\u6570\u8303\u56f4\u6a21\u5f0f\u4e0b\uff0c\u8be5\u9009\u62e9\u53ea\u63a7\u5236\u7ed3\u679c\u4e2d\u663e\u793a\u7684\u643a\u5e26\u7269\u8f68\u8ff9\uff0c\u4e0d\u7b5b\u6389\u4efb\u4f55\u7ed3\u679c\u3002",
            standardOffset: "H1 \u6807\u51c6 Offset\uff08O\uff09",
            offsetPresetAvailable:
                "\u5df2\u5957\u7528 H1 Offset \u9884\u8bbe +{offset}\u3002\u5f53\u524d\u6a21\u5f0f\u68c0\u67e5 {offsets}\uff1b\u4ecd\u53ef\u624b\u52a8\u4fee\u6539\u3002",
            offsetPresetUnknown:
                "\u8be5\u5730\u70b9\u5c1a\u65e0\u5b9e\u6d4b\u9884\u8bbe\u3002Offset 0 \u8868\u793a\u672a\u77e5\uff1b\u641c\u7d22\u524d\u8bf7\u8f93\u5165 H1 \u6807\u51c6 Offset\u3002",
            offsetRequired:
                "\u8bf7\u5148\u8f93\u5165\u5927\u4e8e 0 \u7684 H1 \u6807\u51c6 Offset\uff0c\u518d\u7b5b\u9009\u6216\u641c\u7d22\u3002",
            enableSweetScentProfile:
                "使用 Switch 英文版 FRLG 携带物档案（实验）",
            sourceData: "FRLG 源码携带率：",
            profileAvailable: "火红实机验证档案：{profiles}。",
            profileUnavailable:
                "\u8be5\u5730\u70b9\u5c1a\u65e0\u706b\u7ea2\u5b9e\u673a H1 Offset\uff0c\u9ed8\u8ba4\u4e3a 0\uff0c\u53ef\u624b\u52a8\u8f93\u5165\u3002",
            interferenceWarning:
                "NPC \u6216\u5f02\u6b65 RNG \u53ef\u80fd\u79fb\u52a8\u643a\u5e26\u7269\u5224\u5b9a\uff1b\u5f53\u524d\u641c\u7d22\u6a21\u5f0f\u4f1a\u660e\u786e\u68c0\u67e5\u6240\u9700\u7684\u76f8\u90bb\u8f68\u8ff9\u3002",
            samples: "{count} 个样本",
            baseline: "基准轨迹",
            alternate: "可能的 +1",
            verifiedProfile: "实机验证基准",
            variableProfile: "已观察到双轨迹",
            filter: "携带物筛选（实验）",
            filterAny: "全部结果",
            filterAnyItem: "任意携带物",
            filterUnavailable:
                "只有稳定的实机基准 Offset 才启用精确筛选；双轨迹地点仅显示结果。",
            searchFailed: "\u643a\u5e26\u7269\u641c\u7d22\u5931\u8d25\uff1a{error}",
            noResults: "\u6ca1\u6709\u627e\u5230\u7b26\u5408\u6761\u4ef6\u7684\u643a\u5e26\u7269\u7ed3\u679c\u3002",
            resultCount:
                "\u5f53\u524d\u663e\u793a {count} \u6761\u7ed3\u679c\uff08\u6700\u591a {limit} \u6761\uff09\u3002",
            shinyOnlyMode: "\u95ea\u5149\u0020\u002b\u0020\u5e27\u6570\u8303\u56f4\u6a21\u5f0f",
            shinyOnlyModeHelp:
                "\u641c\u7d22\u6574\u4e2a\u0020seed\u0020\u5e93\uff08\u5171\u0020{count}\u0020\u6761\uff09\uff0c\u53ea\u6309\u95ea\u5149\u72b6\u6001\u4e0e\u0020Advance\uff08\u5e27\u6570\uff09\u8303\u56f4\u7b5b\u9009\uff1b\u6240\u9009\u0020Offset\u0020\u8986\u76d6\u4ec5\u7528\u4e8e\u7ed3\u679c\u5c55\u793a\u3002WASM\u0020\u5728\u6536\u96c6\u5230\u0020{limit}\u0020\u6761\u5339\u914d\u7ed3\u679c\u540e\u7acb\u5373\u505c\u6b62\u3002",
            shinyFilter: "\u95ea\u5149\u7b5b\u9009",
            noResultsShiny:
                "\u6ca1\u6709\u627e\u5230\u7b26\u5408\u6761\u4ef6\u7684\u95ea\u5149\u7ed3\u679c\u3002",
            shinySearchWorkload:
                "\u672c\u6b21\u641c\u7d22\u8986\u76d6\u0020{frames}\u0020\u5e27\uff08{seeds}\u0020\u6761\u0020seed\u0020\u00d7\u0020\u6bcf\u6761\u0020{advances}\u0020\u5e27\uff09\uff0c\u8017\u65f6\u53ef\u80fd\u8f83\u957f\u3002",
        },
        compare: {
            title: "\u6821\u51c6\u5bf9\u7167",
            target: "\u76ee\u6807",
            history: "\u5386\u53f2",
            record: "\u8bb0\u5f55",
            settings: "\u6821\u51c6\u9875\u9762\u8bbe\u7f6e",
            floatWindow: "\u6d6e\u7a97",
            minimize: "\u6700\u5c0f\u5316",
            settingsShort: "\u8bbe",
            clearAll: "\u6e05\u7a7a",
            clearHistory: "\u6e05\u7a7a\u5386\u53f2",
            clearShort: "\u6e05",
            delete: "\u5220\u9664",
            deleteTarget: "\u5220\u9664\u76ee\u6807",
            emptyTarget:
                "\u5148\u4ece\u4e0b\u65b9\u7ed3\u679c\u8868\u91cc\u52a0\u5165\u4e00\u6761\u76ee\u6807\u6570\u636e\u3002",
            emptyHistory:
                "\u540e\u7eed\u52a0\u5165\u7684\u5386\u53f2\u6570\u636e\u4f1a\u663e\u793a\u5728\u8fd9\u91cc\u3002",
            display: "\u663e\u793a",
            enable: "\u542f\u7528\u5bf9\u7167\u8868",
            enableCalculator: "\u542f\u7528\u8ba1\u7b97\u5668",
            autoAddTarget: "\u6821\u51c6\u81ea\u52a8\u6dfb\u52a0\u76ee\u6807",
            position: "\u8868\u683c\u4f4d\u7f6e",
            positionLeft: "\u5de6\u4fa7",
            positionRight: "\u53f3\u4fa7",
            compareMode: "\u5bf9\u6bd4\u65b9\u5f0f",
            modeTarget: "\u59cb\u7ec8\u4e0e\u76ee\u6807\u5bf9\u6bd4",
            modePrevious: "\u4e0e\u4e0a\u4e00\u6761\u5386\u53f2\u5bf9\u6bd4",
            visibleColumns: "\u663e\u793a\u5217",
            resultVisibleColumns: "\u7ed3\u679c\u8868\u663e\u793a\u5217",
            addToTarget: "\u52a0\u5230\u76ee\u6807",
            addToHistory: "\u52a0\u5230\u5386\u53f2",
            reAddHistory: "\u518d\u6b21\u52a0\u5165\u5386\u53f2",
            addedTarget: "\u5df2\u6dfb\u52a0\u4e3a\u76ee\u6807",
            addedHistory: "\u5df2\u6dfb\u52a0\u5230\u5386\u53f2",
            resultsTitle: "\u6821\u51c6\u7ed3\u679c",
            calculator: "\u8ba1\u7b97\u5668",
            wildLevelFilter:
                "\u6309\u4e2a\u4f53\u503c\u7b2c\u4e00\u884c\u7684\u7b49\u7ea7\u7b5b\u9009\u91ce\u751f\u7ed3\u679c",
            historyWildDetails: "\u5b9d\u53ef\u68a6 / \u7b49\u7ea7",
            historyWildDetailsToggle:
                "\u5728\u5386\u53f2\u8868\u4e2d\u663e\u793a\u5b9d\u53ef\u68a6\u79cd\u7c7b\u548c\u7b49\u7ea7",
            manualTeachyTVToggle:
                "\u5141\u8bb8\u5728\u6821\u51c6\u9875\u624b\u52a8\u5207\u6362\u6559\u5b66\u7535\u89c6\u6a21\u5f0f",
            wildLevelFilterStaticHint:
                "\u8be5\u7b5b\u9009\u53ea\u6709\u5728\u6821\u51c6\u65b9\u6cd5\u4e3a\u91ce\u751f\u65f6\u624d\u53ef\u7528\u3002",
            wildLevelFilterHint:
                "\u5f00\u542f\u540e\uff0c\u53ea\u663e\u793a\u7b49\u4e8e\u4e2a\u4f53\u503c\u8f93\u5165\u7b2c\u4e00\u884c\u7b49\u7ea7\u7684\u91ce\u751f\u7ed3\u679c\u3002\u5f53\u524d\u7b2c\u4e00\u884c\u7b49\u7ea7\uff1a{level}",
        },
        dynamicTool: {
            title: "\u706b\u7ea2\u53f6\u7eff\u52a8\u6001\u4fee\u6b63\u5de5\u5177",
            showTool: "\u663e\u793a\u52a8\u6001\u4fee\u6b63\u5de5\u5177",
            hideTool: "\u9690\u85cf\u52a8\u6001\u4fee\u6b63\u5de5\u5177",
            toggleInSettings: "\u663e\u793a\u52a8\u6001\u4fee\u6b63\u5de5\u5177",
            modeSection: "\u6a21\u5f0f\u4e0e\u8f93\u5165",
            modeLabel: "\u6a21\u5f0f\u9009\u62e9",
            modeTv: "TV \u6a21\u5f0f",
            modeNoTv: "\u666e\u901a\u6a21\u5f0f",
            currentResultSection: "\u5f53\u524d\u811a\u672c\u53c2\u6570",
            historySection: "\u8c03\u6574\u65e5\u5fd7",
            targetAdv: "\u76ee\u6807 Advances",
            tvParams: "TV \u53c2\u6570",
            noTvParams: "\u666e\u901a\u53c2\u6570",
            baseTimeInput: "\u57fa\u7840\u65f6\u95f4 ms",
            baseTimeTv: "TV \u57fa\u7840\u65f6\u95f4 (ms)",
            baseTimeNoTv: "\u666e\u901a\u57fa\u7840\u65f6\u95f4 (ms)",
            baseTimeTvHint: "\u9ed8\u8ba4\u503c\u4e3a 30000 ms",
            baseTimeNoTvHint: "\u9ed8\u8ba4\u503c\u4e3a 13500 ms",
            parityAutoHint: "",
            calculateAction: "\u8ba1\u7b97",
            actualHit: "\u5b9e\u9645\u547d\u4e2d Advances",
            actualHitPlaceholder: "\u53ef\u7559\u7a7a",
            actualHitHint: "\u7559\u7a7a\u65f6\u81ea\u52a8\u521d\u59cb\u5316\u8ba1\u7b97",
            currentTvLabel: "_TV\u8fc7\u5e27\u65f6\u95f4",
            currentWaitLabel: "_\u5269\u4f59\u5e27\u6570\u65f6\u95f4",
            currentParityLabel: "_\u5947\u5076\u65f6\u95f4",
            currentBaseLabel: "\u5f53\u524d\u57fa\u7840\u65f6\u95f4",
            lastDiff: "\u4e0a\u6b21\u504f\u5dee",
            invalidCalculation: "\u8bf7\u5148\u8f93\u5165\u6709\u6548\u7684\u521d\u59cb\u5316\u53c2\u6570\u3002",
            invalidCorrection: "\u8bf7\u5148\u8f93\u5165\u6709\u6548\u7684\u5f53\u524d\u53c2\u6570\u548c\u5b9e\u9645\u547d\u4e2d\u5e27\u6570\u3002",
            calculateCompleted: "\u521d\u59cb\u5316\u5b8c\u6210\u3002",
            correctionCompleted: "\u4fee\u6b63\u5b8c\u6210\u3002",
            perfectAligned: "\u5df2\u5b8c\u5168\u5bf9\u9f50\u3002",
            clearedState: "\u6240\u6709\u5de5\u5177\u7f13\u5b58\u5df2\u6e05\u7a7a\u3002",
            clearAll: "\u6e05\u7a7a\u5168\u90e8",
            notUsedShort: "\u4e0d\u4f7f\u7528",
            seedQuestion: "Seed \u547d\u4e2d\u60c5\u51b5",
            seedStatusLabel: "Seed \u547d\u4e2d\u60c5\u51b5",
            seedHit: "\u547d\u4e2d",
            seedMiss: "\u672a\u547d\u4e2d",
            historyUnit: "\u5355\u4f4d\uff1ams",
            historyRound: "\u8f6e\u6b21",
            historyTvShort: "TV",
            historyWaitShort: "\u5269\u4f59",
            historyParityShort: "\u5947\u5076",
            rollbackHint: "\u70b9\u51fb\u5373\u53ef\u56de\u6eaf",
            rollbackAction: "\u56de\u6eaf",
            rollbackDialogTitle: "\u786e\u8ba4\u56de\u6eaf",
            rollbackDialogBody:
                "\u662f\u5426\u786e\u5b9a\u56de\u6eaf\u5230 {round} \u7684\u5b8c\u6574\u72b6\u6001\uff1f",
            rollbackConfirm: "\u786e\u5b9a",
            rollbackCompleted: "\u5df2\u56de\u6eaf\u5230\u9009\u4e2d\u8f6e\u6b21\u3002",
            emptyHistory:
                "\u6bcf\u6b21\u8ba1\u7b97\u540e\uff0c\u7ed3\u679c\u53c2\u6570\u90fd\u4f1a\u8ffd\u52a0\u5230\u8fd9\u91cc\u3002",
        },
        messages: {
            noKnownSeeds:
                "\u5f53\u524d\u6e38\u620f\u548c\u8bbe\u7f6e\u4e0b\u6ca1\u6709\u5df2\u77e5 Seed",
            incompatibleEggParents:
                "\u6240\u9009\u4eb2\u4ee3\u6027\u522b\u7ec4\u5408\u4e0d\u80fd\u751f\u86cb\u3002",
            noEggSeeds:
                "\u5f53\u524d\u6e38\u620f\u4e0b\u6ca1\u6709\u86cb Seed\u3002",
            noHeldEggSeeds:
                "\u5f53\u524d\u6e38\u620f\u548c\u8bbe\u7f6e\u4e0b\u6ca1\u6709\u86cb\u751f\u6210 Seed\u3002",
            noPickupEggSeeds:
                "\u5f53\u524d\u6e38\u620f\u548c\u8bbe\u7f6e\u4e0b\u6ca1\u6709\u86cb\u9886\u53d6 Seed\u3002",
            eggResultsCapHit:
                "\u5df2\u8fbe\u5230\u7ed3\u679c\u4e0a\u9650\uff0c\u8bf7\u6536\u7a84\u7b5b\u9009\u6216\u63d0\u9ad8\u6700\u5927\u7ed3\u679c\u6570\u3002",
            noEggResults:
                "\u6240\u9009\u7b5b\u9009\u6761\u4ef6\u4e0b\u6ca1\u6709\u5b75\u5316\u7ed3\u679c\u3002",
            eggSearchProgress:
                "\u8fdb\u5ea6\uff1a{percent}%\uff08Seed \u7ec4\u5408 {checked}/{total}\uff0c\u7b5b\u9009 {current}/{filters}\uff09",
            requiredForIvCalculation:
                "\u8fdb\u884c\u4e2a\u4f53\u503c\u8ba1\u7b97\u65f6\u5fc5\u586b",
            ivCalculationDisabled:
                "\u4e2a\u4f53\u503c\u8ba1\u7b97\u5df2\u5173\u95ed\uff0c\u6b63\u5728\u641c\u7d22\u5168\u90e8\u6027\u683c\u3002",
            filterByReachableAdvances:
                "\u6309\u53ef\u8fbe\u6d88\u8017\u5e27\u7b5b\u9009",
            usePerfectIvFilter:
                "\u6ee1\u4e2a\u4f53\u503c\u7b5b\u9009",
            idComboIntro:
                "\u641c\u7d22\u80fd\u8ba9\u5339\u914d\u9759\u6001\u76ee\u6807\u53d8\u95ea\u7684 TID/SID \u7ec4\u5408\u3002",
            noMatchingStaticTargets:
                "\u6240\u9009\u6761\u4ef6\u4e0b\u6ca1\u6709\u5339\u914d\u7684\u9759\u6001\u76ee\u6807\u3002",
            noMatchingAdvances:
                "\u6ca1\u6709\u76ee\u6807\u843d\u5728\u6240\u9009\u6d88\u8017\u5e27\u8303\u56f4\u5185\u3002",
            emptyBingoBoard:
                "\u5f53\u524d\u8fd8\u6ca1\u6709\u751f\u6210\u5bbe\u679c\u68cb\u76d8\u3002\u8bf7\u5148\u56de\u5230\u6821\u51c6\u9875\uff0c\u5728\u8f93\u5165\u6709\u6548\u540e\u70b9\u51fb Bingo\u3002",
            bingoRequiresValidCalibration:
                "\u8bf7\u5148\u8865\u5168\u6709\u6548\u7684\u6821\u51c6\u8f93\u5165\uff0c\u518d\u751f\u6210\u5bbe\u679c\u68cb\u76d8\u3002",
            calibrationNoResultsTitle:
                "\u672a\u641c\u7d22\u5230\u6821\u51c6\u7ed3\u679c\uff0c\u8bf7\u68c0\u67e5\uff1a",
            calibrationNoResultsCheck1:
                "\u58f0\u97f3\u3001\u6309\u952e\u6a21\u5f0f\u3001seed\u6309\u952e\u3001\u989d\u5916\u6309\u952e\u548c\u8bbe\u5907\u662f\u5426\u4e00\u4e00\u5bf9\u5e94",
            calibrationNoResultsCheck2:
                "\u5b9d\u53ef\u68a6\u7684\u6027\u522b\u3001\u80fd\u529b\u503c\u662f\u5426\u586b\u5199\u9519\u8bef",
            calibrationNoResultsCheck3:
                "seed\u548c\u5e27\u6570\u662f\u5426\u9700\u8981\u6269\u5927\u8303\u56f4\uff0c\u5982\u679c\u4f7f\u7528\u4e86tv\u8fc7\u5e27\u5219\u9700\u8981\u8fdb\u4e00\u6b65\u6269\u5927\u5e27\u6570\u641c\u7d22\u8303\u56f4",
            exactIdSummary:
                "\u627e\u5230 {candidateCount} \u4e2a\u5339\u914d\u76ee\u6807 Seed\u3001{tsvCount} \u4e2a\u552f\u4e00 TSV\uff0c\u4ee5\u53ca {resultCount} \u4e2a\u7b26\u5408\u6240\u9009 TID/SID \u7684\u5339\u914d\u76ee\u6807\u3002",
            comboSummary:
                "\u627e\u5230 {candidateCount} \u4e2a\u5339\u914d\u76ee\u6807 Seed\u3001{tsvCount} \u4e2a\u552f\u4e00 TSV\uff0c\u4ee5\u53ca {resultCount} \u4e2a TID/SID \u7ec4\u5408\u3002",
            resultsCapHit:
                "\u7ed3\u679c\u5df2\u8fbe\u5230\u6700\u5927\u6570\u91cf\u4e0a\u9650\u3002",
            optionalExactTidFilter:
                "\u53ef\u9009\u7684\u7cbe\u786e TID \u7b5b\u9009",
            optionalExactSidFilter:
                "\u53ef\u9009\u7684\u7cbe\u786e SID \u7b5b\u9009",
            leaveBlankOrEnterId:
                "\u7559\u7a7a\u6216\u8f93\u5165 0-65535",
            findTidSidCombos: "\u67e5\u627e TID/SID \u7ec4\u5408",
            ms: "\u6beb\u79d2",
            settingsSeedButton: "Seed \u6309\u952e",
            settingsExtraButton: "\u989d\u5916\u6309\u952e",
            matchingSynchronizeSuffix: "\u540c\u6b65",
            invalidTargetSeed:
                "\u8bf7\u8f93\u5165\u5f53\u524d Seed \u5217\u8868\u4e2d\u5b58\u5728\u7684\u76ee\u6807 Seed\u3002",
        },
        imageImport: {
            title: "\u4ece\u622a\u56fe\u5bfc\u5165",
            description:
                "\u7c98\u8d34\u6216\u4e0a\u4f20 Pokemon Skills \u754c\u9762\u622a\u56fe\u3002\u5de5\u5177\u4f1a\u8bfb\u53d6\u53f3\u4e0a\u89d2\u7684 6 \u4e2a\u80fd\u529b\u503c\uff0c\u5e76\u53ef\u4ee5\u5c06\u5b83\u4eec\u8ffd\u52a0\u5230\u4e2a\u4f53\u503c\u8f93\u5165\u7684\u65b0\u4e00\u884c\u3002",
            queueHint:
                "\u5f53\u524d\u5df2\u6709 {count} \u884c\uff0c\u5bfc\u5165\u540e\u4f1a\u8ffd\u52a0\u4e3a\u7b2c {nextCount} \u884c\u3002",
            imageLoaded:
                "\u622a\u56fe\u5df2\u8f7d\u5165\uff0c\u8bf7\u5148\u5206\u522b\u6846\u9009 HP \u533a\u57df\u548c\u5176\u4ed6 5 \u9879\u80fd\u529b\u503c\u533a\u57df\uff0c\u518d\u5f00\u59cb\u8bc6\u522b\u3002",
            noImage: "\u8bf7\u5148\u7c98\u8d34\u6216\u4e0a\u4f20\u622a\u56fe\u3002",
            requiresRoi:
                "\u5f00\u59cb\u8bc6\u522b\u524d\uff0c\u8bf7\u5148\u624b\u52a8\u6846\u9009 ROI\u3002",
            requiresDualRoi:
                "\u5f00\u59cb\u8bc6\u522b\u524d\uff0c\u8bf7\u5148\u6846\u9009\u4e24\u4e2a ROI\uff1a\u4e00\u4e2a\u7ed9 HP\uff0c\u4e00\u4e2a\u7ed9\u5176\u4ed6 5 \u9879\u80fd\u529b\u503c\u3002",
            recognizing: "\u6b63\u5728\u8bc6\u522b...",
            recognize: "\u8bc6\u522b\u80fd\u529b\u503c",
            recognitionComplete:
                "\u8bc6\u522b\u5b8c\u6210\uff0c\u8bf7\u5148\u68c0\u67e5\u4e0b\u65b9\u6570\u503c\u518d\u8ffd\u52a0\u3002",
            recognitionFailed:
                "\u8bc6\u522b\u5931\u8d25\uff0c\u8bf7\u6362\u66f4\u6e05\u6670\u7684\u622a\u56fe\uff0c\u6216\u8005\u624b\u52a8\u586b\u5199\u6570\u503c\u3002",
            noStatsFound:
                "\u5728\u6240\u9009 ROI \u533a\u57df\u5185\u6ca1\u6709\u8bc6\u522b\u5230\u80fd\u529b\u503c\u3002",
            partialRecognition:
                "\u5df2\u8bc6\u522b {count}/{total} \u4e2a\u6570\u503c\uff0c\u8bf7\u68c0\u67e5\u5e76\u8865\u5168\u7f3a\u5931\u9879\u3002",
            requiresNature:
                "\u8ffd\u52a0\u622a\u56fe\u6570\u636e\u524d\uff0c\u8bf7\u5148\u5728\u6821\u51c6\u8868\u5355\u91cc\u9009\u62e9\u6027\u683c\u3002",
            invalidLevel:
                "\u8bf7\u8f93\u5165 1 \u5230 100 \u4e4b\u95f4\u7684\u6709\u6548\u7b49\u7ea7\u3002",
            invalidStats:
                "\u8ffd\u52a0\u4e4b\u524d\uff0c\u8bf7\u786e\u8ba4 6 \u4e2a\u80fd\u529b\u503c\u90fd\u5df2\u586b\u5199\u3002",
            appendAction: "\u8ffd\u52a0\u4e3a\u65b0\u4e00\u884c",
            appended:
                "\u5df2\u8ffd\u52a0\u65b0\u7684\u4e2a\u4f53\u503c\u8f93\u5165\u884c\uff0c\u5f53\u524d\u603b\u884c\u6570\uff1a{nextCount}\u3002",
            appendFailed:
                "\u65e0\u6cd5\u8ffd\u52a0\u8fd9\u6761\u622a\u56fe\u6570\u636e\uff0c\u8bf7\u68c0\u67e5\u6570\u503c\u540e\u91cd\u8bd5\u3002",
            clear: "\u6e05\u7a7a",
            dropzoneTitle:
                "\u70b9\u51fb\u4e0a\u4f20\u3001\u62d6\u653e\u622a\u56fe\u5230\u6b64\u5904\uff0c\u6216\u76f4\u63a5\u6309 Ctrl+V",
            dropzoneHint:
                "\u5efa\u8bae\u6d41\u7a0b\uff1a\u5148\u9009\u6027\u683c\uff0c\u518d\u8f93\u5165\u7b49\u7ea7\uff0c\u7136\u540e\u7c98\u8d34\u622a\u56fe\u3001\u8bc6\u522b\uff0c\u6700\u540e\u8ffd\u52a0\u4e3a\u65b0\u4e00\u884c\u3002",
            previewTitle: "\u8bc6\u522b\u9884\u89c8",
            adjustHint:
                "\u73b0\u5728\u53ea\u652f\u6301\u624b\u52a8 ROI\uff1a\u9700\u8981\u5206\u522b\u6846\u9009 HP \u533a\u57df\u548c\u5176\u4ed6 5 \u9879\u80fd\u529b\u503c\u533a\u57df\u3002\u70b9\u51fb\u6309\u94ae\u540e\uff0c\u5148\u70b9\u5de6\u4e0a\u89d2\uff0c\u518d\u70b9\u53f3\u4e0b\u89d2\u3002",
            startRoiSelection: "\u6846\u9009 ROI",
            startHpRoiSelection: "\u6846\u9009 HP ROI",
            startStatsRoiSelection: "\u6846\u9009 5 \u9879 ROI",
            roiSelectionModeActive:
                "\u5df2\u8fdb\u5165 ROI \u6846\u9009\u6a21\u5f0f\uff0c\u8bf7\u5148\u70b9\u5de6\u4e0a\u89d2\uff0c\u518d\u70b9\u53f3\u4e0b\u89d2\u3002",
            hpRoiSelectionModeActive:
                "\u5df2\u8fdb\u5165 HP ROI \u6846\u9009\u6a21\u5f0f\uff0c\u8bf7\u5148\u70b9\u5de6\u4e0a\u89d2\uff0c\u518d\u70b9\u53f3\u4e0b\u89d2\u3002",
            statsRoiSelectionModeActive:
                "\u5df2\u8fdb\u5165 5 \u9879 ROI \u6846\u9009\u6a21\u5f0f\uff0c\u8bf7\u5148\u70b9\u5de6\u4e0a\u89d2\uff0c\u518d\u70b9\u53f3\u4e0b\u89d2\u3002",
            roiFirstPointSet:
                "\u5de6\u4e0a\u89d2\u5df2\u8bb0\u5f55\uff0c\u8bf7\u518d\u70b9\u4e00\u4e0b\u53f3\u4e0b\u89d2\u3002",
            roiApplied:
                "ROI \u5df2\u5e94\u7528\uff0c\u540e\u7eed\u8bc6\u522b\u53ea\u4f1a\u4f7f\u7528\u8fd9\u4e2a\u9009\u5b9a\u533a\u57df\u3002",
            hpRoiApplied:
                "HP ROI \u5df2\u5e94\u7528\uff0c\u540e\u7eed\u8bc6\u522b\u53ea\u4f1a\u7528\u5b83\u6765\u8bc6\u522b HP\u3002",
            statsRoiApplied:
                "5 \u9879 ROI \u5df2\u5e94\u7528\uff0c\u540e\u7eed\u8bc6\u522b\u4f1a\u7528\u5b83\u6765\u8bc6\u522b\u653b\u51fb/\u9632\u5fa1/\u7279\u653b/\u7279\u9632/\u901f\u5ea6\u3002",
        },
        errors: {
            invalidInput: "\u8f93\u5165\u65e0\u6548",
            valueMustBeBetween:
                "\u503c\u5fc5\u987b\u5728 {min} \u5230 {max} \u4e4b\u95f4",
            lineMissing: "\u7b2c {line} \u884c\u7f3a\u5c11 {field}",
            lineInvalid: "\u7b2c {line} \u884c\u7684 {field} \u65e0\u6548",
            noPossibleIv: "{stat} \u4e0d\u5b58\u5728\u53ef\u884c\u4e2a\u4f53\u503c",
        },
        stats: {
            hp: "HP",
            attack: "\u653b\u51fb",
            defense: "\u9632\u5fa1",
            specialAttack: "\u7279\u653b",
            specialDefense: "\u7279\u9632",
            speed: "\u901f\u5ea6",
        },
    },
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [localeValue, setLocaleValue] = useLocalStorage<Locale>("locale", "zh");
    const locale = localeValue === "en" ? "en" : "zh";

    return (
        <I18nContext.Provider
            value={{
                locale,
                setLocale: setLocaleValue,
            }}
        >
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error("useI18n must be used within I18nProvider");
    }

    const translate = (key: string, replacements?: Record<string, string>) => {
        const value = key.split(".").reduce<string | TranslationValue>(
            (current, part) =>
                typeof current === "string" ? current : current[part],
            TRANSLATIONS[context.locale]
        );
        if (typeof value !== "string") {
            return key;
        }
        return Object.entries(replacements ?? {}).reduce(
            (result, [name, replacement]) =>
                result.split(`{${name}}`).join(replacement),
            value
        );
    };

    return {
        locale: context.locale,
        setLocale: context.setLocale,
        t: translate,
        resources: RESOURCES[context.locale],
    };
}

export function getLocation(
    resources: ResourceBundle,
    game: number,
    location: number
) {
    if (game & Game.RS) return resources.rsLocations[location];
    if (game & Game.Emerald) return resources.eLocations[location];
    return resources.frlgLocations[location];
}

export function getName(
    resources: ResourceBundle,
    species: number | string,
    form: number | string = 0
) {
    const speciesName =
        resources.species[
            typeof species === "number" ? species : parseInt(species, 10)
        ];
    const formName = resources.forms[`${species}-${form}`];

    return `${speciesName}${formName ? ` (${formName})` : ""}`;
}

export function getAllGameOptions(t: (key: string) => string) {
    return [
        { value: "r_painting", label: t("options.rubyPaintingSeed") },
        { value: "s_painting", label: t("options.sapphirePaintingSeed") },
        { value: "e_painting", label: t("options.emeraldPaintingSeed") },
        { value: "fr", label: t("options.fireRedEng") },
        { value: "fr_eu", label: t("options.fireRedEu") },
        { value: "fr_jpn_1_0", label: t("options.fireRedJpn10") },
        { value: "fr_jpn_1_1", label: t("options.fireRedJpn11") },
        { value: "fr_nx", label: t("options.switchFireRed") },
        { value: "fr_jpn_nx", label: t("options.switchFireRedJpn") },
        { value: "fr_mgba", label: t("options.fireRedMgba") },
        { value: "lg", label: t("options.leafGreenEng") },
        { value: "lg_eu", label: t("options.leafGreenEu") },
        { value: "lg_jpn", label: t("options.leafGreenJpn") },
        { value: "lg_nx", label: t("options.switchLeafGreen") },
        { value: "lg_jpn_nx", label: t("options.switchLeafGreenJpn") },
        { value: "lg_mgba", label: t("options.leafGreenMgba") },
    ];
}

export function getIdComboGameOptions(t: (key: string) => string) {
    return [{ value: "e_painting", label: t("options.emerald") }, ...getAllGameOptions(t).slice(3)];
}

export function getConsoleOptions(
    t: (key: string) => string,
    isSwitch: boolean
) {
    return isSwitch
        ? [
              { value: "NX", label: t("options.switch1") },
              { value: "NX2", label: t("options.switch2") },
          ]
        : [
              { value: "GBA", label: t("options.gba") },
              { value: "GBP", label: t("options.gbp") },
              { value: "NDS", label: t("options.nds") },
              { value: "3DS", label: t("options.firm3ds") },
          ];
}
