import { proxy } from "comlink";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    createFilterOptions,
    Dialog,
    DialogContent,
    FormControlLabel,
    MenuItem,
    Paper,
    TextField,
    Typography,
    type SxProps,
    type Theme,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";

import useLocalStorage from "../hooks/useLocalStorage";
import { getAllGameOptions, getConsoleOptions, getName, useI18n } from "../i18n";
import fetchTenLines, {
    fetchSeedData,
    fixGameConsole,
    frameToMS,
    hexSeed,
    SEED_IDENTIFIER_TO_GAME,
} from "../tenLines";
import type {
    ExtendedEggGeneratorState,
    FRLGContiguousSeedEntry,
} from "../tenLines/generated.d";
import IvEntry from "./IvEntry";
import IvCalculator from "./IvCalculator";
import NumericalInput from "./NumericalInput";
import RangeInput from "./RangeInput";
import EggTable from "./EggTable";
import EggCalibrationComparePanel, {
    createEggCalibrationCompareEntry,
    EGG_COMPARE_HISTORY_STORAGE_KEY,
    EGG_COMPARE_TARGET_STORAGE_KEY,
    type EggCalibrationCompareEntry,
} from "./EggCalibrationComparePanel";
import { filterNatureOptions } from "../utils/natureSearch";
import {
    DEFAULT_FRLG_EGG_ADVANCE_RANGE,
    DEFAULT_FRLG_EGG_COMPATIBILITY,
    DEFAULT_FRLG_EGG_METHOD,
    DEFAULT_FRLG_EGG_PARENT_IVS,
    DEFAULT_EGG_SEED_SETTINGS,
    FRLG_EGG_COMPATIBILITY_OPTIONS,
    FRLG_EGG_METHODS,
    buildEggSeedSettings,
    buildSeedSettingKey,
    filterFrlgEggGameOptions,
    formatEggSearchError,
    formatEggSeedTime,
    getPreferredEggSeedSettings,
    getSeedRangeAroundTarget,
    isFrlgEggGame,
    parseEggSeedSettings,
    type EggSeedSettings,
} from "./frlgEggHelpers";
import {
    getSwitchJapaneseFRLGNatureLabel,
    isSwitchJapaneseFRLGGame,
} from "./calibrationJapaneseLabels";

const DEFAULT_CHILD_IV_RANGES: [string, string][] = [
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
];

const parseDecimal = (value: string) => parseInt(value, 10);
const parseHex = (value: string) => parseInt(value, 16);
const parseRange = (value: [string, string]) => value.map(parseDecimal);

function parseIvList(value: string | null): string[] {
    const parts = value?.split(",") ?? [];
    if (parts.length !== 6) {
        return DEFAULT_FRLG_EGG_PARENT_IVS.map((iv) => iv.toString());
    }

    return parts.map((part) => {
        const parsed = parseDecimal(part);
        return Number.isInteger(parsed) && parsed >= 0 && parsed <= 31
            ? parsed.toString()
            : "31";
    });
}

function parseIvRanges(value: string | null): [string, string][] {
    const ranges = value?.split(",").map((part) => part.split("-")) ?? [];
    if (ranges.length !== 6) {
        return DEFAULT_CHILD_IV_RANGES.map((range) => [...range] as [string, string]);
    }

    return ranges.map(([min, max]) => {
        const parsedMin = parseDecimal(min);
        const parsedMax = parseDecimal(max);
        if (
            Number.isInteger(parsedMin) &&
            Number.isInteger(parsedMax) &&
            parsedMin >= 0 &&
            parsedMax <= 31 &&
            parsedMin <= parsedMax
        ) {
            return [parsedMin.toString(), parsedMax.toString()];
        }
        return ["0", "31"];
    });
}

function formatIvRanges(value: [string, string][]): string {
    return value.map((range) => `${range[0]}-${range[1]}`).join(",");
}

function seedSettingsKey(settings: EggSeedSettings): string {
    return buildSeedSettingKey(
        settings.sound,
        settings.buttonMode,
        settings.seedButton
    );
}

function normalizeHexInput(value: string, maxDigits: number): string {
    return value
        .trim()
        .replace(/^0x/i, "")
        .replace(/[^0-9a-fA-F]/g, "")
        .slice(0, maxDigits)
        .toUpperCase();
}

