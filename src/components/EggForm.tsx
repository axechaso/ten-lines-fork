import { proxy } from "comlink";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    LinearProgress,
    MenuItem,
    TextField,
    Typography,
    type SxProps,
    type Theme,
} from "@mui/material";

import { getAllGameOptions, getConsoleOptions, getName, useI18n } from "../i18n";
import fetchTenLines, {
    fetchSeedData,
    fixGameConsole,
    SEED_IDENTIFIER_TO_GAME,
} from "../tenLines";
import type { ExtendedEggGeneratorState } from "../tenLines/generated.d";
import { filterNatureOptions } from "../utils/natureSearch";
import IvEntry from "./IvEntry";
import NumericalInput from "./NumericalInput";
import RangeInput from "./RangeInput";
import EggParentSettings, { type EggParentState } from "./EggParentSettings";
import EggTable from "./EggTable";
import {
    DEFAULT_FRLG_EGG_ADVANCE_RANGE,
    DEFAULT_FRLG_EGG_COMPATIBILITY,
    DEFAULT_FRLG_EGG_MAX_RESULTS,
    DEFAULT_FRLG_EGG_METHOD,
    DEFAULT_FRLG_EGG_PARENT_IVS,
    DEFAULT_FRLG_EGG_SEED_SKIP_COUNT,
    FRLG_EGG_COMPATIBILITY_OPTIONS,
    FRLG_EGG_IV_PRESETS,
    FRLG_EGG_METHODS,
    applyEggIvPreset,
    buildEggSeedSearchPhases,
    calculateEggSearchProgress,
    filterFrlgEggGameOptions,
    formatEggSearchError,
    isCompatibleEggParentPair,
    isFrlgEggGame,
    skipEggSeedTableEntries,
} from "./frlgEggHelpers";

const DEFAULT_IVS = DEFAULT_FRLG_EGG_PARENT_IVS.map((value) => value.toString());
const DEFAULT_IV_RANGES: [string, string][] = [
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
];

const parseDecimal = (value: string) => parseInt(value, 10);
const parseRange = (value: [string, string]) => value.map(parseDecimal);
const parseIvs = (value: string[]) => value.map(parseDecimal);

type EggSearchProgress = {
    completedNatureFilters: number;
    totalNatureFilters: number;
    checkedSeedPairs: number;
    totalSeedPairs: number;
};

function copyIvRanges() {
    return DEFAULT_IV_RANGES.map((range) => [...range] as [string, string]);
}

function copyDefaultAdvanceRange(): [string, string] {
    return [
        DEFAULT_FRLG_EGG_ADVANCE_RANGE[0].toString(),
        DEFAULT_FRLG_EGG_ADVANCE_RANGE[1].toString(),
    ];
}

