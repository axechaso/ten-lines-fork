import { proxy } from "comlink";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Checkbox,
    createFilterOptions,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    FormGroup,
    IconButton,
    MenuItem,
    Paper,
    Snackbar,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";

import useLocalStorage from "../hooks/useLocalStorage";
import {
    getAllGameOptions,
    getConsoleOptions,
    useI18n,
} from "../i18n";
import fetchTenLines, {
    COMBINED_WILD_METHOD,
    fetchSeedData,
    fixGameConsole,
    frameToMS,
    hexSeed,
    SEED_IDENTIFIER_TO_GAME,
    STATIC_2,
    STATIC_4,
} from "../tenLines";
import type {
    ExtendedGeneratorState,
    ExtendedWildGeneratorState,
    FRLGContiguousSeedEntry,
} from "../tenLines/generated";
import { fetchBingo, getBingoActive, useBingoBoard } from "./BingoPage";
import CalibrationComparePanel, {
    type CalibrationCompareColumn,
    type CalibrationCompareEntry,
    type CalibrationCompareRow,
    type CalibrationCompareSettings,
    type CalibrationResultRow,
    DEFAULT_COMPARE_COLUMNS,
} from "./CalibrationComparePanel";
import CalibrationTable, {
    CALIBRATION_TABLE_COLUMN_OPTIONS,
    type CalibrationTableColumn,
} from "./CalibrationTable";
import CalibrationDynamicToolPanel from "./CalibrationDynamicToolPanel";
import {
    setDynamicToolActualHit,
    setDynamicToolHitSeed,
    setDynamicToolTargetAdv,
} from "./calibrationDynamicToolStorage";
import {
    getSwitchJapaneseFRLGButtonModeLabel,
    getSwitchJapaneseFRLGExtraButtonLabel,
    getSwitchJapaneseFRLGNatureLabel,
    getSwitchJapaneseFRLGSeedButtonLabel,
    getSwitchJapaneseFRLGSoundLabel,
    isSwitchJapaneseFRLGGame,
} from "./calibrationJapaneseLabels";
import IvCalculator from "./IvCalculator";
import IvEntry from "./IvEntry";
import NumericalInput from "./NumericalInput";
import RangeInput from "./RangeInput";
import StaticEncounterSelector from "./StaticEncounterSelector";
import TeachyTVEntry from "./TeachyTVEntry";
import WildEncounterSelector from "./WildEncounterSelector";
import { filterNatureOptions } from "../utils/natureSearch";

const CALIBRATION_COMPARE_COLUMN_OPTIONS: CalibrationCompareColumn[] = [
    "seed",
    "advances",
    "pid",
    "shiny",
    "nature",
    "stats",
    "ability",
    "ivs",
    "hidden",
    "power",
    "gender",
];

const DEFAULT_COMPARE_SETTINGS: CalibrationCompareSettings = {
    enabled: true,
    position: "right",
    compareMode: "target",
    visibleColumns: DEFAULT_COMPARE_COLUMNS,
    tableVisibleColumns: CALIBRATION_TABLE_COLUMN_OPTIONS.filter(
        (column) => column !== "stats"
    ),
    calculatorEnabled: false,
    autoAddTarget: true,
    wildLevelFilterEnabled: false,
    dynamicToolEnabled: true,
    historyWildDetailsEnabled: true,
    manualTeachyTVEnabled: false,
};

const FLOATING_COMPARE_DEFAULT_SIZE = {
    width: 420,
    height: 620,
};

const FLOATING_COMPARE_MIN_WIDTH = 360;
const FLOATING_COMPARE_DEFAULT_POSITION = {
    x: 24,
    y: 88,
};
const FLOATING_DYNAMIC_DEFAULT_SIZE = {
    width: 420,
    height: 760,
};
const FLOATING_DYNAMIC_MIN_WIDTH = 340;
const FLOATING_DYNAMIC_MIN_HEIGHT = 520;
const FLOATING_DYNAMIC_DEFAULT_POSITION = {
    x: 40,
    y: 104,
};

export const COMPARE_TARGET_STORAGE_KEY = "calibration-compare-target";
export const SEARCHER_COMPARE_TARGET_KEY = "searcher-compare-target";

export interface CalibrationFormState {
    seedLeewayString: string;
    shininess: number;
    nature: number;
    gender: number;
    ivRangeStrings: [string, string][];
    ivCalculatorText: string;
    staticCategory: number;
    staticPokemon: number;
    wildCategory: number;
    wildLocation: number;
    wildPokemon: number;
    wildLead: number;
    shouldFilterPokemon: boolean;
    method: number;
}

export interface CalibrationURLState {
    game: string;
    sound: string;
    buttonMode: string;
    button: string;
    heldButton: string;
    gameConsole: string;
    targetInitialSeed: string;
    advancesMin: string;
    advancesMax: string;
    ttvAdvancesMin: string;
    ttvAdvancesMax: string;
    offset: string;
    overworldFrames: string;
    trainerID: string;
    secretID: string;
    teachyTVMode: string;
    teachyTVRegularOut: string;
    bingoTvFluctuationMode: string;
    calibrationTransfer: string;
    calibrationMethod: string;
    calibrationStaticCategory: string;
    calibrationStaticPokemon: string;
    calibrationWildCategory: string;
    calibrationWildLocation: string;
    calibrationWildPokemon: string;
    calibrationWildLead: string;
    calibrationFilterPokemon: string;
}

function parseOptionalDecimalParam(
    searchParams: URLSearchParams,
    key: string
) {
    const value = searchParams.get(key);
    if (value === null) {
        return undefined;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
}

function createCompareEntry(row: CalibrationCompareRow): CalibrationCompareEntry {
    return {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        row,
    };
}

export function createStoredCompareEntry(
    row: CalibrationCompareRow
): CalibrationCompareEntry {
    return createCompareEntry(row);
}

function parseFirstIvCalculatorLevel(value: string) {
    const firstLine = value
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line !== "");

    if (!firstLine) {
        return null;
    }

    const firstToken = firstLine.split(/[\s-]+/)[0];
    const parsedLevel = Number.parseInt(firstToken, 10);
    if (!Number.isInteger(parsedLevel) || parsedLevel < 1 || parsedLevel > 100) {
        return null;
    }

    return parsedLevel;
}

function getCompareRowAutoAddKey(row: CalibrationCompareRow | null | undefined) {
    if (!row) {
        return "";
    }

    const pidPart = "pid" in row ? row.pid : "nopid";
    return `${row.initialSeed}-${row.advances}-${pidPart}`;
}

function useCalibrationURLState() {
    const [searchParams, setSearchParams] = useSearchParams();
    const game = searchParams.get("game") || "r_painting";
    const sound = searchParams.get("sound") || "mono";
    const buttonMode = searchParams.get("buttonMode") || "a";
    const button = searchParams.get("button") || "a";
    const heldButton = searchParams.get("heldButton") || "none";
    const gameConsole = fixGameConsole(
        game,
        searchParams.get("gameConsole") || "GBA"
    );
    const advancesMin = searchParams.get("advancesMin") || "0";
    const advancesMax = searchParams.get("advancesMax") || "100";
    const ttvAdvancesMin = searchParams.get("ttvAdvancesMin") || "0";
    const ttvAdvancesMax = searchParams.get("ttvAdvancesMax") || "100";
    const offset = searchParams.get("offset") || "0";
    const overworldFrames = gameConsole.startsWith("NX")
        ? searchParams.get("overworldFrames") || "600"
        : "0";
    const trainerID = searchParams.get("trainerID") || "0";
    const secretID = searchParams.get("secretID") || "0";
    const teachyTVMode = searchParams.get("teachyTVMode") || "false";
    const teachyTVRegularOut =
        searchParams.get("teachyTVRegularOut") || "3600";
    const bingoTvFluctuationMode =
        searchParams.get("bingoTvFluctuationMode") || "false";
    const calibrationTransfer =
        searchParams.get("calibrationTransfer") || "";
    const calibrationMethod = parseOptionalDecimalParam(
        searchParams,
        "calibrationMethod"
    );
    const calibrationStaticCategory = parseOptionalDecimalParam(
        searchParams,
        "calibrationStaticCategory"
    );
    const calibrationStaticPokemon = parseOptionalDecimalParam(
        searchParams,
        "calibrationStaticPokemon"
    );
    const calibrationWildCategory = parseOptionalDecimalParam(
        searchParams,
        "calibrationWildCategory"
    );
    const calibrationWildLocation = parseOptionalDecimalParam(
        searchParams,
        "calibrationWildLocation"
    );
    const calibrationWildPokemon = parseOptionalDecimalParam(
        searchParams,
        "calibrationWildPokemon"
    );
    const calibrationWildLead = parseOptionalDecimalParam(
        searchParams,
        "calibrationWildLead"
    );
    const calibrationFilterPokemon =
        searchParams.get("calibrationFilterPokemon");
    const targetSeedValue =
        parseInt(searchParams.get("targetInitialSeed") || "DEAD", 16) ?? 0xdead;
    const setCalibrationURLState = (state: Partial<CalibrationURLState>) => {
        setSearchParams((prev) => {
            for (const [key, value] of Object.entries(state)) {
                prev.set(key, value);
            }
            return prev;
        });
    };
    return {
        game,
        sound,
        buttonMode,
        button,
        heldButton,
        gameConsole,
        targetSeedValue,
        advancesMin,
        advancesMax,
        ttvAdvancesMin,
        ttvAdvancesMax,
        offset,
        overworldFrames,
        trainerID,
        secretID,
        teachyTVMode,
        teachyTVRegularOut,
        bingoTvFluctuationMode,
        calibrationTransfer,
        calibrationMethod,
        calibrationStaticCategory,
        calibrationStaticPokemon,
        calibrationWildCategory,
        calibrationWildLocation,
        calibrationWildPokemon,
        calibrationWildLead,
        calibrationFilterPokemon,
        setCalibrationURLState,
    };
}