function HexInput({
    label,
    name,
    value,
    maxDigits,
    maximumValue,
    required = true,
    disabled = false,
    helperText,
    externalError = false,
    onChange,
}: {
    label: string;
    name: string;
    value: string;
    maxDigits: number;
    maximumValue: number;
    required?: boolean;
    disabled?: boolean;
    helperText?: string;
    externalError?: boolean;
    onChange: (value: string, isValid: boolean) => void;
}) {
    const { t } = useI18n();
    const normalizedValue = normalizeHexInput(value, maxDigits);
    const parsedValue = normalizedValue === "" ? Number.NaN : parseHex(normalizedValue);
    const hasError =
        !disabled &&
        (externalError ||
            (required && normalizedValue === "") ||
            (!Number.isNaN(parsedValue) && parsedValue > maximumValue));
    const resolvedHelperText =
        helperText ??
        (required && normalizedValue === "" ? t("errors.invalidInput") : "");

    return (
        <TextField
            label={label}
            name={name}
            value={normalizedValue}
            disabled={disabled}
            onChange={(event) => {
                const nextValue = normalizeHexInput(event.target.value, maxDigits);
                const nextParsed = nextValue === "" ? Number.NaN : parseHex(nextValue);
                onChange(
                    nextValue,
                    !required && nextValue === ""
                        ? true
                        : nextValue !== "" && nextParsed <= maximumValue
                );
            }}
            fullWidth
            margin="normal"
            error={hasError}
            helperText={hasError ? resolvedHelperText : helperText}
            slotProps={{
                htmlInput: {
                    inputMode: "text",
                },
            }}
        />
    );
}

const eggSeedFilterOptions = createFilterOptions<FRLGContiguousSeedEntry>({
    limit: 100,
    stringify: (option) => hexSeed(option.initialSeed, 16),
});

function EggSeedAutocomplete({
    label,
    name,
    seeds,
    seedValue,
    targetIndex,
    gameConsole,
    loading,
    isValid,
    onValidityChange,
    onChange,
}: {
    label: string;
    name: string;
    seeds: FRLGContiguousSeedEntry[];
    seedValue: string;
    targetIndex: number;
    gameConsole: string;
    loading: boolean;
    isValid: boolean;
    onValidityChange: (isValid: boolean) => void;
    onChange: (value: string) => void;
}) {
    const { t } = useI18n();
    const [inputValue, setInputValue] = useState(
        normalizeHexInput(seedValue, 4)
    );
    const targetSeed = targetIndex === -1 ? null : seeds[targetIndex];
    const seedTimeUnit = t("messages.ms");
    const formatSeedLabel = (seed: FRLGContiguousSeedEntry) =>
        `${hexSeed(seed.initialSeed, 16)} (${formatEggSeedTime(
            seed.seedTime,
            gameConsole,
            frameToMS
        )}${seedTimeUnit})`;
    const targetSeedLabel = targetSeed
        ? formatSeedLabel(targetSeed)
        : normalizeHexInput(seedValue, 4);

    useEffect(() => {
        setInputValue(targetSeedLabel);
        if (targetSeed !== null) {
            onValidityChange(true);
        }
    }, [onValidityChange, targetSeed, targetSeedLabel]);

    return (
        <Autocomplete
            freeSolo
            forcePopupIcon
            openOnFocus
            options={seeds}
            loading={loading}
            loadingText={t("common.loadingResources")}
            value={targetSeed}
            inputValue={inputValue}
            disabled={loading}
            onInputChange={(_event, nextInputValue, reason) => {
                if (reason === "reset" && targetSeed) {
                    setInputValue(formatSeedLabel(targetSeed));
                    return;
                }

                const normalized = normalizeHexInput(nextInputValue, 4);
                setInputValue(normalized);
                if (normalized === "") {
                    onValidityChange(false);
                    return;
                }

                const parsedSeed = parseHex(normalized);
                const exists = seeds.some(
                    (seed) => seed.initialSeed === parsedSeed
                );
                onValidityChange(exists);
                if (exists) {
                    onChange(hexSeed(parsedSeed, 16));
                }
            }}
            onChange={(_event, nextValue) => {
                if (!nextValue || typeof nextValue === "string") {
                    return;
                }

                const normalized = hexSeed(nextValue.initialSeed, 16);
                setInputValue(formatSeedLabel(nextValue));
                onValidityChange(true);
                onChange(normalized);
            }}
            getOptionLabel={(option) => {
                if (typeof option === "string") {
                    return option;
                }

                return formatSeedLabel(option);
            }}
            isOptionEqualToValue={(option, value) =>
                option.initialSeed === value.initialSeed
            }
            filterOptions={(options, state) => {
                const normalizedInput = normalizeHexInput(
                    state.inputValue,
                    4
                );
                const normalizedSeedValue = normalizeHexInput(seedValue, 4);

                return eggSeedFilterOptions(options, {
                    ...state,
                    inputValue:
                        targetSeed === null &&
                        normalizedInput === normalizedSeedValue
                            ? ""
                            : normalizedInput,
                });
            }}
            renderInput={(params) => {
                const hasNoSeeds = !loading && seeds.length === 0;
                const hasInvalidSeed =
                    !loading &&
                    !hasNoSeeds &&
                    (!isValid || targetIndex === -1);
                const helperText = loading
                    ? t("common.loadingResources")
                    : hasNoSeeds
                      ? t("messages.noKnownSeeds")
                      : hasInvalidSeed
                        ? t("messages.invalidTargetSeed")
                        : undefined;

                return (
                    <TextField
                        {...params}
                        label={label}
                        name={name}
                        margin="normal"
                        error={hasNoSeeds || hasInvalidSeed}
                        helperText={helperText}
                    />
                );
            }}
            disablePortal
            selectOnFocus
            fullWidth
        />
    );
}