export default function EggForm({
    sx,
    hidden,
}: {
    sx?: SxProps<Theme>;
    hidden?: boolean;
}) {
    const { t, resources } = useI18n();
    const [searchParams, setSearchParams] = useSearchParams();
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
    const trainerID = searchParams.get("trainerID") || "0";
    const secretID = searchParams.get("secretID") || "0";
    const setSharedURLState = (state: Record<string, string>) => {
        setSearchParams((previous) => {
            const params = new URLSearchParams(previous);
            for (const [key, value] of Object.entries(state)) {
                params.set(key, value);
            }
            return params;
        });
    };
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
    const [method, setMethod] = useState(DEFAULT_FRLG_EGG_METHOD.toString());
    const [compatibility, setCompatibility] = useState(
        DEFAULT_FRLG_EGG_COMPATIBILITY.toString()
    );
    const [maxResults, setMaxResults] = useState(
        DEFAULT_FRLG_EGG_MAX_RESULTS.toString()
    );
    const [eggSpecies, setEggSpecies] = useState(1);
    const [heldAdvances, setHeldAdvances] = useState<[string, string]>(
        copyDefaultAdvanceRange
    );
    const [pickupAdvances, setPickupAdvances] = useState<[string, string]>(
        copyDefaultAdvanceRange
    );
    const [heldAdvancesValid, setHeldAdvancesValid] = useState(true);
    const [pickupAdvancesValid, setPickupAdvancesValid] = useState(true);
    const [heldOffset, setHeldOffset] = useState("0");
    const [pickupOffset, setPickupOffset] = useState("0");
    const [parentA, setParentA] = useState<EggParentState>({
        ivs: [...DEFAULT_IVS],
        gender: "0",
    });
    const [parentB, setParentB] = useState<EggParentState>({
        ivs: [...DEFAULT_IVS],
        gender: "1",
    });
    const [parentAValid, setParentAValid] = useState(true);
    const [parentBValid, setParentBValid] = useState(true);
    const [shininess, setShininess] = useState("255");
    const [natures, setNatures] = useState<number[]>([]);
    const [gender, setGender] = useState("255");
    const [ability, setAbility] = useState("255");
    const [hiddenPower, setHiddenPower] = useState("-1");
    const [ivPreset, setIvPreset] = useState("");
    const [ivRanges, setIvRanges] = useState(copyIvRanges);
    const [ivRangesValid, setIvRangesValid] = useState(true);
    const [showInheritance, setShowInheritance] = useState(false);
    const [skipEarlySeeds, setSkipEarlySeeds] = useState(true);
    const [sameInitialSeedOnly, setSameInitialSeedOnly] = useState(true);
    const [rows, setRows] = useState<ExtendedEggGeneratorState[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchProgress, setSearchProgress] = useState<EggSearchProgress | null>(
        null
    );
    const [message, setMessage] = useState("");

    const gameOptions = useMemo(
        () => filterFrlgEggGameOptions(getAllGameOptions(t)),
        [t]
    );
    const eggSpeciesOptions = useMemo(
        () =>
            Array.from(
                { length: Math.min(resources.species.length - 1, 386) },
                (_value, index) => index + 1
            ),
        [resources.species]
    );
    const parentPairIsCompatible = isCompatibleEggParentPair(
        parseDecimal(parentA.gender),
        parseDecimal(parentB.gender)
    );
    const fixedGameConsole = fixGameConsole(game, gameConsole);
    const isSwitch = game.endsWith("nx");
    const selectedNatureSet = useMemo(() => new Set(natures), [natures]);
    const inputsAreValid =
        parentAValid &&
        parentBValid &&
        heldAdvancesValid &&
        pickupAdvancesValid &&
        ivRangesValid;
    const submittedNatureFilters = natures.length === 0 ? [-1] : natures;
    const calibrationContext = {
        game,
        gameConsole: fixedGameConsole,
        trainerID,
        secretID,
        method,
        compatibility,
        eggSpecies: eggSpecies.toString(),
        parentAIvs: parentA.ivs,
        parentBIvs: parentB.ivs,
        parentAGender: parentA.gender,
        parentBGender: parentB.gender,
        heldOffset,
        pickupOffset,
    };
    const progressPercent = searchProgress
        ? calculateEggSearchProgress(
              searchProgress.completedNatureFilters,
              searchProgress.totalNatureFilters,
              searchProgress.checkedSeedPairs,
              searchProgress.totalSeedPairs
          )
        : 0;
    const progressText =
        searchProgress === null
            ? ""
            : t("messages.eggSearchProgress", {
                  percent: Math.floor(progressPercent).toString(),
                  checked: Math.min(
                      searchProgress.checkedSeedPairs,
                      searchProgress.totalSeedPairs
                  ).toLocaleString(),
                  total: searchProgress.totalSeedPairs.toLocaleString(),
                  current: Math.min(
                      searchProgress.completedNatureFilters + 1,
                      searchProgress.totalNatureFilters
                  ).toString(),
                  filters: searchProgress.totalNatureFilters.toString(),
              });

    const runSearch = async () => {
        setMessage("");
        setRows([]);
        setSearchProgress(null);

        if (!parentPairIsCompatible) {
            setMessage(t("messages.incompatibleEggParents"));
            return;
        }
        if (!inputsAreValid) {
            return;
        }

        setSearching(true);
        let receivedResults = 0;
        try {
            const tenLines = await fetchTenLines();
            const seedData = await fetchSeedData(game);
            const allEggSeeds = await tenLines.get_all_contiguous_seed_list(
                seedData,
                game
            );
            const eggSeeds = skipEarlySeeds
                ? skipEggSeedTableEntries(
                      allEggSeeds,
                      DEFAULT_FRLG_EGG_SEED_SKIP_COUNT
                  )
                : allEggSeeds;

            if (eggSeeds.length === 0) {
                setMessage(t("messages.noEggSeeds"));
                return;
            }

            const searchPhases = buildEggSeedSearchPhases(
                eggSeeds,
                sameInitialSeedOnly
            );
            const totalSeedPairs = searchPhases.reduce(
                (total, phase) => total + phase.pairCount,
                0
            );
            const resultLimit = parseDecimal(maxResults);
            for (
                let natureIndex = 0;
                natureIndex < submittedNatureFilters.length;
                natureIndex++
            ) {
                const natureFilter = submittedNatureFilters[natureIndex];
                for (const phase of searchPhases) {
                    const remainingResults = resultLimit - receivedResults;
                    if (remainingResults <= 0) {
                        break;
                    }

                    await tenLines.check_seeds_frlg_egg(
                        phase.heldSeeds,
                        phase.pickupSeeds,
                        parseRange(heldAdvances),
                        parseRange(pickupAdvances),
                        parseDecimal(heldOffset),
                        parseDecimal(pickupOffset),
                        SEED_IDENTIFIER_TO_GAME[game],
                        parseDecimal(trainerID),
                        parseDecimal(secretID),
                        parseDecimal(method),
                        parseDecimal(compatibility),
                        [parseIvs(parentA.ivs), parseIvs(parentB.ivs)],
                        [parseDecimal(parentA.gender), parseDecimal(parentB.gender)],
                        eggSpecies,
                        parseDecimal(shininess),
                        natureFilter,
                        parseDecimal(gender),
                        parseDecimal(ability),
                        parseDecimal(hiddenPower),
                        ivRanges.map(parseRange),
                        remainingResults,
                        t("common.any"),
                        t("common.any"),
                        -1,
                        sameInitialSeedOnly,
                        proxy((batch: ExtendedEggGeneratorState[]) => {
                            receivedResults += batch.length;
                            setRows((currentRows) => [...currentRows, ...batch]);
                        }),
                        proxy((checkedSeedPairs: number) => {
                            setSearchProgress({
                                completedNatureFilters: natureIndex,
                                totalNatureFilters: submittedNatureFilters.length,
                                checkedSeedPairs:
                                    phase.pairOffset + checkedSeedPairs,
                                totalSeedPairs,
                            });
                        }),
                        proxy((nextSearching: boolean) => {
                            if (nextSearching) {
                                setSearching(true);
                            }
                        })
                    );
                }
                setSearchProgress({
                    completedNatureFilters: natureIndex + 1,
                    totalNatureFilters: submittedNatureFilters.length,
                    checkedSeedPairs: totalSeedPairs,
                    totalSeedPairs,
                });
                if (receivedResults >= resultLimit) {
                    break;
                }
            }

            if (receivedResults === 0) {
                setMessage(t("messages.noEggResults"));
            } else if (receivedResults >= parseDecimal(maxResults)) {
                setMessage(t("messages.eggResultsCapHit"));
            }
        } catch (error) {
            setMessage(formatEggSearchError(error));
        } finally {
            setSearching(false);
        }
    };

    if (hidden) return null;

    return (
        <Box
            component="form"
            sx={{ ...sx, textAlign: "left" }}
            onSubmit={(event) => {
                event.preventDefault();
                void runSearch();
            }}
        >
            <Typography variant="h5" sx={{ mt: 2 }}>
                {t("tabs.eggSearch")}
            </Typography>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                    gap: 2,
                }}
            >
                <TextField
                    label={t("labels.game")}
                    value={game}
                    onChange={(event) => {
                        const nextGame = event.target.value;
                        setSharedURLState({
                            game: nextGame,
                            gameConsole: fixGameConsole(
                                nextGame,
                                gameConsole
                            ),
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
                    value={fixedGameConsole}
                    onChange={(event) =>
                        setSharedURLState({
                            gameConsole: fixGameConsole(
                                game,
                                event.target.value
                            ),
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
                    onChange={(event) => setMethod(event.target.value)}
                    select
                    fullWidth
                    margin="normal"
                >
                    {FRLG_EGG_METHODS.map((option) => (
                        <MenuItem
                            key={option.value}
                            value={option.value.toString()}
                        >
                            {t(option.labelKey)}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    label={t("labels.compatibility")}
                    value={compatibility}
                    onChange={(event) => setCompatibility(event.target.value)}
                    select
                    fullWidth
                    margin="normal"
                >
                    {FRLG_EGG_COMPATIBILITY_OPTIONS.map((option) => (
                        <MenuItem
                            key={option.value}
                            value={option.value.toString()}
                        >
                            {t(option.labelKey)}
                        </MenuItem>
                    ))}
                </TextField>
                <NumericalInput
                    label={t("labels.trainerId")}
                    name="eggTrainerID"
                    value={trainerID}
                    minimumValue={0}
                    maximumValue={65535}
                    onChange={(_, next) =>
                        setSharedURLState({ trainerID: next.value })
                    }
                />
                <NumericalInput
                    label={t("labels.secretId")}
                    name="eggSecretID"
                    value={secretID}
                    minimumValue={0}
                    maximumValue={65535}
                    onChange={(_, next) =>
                        setSharedURLState({ secretID: next.value })
                    }
                />
                <NumericalInput
                    label={t("labels.maxResults")}
                    name="eggMaxResults"
                    value={maxResults}
                    minimumValue={1}
                    maximumValue={10000}
                    onChange={(_, next) => setMaxResults(next.value)}
                />
            </Box>
            <Box
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    columnGap: 3,
                    rowGap: 0,
                }}
            >
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={skipEarlySeeds}
                            onChange={(event) =>
                                setSkipEarlySeeds(event.target.checked)
                            }
                        />
                    }
                    label={t("labels.skipEarlyEggSeeds", {
                        count: DEFAULT_FRLG_EGG_SEED_SKIP_COUNT.toString(),
                    })}
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={sameInitialSeedOnly}
                            onChange={(event) =>
                                setSameInitialSeedOnly(event.target.checked)
                            }
                        />
                    }
                    label={t("labels.sameEggInitialSeed")}
                />
            </Box>

            <Typography variant="h6" sx={{ mt: 2 }}>
                {t("labels.eggGeneration")}
            </Typography>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                    gap: 2,
                }}
            >
                <RangeInput
                    label={t("labels.heldAdvances")}
                    name="heldAdvances"
                    value={heldAdvances}
                    minimumValue={0}
                    maximumValue={4294967295}
                    onChange={(_, next) => {
                        setHeldAdvances(next.value);
                        setHeldAdvancesValid(next.isValid);
                    }}
                />
                <NumericalInput
                    label={t("labels.heldOffset")}
                    name="heldOffset"
                    value={heldOffset}
                    minimumValue={0}
                    maximumValue={4294967295}
                    onChange={(_, next) => setHeldOffset(next.value)}
                />
            </Box>

            <Typography variant="h6" sx={{ mt: 2 }}>
                {t("labels.eggPickup")}
            </Typography>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                    gap: 2,
                }}
            >
                <RangeInput
                    label={t("labels.pickupAdvances")}
                    name="pickupAdvances"
                    value={pickupAdvances}
                    minimumValue={0}
                    maximumValue={4294967295}
                    onChange={(_, next) => {
                        setPickupAdvances(next.value);
                        setPickupAdvancesValid(next.isValid);
                    }}
                />
                <NumericalInput
                    label={t("labels.pickupOffset")}
                    name="pickupOffset"
                    value={pickupOffset}
                    minimumValue={0}
                    maximumValue={4294967295}
                    onChange={(_, next) => setPickupOffset(next.value)}
                />
            </Box>

            <Typography variant="h6" sx={{ mt: 2 }}>
                {t("labels.eggSettings")}
            </Typography>
            <Autocomplete
                options={eggSpeciesOptions}
                value={eggSpecies}
                onChange={(_event, newValue) => {
                    if (newValue !== null) {
                        setEggSpecies(newValue);
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
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                    gap: 2,
                }}
            >
                <EggParentSettings
                    label={t("labels.parentA")}
                    value={parentA}
                    onChange={setParentA}
                    onValidityChange={setParentAValid}
                />
                <EggParentSettings
                    label={t("labels.parentB")}
                    value={parentB}
                    onChange={setParentB}
                    onValidityChange={setParentBValid}
                />
            </Box>

            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                    gap: 2,
                }}
            >
                <TextField
                    label={t("labels.shininess")}
                    value={shininess}
                    onChange={(event) => setShininess(event.target.value)}
                    select
                    fullWidth
                    margin="normal"
                >
                    <MenuItem value="255">{t("common.any")}</MenuItem>
                    <MenuItem value="1">{t("options.star")}</MenuItem>
                    <MenuItem value="2">{t("options.square")}</MenuItem>
                    <MenuItem value="3">{t("options.starSquare")}</MenuItem>
                </TextField>
                <Autocomplete
                    multiple
                    disableCloseOnSelect
                    options={resources.natures.map((_nature, index) => index)}
                    value={natures}
                    filterOptions={filterNatureOptions}
                    onChange={(_event, value) => setNatures(value)}
                    getOptionLabel={(option) => resources.natures[option]}
                    renderOption={(props, option) => {
                        const { key, ...optionProps } = props;
                        const isSelected = selectedNatureSet.has(option);
                        return (
                            <Box
                                component="li"
                                key={key}
                                {...optionProps}
                                sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    width: "100%",
                                }}
                            >
                                <span>{resources.natures[option]}</span>
                                <span
                                    aria-hidden="true"
                                    style={{
                                        visibility: isSelected
                                            ? "visible"
                                            : "hidden",
                                        fontWeight: 700,
                                    }}
                                >
                                    {"\u2713"}
                                </span>
                            </Box>
                        );
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={t("labels.nature")}
                            margin="normal"
                            style={{ textAlign: "left" }}
                            placeholder={
                                natures.length === 0
                                    ? t("common.any")
                                    : undefined
                            }
                        />
                    )}
                    fullWidth
                />
                <TextField
                    label={t("labels.gender")}
                    value={gender}
                    onChange={(event) => setGender(event.target.value)}
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
                    label={t("labels.ability")}
                    value={ability}
                    onChange={(event) => setAbility(event.target.value)}
                    select
                    fullWidth
                    margin="normal"
                >
                    <MenuItem value="255">{t("common.any")}</MenuItem>
                    <MenuItem value="0">0</MenuItem>
                    <MenuItem value="1">1</MenuItem>
                </TextField>
                <TextField
                    label={t("labels.hiddenPower")}
                    value={hiddenPower}
                    onChange={(event) => setHiddenPower(event.target.value)}
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
            <TextField
                label={t("labels.ivPreset")}
                value={ivPreset}
                onChange={(event) => {
                    const nextPreset = event.target.value;
                    setIvPreset(nextPreset);
                    const presetOption = FRLG_EGG_IV_PRESETS.find(
                        (option) => option.value === nextPreset
                    );
                    if (presetOption) {
                        setIvRanges(applyEggIvPreset(presetOption.value));
                        setIvRangesValid(true);
                    }
                }}
                select
                fullWidth
                margin="normal"
            >
                <MenuItem value="">{t("common.none")}</MenuItem>
                {FRLG_EGG_IV_PRESETS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                    </MenuItem>
                ))}
            </TextField>
            <IvEntry
                value={ivRanges}
                onChange={(_, next) => {
                    setIvPreset("");
                    setIvRanges(next.value);
                    setIvRangesValid(next.isValid);
                }}
            />
            <FormControlLabel
                control={
                    <Checkbox
                        checked={showInheritance}
                        onChange={(event) =>
                            setShowInheritance(event.target.checked)
                        }
                    />
                }
                label={t("labels.showInheritance")}
            />

            {message !== "" && (
                <Typography color="error" sx={{ my: 1 }}>
                    {message}
                </Typography>
            )}
            {searching && searchProgress !== null && (
                <Box sx={{ my: 1 }}>
                    <LinearProgress
                        variant="determinate"
                        value={progressPercent}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {progressText}
                    </Typography>
                </Box>
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
                    showInheritance={showInheritance}
                    calibrationContext={calibrationContext}
                    gameConsole={fixedGameConsole}
                />
            )}
        </Box>
    );
}