export default function CalibrationForm({
    sx,
    hidden,
}: {
    sx?: Record<string, unknown>;
    hidden?: boolean;
}) {
    const { t, resources } = useI18n();
    const [calibrationFormState, setCalibrationFormState] =
        useState<CalibrationFormState>({
            seedLeewayString: "20",
            shininess: 255,
            nature: -1,
            gender: 255,
            ivRangeStrings: [
                ["0", "31"],
                ["0", "31"],
                ["0", "31"],
                ["0", "31"],
                ["0", "31"],
                ["0", "31"],
            ],
            ivCalculatorText: "",
            staticCategory: 0,
            staticPokemon: 0,
            wildCategory: 0,
            wildLocation: 0,
            wildPokemon: 0,
            wildLead: 255,
            shouldFilterPokemon: false,
            method: 1,
        });
    const {
        game,
        sound,
        buttonMode,
        button,
        heldButton,
        gameConsole,
        targetSeedValue,
        advancesMin,
        advancesMax,
        ttvAdvancesMin,
        ttvAdvancesMax,
        offset,
        overworldFrames,
        trainerID,
        secretID,
        teachyTVMode,
        teachyTVRegularOut,
        bingoTvFluctuationMode,
        calibrationTransfer,
        calibrationMethod,
        calibrationStaticCategory,
        calibrationStaticPokemon,
        calibrationWildCategory,
        calibrationWildLocation,
        calibrationWildPokemon,
        calibrationWildLead,
        calibrationFilterPokemon,
        setCalibrationURLState,
    } = useCalibrationURLState();

    useEffect(() => {
        if (!calibrationTransfer) {
            return;
        }

        setCalibrationFormState((current) => ({
            ...current,
            ...(calibrationMethod === undefined
                ? {}
                : { method: calibrationMethod }),
            ...(calibrationStaticCategory === undefined
                ? {}
                : { staticCategory: calibrationStaticCategory }),
            ...(calibrationStaticPokemon === undefined
                ? {}
                : { staticPokemon: calibrationStaticPokemon }),
            ...(calibrationWildCategory === undefined
                ? {}
                : { wildCategory: calibrationWildCategory }),
            ...(calibrationWildLocation === undefined
                ? {}
                : { wildLocation: calibrationWildLocation }),
            ...(calibrationWildPokemon === undefined
                ? {}
                : { wildPokemon: calibrationWildPokemon }),
            ...(calibrationWildLead === undefined
                ? {}
                : { wildLead: calibrationWildLead }),
            ...(calibrationFilterPokemon === null
                ? {}
                : {
                      shouldFilterPokemon:
                          calibrationFilterPokemon === "true",
                  }),
        }));
    }, [
        calibrationFilterPokemon,
        calibrationMethod,
        calibrationStaticCategory,
        calibrationStaticPokemon,
        calibrationTransfer,
        calibrationWildCategory,
        calibrationWildLead,
        calibrationWildLocation,
        calibrationWildPokemon,
    ]);

    const [, setBingoBoard, , setBingoCounters] = useBingoBoard();

    const bingoActive = getBingoActive();
    const isBingoTvFluctuationMode = bingoTvFluctuationMode === "true";

    const isStatic = calibrationFormState.method <= STATIC_4;
    const isFRLG = game.startsWith("fr") || game.startsWith("lg");
    const isFRLGE = isFRLG || game.startsWith("e_");
    const isSwitch = game.endsWith("nx");
    const usesSwitchJapaneseFRLGLabels = isSwitchJapaneseFRLGGame(game);
    const soundOptionLabels = {
        mono: usesSwitchJapaneseFRLGLabels
            ? getSwitchJapaneseFRLGSoundLabel("mono")
            : t("common.mono"),
        stereo: usesSwitchJapaneseFRLGLabels
            ? getSwitchJapaneseFRLGSoundLabel("stereo")
            : t("common.stereo"),
    };
    const buttonModeOptionLabels = {
        a: usesSwitchJapaneseFRLGLabels
            ? getSwitchJapaneseFRLGButtonModeLabel("a")
            : "L=A",
        h: usesSwitchJapaneseFRLGLabels
            ? getSwitchJapaneseFRLGButtonModeLabel("h")
            : t("options.help"),
        r: usesSwitchJapaneseFRLGLabels
            ? getSwitchJapaneseFRLGButtonModeLabel("r")
            : "LR",
    };
    const seedButtonOptionLabels = {
        a: usesSwitchJapaneseFRLGLabels
            ? getSwitchJapaneseFRLGSeedButtonLabel("a")
            : "A",
        start: usesSwitchJapaneseFRLGLabels
            ? getSwitchJapaneseFRLGSeedButtonLabel("start")
            : t("options.start"),
        l: usesSwitchJapaneseFRLGLabels
            ? getSwitchJapaneseFRLGSeedButtonLabel("l")
            : "L (L=A)",
    };
    const extraButtonOptionLabels = {
        none: usesSwitchJapaneseFRLGLabels
            ? getSwitchJapaneseFRLGExtraButtonLabel("none")
            : t("common.none"),
        startup_select: usesSwitchJapaneseFRLGLabels
            ? getSwitchJapaneseFRLGExtraButtonLabel("startup_select")
            : t("options.startupSelect"),
        startup_a: usesSwitchJapaneseFRLGLabels
            ? getSwitchJapaneseFRLGExtraButtonLabel("startup_a")
            : t("options.startupA"),
        blackout_r: usesSwitchJapaneseFRLGLabels
            ? getSwitchJapaneseFRLGExtraButtonLabel("blackout_r")
            : t("options.blackoutR"),
        blackout_a: usesSwitchJapaneseFRLGLabels
            ? getSwitchJapaneseFRLGExtraButtonLabel("blackout_a")
            : t("options.blackoutA"),
        blackout_l: usesSwitchJapaneseFRLGLabels
            ? getSwitchJapaneseFRLGExtraButtonLabel("blackout_l")
            : t("options.blackoutL"),
        blackout_al: usesSwitchJapaneseFRLGLabels
            ? getSwitchJapaneseFRLGExtraButtonLabel("blackout_al")
            : t("options.blackoutAL"),
    };

    const [rows, setRows] = useState<
        ExtendedGeneratorState[] | ExtendedWildGeneratorState[]
    >([]);
    const [searching, setSearching] = useState(false);
    const [hasSubmittedSearch, setHasSubmittedSearch] = useState(false);
    const [storedCompareSettings, setCompareSettings] =
        useLocalStorage<CalibrationCompareSettings>(
            "calibration-compare-settings",
            DEFAULT_COMPARE_SETTINGS
        );
    const compareSettings: CalibrationCompareSettings = {
        ...DEFAULT_COMPARE_SETTINGS,
        ...storedCompareSettings,
    };
    const [compareTarget, setCompareTarget] =
        useLocalStorage<CalibrationCompareEntry | null>(
            COMPARE_TARGET_STORAGE_KEY,
            null
        );
    const [compareHistory, setCompareHistory] = useLocalStorage<
        CalibrationCompareEntry[]
    >("calibration-compare-history", []);
    const [compareSettingsOpen, setCompareSettingsOpen] = useState(false);
    const [compareFeedback, setCompareFeedback] = useState("");
    const [blockedAutoAddKey, setBlockedAutoAddKey] = useState("");
    const [compareFloating, setCompareFloating] = useState(false);
    const [dynamicToolFloating, setDynamicToolFloating] = useState(false);
    const [activeFloatingPanel, setActiveFloatingPanel] = useState<
        "compare" | "dynamic"
    >("compare");
    const [compareFloatingPosition, setCompareFloatingPosition] = useState(
        FLOATING_COMPARE_DEFAULT_POSITION
    );
    const [compareFloatingSize, setCompareFloatingSize] = useState(
        FLOATING_COMPARE_DEFAULT_SIZE
    );
    const [dynamicToolFloatingPosition, setDynamicToolFloatingPosition] =
        useState(FLOATING_DYNAMIC_DEFAULT_POSITION);
    const [dynamicToolFloatingSize, setDynamicToolFloatingSize] = useState(
        FLOATING_DYNAMIC_DEFAULT_SIZE
    );
    const compareFloatingFrameRef = useRef<{
        mode: "drag" | "resize-right" | "resize-bottom" | "resize-corner";
        pointerX: number;
        pointerY: number;
        startX: number;
        startY: number;
        startWidth: number;
        startHeight: number;
    } | null>(null);
    const dynamicToolFloatingFrameRef = useRef<{
        mode: "drag" | "resize-right" | "resize-bottom" | "resize-corner";
        pointerX: number;
        pointerY: number;
        startX: number;
        startY: number;
        startWidth: number;
        startHeight: number;
    } | null>(null);

    const [seedLeewayIsValid, setSeedLeewayIsValid] = useState(true);
    const seedLeeway = seedLeewayIsValid
        ? parseInt(calibrationFormState.seedLeewayString, 10)
        : 0;
    const [advancesRangeIsValid, setAdvancesRangeIsValid] = useState(true);
    const advancesRange = advancesRangeIsValid
        ? [parseInt(advancesMin, 10), parseInt(advancesMax, 10)]
        : [0, 0];
    const canManuallyToggleTeachyTV =
        compareSettings.manualTeachyTVEnabled && isFRLG;
    const isTeachyTVMode = teachyTVMode === "true" && canManuallyToggleTeachyTV;
    const [ttvAdvancesRangeIsValid, setTTVAdvancesRangeIsValid] =
        useState(true);
    const ttvAdvancesRange = !isTeachyTVMode
        ? [0, 0]
        : ttvAdvancesRangeIsValid
          ? [parseInt(ttvAdvancesMin, 10), parseInt(ttvAdvancesMax, 10)]
          : [0, 0];
    const [ivRangesAreValid, setIvRangesAreValid] = useState(true);
    const [offsetIsValid, setOffsetIsValid] = useState(true);
    const [overworldFramesIsValid, setOverworldFramesIsValid] = useState(true);
    const ivRanges =
        calibrationFormState.nature == -1
            ? [
                  [0, 31],
                  [0, 31],
                  [0, 31],
                  [0, 31],
                  [0, 31],
                  [0, 31],
              ]
            : ivRangesAreValid
              ? calibrationFormState.ivRangeStrings.map((range) => [
                    parseInt(range[0], 10),
                    parseInt(range[1], 10),
                ])
              : [];

    const [trainerIDIsValid, setTrainerIDIsValid] = useState(true);
    const [secretIDIsValid, setSecretIDIsValid] = useState(true);

    const [seedList, setSeedList] = useState<FRLGContiguousSeedEntry[]>([]);
    const [seedDialogOpen, setSeedDialogOpen] = useState(false);
    const [targetSeedInput, setTargetSeedInput] = useState("");
    const [targetSeedIsValid, setTargetSeedIsValid] = useState(true);

    const isNotSubmittable =
        searching ||
        seedList.length === 0 ||
        !targetSeedIsValid ||
        !trainerIDIsValid ||
        !secretIDIsValid ||
        !seedLeewayIsValid ||
        !advancesRangeIsValid ||
        (isTeachyTVMode && !ttvAdvancesRangeIsValid) ||
        !ivRangesAreValid ||
        !offsetIsValid ||
        !overworldFramesIsValid;

    useEffect(() => {
        const fetchSeedList = async () => {
            if (!isFRLG) {
                setSeedList(
                    [...Array(0x10000).keys()].map((seed) => ({
                        initialSeed: seed,
                        seedTime: seed * 16,
                    }))
                );
                return;
            }
            const seedData = await fetchSeedData(game);
            const tenLines = await fetchTenLines();
            const nextSeedList = await tenLines.get_contiguous_seed_list(
                seedData,
                `${sound}_${buttonMode}_${button}`,
                game,
                heldButton
            );
            setSeedList(nextSeedList);
            if (
                nextSeedList.findIndex(
                    (seed: FRLGContiguousSeedEntry) =>
                        seed.initialSeed === targetSeedValue
                ) == -1
            ) {
                setCalibrationURLState({
                    targetInitialSeed: hexSeed(
                        nextSeedList.length > 0
                            ? nextSeedList[Math.min(51, nextSeedList.length - 1)]
                                  .initialSeed
                            : 0xdead,
                        16
                    ),
                });
            }
        };
        void fetchSeedList();
    }, [game, sound, buttonMode, button, heldButton]);

    const normalizeSeedInput = useCallback(
        (value: string) => value.trim().replace(/^0x/i, "").toUpperCase(),
        []
    );

    const targetSeedIndex = useMemo(
        () =>
            seedList.findIndex((seed) => seed.initialSeed === targetSeedValue),
        [seedList, targetSeedValue]
    );

    const targetSeed: FRLGContiguousSeedEntry =
        targetSeedIndex === -1
            ? { initialSeed: 0xdead, seedTime: 0 }
            : seedList[targetSeedIndex];

    useEffect(() => {
        setTargetSeedInput(hexSeed(targetSeedValue, 16));
    }, [targetSeedValue]);

    useEffect(() => {
        setTargetSeedIsValid(seedList.length === 0 || targetSeedIndex !== -1);
    }, [seedList.length, targetSeedIndex]);
    const orderedVisibleColumns = CALIBRATION_COMPARE_COLUMN_OPTIONS.filter(
        (column) => compareSettings.visibleColumns.includes(column)
    );
    const tableVisibleColumns =
        compareSettings.tableVisibleColumns as CalibrationTableColumn[];
    const orderedTableVisibleColumns = CALIBRATION_TABLE_COLUMN_OPTIONS.filter(
        (column) => tableVisibleColumns.includes(column)
    );
    const ivCalculatorEnabled = calibrationFormState.nature !== -1;
    const firstIvCalculatorLevel = useMemo(
        () =>
            ivCalculatorEnabled
                ? parseFirstIvCalculatorLevel(
                      calibrationFormState.ivCalculatorText
                  )
                : null,
        [ivCalculatorEnabled, calibrationFormState.ivCalculatorText]
    );
    const visibleRows = useMemo(() => {
        if (
            isStatic ||
            !ivCalculatorEnabled ||
            !compareSettings.wildLevelFilterEnabled ||
            firstIvCalculatorLevel === null
        ) {
            return rows;
        }

        return (rows as ExtendedWildGeneratorState[]).filter(
            (row) => row.level === firstIvCalculatorLevel
        );
    }, [
        ivCalculatorEnabled,
        compareSettings.wildLevelFilterEnabled,
        firstIvCalculatorLevel,
        isStatic,
        rows,
    ]);
    const compareFloatingMinHeight = compareSettings.calculatorEnabled
        ? 520
        : 400;
    const currentAutoAddKey = useMemo(
        () => getCompareRowAutoAddKey(visibleRows[0]),
        [visibleRows]
    );
    const dynamicToolFloatingZIndex =
        activeFloatingPanel === "dynamic" ? 1401 : 1400;
    const compareFloatingZIndex =
        activeFloatingPanel === "compare" ? 1401 : 1400;

    const clampFloatingPosition = useCallback((
        x: number,
        y: number,
        width: number,
        height: number
    ) => ({
        x: Math.min(
            Math.max(12, x),
            Math.max(12, window.innerWidth - width - 12)
        ),
        y: Math.min(
            Math.max(12, y),
            Math.max(12, window.innerHeight - height - 12)
        ),
    }), []);

    const clampFloatingSize = useCallback((width: number, height: number) => ({
        width: Math.min(
            Math.max(FLOATING_COMPARE_MIN_WIDTH, width),
            Math.max(FLOATING_COMPARE_MIN_WIDTH, window.innerWidth - 24)
        ),
        height: Math.min(
            Math.max(compareFloatingMinHeight, height),
            Math.max(compareFloatingMinHeight, window.innerHeight - 24)
        ),
    }), [compareFloatingMinHeight]);
    const clampDynamicToolFloatingSize = useCallback(
        (width: number, height: number) => ({
            width: Math.min(
                Math.max(FLOATING_DYNAMIC_MIN_WIDTH, width),
                Math.max(FLOATING_DYNAMIC_MIN_WIDTH, window.innerWidth - 24)
            ),
            height: Math.min(
                Math.max(FLOATING_DYNAMIC_MIN_HEIGHT, height),
                Math.max(FLOATING_DYNAMIC_MIN_HEIGHT, window.innerHeight - 24)
            ),
        }),
        []
    );
    const syncDynamicToolSeedHit = useCallback(
        (row: CalibrationCompareRow) => {
            setDynamicToolHitSeed(row.initialSeed === targetSeed.initialSeed);
        },
        [targetSeed.initialSeed]
    );

    const addCompareTarget = useCallback((row: CalibrationCompareRow) => {
        setCompareTarget(createCompareEntry(row));
        setBlockedAutoAddKey("");
        setDynamicToolTargetAdv(row.advances);
        syncDynamicToolSeedHit(row);
        setCompareFeedback(t("compare.addedTarget"));
    }, [setCompareTarget, setCompareFeedback, syncDynamicToolSeedHit, t]);

    const addCompareHistory = (row: CalibrationResultRow) => {
        setCompareHistory((history: CalibrationCompareEntry[]) => [
            ...history,
            createCompareEntry(row),
        ]);
        setCompareFeedback(t("compare.addedHistory"));
    };

    const addCompareHistoryEntry = useCallback((row: CalibrationCompareRow) => {
        setCompareHistory((history: CalibrationCompareEntry[]) => [
            ...history,
            createCompareEntry(row),
        ]);
        if ("ivs" in row && "pid" in row) {
            setDynamicToolActualHit(row.advances);
        }
        syncDynamicToolSeedHit(row);
        setCompareFeedback(t("compare.addedHistory"));
    }, [setCompareHistory, syncDynamicToolSeedHit, t]);

    const handleQuickAdd = (
        row: CalibrationResultRow,
        destination: "target" | "history"
    ) => {
        if (destination === "target") {
            addCompareTarget(row);
            return;
        }
        setDynamicToolActualHit(row.advances);
        syncDynamicToolSeedHit(row);
        addCompareHistory(row);
    };

    const deleteCompareTarget = () => {
        setBlockedAutoAddKey(currentAutoAddKey);
        setCompareTarget(null);
    };

    const clearCompareEntries = () => {
        setBlockedAutoAddKey(currentAutoAddKey);
        setCompareTarget(null);
        setCompareHistory([]);
    };

    const clearCompareHistory = () => {
        setBlockedAutoAddKey(currentAutoAddKey);
        setCompareHistory([]);
    };

    useEffect(() => {
        if (!compareFloating) {
            return undefined;
        }

        const handlePointerMove = (event: MouseEvent) => {
            const frame = compareFloatingFrameRef.current;
            if (!frame) {
                return;
            }

            if (frame.mode === "drag") {
                const nextPosition = clampFloatingPosition(
                    frame.startX + (event.clientX - frame.pointerX),
                    frame.startY + (event.clientY - frame.pointerY),
                    compareFloatingSize.width,
                    compareFloatingSize.height
                );
                setCompareFloatingPosition(nextPosition);
                return;
            }

            const nextWidth =
                frame.mode === "resize-bottom"
                    ? frame.startWidth
                    : frame.startWidth + (event.clientX - frame.pointerX);
            const nextHeight =
                frame.mode === "resize-right"
                    ? frame.startHeight
                    : frame.startHeight + (event.clientY - frame.pointerY);
            const clampedSize = clampFloatingSize(nextWidth, nextHeight);

            setCompareFloatingSize(clampedSize);
            setCompareFloatingPosition((current) =>
                clampFloatingPosition(
                    current.x,
                    current.y,
                    clampedSize.width,
                    clampedSize.height
                )
            );
        };

        const handlePointerUp = () => {
            compareFloatingFrameRef.current = null;
        };

        window.addEventListener("mousemove", handlePointerMove);
        window.addEventListener("mouseup", handlePointerUp);

        return () => {
            window.removeEventListener("mousemove", handlePointerMove);
            window.removeEventListener("mouseup", handlePointerUp);
        };
    }, [
        clampFloatingPosition,
        clampFloatingSize,
        compareFloating,
        compareFloatingMinHeight,
        compareFloatingSize.height,
        compareFloatingSize.width,
    ]);

    useEffect(() => {
        if (!dynamicToolFloating) {
            return undefined;
        }

        const handlePointerMove = (event: MouseEvent) => {
            const frame = dynamicToolFloatingFrameRef.current;
            if (!frame) {
                return;
            }

            if (frame.mode === "drag") {
                const nextPosition = clampFloatingPosition(
                    frame.startX + (event.clientX - frame.pointerX),
                    frame.startY + (event.clientY - frame.pointerY),
                    dynamicToolFloatingSize.width,
                    dynamicToolFloatingSize.height
                );
                setDynamicToolFloatingPosition(nextPosition);
                return;
            }

            const nextWidth =
                frame.mode === "resize-bottom"
                    ? frame.startWidth
                    : frame.startWidth + (event.clientX - frame.pointerX);
            const nextHeight =
                frame.mode === "resize-right"
                    ? frame.startHeight
                    : frame.startHeight + (event.clientY - frame.pointerY);
            const clampedSize = clampDynamicToolFloatingSize(
                nextWidth,
                nextHeight
            );

            setDynamicToolFloatingSize(clampedSize);
            setDynamicToolFloatingPosition((current) =>
                clampFloatingPosition(
                    current.x,
                    current.y,
                    clampedSize.width,
                    clampedSize.height
                )
            );
        };

        const handlePointerUp = () => {
            dynamicToolFloatingFrameRef.current = null;
        };

        window.addEventListener("mousemove", handlePointerMove);
        window.addEventListener("mouseup", handlePointerUp);

        return () => {
            window.removeEventListener("mousemove", handlePointerMove);
            window.removeEventListener("mouseup", handlePointerUp);
        };
    }, [
        clampDynamicToolFloatingSize,
        clampFloatingPosition,
        dynamicToolFloating,
        dynamicToolFloatingSize.height,
        dynamicToolFloatingSize.width,
    ]);

    useEffect(() => {
        if (!compareFloating) {
            return undefined;
        }

        const handleResize = () => {
            setCompareFloatingSize((current) =>
                clampFloatingSize(current.width, current.height)
            );
            setCompareFloatingPosition((current) =>
                clampFloatingPosition(
                    current.x,
                    current.y,
                    compareFloatingSize.width,
                    compareFloatingSize.height
                )
            );
        };

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [
        clampFloatingPosition,
        clampFloatingSize,
        compareFloating,
        compareFloatingMinHeight,
        compareFloatingSize.height,
        compareFloatingSize.width,
    ]);

    useEffect(() => {
        if (!dynamicToolFloating) {
            return undefined;
        }

        const handleResize = () => {
            setDynamicToolFloatingSize((current) =>
                clampDynamicToolFloatingSize(current.width, current.height)
            );
            setDynamicToolFloatingPosition((current) =>
                clampFloatingPosition(
                    current.x,
                    current.y,
                    dynamicToolFloatingSize.width,
                    dynamicToolFloatingSize.height
                )
            );
        };

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [
        clampDynamicToolFloatingSize,
        clampFloatingPosition,
        dynamicToolFloating,
        dynamicToolFloatingSize.height,
        dynamicToolFloatingSize.width,
    ]);

    useEffect(() => {
        if (!compareFloating) {
            return;
        }
        setCompareFloatingSize((current) =>
            clampFloatingSize(current.width, current.height)
        );
    }, [clampFloatingSize, compareFloating, compareFloatingMinHeight]);

    useEffect(() => {
        if (!dynamicToolFloating) {
            return;
        }
        setDynamicToolFloatingSize((current) =>
            clampDynamicToolFloatingSize(current.width, current.height)
        );
    }, [clampDynamicToolFloatingSize, dynamicToolFloating]);

    const startCompareFloatingDrag = (
        event: React.MouseEvent<HTMLDivElement>
    ) => {
        if (!compareFloating || event.button !== 0) {
            return;
        }
        const target = event.target as HTMLElement;
        if (target.closest("button")) {
            return;
        }
        event.preventDefault();
        compareFloatingFrameRef.current = {
            mode: "drag",
            pointerX: event.clientX,
            pointerY: event.clientY,
            startX: compareFloatingPosition.x,
            startY: compareFloatingPosition.y,
            startWidth: compareFloatingSize.width,
            startHeight: compareFloatingSize.height,
        };
    };
    const startDynamicToolFloatingDrag = (
        event: React.MouseEvent<HTMLDivElement>
    ) => {
        if (!dynamicToolFloating || event.button !== 0) {
            return;
        }
        const target = event.target as HTMLElement;
        if (target.closest("button")) {
            return;
        }
        event.preventDefault();
        setActiveFloatingPanel("dynamic");
        dynamicToolFloatingFrameRef.current = {
            mode: "drag",
            pointerX: event.clientX,
            pointerY: event.clientY,
            startX: dynamicToolFloatingPosition.x,
            startY: dynamicToolFloatingPosition.y,
            startWidth: dynamicToolFloatingSize.width,
            startHeight: dynamicToolFloatingSize.height,
        };
    };

    const startCompareFloatingResize = (
        mode: "resize-right" | "resize-bottom" | "resize-corner"
    ) => (event: React.MouseEvent<HTMLDivElement>) => {
        if (!compareFloating || event.button !== 0) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        compareFloatingFrameRef.current = {
            mode,
            pointerX: event.clientX,
            pointerY: event.clientY,
            startX: compareFloatingPosition.x,
            startY: compareFloatingPosition.y,
            startWidth: compareFloatingSize.width,
            startHeight: compareFloatingSize.height,
        };
    };
    const startDynamicToolFloatingResize = (
        mode: "resize-right" | "resize-bottom" | "resize-corner"
    ) => (event: React.MouseEvent<HTMLDivElement>) => {
        if (!dynamicToolFloating || event.button !== 0) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        setActiveFloatingPanel("dynamic");
        dynamicToolFloatingFrameRef.current = {
            mode,
            pointerX: event.clientX,
            pointerY: event.clientY,
            startX: dynamicToolFloatingPosition.x,
            startY: dynamicToolFloatingPosition.y,
            startWidth: dynamicToolFloatingSize.width,
            startHeight: dynamicToolFloatingSize.height,
        };
    };

    const toggleCompareFloating = () => {
        setCompareFloating((current) => {
            const next = !current;
            if (next) {
                setActiveFloatingPanel("compare");
                const clampedSize = clampFloatingSize(
                    compareFloatingSize.width,
                    compareFloatingSize.height
                );
                setCompareFloatingSize(clampedSize);
                setCompareFloatingPosition((position) =>
                    clampFloatingPosition(
                        position.x,
                        position.y,
                        clampedSize.width,
                        clampedSize.height
                    )
                );
            } else {
                compareFloatingFrameRef.current = null;
            }
            return next;
        });
    };
    const toggleDynamicToolFloating = () => {
        setDynamicToolFloating((current) => {
            const next = !current;
            if (next) {
                setActiveFloatingPanel("dynamic");
                const clampedSize = clampDynamicToolFloatingSize(
                    dynamicToolFloatingSize.width,
                    dynamicToolFloatingSize.height
                );
                setDynamicToolFloatingSize(clampedSize);
                setDynamicToolFloatingPosition((position) =>
                    clampFloatingPosition(
                        position.x,
                        position.y,
                        clampedSize.width,
                        clampedSize.height
                    )
                );
            } else {
                dynamicToolFloatingFrameRef.current = null;
            }
            return next;
        });
    };

    const toggleCompareColumn = (column: CalibrationCompareColumn) => {
        setCompareSettings((current: CalibrationCompareSettings) => {
            const exists = current.visibleColumns.includes(column);
            const nextVisibleColumns = exists
                ? current.visibleColumns.filter(
                      (item: CalibrationCompareColumn) => item !== column
                  )
                : [...current.visibleColumns, column];

            return {
                ...current,
                visibleColumns:
                    nextVisibleColumns.length > 0
                        ? nextVisibleColumns
                        : current.visibleColumns,
            };
        });
    };

    const toggleResultColumn = (column: CalibrationTableColumn) => {
        setCompareSettings((current: CalibrationCompareSettings) => {
            const currentColumns =
                current.tableVisibleColumns as CalibrationTableColumn[];
            const exists = currentColumns.includes(column);
            const nextVisibleColumns = exists
                ? currentColumns.filter(
                      (item: CalibrationTableColumn) => item !== column
                  )
                : [...currentColumns, column];

            return {
                ...current,
                tableVisibleColumns:
                    nextVisibleColumns.length > 0
                        ? nextVisibleColumns
                        : current.tableVisibleColumns,
            };
        });
    };

    useEffect(() => {
        if (
            !compareSettings.autoAddTarget ||
            compareTarget ||
            currentAutoAddKey === "" ||
            blockedAutoAddKey === currentAutoAddKey ||
            visibleRows.length === 0
        ) {
            return;
        }
        addCompareTarget(visibleRows[0]);
    }, [
        addCompareTarget,
        blockedAutoAddKey,
        compareSettings.autoAddTarget,
        compareTarget,
        currentAutoAddKey,
        visibleRows,
    ]);

    useEffect(() => {
        let nextStaticCategory = calibrationFormState.staticCategory;

        if (nextStaticCategory === 3 && !isFRLG) {
            nextStaticCategory = 0;
        }
        if (nextStaticCategory === 6 && !isFRLGE) {
            nextStaticCategory = 0;
        }
        if (nextStaticCategory === 8 && isFRLG) {
            nextStaticCategory = 0;
        }

        if (nextStaticCategory !== calibrationFormState.staticCategory) {
            setCalibrationFormState((current) => ({
                ...current,
                staticCategory: nextStaticCategory,
            }));
        }
    }, [calibrationFormState.staticCategory, isFRLG, isFRLGE]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        runSearch();
    };

    const runSearch = () => {
        if (isNotSubmittable) {
            setRows([]);
            return;
        }

        const searchSeeds = seedList.slice(
            Math.max(0, targetSeedIndex - seedLeeway),
            Math.min(seedList.length, targetSeedIndex + seedLeeway + 1)
        );
        const submit = async () => {
            const tenLines = await fetchTenLines();
            setRows([]);
            setHasSubmittedSearch(true);
            setSearching(true);
            if (isStatic) {
                await tenLines.check_seeds_static(
                    searchSeeds,
                    advancesRange,
                    ttvAdvancesRange,
                    parseInt(offset),
                    SEED_IDENTIFIER_TO_GAME[game],
                    parseInt(trainerID),
                    parseInt(secretID),
                    calibrationFormState.staticCategory,
                    calibrationFormState.staticPokemon,
                    calibrationFormState.method,
                    calibrationFormState.shininess,
                    calibrationFormState.nature,
                    calibrationFormState.gender,
                    ivRanges,
                    proxy((results: ExtendedGeneratorState[]) => {
                        setRows((currentRows) => {
                            if (
                                currentRows.length > 1000 ||
                                results.length === 0
                            ) {
                                return currentRows;
                            }
                            return [...currentRows, ...results];
                        });
                    }),
                    proxy(setSearching)
                );
            } else {
                await tenLines.check_seeds_wild(
                    searchSeeds,
                    advancesRange,
                    ttvAdvancesRange,
                    parseInt(offset),
                    SEED_IDENTIFIER_TO_GAME[game],
                    parseInt(trainerID),
                    parseInt(secretID),
                    calibrationFormState.wildCategory,
                    calibrationFormState.wildLocation,
                    !calibrationFormState.shouldFilterPokemon
                        ? -1
                        : calibrationFormState.wildPokemon,
                    calibrationFormState.method,
                    calibrationFormState.wildLead,
                    calibrationFormState.shininess,
                    calibrationFormState.nature,
                    calibrationFormState.gender,
                    ivRanges,
                    proxy((results: ExtendedWildGeneratorState[]) => {
                        setRows((currentRows) => {
                            if (
                                currentRows.length > 1000 ||
                                results.length === 0
                            ) {
                                return currentRows;
                            }
                            return [...currentRows, ...results];
                        });
                    }),
                    proxy(setSearching)
                );
            }
        };
        void submit();
    };

    const targetSeedFilterOptions = createFilterOptions({
        limit: 100,
        stringify: (option: FRLGContiguousSeedEntry) =>
            `${hexSeed(option.initialSeed, 16)}`,
    });

    if (hidden) {
        return null;
    }

    const comparePanel = (
        <CalibrationComparePanel
            targetEntry={compareTarget}
            historyEntries={compareHistory}
            settings={{
                ...compareSettings,
                visibleColumns: orderedVisibleColumns,
            }}
            floating={compareFloating}
            gameConsole={gameConsole}
            onDeleteTarget={deleteCompareTarget}
            onDeleteHistoryEntry={(id) => {
                setCompareHistory((history: CalibrationCompareEntry[]) =>
                    history.filter(
                        (entry: CalibrationCompareEntry) => entry.id !== id
                    )
                );
            }}
            onReAddHistoryEntry={(id) => {
                const existingEntry = compareHistory.find(
                    (entry: CalibrationCompareEntry) => entry.id === id
                );
                if (existingEntry) {
                    addCompareHistoryEntry(existingEntry.row);
                }
            }}
            onClearAll={clearCompareEntries}
            onClearHistory={clearCompareHistory}
            onOpenSettings={() => setCompareSettingsOpen(true)}
            onToggleFloating={toggleCompareFloating}
            onHeaderMouseDown={startCompareFloatingDrag}
        />
    );

    const dynamicToolPanel = compareSettings.dynamicToolEnabled ? (
        <CalibrationDynamicToolPanel
            floating={dynamicToolFloating}
            onToggleFloating={toggleDynamicToolFloating}
            onHeaderMouseDown={startDynamicToolFloatingDrag}
        />
    ) : null;

    return (
        <Box
            sx={{
                ...sx,
                width: "100%",
                position: "relative",
                overflow: "visible",
            }}
        >
            <Box
                sx={{
                    width: "100%",
                    display: "grid",
                    gap: 2,
                    alignItems: "start",
                    gridTemplateColumns: {
                        xs: "1fr",
                        lg: "minmax(0, 1fr) minmax(0, 960px) minmax(0, 1fr)",
                        xl: compareSettings.enabled
                            ? "minmax(260px, 1fr) minmax(720px, 2fr) minmax(260px, 1fr)"
                            : "minmax(0, 1fr) minmax(0, 960px) minmax(0, 1fr)",
                    },
                }}
            >
                {compareSettings.dynamicToolEnabled && !dynamicToolFloating ? (
                    <Box
                        sx={{
                            order: { xs: 1, lg: 1 },
                            position: { lg: "sticky" },
                            top: { lg: 16 },
                            alignSelf: "start",
                            minWidth: 0,
                            gridColumn: { xs: "1", lg: "2", xl: "1" },
                        }}
                    >
                        {dynamicToolPanel}
                    </Box>
                ) : null}

                {compareSettings.enabled && compareFloating && (
                    <Box
                        onMouseDown={() => setActiveFloatingPanel("compare")}
                        sx={{
                            position: "fixed",
                            top: compareFloatingPosition.y,
                            left: compareFloatingPosition.x,
                            width: compareFloatingSize.width,
                            height: compareFloatingSize.height,
                            minWidth: FLOATING_COMPARE_MIN_WIDTH,
                            minHeight: compareFloatingMinHeight,
                            maxWidth: "calc(100vw - 24px)",
                            maxHeight: "calc(100vh - 24px)",
                            overflow: "hidden",
                            zIndex: compareFloatingZIndex,
                            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
                        }}
                    >
                        {comparePanel}
                        <Box
                            onMouseDown={startCompareFloatingResize("resize-right")}
                            sx={{
                                position: "absolute",
                                top: 0,
                                right: 0,
                                width: 10,
                                height: "100%",
                                cursor: "ew-resize",
                                zIndex: 2,
                            }}
                        />
                        <Box
                            onMouseDown={startCompareFloatingResize("resize-bottom")}
                            sx={{
                                position: "absolute",
                                left: 0,
                                bottom: 0,
                                width: "100%",
                                height: 10,
                                cursor: "ns-resize",
                                zIndex: 2,
                            }}
                        />
                        <Box
                            onMouseDown={startCompareFloatingResize("resize-corner")}
                            sx={{
                                position: "absolute",
                                right: 0,
                                bottom: 0,
                                width: 18,
                                height: 18,
                                cursor: "nwse-resize",
                                zIndex: 3,
                                "&::after": {
                                    content: '""',
                                    position: "absolute",
                                    right: 4,
                                    bottom: 4,
                                    width: 8,
                                    height: 8,
                                    borderRight: "2px solid rgba(255,255,255,0.45)",
                                    borderBottom: "2px solid rgba(255,255,255,0.45)",
                                },
                            }}
                        />
                    </Box>
                )}
                {compareSettings.dynamicToolEnabled && dynamicToolFloating ? (
                    <Box
                        onMouseDown={() => setActiveFloatingPanel("dynamic")}
                        sx={{
                            position: "fixed",
                            top: dynamicToolFloatingPosition.y,
                            left: dynamicToolFloatingPosition.x,
                            width: dynamicToolFloatingSize.width,
                            height: dynamicToolFloatingSize.height,
                            minWidth: FLOATING_DYNAMIC_MIN_WIDTH,
                            minHeight: FLOATING_DYNAMIC_MIN_HEIGHT,
                            maxWidth: "calc(100vw - 24px)",
                            maxHeight: "calc(100vh - 24px)",
                            overflow: "hidden",
                            zIndex: dynamicToolFloatingZIndex,
                            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
                        }}
                    >
                        {dynamicToolPanel}
                        <Box
                            onMouseDown={startDynamicToolFloatingResize("resize-right")}
                            sx={{
                                position: "absolute",
                                top: 0,
                                right: 0,
                                width: 10,
                                height: "100%",
                                cursor: "ew-resize",
                                zIndex: 2,
                            }}
                        />
                        <Box
                            onMouseDown={startDynamicToolFloatingResize("resize-bottom")}
                            sx={{
                                position: "absolute",
                                left: 0,
                                bottom: 0,
                                width: "100%",
                                height: 10,
                                cursor: "ns-resize",
                                zIndex: 2,
                            }}
                        />
                        <Box
                            onMouseDown={startDynamicToolFloatingResize("resize-corner")}
                            sx={{
                                position: "absolute",
                                right: 0,
                                bottom: 0,
                                width: 18,
                                height: 18,
                                cursor: "nwse-resize",
                                zIndex: 3,
                                "&::after": {
                                    content: '""',
                                    position: "absolute",
                                    right: 4,
                                    bottom: 4,
                                    width: 8,
                                    height: 8,
                                    borderRight: "2px solid rgba(255,255,255,0.45)",
                                    borderBottom: "2px solid rgba(255,255,255,0.45)",
                                },
                            }}
                        />
                    </Box>
                ) : null}

                <Paper
                    variant="outlined"
                    sx={{
                        order: { xs: 3, lg: 2 },
                        width: "100%",
                        minWidth: 0,
                        minInlineSize: { xs: 0, lg: 0, xl: 720 },
                        borderRadius: 4,
                        p: { xs: 1.5, sm: 2.5 },
                        background:
                            "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
                    }}
                >
                    <Box component="form" onSubmit={handleSubmit}>
                        <TextField
                            label={t("labels.game")}
                            margin="normal"
                            style={{ textAlign: "left" }}
                            onChange={(event) => {
                                const nextGame = event.target.value;
                                setCalibrationURLState({
                                    game: nextGame,
                                    gameConsole: fixGameConsole(
                                        nextGame,
                                        gameConsole
                                    ),
                                });
                            }}
                            value={game}
                            select
                            fullWidth
                        >
                            {getAllGameOptions(t).map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        {isFRLG && (
                            <React.Fragment>
                                <TextField
                                    label={t("labels.sound")}
                                    margin="normal"
                                    style={{ textAlign: "left" }}
                                    onChange={(event) =>
                                        setCalibrationURLState({
                                            sound: event.target.value,
                                        })
                                    }
                                    value={sound}
                                    select
                                    fullWidth
                                >
                                    <MenuItem value="mono">
                                        {soundOptionLabels.mono}
                                    </MenuItem>
                                    <MenuItem value="stereo">
                                        {soundOptionLabels.stereo}
                                    </MenuItem>
                                </TextField>
                                <TextField
                                    label={t("labels.buttonMode")}
                                    margin="normal"
                                    style={{ textAlign: "left" }}
                                    onChange={(event) =>
                                        setCalibrationURLState({
                                            buttonMode: event.target.value,
                                        })
                                    }
                                    value={buttonMode}
                                    select
                                    fullWidth
                                >
                                    <MenuItem value="a">
                                        {buttonModeOptionLabels.a}
                                    </MenuItem>
                                    <MenuItem value="h">
                                        {buttonModeOptionLabels.h}
                                    </MenuItem>
                                    <MenuItem value="r">
                                        {buttonModeOptionLabels.r}
                                    </MenuItem>
                                </TextField>
                                <TextField
                                    label={t("labels.seedButton")}
                                    margin="normal"
                                    style={{ textAlign: "left" }}
                                    onChange={(event) =>
                                        setCalibrationURLState({
                                            button: event.target.value,
                                        })
                                    }
                                    value={button}
                                    select
                                    fullWidth
                                >
                                    <MenuItem value="a">
                                        {seedButtonOptionLabels.a}
                                    </MenuItem>
                                    <MenuItem value="start">
                                        {seedButtonOptionLabels.start}
                                    </MenuItem>
                                    <MenuItem value="l">
                                        {seedButtonOptionLabels.l}
                                    </MenuItem>
                                </TextField>
                                <TextField
                                    label={t("labels.extraButton")}
                                    margin="normal"
                                    style={{ textAlign: "left" }}
                                    onChange={(event) =>
                                        setCalibrationURLState({
                                            heldButton: event.target.value,
                                        })
                                    }
                                    value={heldButton}
                                    select
                                    fullWidth
                                >
                                    <MenuItem value="none">
                                        {extraButtonOptionLabels.none}
                                    </MenuItem>
                                    <MenuItem value="startup_select">
                                        {extraButtonOptionLabels.startup_select}
                                    </MenuItem>
                                    <MenuItem value="startup_a">
                                        {extraButtonOptionLabels.startup_a}
                                    </MenuItem>
                                    <MenuItem value="blackout_r">
                                        {extraButtonOptionLabels.blackout_r}
                                    </MenuItem>
                                    <MenuItem value="blackout_a">
                                        {extraButtonOptionLabels.blackout_a}
                                    </MenuItem>
                                    <MenuItem value="blackout_l">
                                        {extraButtonOptionLabels.blackout_l}
                                    </MenuItem>
                                    <MenuItem value="blackout_al">
                                        {extraButtonOptionLabels.blackout_al}
                                    </MenuItem>
                                </TextField>
                            </React.Fragment>
                        )}

                        <TextField
                            label={t("labels.console")}
                            margin="normal"
                            style={{ textAlign: "left" }}
                            onChange={(event) =>
                                setCalibrationURLState({
                                    gameConsole: event.target.value,
                                })
                            }
                            value={gameConsole}
                            select
                            fullWidth
                        >
                            {getConsoleOptions(t, isSwitch).map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Autocomplete
                            freeSolo
                            options={seedList}
                            value={targetSeedIndex === -1 ? null : targetSeed}
                            inputValue={targetSeedInput}
                            onInputChange={(_event, newInputValue) => {
                                const normalized = normalizeSeedInput(
                                    newInputValue
                                );
                                setTargetSeedInput(normalized);
                                if (normalized === "") {
                                    setTargetSeedIsValid(false);
                                    return;
                                }
                                const parsedSeed = Number.parseInt(
                                    normalized,
                                    16
                                );
                                const exists = seedList.some(
                                    (seed) => seed.initialSeed === parsedSeed
                                );
                                setTargetSeedIsValid(exists);
                                if (exists) {
                                    setCalibrationURLState({
                                        targetInitialSeed: hexSeed(
                                            parsedSeed,
                                            16
                                        ),
                                    });
                                }
                            }}
                            onChange={(_event, newValue) => {
                                if (!newValue || typeof newValue === "string") {
                                    return;
                                }
                                setTargetSeedInput(
                                    hexSeed(newValue.initialSeed, 16)
                                );
                                setTargetSeedIsValid(true);
                                setCalibrationURLState({
                                    targetInitialSeed: hexSeed(
                                        newValue.initialSeed,
                                        16
                                    ),
                                });
                            }}
                            getOptionLabel={(item_) => {
                                if (typeof item_ === "string") {
                                    return item_;
                                }
                                const item = item_ as FRLGContiguousSeedEntry;
                                return `${hexSeed(item.initialSeed, 16)} (${frameToMS(
                                    item.seedTime / 16,
                                    gameConsole
                                )}ms)`;
                            }}
                            isOptionEqualToValue={(option, value) =>
                                option.initialSeed === value.initialSeed
                            }
                            filterOptions={targetSeedFilterOptions}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label={t("labels.targetSeed")}
                                    margin="normal"
                                    error={
                                        seedList.length === 0 || !targetSeedIsValid
                                    }
                                    helperText={
                                        seedList.length === 0
                                            ? t("messages.noKnownSeeds")
                                            : !targetSeedIsValid
                                              ? t("messages.invalidTargetSeed")
                                              : undefined
                                    }
                                />
                            )}
                            disablePortal
                            selectOnFocus
                            fullWidth
                        />
                        <Box
                            sx={{
                                display: "flex",
                                gap: 1,
                                alignItems: "center",
                            }}
                        >
                            <NumericalInput
                                label={t("labels.seedLeeway")}
                                margin="normal"
                                onChange={(_event, value) => {
                                    setCalibrationFormState((data) => ({
                                        ...data,
                                        seedLeewayString: value.value,
                                    }));
                                    setSeedLeewayIsValid(value.isValid);
                                }}
                                value={calibrationFormState.seedLeewayString}
                                minimumValue={0}
                                maximumValue={10000}
                                isHex={false}
                                name="seedLeeway"
                            />
                            <Button
                                sx={{ my: 2, minWidth: 110 }}
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={() => {
                                    setSeedDialogOpen(true);
                                }}
                            >
                                {t("common.showSeeds")}
                            </Button>
                            <Dialog
                                open={seedDialogOpen}
                                onClose={() => {
                                    setSeedDialogOpen(false);
                                }}
                            >
                                <DialogContent
                                    sx={{ minWidth: 150, textAlign: "center" }}
                                >
                                    <Box>
                                        {seedList
                                            .slice(
                                                Math.max(targetSeedIndex - seedLeeway, 0),
                                                Math.min(
                                                    targetSeedIndex + seedLeeway + 1,
                                                    seedList.length
                                                )
                                            )
                                            .map((seed, i) => (
                                                <div key={i}>
                                                    {hexSeed(seed.initialSeed, 16)}
                                                </div>
                                            ))}
                                    </Box>
                                </DialogContent>
                            </Dialog>
                        </Box>
                        <RangeInput
                            label={
                                isTeachyTVMode
                                    ? t("labels.finalAPressFrame")
                                    : t("labels.advances")
                            }
                            name="advancesRange"
                            onChange={(_event, value) => {
                                setCalibrationURLState({
                                    advancesMin: value.value[0],
                                    advancesMax: value.value[1],
                                });
                                setAdvancesRangeIsValid(value.isValid);
                            }}
                            value={[advancesMin, advancesMax]}
                            minimumValue={0}
                            maximumValue={4294967295}
                        />
                        <NumericalInput
                            label={t("labels.offset")}
                            name="offset"
                            minimumValue={0}
                            maximumValue={4294967295}
                            onChange={(_, value) => {
                                setCalibrationURLState({ offset: value.value });
                                setOffsetIsValid(value.isValid);
                            }}
                            value={offset}
                        ></NumericalInput>
                        {isTeachyTVMode && (
                            <RangeInput
                                label={t("labels.teachyTvAdvances")}
                                name="ttvRange"
                                onChange={(_event, value) => {
                                    setCalibrationURLState({
                                        ttvAdvancesMin: value.value[0],
                                        ttvAdvancesMax: value.value[1],
                                    });
                                    setTTVAdvancesRangeIsValid(value.isValid);
                                }}
                                value={[ttvAdvancesMin, ttvAdvancesMax]}
                                minimumValue={0}
                                maximumValue={4294967295}
                            />
                        )}
                        {isSwitch && (
                            <NumericalInput
                                label={t("labels.requiredOverworldFrames")}
                                name="overworldFrames"
                                minimumValue={0}
                                maximumValue={4294967295}
                                onChange={(_, value) => {
                                    setCalibrationURLState({
                                        overworldFrames: value.value,
                                    });
                                    setOverworldFramesIsValid(value.isValid);
                                }}
                                value={overworldFrames}
                            ></NumericalInput>
                        )}
                        {canManuallyToggleTeachyTV && (
                            <TeachyTVEntry
                                isTeachyTVMode={isTeachyTVMode}
                                teachyTVRegularOut={teachyTVRegularOut}
                                onChange={(teachyMode, regularOut) => {
                                    setCalibrationURLState({
                                        teachyTVMode: teachyMode.toString(),
                                        teachyTVRegularOut: regularOut.value,
                                    });
                                }}
                            />
                        )}
                        <Box sx={{ flexDirection: "row", display: "flex" }}>
                            <NumericalInput
                                label={t("labels.trainerId")}
                                margin="normal"
                                onChange={(_event, value) => {
                                    setCalibrationURLState({ trainerID: value.value });
                                    setTrainerIDIsValid(value.isValid);
                                }}
                                value={trainerID}
                                minimumValue={0}
                                maximumValue={65535}
                                isHex={false}
                                name="trainerID"
                            />
                            <span
                                style={{
                                    margin: "0 10px",
                                    alignSelf: "center",
                                }}
                            >
                                /
                            </span>
                            <NumericalInput
                                label={t("labels.secretId")}
                                margin="normal"
                                onChange={(_event, value) => {
                                    setCalibrationURLState({ secretID: value.value });
                                    setSecretIDIsValid(value.isValid);
                                }}
                                value={secretID}
                                minimumValue={0}
                                maximumValue={65535}
                                isHex={false}
                                name="secretID"
                            />
                        </Box>
                        <TextField
                            label={t("labels.method")}
                            margin="normal"
                            style={{ textAlign: "left" }}
                            onChange={(event) => {
                                setCalibrationFormState((data) => ({
                                    ...data,
                                    method: parseInt(event.target.value),
                                }));
                            }}
                            value={calibrationFormState.method}
                            select
                            fullWidth
                        >
                            {Object.entries(resources.methods)
                                .filter(([value]) => parseInt(value) != STATIC_2)
                                .map(([value, name], index) => (
                                    <MenuItem key={index} value={parseInt(value)}>
                                        {name}
                                    </MenuItem>
                                ))}
                        </TextField>
                        {isStatic ? (
                            <StaticEncounterSelector
                                staticCategory={calibrationFormState.staticCategory}
                                staticPokemon={calibrationFormState.staticPokemon}
                                game={SEED_IDENTIFIER_TO_GAME[game]}
                                onChange={(staticCategory, staticPokemon) => {
                                    setCalibrationFormState((data) => ({
                                        ...data,
                                        staticCategory,
                                        staticPokemon,
                                    }));
                                }}
                            />
                        ) : (
                            <WildEncounterSelector
                                wildCategory={calibrationFormState.wildCategory}
                                wildLocation={calibrationFormState.wildLocation}
                                wildPokemon={calibrationFormState.wildPokemon}
                                wildLead={calibrationFormState.wildLead}
                                shouldFilterPokemon={
                                    calibrationFormState.shouldFilterPokemon
                                }
                                game={SEED_IDENTIFIER_TO_GAME[game]}
                                onChange={(
                                    wildCategory,
                                    wildLocation,
                                    wildPokemon,
                                    wildLead,
                                    shouldFilterPokemon
                                ) => {
                                    setCalibrationFormState((data) => ({
                                        ...data,
                                        wildCategory,
                                        wildLocation,
                                        wildPokemon,
                                        wildLead,
                                        shouldFilterPokemon,
                                    }));
                                }}
                            />
                        )}
                        <TextField
                            label={t("labels.shininess")}
                            margin="normal"
                            style={{ textAlign: "left" }}
                            onChange={(event) => {
                                setCalibrationFormState((data) => ({
                                    ...data,
                                    shininess: parseInt(event.target.value),
                                }));
                            }}
                            value={calibrationFormState.shininess}
                            select
                            fullWidth
                        >
                            <MenuItem value="255">{t("common.any")}</MenuItem>
                            <MenuItem value="1">{t("options.star")}</MenuItem>
                            <MenuItem value="2">{t("options.square")}</MenuItem>
                            <MenuItem value="3">{t("options.starSquare")}</MenuItem>
                        </TextField>
                        <Autocomplete
                            options={[-1, ...resources.natures.map((_nature, index) => index)]}
                            value={calibrationFormState.nature}
                            onChange={(_event, value) => {
                                setCalibrationFormState((data) => ({
                                    ...data,
                                    nature: value ?? -1,
                                }));
                            }}
                            filterOptions={filterNatureOptions}
                            getOptionLabel={(option) =>
                                option === -1
                                    ? t("common.any")
                                    : usesSwitchJapaneseFRLGLabels
                                      ? getSwitchJapaneseFRLGNatureLabel(option)
                                      : resources.natures[option]
                            }
                            isOptionEqualToValue={(option, value) =>
                                option === value
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label={t("labels.nature")}
                                    margin="normal"
                                    style={{ textAlign: "left" }}
                                    helperText={t(
                                        "messages.requiredForIvCalculation"
                                    )}
                                    placeholder={
                                        calibrationFormState.nature === -1
                                            ? t("common.any")
                                            : undefined
                                    }
                                />
                            )}
                            fullWidth
                        />
                        <TextField
                            label={t("labels.gender")}
                            margin="normal"
                            style={{ textAlign: "left" }}
                            onChange={(event) => {
                                setCalibrationFormState((data) => ({
                                    ...data,
                                    gender: parseInt(event.target.value),
                                }));
                            }}
                            value={calibrationFormState.gender}
                            select
                            fullWidth
                        >
                            <MenuItem value="255">{t("common.any")}</MenuItem>
                            {resources.genders.slice(0, 2).map((gender, index) => (
                                <MenuItem key={index} value={index}>
                                    {gender}
                                </MenuItem>
                            ))}
                        </TextField>
                        {calibrationFormState.nature !== -1 ? (
                            <React.Fragment>
                                <IvCalculator
                                    onChange={(_event, value) => {
                                        setCalibrationFormState((data) => ({
                                            ...data,
                                            ivCalculatorText: value.value,
                                        }));
                                        if (value.isValid) {
                                            setCalibrationFormState((data) => ({
                                                ...data,
                                                ivRangeStrings: value.calculatedValue.map(
                                                    (ivRange) => [
                                                        ivRange.min.toString(),
                                                        ivRange.max.toString(),
                                                    ]
                                                ),
                                            }));
                                        }
                                    }}
                                    calculateIVs={async (parsedLines) => {
                                        const tenLines = await fetchTenLines();
                                        if (isStatic) {
                                            return await tenLines.calc_ivs_static(
                                                calibrationFormState.staticCategory,
                                                calibrationFormState.staticPokemon,
                                                parsedLines,
                                                calibrationFormState.nature
                                            );
                                        }
                                        return await tenLines.calc_ivs_generic(
                                            calibrationFormState.wildPokemon & 0x7ff,
                                            calibrationFormState.wildPokemon >> 11,
                                            parsedLines,
                                            calibrationFormState.nature
                                        );
                                    }}
                                    value={calibrationFormState.ivCalculatorText}
                                />
                                <IvEntry
                                    onChange={(_event, value) => {
                                        setIvRangesAreValid(value.isValid);
                                        setCalibrationFormState((data) => ({
                                            ...data,
                                            ivRangeStrings: value.value,
                                        }));
                                    }}
                                    value={calibrationFormState.ivRangeStrings}
                                />
                            </React.Fragment>
                        ) : (
                            <span>{t("messages.ivCalculationDisabled")}</span>
                        )}
                        {bingoActive && (
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={isBingoTvFluctuationMode}
                                        onChange={(event) =>
                                            setCalibrationURLState({
                                                bingoTvFluctuationMode:
                                                    event.target.checked.toString(),
                                            })
                                        }
                                    />
                                }
                                label={t("labels.bingoTvFluctuationMode")}
                            />
                        )}
                        {bingoActive && (
                            <Tooltip
                                title={
                                    isNotSubmittable
                                        ? t("messages.bingoRequiresValidCalibration")
                                        : ""
                                }
                            >
                                <Box component="span" sx={{ display: "block", width: "100%" }}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        type="button"
                                        disabled={isNotSubmittable}
                                        onClick={() => {
                                            if (isNotSubmittable) return;
                                            const searchSeeds = seedList.slice(
                                                Math.max(0, targetSeedIndex - seedLeeway),
                                                Math.min(
                                                    seedList.length,
                                                    targetSeedIndex + seedLeeway + 1
                                                )
                                            );
                                            fetchBingo(
                                                searchSeeds,
                                                advancesRange,
                                                offset,
                                                isStatic,
                                                trainerID,
                                                secretID,
                                                game,
                                                calibrationFormState,
                                                setBingoBoard,
                                                setBingoCounters,
                                                isBingoTvFluctuationMode
                                            );
                                        }}
                                        fullWidth
                                        sx={{ my: 0.5 }}
                                    >
                                        Bingo
                                    </Button>
                                </Box>
                            </Tooltip>
                        )}
                        <Button
                            variant="contained"
                            color="primary"
                            type="submit"
                            disabled={isNotSubmittable}
                            sx={{ my: 0.5 }}
                            fullWidth
                        >
                            {searching ? t("common.searching") : t("common.submit")}
                        </Button>
                    </Box>

                    {!searching && hasSubmittedSearch && rows.length === 0 && (
                        <Alert severity="warning" sx={{ mt: 2, textAlign: "left" }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                {t("messages.calibrationNoResultsTitle")}
                            </Typography>
                            <Box
                                component="ol"
                                sx={{
                                    m: 0,
                                    pl: 2.5,
                                    display: "grid",
                                    gap: 0.5,
                                }}
                            >
                                <li>{t("messages.calibrationNoResultsCheck1")}</li>
                                <li>{t("messages.calibrationNoResultsCheck2")}</li>
                                <li>{t("messages.calibrationNoResultsCheck3")}</li>
                            </Box>
                        </Alert>
                    )}

                    <Box
                        sx={{
                            mt: 2,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 2,
                            flexWrap: "wrap",
                        }}
                    >
                        <Box sx={{ textAlign: "left" }}>
                            <Typography variant="h6">
                                {t("compare.resultsTitle")}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t("labels.resultCount")}: {visibleRows.length}
                            </Typography>
                        </Box>
                        <Tooltip title={t("table.settings")}>
                            <IconButton
                                onClick={() => setCompareSettingsOpen(true)}
                                aria-label={t("table.settings")}
                                sx={{
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    borderRadius: 999,
                                    backgroundColor: "rgba(255,255,255,0.04)",
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={{ fontSize: "1.05rem", lineHeight: 1 }}
                                >
                                    ⚙
                                </Box>
                            </IconButton>
                        </Tooltip>
                    </Box>

                    <Box sx={{ mt: 1.5 }}>
                        <CalibrationTable
                            rows={visibleRows}
                            target={targetSeed}
                            gameConsole={gameConsole}
                            isStatic={isStatic}
                            isTeachyTVMode={isTeachyTVMode}
                            isMultiMethod={
                                calibrationFormState.method == COMBINED_WILD_METHOD
                            }
                            hasTarget={Boolean(compareTarget)}
                            visibleColumns={orderedTableVisibleColumns}
                            onAdd={handleQuickAdd}
                        />
                    </Box>
                </Paper>

                {compareSettings.enabled && !compareFloating && (
                    <Box
                        sx={{
                            order: { xs: 4, lg: 3 },
                            position: { lg: "sticky" },
                            top: { lg: 16 },
                            alignSelf: "start",
                            minWidth: 0,
                            gridColumn: {
                                xs: "1",
                                lg: "2",
                                xl: "3",
                            },
                        }}
                    >
                        {comparePanel}
                    </Box>
                )}
            </Box>

            <Dialog
                open={compareSettingsOpen}
                onClose={() => setCompareSettingsOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>{t("compare.settings")}</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: "grid", gap: 2.5 }}>
                        <Paper variant="outlined" sx={{ p: 2, textAlign: "left" }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                {t("compare.display")}
                            </Typography>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={compareSettings.enabled}
                                        onChange={(event) =>
                                            setCompareSettings((current: CalibrationCompareSettings) => ({
                                                ...current,
                                                enabled: event.target.checked,
                                            }))
                                        }
                                    />
                                }
                                label={t("compare.enable")}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={compareSettings.calculatorEnabled}
                                        onChange={(event) =>
                                            setCompareSettings((current: CalibrationCompareSettings) => ({
                                                ...current,
                                                calculatorEnabled:
                                                    event.target.checked,
                                            }))
                                        }
                                    />
                                }
                                label={t("compare.enableCalculator")}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={compareSettings.autoAddTarget}
                                        onChange={(event) =>
                                            setCompareSettings((current: CalibrationCompareSettings) => ({
                                                ...current,
                                                autoAddTarget:
                                                    event.target.checked,
                                            }))
                                        }
                                    />
                                }
                                label={t("compare.autoAddTarget")}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={compareSettings.dynamicToolEnabled}
                                        onChange={(event) =>
                                            setCompareSettings((current: CalibrationCompareSettings) => ({
                                                ...current,
                                                dynamicToolEnabled:
                                                    event.target.checked,
                                            }))
                                        }
                                    />
                                }
                                label={t("dynamicTool.toggleInSettings")}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={
                                            compareSettings.manualTeachyTVEnabled
                                        }
                                        onChange={(event) => {
                                            setCompareSettings((current: CalibrationCompareSettings) => ({
                                                ...current,
                                                manualTeachyTVEnabled:
                                                    event.target.checked,
                                            }));
                                            if (!event.target.checked) {
                                                setCalibrationURLState({
                                                    teachyTVMode: "false",
                                                });
                                            }
                                        }}
                                    />
                                }
                                label={t("compare.manualTeachyTVToggle")}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={
                                            compareSettings.historyWildDetailsEnabled
                                        }
                                        onChange={(event) =>
                                            setCompareSettings((current: CalibrationCompareSettings) => ({
                                                ...current,
                                                historyWildDetailsEnabled:
                                                    event.target.checked,
                                            }))
                                        }
                                    />
                                }
                                label={t("compare.historyWildDetailsToggle")}
                            />
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2, textAlign: "left" }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                {t("compare.compareMode")}
                            </Typography>
                            <TextField
                                value={compareSettings.compareMode}
                                onChange={(event) =>
                                    setCompareSettings((current: CalibrationCompareSettings) => ({
                                        ...current,
                                        compareMode: event.target.value as
                                            CalibrationCompareSettings["compareMode"],
                                    }))
                                }
                                select
                                fullWidth
                            >
                                <MenuItem value="target">
                                    {t("compare.modeTarget")}
                                </MenuItem>
                                <MenuItem value="previous">
                                    {t("compare.modePrevious")}
                                </MenuItem>
                            </TextField>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2, textAlign: "left" }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                {t("compare.visibleColumns")}
                            </Typography>
                            <FormGroup>
                                {CALIBRATION_COMPARE_COLUMN_OPTIONS.map((column) => (
                                    <FormControlLabel
                                        key={column}
                                        control={
                                            <Checkbox
                                                checked={orderedVisibleColumns.includes(
                                                    column
                                                )}
                                                onChange={() =>
                                                    toggleCompareColumn(column)
                                                }
                                            />
                                        }
                                        label={t(`table.${column}`)}
                                    />
                                ))}
                            </FormGroup>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2, textAlign: "left" }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                {t("compare.resultVisibleColumns")}
                            </Typography>
                            <FormGroup>
                                {CALIBRATION_TABLE_COLUMN_OPTIONS.map((column) => (
                                    <FormControlLabel
                                        key={column}
                                        control={
                                            <Checkbox
                                                checked={orderedTableVisibleColumns.includes(
                                                    column
                                                )}
                                                onChange={() =>
                                                    toggleResultColumn(column)
                                                }
                                            />
                                        }
                                        label={t(`table.${column}`)}
                                    />
                                ))}
                            </FormGroup>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={
                                            compareSettings.wildLevelFilterEnabled
                                        }
                                        disabled={isStatic}
                                        onChange={(event) =>
                                            setCompareSettings(
                                                (
                                                    current: CalibrationCompareSettings
                                                ) => ({
                                                    ...current,
                                                    wildLevelFilterEnabled:
                                                        event.target.checked,
                                                })
                                            )
                                        }
                                    />
                                }
                                label={t("compare.wildLevelFilter")}
                            />
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block", mt: 0.5 }}
                            >
                                {isStatic
                                    ? t("compare.wildLevelFilterStaticHint")
                                    : t("compare.wildLevelFilterHint", {
                                          level:
                                              firstIvCalculatorLevel === null
                                                  ? "-"
                                                  : String(firstIvCalculatorLevel),
                                      })}
                            </Typography>
                        </Paper>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCompareSettingsOpen(false)}>
                        {t("common.close")}
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={Boolean(compareFeedback)}
                autoHideDuration={1800}
                onClose={() => setCompareFeedback("")}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    severity="success"
                    variant="filled"
                    onClose={() => setCompareFeedback("")}
                    sx={{ width: "100%" }}
                >
                    {compareFeedback}
                </Alert>
            </Snackbar>
        </Box>
    );
}