export default function EggCalibrationForm({
    sx,
    hidden,
}: {
    sx?: SxProps<Theme>;
    hidden?: boolean;
}) {
    const { t, resources } = useI18n();
    const [searchParams, setSearchParams] = useSearchParams();
    const setURLState = useCallback((state: Record<string, string>) => {
        setSearchParams((previous) => {
            const params = new URLSearchParams(previous);
            for (const [key, value] of Object.entries(state)) {
                params.set(key, value);
            }
            return params;
        });
    }, [setSearchParams]);

    const requestedGame = searchParams.get("game");
    const requestedGameConsole = searchParams.get("gameConsole");
    const fallbackGame = requestedGameConsole?.startsWith("NX")
        ? "fr_nx"
        : "fr";
    const game =
        requestedGame && isFrlgEggGame(requestedGame)
            ? requestedGame
            : fallbackGame;
    const gameConsole = fixGameConsole(
        game,
        requestedGameConsole || (game.endsWith("nx") ? "NX" : "GBA")
    );
    const sharedGameNeedsNormalization =
        requestedGame !== game ||
        requestedGameConsole !== gameConsole;
    const heldSettingsText =
        searchParams.get("heldSettings") || buildEggSeedSettings(parseEggSeedSettings(undefined));
    const pickupSettingsText =
        searchParams.get("pickupSettings") || buildEggSeedSettings(parseEggSeedSettings(undefined));
    const heldSettings = useMemo(
        () => parseEggSeedSettings(heldSettingsText),
        [heldSettingsText]
    );
    const pickupSettings = useMemo(
        () => parseEggSeedSettings(pickupSettingsText),
        [pickupSettingsText]
    );
    const heldSeed = searchParams.get("heldSeed") || "0000";
    const pickupSeed = searchParams.get("pickupSeed") || "0000";
    const seedLeeway = searchParams.get("seedLeeway") || "20";
    const heldAdvances: [string, string] = [
        searchParams.get("heldAdvancesMin") || DEFAULT_FRLG_EGG_ADVANCE_RANGE[0].toString(),
        searchParams.get("heldAdvancesMax") || DEFAULT_FRLG_EGG_ADVANCE_RANGE[1].toString(),
    ];
    const pickupAdvances: [string, string] = [
        searchParams.get("pickupAdvancesMin") || DEFAULT_FRLG_EGG_ADVANCE_RANGE[0].toString(),
        searchParams.get("pickupAdvancesMax") || DEFAULT_FRLG_EGG_ADVANCE_RANGE[1].toString(),
    ];
    const heldOffset = searchParams.get("heldOffset") || "0";
    const pickupOffset = searchParams.get("pickupOffset") || "0";
    const trainerID = searchParams.get("trainerID") || "0";
    const secretID = searchParams.get("secretID") || "0";
    const method = searchParams.get("eggMethod") || DEFAULT_FRLG_EGG_METHOD.toString();
    const compatibility =
        searchParams.get("compatibility") || DEFAULT_FRLG_EGG_COMPATIBILITY.toString();
    const eggSpecies = parseDecimal(searchParams.get("eggSpecies") || "1");
    const parentAIvs = parseIvList(searchParams.get("parentAIvs"));
    const parentBIvs = parseIvList(searchParams.get("parentBIvs"));
    const parentAGender = searchParams.get("parentAGender") || "0";
    const parentBGender = searchParams.get("parentBGender") || "1";
    const usePidFilter = searchParams.get("usePidFilter") === "true";
    const childPid = searchParams.get("childPid") || "";
    const childNature = searchParams.get("childNature") || "-1";
    const childAbility = searchParams.get("childAbility") || "255";
    const childGender = searchParams.get("childGender") || "255";
    const childHiddenPower = searchParams.get("childHiddenPower") || "-1";
    const childIvRanges = parseIvRanges(searchParams.get("childIvRanges"));

    const [heldSeedList, setHeldSeedList] = useState<FRLGContiguousSeedEntry[]>([]);
    const [pickupSeedList, setPickupSeedList] = useState<FRLGContiguousSeedEntry[]>([]);
    const [seedListsLoading, setSeedListsLoading] = useState(true);
    const [seedDialogOpen, setSeedDialogOpen] = useState(false);
    const [rows, setRows] = useState<ExtendedEggGeneratorState[]>([]);
    const [searching, setSearching] = useState(false);
    const [message, setMessage] = useState("");
    const [ivCalculatorText, setIvCalculatorText] = useState("");
    const [heldSeedValid, setHeldSeedValid] = useState(true);
    const [pickupSeedValid, setPickupSeedValid] = useState(true);
    const [seedLeewayValid, setSeedLeewayValid] = useState(true);
    const [heldAdvancesValid, setHeldAdvancesValid] = useState(true);
    const [pickupAdvancesValid, setPickupAdvancesValid] = useState(true);
    const [heldOffsetValid, setHeldOffsetValid] = useState(true);
    const [pickupOffsetValid, setPickupOffsetValid] = useState(true);
    const [trainerIDValid, setTrainerIDValid] = useState(true);
    const [secretIDValid, setSecretIDValid] = useState(true);
    const [childPidValid, setChildPidValid] = useState(true);
    const [childIvRangesValid, setChildIvRangesValid] = useState(true);
    useEffect(() => {
        if (hidden || !sharedGameNeedsNormalization) {
            return;
        }
        setSearchParams((previous) => {
            const params = new URLSearchParams(previous);
            params.set("game", game);
            params.set("gameConsole", gameConsole);
            return params;
        });
    }, [
        game,
        gameConsole,
        hidden,
        setSearchParams,
        sharedGameNeedsNormalization,
    ]);
    const [compareTarget, setCompareTarget] =
        useLocalStorage<EggCalibrationCompareEntry | null>(
            EGG_COMPARE_TARGET_STORAGE_KEY,
            null
        );
    const [compareHistory, setCompareHistory] = useLocalStorage<
        EggCalibrationCompareEntry[]
    >(EGG_COMPARE_HISTORY_STORAGE_KEY, []);

    const gameOptions = useMemo(
        () => filterFrlgEggGameOptions(getAllGameOptions(t)),
        [t]
    );
    const isSwitch = game.endsWith("nx");
    const eggSpeciesOptions = useMemo(
        () =>
            Array.from(
                { length: Math.min(resources.species.length - 1, 386) },
                (_value, index) => index + 1
            ),
        [resources.species]
    );
    const usesSwitchJapaneseFRLGLabels = isSwitchJapaneseFRLGGame(game);
    const heldSeedValue = parseHex(heldSeed);
    const pickupSeedValue = parseHex(pickupSeed);
    const heldTargetIndex = heldSeedList.findIndex(
        (seed) => seed.initialSeed === heldSeedValue
    );
    const pickupTargetIndex = pickupSeedList.findIndex(
        (seed) => seed.initialSeed === pickupSeedValue
    );
    const parsedSeedLeeway = seedLeewayValid ? parseDecimal(seedLeeway) : 0;
    const heldSearchSeeds = getSeedRangeAroundTarget(
        heldSeedList,
        heldSeedValue,
        parsedSeedLeeway
    );
    const pickupSearchSeeds = getSeedRangeAroundTarget(
        pickupSeedList,
        pickupSeedValue,
        parsedSeedLeeway
    );
    const seedPairCount = heldSearchSeeds.length * pickupSearchSeeds.length;
    const inputsAreValid =
        !seedListsLoading &&
        heldSeedValid &&
        pickupSeedValid &&
        heldTargetIndex !== -1 &&
        pickupTargetIndex !== -1 &&
        seedLeewayValid &&
        heldAdvancesValid &&
        pickupAdvancesValid &&
        heldOffsetValid &&
        pickupOffsetValid &&
        trainerIDValid &&
        secretIDValid &&
        (!usePidFilter || (childPidValid && childPid !== "")) &&
        childIvRangesValid;

    useEffect(() => {
        let cancelled = false;
        setSeedListsLoading(true);

        const fetchSeedLists = async () => {
            const seedData = await fetchSeedData(game);
            const tenLines = await fetchTenLines();
            let [nextHeldSeeds, nextPickupSeeds] = await Promise.all([
                tenLines.get_contiguous_seed_list(
                    seedData,
                    seedSettingsKey(heldSettings),
                    game,
                    heldSettings.extraButton
                ),
                tenLines.get_contiguous_seed_list(
                    seedData,
                    seedSettingsKey(pickupSettings),
                    game,
                    pickupSettings.extraButton
                ),
            ]);

            let nextHeldSettings = heldSettingsText;
            let nextPickupSettings = pickupSettingsText;
            if (nextHeldSeeds.length === 0 || nextPickupSeeds.length === 0) {
                let fallbackSettings: string | null = buildEggSeedSettings(
                    DEFAULT_EGG_SEED_SETTINGS
                );
                let fallbackSeeds =
                    await tenLines.get_contiguous_seed_list(
                        seedData,
                        seedSettingsKey(DEFAULT_EGG_SEED_SETTINGS),
                        game,
                        DEFAULT_EGG_SEED_SETTINGS.extraButton
                    );

                if (fallbackSeeds.length === 0) {
                    const allSeeds =
                        await tenLines.get_all_contiguous_seed_list(
                            seedData,
                            game
                        );
                    fallbackSettings =
                        getPreferredEggSeedSettings(allSeeds);
                    fallbackSeeds =
                        fallbackSettings === null
                            ? []
                            : allSeeds.filter(
                                  (seed) =>
                                      seed.settings === fallbackSettings
                              );
                }

                if (nextHeldSeeds.length === 0) {
                    nextHeldSeeds = fallbackSeeds;
                    nextHeldSettings =
                        fallbackSettings ?? nextHeldSettings;
                }
                if (nextPickupSeeds.length === 0) {
                    nextPickupSeeds = fallbackSeeds;
                    nextPickupSettings =
                        fallbackSettings ?? nextPickupSettings;
                }
            }

            if (cancelled) {
                return;
            }

            setHeldSeedList(nextHeldSeeds);
            setPickupSeedList(nextPickupSeeds);
            setSeedListsLoading(false);

            const nextURLState: Record<string, string> = {};
            if (nextHeldSettings !== heldSettingsText) {
                nextURLState.heldSettings = nextHeldSettings;
            }
            if (nextPickupSettings !== pickupSettingsText) {
                nextURLState.pickupSettings = nextPickupSettings;
            }
            if (Object.keys(nextURLState).length > 0) {
                setURLState(nextURLState);
            }
        };
        void fetchSeedLists().catch((error: unknown) => {
            if (!cancelled) {
                setSeedListsLoading(false);
                setMessage(
                    error instanceof Error ? error.message : String(error)
                );
            }
        });

        return () => {
            cancelled = true;
        };
    }, [
        game,
        heldSettings,
        heldSettingsText,
        pickupSettings,
        pickupSettingsText,
        setURLState,
    ]);

    useEffect(() => {
        const nextURLState: Record<string, string> = {};
        if (heldSeedList.length > 0 && heldTargetIndex === -1) {
            nextURLState.heldSeed = hexSeed(
                heldSeedList[Math.min(51, heldSeedList.length - 1)].initialSeed,
                16
            );
        }
        if (pickupSeedList.length > 0 && pickupTargetIndex === -1) {
            nextURLState.pickupSeed = hexSeed(
                pickupSeedList[Math.min(51, pickupSeedList.length - 1)]
                    .initialSeed,
                16
            );
        }
        if (Object.keys(nextURLState).length > 0) {
            setURLState(nextURLState);
        }
    }, [
        heldSeedList,
        heldTargetIndex,
        pickupSeedList,
        pickupTargetIndex,
        setURLState,
    ]);

    const runSearch = async () => {
        setMessage("");
        setRows([]);

        if (!inputsAreValid) {
            return;
        }

        setSearching(true);
        try {
            const tenLines = await fetchTenLines();
            let receivedResults = 0;
            await tenLines.check_seeds_frlg_egg(
                heldSearchSeeds,
                pickupSearchSeeds,
                parseRange(heldAdvances),
                parseRange(pickupAdvances),
                parseDecimal(heldOffset),
                parseDecimal(pickupOffset),
                SEED_IDENTIFIER_TO_GAME[game],
                parseDecimal(trainerID),
                parseDecimal(secretID),
                parseDecimal(method),
                parseDecimal(compatibility),
                [parentAIvs.map(parseDecimal), parentBIvs.map(parseDecimal)],
                [parseDecimal(parentAGender), parseDecimal(parentBGender)],
                eggSpecies,
                255,
                parseDecimal(childNature),
                parseDecimal(childGender),
                parseDecimal(childAbility),
                parseDecimal(childHiddenPower),
                childIvRanges.map(parseRange),
                0,
                buildEggSeedSettings(heldSettings),
                buildEggSeedSettings(pickupSettings),
                usePidFilter ? parseHex(childPid) : -1,
                false,
                proxy((batch: ExtendedEggGeneratorState[]) => {
                    receivedResults += batch.length;
                    setRows((currentRows) => [...currentRows, ...batch]);
                }),
                proxy(() => {}),
                proxy((nextSearching: boolean) => {
                    if (nextSearching) {
                        setSearching(true);
                    }
                })
            );

            if (receivedResults === 0) {
                setMessage(t("messages.noEggResults"));
            }
        } catch (error) {
            setMessage(formatEggSearchError(error));
        } finally {
            setSearching(false);
        }
    };

    if (hidden) {
        return null;
    }

    return (
        <Box
            component="form"
            sx={{ ...sx, textAlign: "left" }}
            onSubmit={(event) => {
                event.preventDefault();
                void runSearch();
            }}
        >
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "minmax(0, 1fr)",
                        xl: "minmax(720px, 2fr) minmax(300px, 1fr)",
                    },
                    gap: 2,
                    alignItems: "start",
                }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h5" sx={{ mt: 2 }}>
                        {t("tabs.eggCalibration")}
                    </Typography>

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                lg: "repeat(2, 1fr)",
                            },
                            gap: 2,
                        }}
                    >
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6">{t("labels.eggGeneration")}</Typography>
                    <EggSeedAutocomplete
                        label={t("table.heldSeed")}
                        name="eggCalibrationHeldSeed"
                        seeds={heldSeedList}
                        seedValue={heldSeed}
                        targetIndex={heldTargetIndex}
                        gameConsole={gameConsole}
                        loading={seedListsLoading}
                        isValid={heldSeedValid}
                        onValidityChange={setHeldSeedValid}
                        onChange={(nextValue) =>
                            setURLState({ heldSeed: nextValue })
                        }
                    />
                    <RangeInput
                        label={t("table.heldAdvances")}
                        name="eggCalibrationHeldAdvances"
                        value={heldAdvances}
                        minimumValue={0}
                        maximumValue={4294967295}
                        onChange={(_, next) => {
                            setHeldAdvancesValid(next.isValid);
                            setURLState({
                                heldAdvancesMin: next.value[0],
                                heldAdvancesMax: next.value[1],
                            });
                        }}
                    />
                    <NumericalInput
                        label={t("labels.heldOffset")}
                        name="eggCalibrationHeldOffset"
                        value={heldOffset}
                        minimumValue={0}
                        maximumValue={4294967295}
                        onChange={(_, next) => {
                            setHeldOffsetValid(next.isValid);
                            setURLState({ heldOffset: next.value });
                        }}
                    />
                </Paper>

                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6">{t("labels.eggPickup")}</Typography>
                    <EggSeedAutocomplete
                        label={t("table.pickupSeed")}
                        name="eggCalibrationPickupSeed"
                        seeds={pickupSeedList}
                        seedValue={pickupSeed}
                        targetIndex={pickupTargetIndex}
                        gameConsole={gameConsole}
                        loading={seedListsLoading}
                        isValid={pickupSeedValid}
                        onValidityChange={setPickupSeedValid}
                        onChange={(nextValue) =>
                            setURLState({ pickupSeed: nextValue })
                        }
                    />
                    <RangeInput
                        label={t("table.pickupAdvances")}
                        name="eggCalibrationPickupAdvances"
                        value={pickupAdvances}
                        minimumValue={0}
                        maximumValue={4294967295}
                        onChange={(_, next) => {
                            setPickupAdvancesValid(next.isValid);
                            setURLState({
                                pickupAdvancesMin: next.value[0],
                                pickupAdvancesMax: next.value[1],
                            });
                        }}
                    />
                    <NumericalInput
                        label={t("labels.pickupOffset")}
                        name="eggCalibrationPickupOffset"
                        value={pickupOffset}
                        minimumValue={0}
                        maximumValue={4294967295}
                        onChange={(_, next) => {
                            setPickupOffsetValid(next.isValid);
                            setURLState({ pickupOffset: next.value });
                        }}
                    />
                </Paper>
                    </Box>

            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <NumericalInput
                    label={t("labels.seedLeeway")}
                    name="eggCalibrationSeedLeeway"
                    value={seedLeeway}
                    minimumValue={0}
                    maximumValue={10000}
                    onChange={(_, next) => {
                        setSeedLeewayValid(next.isValid);
                        setURLState({ seedLeeway: next.value });
                    }}
                />
                <Button
                    sx={{ my: 2, minWidth: 110 }}
                    variant="contained"
                    onClick={() => setSeedDialogOpen(true)}
                >
                    {t("common.showSeeds")}
                </Button>
            </Box>
            <Typography variant="body2" color="text.secondary">
                {t("labels.seedPairCount")}: {seedPairCount.toLocaleString()}
            </Typography>

            <Dialog
                open={seedDialogOpen}
                onClose={() => setSeedDialogOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogContent>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, 1fr)",
                            gap: 2,
                            textAlign: "center",
                        }}
                    >
                        <Box>
                            <Typography variant="subtitle2">
                                {t("labels.eggGeneration")}
                            </Typography>
                            {heldSearchSeeds.map((seed) => (
                                <div key={seed.initialSeed}>
                                    {hexSeed(seed.initialSeed, 16)}
                                </div>
                            ))}
                        </Box>
                        <Box>
                            <Typography variant="subtitle2">
                                {t("labels.eggPickup")}
                            </Typography>
                            {pickupSearchSeeds.map((seed) => (
                                <div key={seed.initialSeed}>
                                    {hexSeed(seed.initialSeed, 16)}
                                </div>
                            ))}
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>

            <Typography variant="h6" sx={{ mt: 2 }}>
                {t("labels.eggSettings")}
            </Typography>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                    gap: 2,
                }}
            >
                <TextField
                    label={t("labels.game")}
                    value={game}
                    onChange={(event) => {
                        const nextGame = event.target.value;
                        setURLState({
                            game: nextGame,
                            gameConsole: fixGameConsole(nextGame, gameConsole),
                        });
                    }}
                    select
                    fullWidth
                    margin="normal"
                >
                    {gameOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    label={t("labels.console")}
                    value={gameConsole}
                    onChange={(event) =>
                        setURLState({
                            gameConsole: fixGameConsole(game, event.target.value),
                        })
                    }
                    select
                    fullWidth
                    margin="normal"
                >
                    {getConsoleOptions(t, isSwitch).map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    label={t("labels.eggMethod")}
                    value={method}
                    onChange={(event) => setURLState({ eggMethod: event.target.value })}
                    select
                    fullWidth
                    margin="normal"
                >
                    {FRLG_EGG_METHODS.map((option) => (
                        <MenuItem key={option.value} value={option.value.toString()}>
                            {t(option.labelKey)}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    label={t("labels.compatibility")}
                    value={compatibility}
                    onChange={(event) =>
                        setURLState({ compatibility: event.target.value })
                    }
                    select
                    fullWidth
                    margin="normal"
                >
                    {FRLG_EGG_COMPATIBILITY_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value.toString()}>
                            {t(option.labelKey)}
                        </MenuItem>
                    ))}
                </TextField>
                <NumericalInput
                    label={t("labels.trainerId")}
                    name="eggCalibrationTrainerID"
                    value={trainerID}
                    minimumValue={0}
                    maximumValue={65535}
                    onChange={(_, next) => {
                        setTrainerIDValid(next.isValid);
                        setURLState({ trainerID: next.value });
                    }}
                />
                <NumericalInput
                    label={t("labels.secretId")}
                    name="eggCalibrationSecretID"
                    value={secretID}
                    minimumValue={0}
                    maximumValue={65535}
                    onChange={(_, next) => {
                        setSecretIDValid(next.isValid);
                        setURLState({ secretID: next.value });
                    }}
                />
                <Autocomplete
                    options={eggSpeciesOptions}
                    value={eggSpecies}
                    onChange={(_event, newValue) => {
                        if (newValue !== null) {
                            setURLState({ eggSpecies: newValue.toString() });
                        }
                    }}
                    getOptionLabel={(option) => getName(resources, option)}
                    isOptionEqualToValue={(option, value) => option === value}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={t("labels.eggSpecies")}
                            margin="normal"
                        />
                    )}
                    disablePortal
                    disableClearable
                    selectOnFocus
                    fullWidth
                />
            </Box>

            <Typography variant="h6" sx={{ mt: 2 }}>
                {t("labels.childInfo")}
            </Typography>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                    gap: 2,
                }}
            >
                <Box>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={usePidFilter}
                                onChange={(event) =>
                                    setURLState({
                                        usePidFilter: event.target.checked.toString(),
                                    })
                                }
                            />
                        }
                        label={t("labels.usePidFilter")}
                    />
                    <HexInput
                        label={t("table.pid")}
                        name="eggCalibrationChildPid"
                        value={childPid}
                        maxDigits={8}
                        maximumValue={0xffffffff}
                        required={usePidFilter}
                        disabled={!usePidFilter}
                        onChange={(nextValue, isValid) => {
                            setChildPidValid(isValid);
                            setURLState({ childPid: nextValue });
                        }}
                    />
                </Box>
                <Autocomplete
                    options={[-1, ...resources.natures.map((_nature, index) => index)]}
                    value={parseDecimal(childNature)}
                    onChange={(_event, value) => {
                        setURLState({ childNature: (value ?? -1).toString() });
                    }}
                    filterOptions={filterNatureOptions}
                    getOptionLabel={(option) =>
                        option === -1
                            ? t("common.any")
                            : usesSwitchJapaneseFRLGLabels
                              ? getSwitchJapaneseFRLGNatureLabel(option)
                              : resources.natures[option]
                    }
                    isOptionEqualToValue={(option, value) => option === value}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={t("labels.nature")}
                            margin="normal"
                            helperText={t("messages.requiredForIvCalculation")}
                            placeholder={
                                childNature === "-1" ? t("common.any") : undefined
                            }
                        />
                    )}
                    fullWidth
                />
                <TextField
                    label={t("labels.ability")}
                    value={childAbility}
                    onChange={(event) =>
                        setURLState({ childAbility: event.target.value })
                    }
                    select
                    fullWidth
                    margin="normal"
                >
                    <MenuItem value="255">{t("common.any")}</MenuItem>
                    <MenuItem value="0">0</MenuItem>
                    <MenuItem value="1">1</MenuItem>
                </TextField>
                <TextField
                    label={t("labels.gender")}
                    value={childGender}
                    onChange={(event) =>
                        setURLState({ childGender: event.target.value })
                    }
                    select
                    fullWidth
                    margin="normal"
                >
                    <MenuItem value="255">{t("common.any")}</MenuItem>
                    {resources.genders.slice(0, 2).map((name, index) => (
                        <MenuItem key={index} value={index.toString()}>
                            {name}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    label={t("labels.hiddenPower")}
                    value={childHiddenPower}
                    onChange={(event) =>
                        setURLState({ childHiddenPower: event.target.value })
                    }
                    select
                    fullWidth
                    margin="normal"
                >
                    <MenuItem value="-1">{t("common.any")}</MenuItem>
                    {resources.types.map((type, index) => (
                        <MenuItem key={index} value={index.toString()}>
                            {type}
                        </MenuItem>
                    ))}
                </TextField>
            </Box>
            {childNature !== "-1" ? (
                <>
                    <IvCalculator
                        value={ivCalculatorText}
                        onChange={(_event, next) => {
                            setIvCalculatorText(next.value);
                            if (next.isValid) {
                                setURLState({
                                    childIvRanges: formatIvRanges(
                                        next.calculatedValue.map((ivRange) => [
                                            ivRange.min.toString(),
                                            ivRange.max.toString(),
                                        ])
                                    ),
                                });
                            }
                        }}
                        calculateIVs={async (parsedLines) => {
                            const tenLines = await fetchTenLines();
                            return await tenLines.calc_ivs_generic(
                                eggSpecies,
                                0,
                                parsedLines,
                                parseDecimal(childNature)
                            );
                        }}
                    />
                    <IvEntry
                        value={childIvRanges}
                        onChange={(_, next) => {
                            setChildIvRangesValid(next.isValid);
                            setURLState({ childIvRanges: formatIvRanges(next.value) });
                        }}
                    />
                </>
            ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {t("messages.ivCalculationDisabled")}
                </Typography>
            )}

            {message !== "" && (
                <Typography color="error" sx={{ my: 1 }}>
                    {message}
                </Typography>
            )}
            <Button
                type="submit"
                variant="contained"
                disabled={searching || !inputsAreValid}
                fullWidth
                sx={{ my: 2 }}
            >
                {searching ? t("common.searching") : t("common.submit")}
            </Button>
            {rows.length > 0 && (
                <EggTable
                    rows={rows}
                    showInheritance
                    gameConsole={gameConsole}
                    compareTargetExists={compareTarget !== null}
                    onAddCompareEntry={(row, destination) => {
                        const entry = createEggCalibrationCompareEntry(row);
                        if (destination === "target") {
                            setCompareTarget(entry);
                            return;
                        }
                        setCompareHistory(
                            (entries: EggCalibrationCompareEntry[]) => [
                                ...entries,
                                entry,
                            ]
                        );
                    }}
                    targetSeedTimes={
                        heldTargetIndex !== -1 && pickupTargetIndex !== -1
                            ? {
                                  held: heldSeedList[heldTargetIndex].seedTime,
                                  pickup:
                                      pickupSeedList[pickupTargetIndex].seedTime,
                              }
                            : undefined
                    }
                />
            )}
                </Box>

                <Box
                    sx={{
                        minWidth: 0,
                        position: { xl: "sticky" },
                        top: { xl: 16 },
                        alignSelf: "start",
                    }}
                >
                    <EggCalibrationComparePanel
                        targetEntry={compareTarget}
                        historyEntries={compareHistory}
                        gameConsole={gameConsole}
                        onDeleteTarget={() => setCompareTarget(null)}
                        onDeleteHistoryEntry={(id) =>
                            setCompareHistory(
                                (entries: EggCalibrationCompareEntry[]) =>
                                    entries.filter(
                                        (
                                            entry: EggCalibrationCompareEntry
                                        ) => entry.id !== id
                                    )
                            )
                        }
                        onClearAll={() => {
                            setCompareTarget(null);
                            setCompareHistory([]);
                        }}
                        onClearHistory={() => setCompareHistory([])}
                    />
                </Box>
            </Box>
        </Box>
    );
}
