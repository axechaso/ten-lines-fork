import {
    Alert,
    Autocomplete,
    Box,
    Button,
    createFilterOptions,
    FormControlLabel,
    MenuItem,
    Switch,
    TextField,
    Typography,
    type SxProps,
    type Theme,
} from "@mui/material";
import { proxy } from "comlink";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { getAllGameOptions, getConsoleOptions, useI18n } from "../i18n";
import fetchTenLines, {
    fetchSeedData,
    fixGameConsole,
    frameToMS,
    Game,
    hexSeed,
    SEED_IDENTIFIER_TO_GAME,
    WILD_1,
} from "../tenLines";
import type {
    ExtendedWildGeneratorState,
    FRLGContiguousSeedEntry,
} from "../tenLines/generated";
import {
    FRLG_HELD_ENCOUNTER_GOOD_ROD,
    FRLG_HELD_ENCOUNTER_GRASS,
    FRLG_HELD_ENCOUNTER_OLD_ROD,
    FRLG_HELD_ENCOUNTER_ROCK_SMASH,
    FRLG_HELD_ENCOUNTER_SUPER_ROD,
    FRLG_HELD_ENCOUNTER_SURFING,
    FRLG_HELD_PROFILE_ENGLISH_SWITCH,
    FRLG_HELD_SEARCH_MODE_ALL_METHODS,
    FRLG_HELD_SEARCH_MODE_FIVE_TRACKS,
    FRLG_HELD_SEARCH_MODE_FOUR_TRACKS,
    FRLG_HELD_SEARCH_MODE_H1_STABLE,
    HELD_ITEM_FILTER_ANY,
    HELD_ITEM_FILTER_ANY_ITEM,
    getFrlgHeldItemName,
    getFrlgHeldItemProbabilities,
    getFrlgHeldItemSlots,
    getFrlgHeldOffsetProfile,
    getFrlgHeldSearchOffsets,
    matchesFrlgHeldItemSearchFilter,
    matchesFrlgHeldShinyFilter,
    predictFrlgHeldItemAtOffsets,
    type FrlgHeldSearchMode,
} from "../utils/frlgHeldItems";
import FrlgHeldEncounterSelector, {
    type FrlgHeldEncounterSelection,
} from "./FrlgHeldEncounterSelector";
import { FrlgHeldItemNotice } from "./FrlgHeldItemDisplay";
import FrlgHeldItemResultsTable from "./FrlgHeldItemResultsTable";
import NumericalInput from "./NumericalInput";
import RangeInput from "./RangeInput";

const RESULT_LIMIT = 1000;
const MAX_ADVANCES_PER_SEARCH = 100_000;
const DEFAULT_ADVANCE_RANGE: [string, string] = ["1000", "100000"];
const DEFAULT_SEED_GAME = "fr_nx";
const ENGLISH_SWITCH_FRLG_SEED_GAMES = new Set(["fr_nx", "lg_nx"]);
const UNFILTERED_IV_RANGES: [number, number][] = Array.from(
    { length: 6 },
    () => [0, 31] as [number, number]
);
const SEARCH_MODE_OPTIONS: {
    value: FrlgHeldSearchMode;
    labelKey: string;
    helpKey: string;
}[] = [
    {
        value: FRLG_HELD_SEARCH_MODE_H1_STABLE,
        labelKey: "heldItems.searchModeH1Stable",
        helpKey: "heldItems.searchModeH1StableHelp",
    },
    {
        value: FRLG_HELD_SEARCH_MODE_ALL_METHODS,
        labelKey: "heldItems.searchModeAllMethods",
        helpKey: "heldItems.searchModeAllMethodsHelp",
    },
    {
        value: FRLG_HELD_SEARCH_MODE_FOUR_TRACKS,
        labelKey: "heldItems.searchModeFourTracks",
        helpKey: "heldItems.searchModeFourTracksHelp",
    },
    {
        value: FRLG_HELD_SEARCH_MODE_FIVE_TRACKS,
        labelKey: "heldItems.searchModeFiveTracks",
        helpKey: "heldItems.searchModeFiveTracksHelp",
    },
];
const ENCOUNTER_CATEGORY_OPTIONS = [
    { value: FRLG_HELD_ENCOUNTER_GRASS, labelKey: "options.grass" },
    { value: FRLG_HELD_ENCOUNTER_ROCK_SMASH, labelKey: "options.rockSmash" },
    { value: FRLG_HELD_ENCOUNTER_SURFING, labelKey: "options.surfing" },
    { value: FRLG_HELD_ENCOUNTER_OLD_ROD, labelKey: "options.oldRod" },
    { value: FRLG_HELD_ENCOUNTER_GOOD_ROD, labelKey: "options.goodRod" },
    { value: FRLG_HELD_ENCOUNTER_SUPER_ROD, labelKey: "options.superRod" },
] as const;
const targetSeedFilterOptions = createFilterOptions<FRLGContiguousSeedEntry>({
    limit: 100,
    stringify: (option) => hexSeed(option.initialSeed, 16),
});

interface HeldSeedURLState {
    game: string;
    sound: string;
    buttonMode: string;
    button: string;
    heldButton: string;
    gameConsole: string;
    targetInitialSeed: string;
    trainerID: string;
    secretID: string;
}

const HELD_SEED_QUERY_KEYS: Record<keyof HeldSeedURLState, string> = {
    game: "game",
    sound: "heldSeedSound",
    buttonMode: "heldSeedButtonMode",
    button: "heldSeedButton",
    heldButton: "heldSeedExtraButton",
    gameConsole: "gameConsole",
    targetInitialSeed: "heldTargetInitialSeed",
    trainerID: "trainerID",
    secretID: "secretID",
};

function useHeldSeedURLState() {
    const [searchParams, setSearchParams] = useSearchParams();
    const requestedGameParam = searchParams.get(HELD_SEED_QUERY_KEYS.game);
    const requestedGame = requestedGameParam || DEFAULT_SEED_GAME;
    const requestedGameIsSupported =
        ENGLISH_SWITCH_FRLG_SEED_GAMES.has(requestedGame);
    const game = requestedGameIsSupported
        ? requestedGame
        : DEFAULT_SEED_GAME;
    const isSwitch = game.endsWith("nx");
    const sound =
        searchParams.get(HELD_SEED_QUERY_KEYS.sound) || "stereo";
    const buttonMode =
        searchParams.get(HELD_SEED_QUERY_KEYS.buttonMode) ||
        (isSwitch ? "h" : "a");
    const button =
        searchParams.get(HELD_SEED_QUERY_KEYS.button) || "a";
    const heldButton =
        searchParams.get(HELD_SEED_QUERY_KEYS.heldButton) || "none";
    const requestedGameConsole = searchParams.get(
        HELD_SEED_QUERY_KEYS.gameConsole
    );
    const gameConsole = fixGameConsole(
        game,
        requestedGameConsole || (isSwitch ? "NX" : "GBA")
    );
    const trainerID = searchParams.get(HELD_SEED_QUERY_KEYS.trainerID) || "0";
    const secretID = searchParams.get(HELD_SEED_QUERY_KEYS.secretID) || "0";
    const sharedGameNeedsNormalization =
        requestedGameParam !== game ||
        requestedGameConsole !== gameConsole;
    const targetSeedText =
        searchParams.get(HELD_SEED_QUERY_KEYS.targetInitialSeed) ||
        "DEAD";
    const parsedTargetSeed = Number.parseInt(targetSeedText, 16);
    const targetSeedValue = Number.isNaN(parsedTargetSeed)
        ? 0xdead
        : parsedTargetSeed & 0xffff;

    const setHeldSeedURLState = useCallback(
        (state: Partial<HeldSeedURLState>) => {
            setSearchParams((previous) => {
                const next = new URLSearchParams(previous);
                for (const [key, value] of Object.entries(state)) {
                    next.set(
                        HELD_SEED_QUERY_KEYS[key as keyof HeldSeedURLState],
                        value
                    );
                }
                return next;
            });
        },
        [setSearchParams]
    );

    return {
        game,
        sharedGameNeedsNormalization,
        sound,
        buttonMode,
        button,
        heldButton,
        gameConsole,
        targetSeedValue,
        trainerID,
        secretID,
        setHeldSeedURLState,
    };
}

function resultKey(row: ExtendedWildGeneratorState) {
    return `${row.initialSeed}:${row.advances}:${row.method}:${row.pid}:${row.encounterSlot}`;
}

export default function FrlgHeldItemSearcherPage({
    sx,
    hidden = false,
}: {
    sx?: SxProps<Theme>;
    hidden?: boolean;
}) {
    const { locale, t } = useI18n();
    const {
        game,
        sharedGameNeedsNormalization,
        sound,
        buttonMode,
        button,
        heldButton,
        gameConsole,
        targetSeedValue,
        trainerID,
        secretID,
        setHeldSeedURLState,
    } = useHeldSeedURLState();
    const [seedList, setSeedList] = useState<FRLGContiguousSeedEntry[]>([]);
    const [seedListLoading, setSeedListLoading] = useState(true);
    const [seedListError, setSeedListError] = useState<string>();
    const [targetSeedInput, setTargetSeedInput] = useState("");
    const [targetSeedIsValid, setTargetSeedIsValid] = useState(true);
    const [advanceRangeStrings, setAdvanceRangeStrings] = useState(
        DEFAULT_ADVANCE_RANGE
    );
    const [advanceRangeIsValid, setAdvanceRangeIsValid] = useState(true);
    const [searchMode, setSearchMode] = useState<FrlgHeldSearchMode>(
        FRLG_HELD_SEARCH_MODE_H1_STABLE
    );
    const selectedSearchMode =
        SEARCH_MODE_OPTIONS.find((option) => option.value === searchMode) ??
        SEARCH_MODE_OPTIONS[0];
    const [shinyOnlyMode, setShinyOnlyMode] = useState(false);
    const [shinyFilter, setShinyFilter] = useState(1);
    const [trainerIDIsValid, setTrainerIDIsValid] = useState(true);
    const [secretIDIsValid, setSecretIDIsValid] = useState(true);
    const [encounterCategory, setEncounterCategory] = useState(
        FRLG_HELD_ENCOUNTER_GRASS
    );
    const [selection, setSelection] =
        useState<FrlgHeldEncounterSelection>();
    const [standardOffset, setStandardOffset] = useState("0");
    const [standardOffsetIsValid, setStandardOffsetIsValid] = useState(true);
    const [heldItemFilter, setHeldItemFilter] = useState(
        HELD_ITEM_FILTER_ANY_ITEM
    );
    const [rows, setRows] = useState<ExtendedWildGeneratorState[]>([]);
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchError, setSearchError] = useState<string>();
    const requestIdRef = useRef(0);
    const normalizeSeedInput = useCallback(
        (value: string) => value.trim().replace(/^0x/i, "").toUpperCase(),
        []
    );

    const targetSeedIndex = useMemo(
        () =>
            seedList.findIndex(
                (seed) => seed.initialSeed === targetSeedValue
            ),
        [seedList, targetSeedValue]
    );
    const targetSeed =
        targetSeedIndex === -1 ? undefined : seedList[targetSeedIndex];
    const heldSeedGameOptions = useMemo(
        () =>
            getAllGameOptions(t).filter((option) =>
                ENGLISH_SWITCH_FRLG_SEED_GAMES.has(option.value)
            ),
        [t]
    );
    const encounterGame =
        SEED_IDENTIFIER_TO_GAME[game] ?? Game.FireRed;

    useEffect(() => {
        if (!hidden && sharedGameNeedsNormalization) {
            setHeldSeedURLState({
                game,
                gameConsole,
            });
        }
    }, [
        game,
        gameConsole,
        hidden,
        sharedGameNeedsNormalization,
        setHeldSeedURLState,
    ]);

    useEffect(() => {
        if (hidden) {
            setSeedList([]);
            setSeedListLoading(false);
            setSeedListError(undefined);
            return;
        }

        let cancelled = false;
        setSeedListLoading(true);
        setSeedListError(undefined);
        setSeedList([]);

        const loadSeedList = async () => {
            try {
                const [seedData, tenLines] = await Promise.all([
                    fetchSeedData(game),
                    fetchTenLines(),
                ]);
                const nextSeedList =
                    await tenLines.get_contiguous_seed_list(
                        seedData,
                        `${sound}_${buttonMode}_${button}`,
                        game,
                        heldButton
                    );
                if (cancelled) {
                    return;
                }

                setSeedList(nextSeedList);
            } catch (error) {
                if (!cancelled) {
                    console.error(
                        "Failed to load FRLG held-item seed list",
                        error
                    );
                    setSeedListError(
                        error instanceof Error
                            ? error.message
                            : String(error)
                    );
                }
            } finally {
                if (!cancelled) {
                    setSeedListLoading(false);
                }
            }
        };

        void loadSeedList();
        return () => {
            cancelled = true;
        };
    }, [
        game,
        sound,
        buttonMode,
        button,
        heldButton,
        hidden,
    ]);

    useEffect(() => {
        if (
            hidden ||
            seedListLoading ||
            seedList.length === 0 ||
            seedList.some(
                (seed) => seed.initialSeed === targetSeedValue
            )
        ) {
            return;
        }

        const fallbackSeed =
            seedList[Math.min(51, seedList.length - 1)];
        setHeldSeedURLState({
            targetInitialSeed: hexSeed(fallbackSeed.initialSeed, 16),
        });
    }, [
        seedList,
        seedListLoading,
        targetSeedValue,
        setHeldSeedURLState,
        hidden,
    ]);

    useEffect(() => {
        setTargetSeedInput(hexSeed(targetSeedValue, 16));
    }, [targetSeedValue]);

    useEffect(() => {
        setTargetSeedIsValid(
            seedListLoading ||
                (seedList.length > 0 && targetSeedIndex !== -1)
        );
    }, [seedList.length, seedListLoading, targetSeedIndex]);

    const advanceRange: [number, number] = [
        parseInt(advanceRangeStrings[0], 10),
        parseInt(advanceRangeStrings[1], 10),
    ];
    const advanceCount = advanceRangeIsValid
        ? advanceRange[1] - advanceRange[0] + 1
        : 0;
    const advanceSearchSpaceTooLarge =
        advanceCount > MAX_ADVANCES_PER_SEARCH;
    const advanceSignature = advanceRangeStrings.join(":");
    const heldItemFilterSignature = shinyOnlyMode
        ? undefined
        : `${searchMode}:${standardOffset}`;
    const shinyLibrarySize = seedList.length;
    const shinyTotalFrames = shinyOnlyMode
        ? shinyLibrarySize * advanceCount
        : 0;

    const presetProfile = useMemo(
        () =>
            selection
                ? getFrlgHeldOffsetProfile(
                      FRLG_HELD_PROFILE_ENGLISH_SWITCH,
                      encounterGame,
                      encounterCategory,
                      selection.locationId,
                      WILD_1
                  )
                : undefined,
        [encounterCategory, encounterGame, selection]
    );
    const standardOffsetValue = parseInt(standardOffset, 10);
    const trainerIdValue = parseInt(trainerID, 10);
    const secretIdValue = parseInt(secretID, 10);
    const searchOffsets = getFrlgHeldSearchOffsets(
        standardOffsetValue,
        searchMode
    );
    const hasUsableOffset =
        shinyOnlyMode ||
        (standardOffsetIsValid && searchOffsets.length > 0);
    const slots = selection
        ? getFrlgHeldItemSlots(selection.speciesForm & 0x7ff)
        : undefined;
    const itemOptions = useMemo(
        () =>
            slots
                ? getFrlgHeldItemProbabilities(slots).filter(
                      ({ itemId }) => itemId !== 0
                  )
                : [],
        [slots]
    );

    useEffect(() => {
        requestIdRef.current += 1;
        setRows([]);
        setHasSearched(false);
        setSearchError(undefined);
        setSearching(false);
    }, [
        heldItemFilterSignature,
        shinyOnlyMode,
        shinyFilter,
        encounterCategory,
        selection,
        heldItemFilter,
        targetSeedValue,
        game,
        sound,
        buttonMode,
        button,
        heldButton,
        advanceSignature,
        trainerID,
        secretID,
    ]);

    useEffect(() => {
        setStandardOffset(String(presetProfile?.baseOffset ?? 0));
        setStandardOffsetIsValid(true);
    }, [presetProfile, selection?.locationId]);

    useEffect(() => {
        const validItemIds = new Set(itemOptions.map(({ itemId }) => itemId));
        if (
            heldItemFilter !== HELD_ITEM_FILTER_ANY &&
            heldItemFilter !== HELD_ITEM_FILTER_ANY_ITEM &&
            !validItemIds.has(heldItemFilter)
        ) {
            setHeldItemFilter(HELD_ITEM_FILTER_ANY_ITEM);
        }
    }, [heldItemFilter, itemOptions]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (
            hidden ||
            searching ||
            !selection ||
            seedListLoading ||
            !!seedListError ||
            !trainerIDIsValid ||
            !secretIDIsValid ||
            (shinyOnlyMode
                ? seedList.length === 0
                : !targetSeedIsValid || !targetSeed) ||
            !advanceRangeIsValid ||
            advanceSearchSpaceTooLarge ||
            !hasUsableOffset
        ) {
            return;
        }

        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        setRows([]);
        setSearching(true);
        setHasSearched(true);
        setSearchError(undefined);

        const search = async () => {
            try {
                const tenLines = await fetchTenLines();
                const seeds: FRLGContiguousSeedEntry[] = shinyOnlyMode
                    ? seedList
                    : targetSeed
                      ? [
                            {
                                ...targetSeed,
                                settings:
                                    targetSeed.settings ??
                                    `${sound}_${buttonMode}_${button}`,
                            },
                        ]
                      : [];
                await tenLines.check_seeds_wild_limited(
                    seeds,
                    advanceRange,
                    [0, 0],
                    0,
                    encounterGame,
                    trainerIdValue,
                    secretIdValue,
                    encounterCategory,
                    selection.locationIndex,
                    selection.speciesForm,
                    WILD_1,
                    255,
                    255,
                    -1,
                    255,
                    UNFILTERED_IV_RANGES,
                    shinyOnlyMode ? shinyFilter : 255,
                    shinyOnlyMode ? RESULT_LIMIT : 0,
                    proxy((results: ExtendedWildGeneratorState[]) => {
                        if (requestIdRef.current !== requestId) {
                            return;
                        }

                        const matchingRows = results.filter((row) => {
                            if (shinyOnlyMode) {
                                return matchesFrlgHeldShinyFilter(
                                    row,
                                    shinyFilter
                                );
                            }
                            const prediction = predictFrlgHeldItemAtOffsets({
                                species: row.species,
                                iv2EndSeed: row.iv2EndSeed,
                                offsets: searchOffsets,
                            });
                            return matchesFrlgHeldItemSearchFilter(
                                prediction,
                                heldItemFilter
                            );
                        });

                        setRows((currentRows) => {
                            const merged = new Map(
                                currentRows.map((row) => [resultKey(row), row])
                            );
                            for (const row of matchingRows) {
                                if (merged.size >= RESULT_LIMIT) {
                                    break;
                                }
                                merged.set(resultKey(row), row);
                            }
                            return [...merged.values()].sort(
                                (left, right) =>
                                    left.advances - right.advances ||
                                    left.method - right.method
                            );
                        });
                    }),
                    proxy(() => {})
                );
            } catch (error) {
                if (requestIdRef.current === requestId) {
                    console.error("FRLG held-item search failed", error);
                    setSearchError(
                        error instanceof Error ? error.message : String(error)
                    );
                }
            } finally {
                if (requestIdRef.current === requestId) {
                    setSearching(false);
                }
            }
        };

        void search();
    };

    if (hidden) {
        return null;
    }

    return (
        <Box component="form" onSubmit={handleSubmit} sx={sx}>
            <Typography variant="h5" component="h1" sx={{ mt: 2 }}>
                {t("heldItems.pageTitle")}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
                {t("heldItems.pageDescription")}
            </Typography>
            <Alert severity="info" sx={{ my: 1, textAlign: "left" }}>
                {t("heldItems.separatePageNotice")}
            </Alert>
            <Alert severity="info" sx={{ my: 1, textAlign: "left" }}>
                {t("heldItems.seedAndAdvanceInstruction")}
            </Alert>

            <TextField
                label={t("labels.game")}
                margin="normal"
                value={game}
                onChange={(event) => {
                    const nextGame = event.target.value;
                    const nextIsSwitch = nextGame.endsWith("nx");
                    setHeldSeedURLState({
                        game: nextGame,
                        gameConsole: fixGameConsole(
                            nextGame,
                            gameConsole
                        ),
                        buttonMode: nextIsSwitch ? "h" : "a",
                    });
                }}
                select
                fullWidth
                disabled={searching}
            >
                {heldSeedGameOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {option.label}
                    </MenuItem>
                ))}
            </TextField>
            <TextField
                label={t("labels.sound")}
                margin="normal"
                value={sound}
                onChange={(event) =>
                    setHeldSeedURLState({ sound: event.target.value })
                }
                select
                fullWidth
                disabled={searching}
            >
                <MenuItem value="mono">{t("common.mono")}</MenuItem>
                <MenuItem value="stereo">{t("common.stereo")}</MenuItem>
            </TextField>
            <TextField
                label={t("labels.buttonMode")}
                margin="normal"
                value={buttonMode}
                onChange={(event) =>
                    setHeldSeedURLState({
                        buttonMode: event.target.value,
                    })
                }
                select
                fullWidth
                disabled={searching}
            >
                <MenuItem value="a">L=A</MenuItem>
                <MenuItem value="h">{t("options.help")}</MenuItem>
                <MenuItem value="r">LR</MenuItem>
            </TextField>
            <TextField
                label={t("labels.seedButton")}
                margin="normal"
                value={button}
                onChange={(event) =>
                    setHeldSeedURLState({ button: event.target.value })
                }
                select
                fullWidth
                disabled={searching}
            >
                <MenuItem value="a">A</MenuItem>
                <MenuItem value="start">{t("options.start")}</MenuItem>
                <MenuItem value="l">L (L=A)</MenuItem>
            </TextField>
            <TextField
                label={t("labels.extraButton")}
                margin="normal"
                value={heldButton}
                onChange={(event) =>
                    setHeldSeedURLState({
                        heldButton: event.target.value,
                    })
                }
                select
                fullWidth
                disabled={searching}
            >
                <MenuItem value="none">{t("common.none")}</MenuItem>
                <MenuItem value="startup_select">
                    {t("options.startupSelect")}
                </MenuItem>
                <MenuItem value="startup_a">
                    {t("options.startupA")}
                </MenuItem>
                <MenuItem value="blackout_r">
                    {t("options.blackoutR")}
                </MenuItem>
                <MenuItem value="blackout_a">
                    {t("options.blackoutA")}
                </MenuItem>
                <MenuItem value="blackout_l">
                    {t("options.blackoutL")}
                </MenuItem>
                <MenuItem value="blackout_al">
                    {t("options.blackoutAL")}
                </MenuItem>
            </TextField>
            <TextField
                label={t("labels.console")}
                margin="normal"
                value={gameConsole}
                onChange={(event) =>
                    setHeldSeedURLState({
                        gameConsole: event.target.value,
                    })
                }
                select
                fullWidth
                disabled={searching}
            >
                {getConsoleOptions(t, game.endsWith("nx")).map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {option.label}
                    </MenuItem>
                ))}
            </TextField>
            {!shinyOnlyMode && (
            <Autocomplete
                freeSolo
                options={seedList}
                value={targetSeed ?? null}
                inputValue={targetSeedInput}
                loading={seedListLoading}
                onInputChange={(_event, newInputValue) => {
                    const normalized = normalizeSeedInput(newInputValue);
                    setTargetSeedInput(normalized);
                    if (normalized === "") {
                        setTargetSeedIsValid(false);
                        return;
                    }

                    const parsedSeed = Number.parseInt(normalized, 16);
                    const exists = seedList.some(
                        (seed) => seed.initialSeed === parsedSeed
                    );
                    setTargetSeedIsValid(exists);
                    if (exists) {
                        setHeldSeedURLState({
                            targetInitialSeed: hexSeed(parsedSeed, 16),
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
                    setHeldSeedURLState({
                        targetInitialSeed: hexSeed(
                            newValue.initialSeed,
                            16
                        ),
                    });
                }}
                getOptionLabel={(item) => {
                    if (typeof item === "string") {
                        return item;
                    }
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
                            !seedListLoading &&
                            (seedList.length === 0 ||
                                !targetSeedIsValid)
                        }
                        helperText={
                            seedListError
                                ? seedListError
                                : !seedListLoading &&
                                    seedList.length === 0
                                  ? t("messages.noKnownSeeds")
                                  : !seedListLoading &&
                                      !targetSeedIsValid
                                    ? t("messages.invalidTargetSeed")
                                    : undefined
                        }
                    />
                )}
                disablePortal
                selectOnFocus
                fullWidth
                disabled={searching}
            />
            )}
            <RangeInput
                label={t("labels.advances")}
                name="heldAdvanceRange"
                minimumValue={0}
                maximumValue={0xffffffff}
                value={advanceRangeStrings}
                disabled={searching}
                onChange={(_event, value) => {
                    setAdvanceRangeStrings(value.value);
                    setAdvanceRangeIsValid(value.isValid);
                }}
            />
            {advanceSearchSpaceTooLarge && (
                <Alert severity="warning" sx={{ my: 1 }}>
                    {t("heldItems.advanceSearchTooLarge", {
                        count: advanceCount.toLocaleString(),
                        limit: MAX_ADVANCES_PER_SEARCH.toLocaleString(),
                    })}
                </Alert>
            )}

            <TextField
                label={t("heldItems.searchMode")}
                margin="normal"
                value={searchMode}
                onChange={(event) =>
                    setSearchMode(event.target.value as FrlgHeldSearchMode)
                }
                select
                fullWidth
                disabled={searching}
            >
                {SEARCH_MODE_OPTIONS.map((modeOption) => (
                    <MenuItem key={modeOption.value} value={modeOption.value}>
                        {t(modeOption.labelKey)}
                    </MenuItem>
                ))}
            </TextField>
            <Alert severity="info" sx={{ my: 1, textAlign: "left" }}>
                {t(selectedSearchMode.helpKey)}
                {shinyOnlyMode && (
                    <Typography component="div" sx={{ mt: 1 }}>
                        {t("heldItems.searchModeShinyHelp")}
                    </Typography>
                )}
            </Alert>

            <FormControlLabel
                control={
                    <Switch
                        checked={shinyOnlyMode}
                        onChange={(event) =>
                            setShinyOnlyMode(event.target.checked)
                        }
                        disabled={searching}
                    />
                }
                label={t("heldItems.shinyOnlyMode")}
                sx={{ my: 1 }}
            />

            {shinyOnlyMode && (
                <>
                    <Alert severity="info" sx={{ my: 1, textAlign: "left" }}>
                        {t("heldItems.shinyOnlyModeHelp", {
                            count: seedList.length.toLocaleString(),
                            limit: RESULT_LIMIT.toLocaleString(),
                        })}
                    </Alert>
                    {!advanceSearchSpaceTooLarge &&
                        shinyTotalFrames > 0 && (
                            <Alert
                                severity="warning"
                                sx={{ my: 1, textAlign: "left" }}
                            >
                                {t("heldItems.shinySearchWorkload", {
                                    frames:
                                        shinyTotalFrames.toLocaleString(),
                                    seeds: shinyLibrarySize.toLocaleString(),
                                    advances:
                                        advanceCount.toLocaleString(),
                                })}
                            </Alert>
                        )}
                    <Box sx={{ flexDirection: "row", display: "flex" }}>
                        <NumericalInput
                            label={t("labels.trainerId")}
                            margin="normal"
                            name="trainerID"
                            minimumValue={0}
                            maximumValue={65535}
                            isHex={false}
                            value={trainerID}
                            disabled={searching}
                            onChange={(_event, value) => {
                                setHeldSeedURLState({
                                    trainerID: value.value,
                                });
                                setTrainerIDIsValid(value.isValid);
                            }}
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
                            name="secretID"
                            minimumValue={0}
                            maximumValue={65535}
                            isHex={false}
                            value={secretID}
                            disabled={searching}
                            onChange={(_event, value) => {
                                setHeldSeedURLState({
                                    secretID: value.value,
                                });
                                setSecretIDIsValid(value.isValid);
                            }}
                        />
                    </Box>
                    <TextField
                        label={t("heldItems.shinyFilter")}
                        margin="normal"
                        value={shinyFilter}
                        onChange={(event) =>
                            setShinyFilter(Number(event.target.value))
                        }
                        select
                        fullWidth
                        disabled={searching}
                    >
                        <MenuItem value={1}>{t("options.yes")}</MenuItem>
                        <MenuItem value={0}>{t("options.no")}</MenuItem>
                    </TextField>
                </>
            )}

            <TextField
                label={t("labels.category")}
                margin="normal"
                value={encounterCategory}
                onChange={(event) =>
                    setEncounterCategory(Number(event.target.value))
                }
                select
                fullWidth
                disabled={searching}
            >
                {ENCOUNTER_CATEGORY_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                    </MenuItem>
                ))}
            </TextField>

            <FrlgHeldEncounterSelector
                active={!hidden}
                disabled={searching}
                game={encounterGame}
                encounterCategory={encounterCategory}
                value={selection}
                onChange={setSelection}
            />

            <NumericalInput
                label={t("heldItems.standardOffset")}
                name="heldStandardOffset"
                minimumValue={0}
                maximumValue={0xffffffff}
                value={standardOffset}
                disabled={searching}
                onChange={(_event, value) => {
                    setStandardOffset(value.value);
                    setStandardOffsetIsValid(value.isValid);
                }}
            />
            <Alert
                severity={presetProfile ? "info" : "warning"}
                sx={{ my: 1, textAlign: "left" }}
            >
                {presetProfile
                    ? t("heldItems.offsetPresetAvailable", {
                          offset: String(presetProfile.baseOffset),
                          offsets: searchOffsets
                              .map((offset) => `+${offset}`)
                              .join(" / "),
                      })
                    : t("heldItems.offsetPresetUnknown")}
            </Alert>

            {selection && (
                <FrlgHeldItemNotice
                    profileSet={FRLG_HELD_PROFILE_ENGLISH_SWITCH}
                    game={encounterGame}
                    encounterCategory={encounterCategory}
                    location={selection.locationId}
                    method={WILD_1}
                    species={selection.speciesForm}
                />
            )}

            {!shinyOnlyMode && (
                    <TextField
                        label={t("heldItems.filter")}
                        margin="normal"
                        value={heldItemFilter}
                        onChange={(event) =>
                            setHeldItemFilter(Number(event.target.value))
                        }
                        select
                        fullWidth
                        disabled={searching || !selection || !hasUsableOffset}
                        helperText={
                            selection && !hasUsableOffset
                                ? t("heldItems.offsetRequired")
                                : undefined
                        }
                    >
                        <MenuItem value={HELD_ITEM_FILTER_ANY}>
                            {t("heldItems.filterAny")}
                        </MenuItem>
                        <MenuItem value={HELD_ITEM_FILTER_ANY_ITEM}>
                            {t("heldItems.filterAnyItem")}
                        </MenuItem>
                        {itemOptions.map(({ itemId, percent }) => (
                            <MenuItem key={itemId} value={itemId}>
                                {getFrlgHeldItemName(locale, itemId)} (
                                {percent}%)
                            </MenuItem>
                        ))}
                    </TextField>
            )}

            <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ my: 2 }}
                disabled={
                    searching ||
                    !selection ||
                    seedListLoading ||
                    !!seedListError ||
                    (shinyOnlyMode
                        ? seedList.length === 0
                        : !targetSeedIsValid || !targetSeed) ||
                    !advanceRangeIsValid ||
                    advanceSearchSpaceTooLarge ||
                    !hasUsableOffset
                }
            >
                {searching ? t("common.searching") : t("common.submit")}
            </Button>

            {searchError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {t("heldItems.searchFailed", { error: searchError })}
                </Alert>
            )}
            {hasSearched && !searching && rows.length === 0 && !searchError && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {t(
                        shinyOnlyMode
                            ? "heldItems.noResultsShiny"
                            : "heldItems.noResults"
                    )}
                </Alert>
            )}
            {rows.length > 0 && selection && (
                <>
                    <Typography sx={{ mb: 1 }}>
                        {t("heldItems.resultCount", {
                            count: String(rows.length),
                            limit: String(RESULT_LIMIT),
                        })}
                    </Typography>
                    <FrlgHeldItemResultsTable
                        rows={rows}
                        standardOffset={standardOffsetValue}
                        searchMode={searchMode}
                        game={game}
                        gameConsole={gameConsole}
                        encounterCategory={encounterCategory}
                        encounterLocation={selection.locationIndex}
                        encounterPokemon={selection.speciesForm}
                        calibrationSeedSettings={{
                            sound,
                            buttonMode,
                            button,
                            heldButton,
                        }}
                    />
                </>
            )}
        </Box>
    );
}
