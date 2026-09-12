import { useEffect, useMemo, useState } from "react";

import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    MenuItem,
    Switch,
    type SxProps,
    TextField,
    type Theme,
} from "@mui/material";

import fetchTenLines, {
    COMBINED_WILD_METHOD,
    fetchSeedData,
    fixGameConsole,
    SEED_IDENTIFIER_TO_GAME,
    STATIC_2,
    STATIC_4,
} from "../tenLines";
import NumericalInput from "./NumericalInput";
import RangeInput from "./RangeInput";
import { proxy } from "comlink";
import {
    type EnumeratedStaticTemplate3,
    type ExtendedSearcherState,
    type ExtendedWildSearcherState,
} from "../tenLines/generated.d";
import React from "react";
import { getAllGameOptions, getName, useI18n } from "../i18n";
import IvEntry from "./IvEntry";
import StaticEncounterSelector from "./StaticEncounterSelector";
import { useSearchParams } from "react-router-dom";
import WildEncounterSelector from "./WildEncounterSelector";
import SearcherTable, {
    type SearcherCalibrationContext,
} from "./SearcherTable";
import { filterNatureOptions } from "../utils/natureSearch";
import {
    applyEggIvPreset,
    type EggIvPresetValue,
    FRLG_EGG_IV_PRESETS,
} from "./frlgEggHelpers";

type PerfectIvPreset = number | Exclude<EggIvPresetValue, "6v">;

export interface SearcherFormState {
    shininess: number;
    natures: number[];
    gender: number;
    hiddenPower: number;
    ivRangeStrings: [string, string][];
    usePerfectIvFilter: boolean;
    perfectIvPreset: PerfectIvPreset;
    staticCategory: number;
    staticPokemon: number;
    wildCategory: number;
    wildLocation: number;
    wildPokemon: number;
    wildLead: number;
    method: number;
}

export interface SearcherURLState {
    game: string;
    gameConsole: string;
    trainerID: string;
    secretID: string;
    reachableAdvancesFilter: string;
    sound: string;
    advancesMin: string;
    advancesMax: string;
}

function useSearcherURLState() {
    const [searchParams, setSearchParams] = useSearchParams();
    const game = searchParams.get("game") || "r_painting";
    const gameConsole = fixGameConsole(
        game,
        searchParams.get("gameConsole") || "GBA"
    );
    const trainerID = searchParams.get("trainerID") || "0";
    const secretID = searchParams.get("secretID") || "0";
    const sound = searchParams.get("sound") || "any";
    const reachableAdvancesFilter =
        searchParams.get("reachableAdvancesFilter") ||
        (searchParams.has("advancesMin") || searchParams.has("advancesMax")
            ? "true"
            : "false");
    const advancesMin = searchParams.get("advancesMin") || "0";
    const advancesMax = searchParams.get("advancesMax") || "4294967295";
    const setSearcherURLState = (state: Partial<SearcherURLState>) => {
        setSearchParams((prev) => {
            for (const [key, value] of Object.entries(state)) {
                prev.set(key, value);
            }
            return prev;
        });
    };
    return {
        game,
        gameConsole,
        trainerID,
        secretID,
        sound,
        reachableAdvancesFilter,
        advancesMin,
        advancesMax,
        setSearcherURLState,
    };
}

type SearcherRowWithAdvances =
    | (ExtendedSearcherState & { reachableAdvances?: number })
    | (ExtendedWildSearcherState & { reachableAdvances?: number });

type ReachabilityResult = {
    reachable: boolean;
    advances: number;
};

const DEFAULT_IV_RANGE_STRINGS: [string, string][] = [
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
];

function getPerfectIvRangeSets(
    perfectIvPreset: PerfectIvPreset
): [number, number][][] {
    if (typeof perfectIvPreset !== "number") {
        return [
            applyEggIvPreset(perfectIvPreset).map(([minimum, maximum]) => [
                parseInt(minimum, 10),
                parseInt(maximum, 10),
            ]),
        ];
    }

    const rangeSets: [number, number][][] = [];
    const currentSelection: number[] = [];

    const buildCombinations = (start: number) => {
        if (currentSelection.length === perfectIvPreset) {
            rangeSets.push(
                Array.from({ length: 6 }, (_, statIndex) =>
                    currentSelection.includes(statIndex) ? [31, 31] : [0, 30]
                )
            );
            return;
        }

        for (let statIndex = start; statIndex < 6; statIndex += 1) {
            currentSelection.push(statIndex);
            buildCombinations(statIndex + 1);
            currentSelection.pop();
        }
    };

    buildCombinations(0);
    return rangeSets;
}

function mergeRowsBySeed(
    rows: SearcherRowWithAdvances[]
): SearcherRowWithAdvances[] {
    const rowsBySeed = new Map<number, SearcherRowWithAdvances>();

    for (const row of rows) {
        const existingRow = rowsBySeed.get(row.seed);
        if (!existingRow) {
            rowsBySeed.set(row.seed, row);
            continue;
        }

        const existingAdvances = existingRow.reachableAdvances;
        const nextAdvances = row.reachableAdvances;
        if (
            existingAdvances === undefined ||
            (nextAdvances !== undefined && nextAdvances < existingAdvances)
        ) {
            rowsBySeed.set(row.seed, row);
        }
    }

    return Array.from(rowsBySeed.values());
}

export default function CalibrationForm({
    sx,
    hidden,
}: {
    sx?: SxProps<Theme>;
    hidden?: boolean;
}) {
    const { t, resources } = useI18n();
    const [searcherFormState, setSearcherFormState] =
        useState<SearcherFormState>({
            shininess: 255,
            natures: [],
            gender: 255,
            hiddenPower: -1,
            ivRangeStrings: DEFAULT_IV_RANGE_STRINGS,
            usePerfectIvFilter: false,
            perfectIvPreset: 1,
            staticCategory: 0,
            staticPokemon: 0,
            wildCategory: 0,
            wildLocation: 0,
            wildPokemon: 0,
            wildLead: 255,
            method: 1,
        });
    const {
        game,
        gameConsole,
        trainerID,
        secretID,
        sound,
        reachableAdvancesFilter,
        advancesMin,
        advancesMax,
        setSearcherURLState,
    } =
        useSearcherURLState();

    const [rows, setRows] = useState<SearcherRowWithAdvances[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedStaticTargetName, setSelectedStaticTargetName] =
        useState<string>();

    const [ivRangesAreValid, setIvRangesAreValid] = useState(true);
    const ivRanges = ivRangesAreValid
        ? searcherFormState.ivRangeStrings.map((range) => [
            parseInt(range[0], 10),
            parseInt(range[1], 10),
        ])
        : [];
    const submittedIvRanges = searcherFormState.usePerfectIvFilter
        ? getPerfectIvRangeSets(searcherFormState.perfectIvPreset)
        : [ivRanges];

    const [trainerIDIsValid, setTrainerIDIsValid] = useState(true);
    const [secretIDIsValid, setSecretIDIsValid] = useState(true);
    const [requiredAdvancesRangeIsValid, setRequiredAdvancesRangeIsValid] =
        useState(true);

    const isReachableAdvancesFilterEnabled =
        reachableAdvancesFilter === "true";
    const requiredAdvancesRange = useMemo(
        () =>
            requiredAdvancesRangeIsValid
                ? [parseInt(advancesMin, 10), parseInt(advancesMax, 10)]
                : [0, 0],
        [advancesMin, advancesMax, requiredAdvancesRangeIsValid]
    );

    const isNotSubmittable =
        searching ||
        !trainerIDIsValid ||
        !secretIDIsValid ||
        !ivRangesAreValid ||
        (isReachableAdvancesFilterEnabled && !requiredAdvancesRangeIsValid);
    const isStatic = searcherFormState.method <= STATIC_4;
    const isFRLG = game.startsWith("fr") || game.startsWith("lg");
    const isFRLGE = isFRLG || game.startsWith("e_");

    const selectedNatureSet = useMemo(
        () => new Set(searcherFormState.natures),
        [searcherFormState.natures]
    );
    const compareTargetName = useMemo(() => {
        if (!isStatic && searcherFormState.wildPokemon >= 0) {
            return getName(
                resources,
                searcherFormState.wildPokemon & 0x7ff,
                searcherFormState.wildPokemon >> 11
            );
        }
        return selectedStaticTargetName;
    }, [
        isStatic,
        resources,
        searcherFormState.wildPokemon,
        selectedStaticTargetName,
    ]);
    const visibleRows = useMemo(
        () =>
            searcherFormState.natures.length === 0
                ? rows
                : rows.filter((row) => selectedNatureSet.has(row.nature)),
        [rows, searcherFormState.natures, selectedNatureSet]
    );
    const submittedNatureFilters =
        searcherFormState.natures.length === 0
            ? [-1]
            : searcherFormState.natures;
    const calibrationContext: SearcherCalibrationContext = isStatic
        ? {
              method: searcherFormState.method,
              isStatic: true,
              staticCategory: searcherFormState.staticCategory,
              staticPokemon: searcherFormState.staticPokemon,
          }
        : {
              method: searcherFormState.method,
              isStatic: false,
              wildCategory: searcherFormState.wildCategory,
              wildLocation: searcherFormState.wildLocation,
              wildPokemon: searcherFormState.wildPokemon,
              wildLead: searcherFormState.wildLead,
          };

    useEffect(() => {
        if (!isStatic) {
            setSelectedStaticTargetName(undefined);
            return;
        }

        let cancelled = false;
        const loadStaticTargetName = async () => {
            const tenLines = await fetchTenLines();
            const templates = await tenLines.get_static_template_info(
                searcherFormState.staticCategory
            );
            const matchingTemplate = templates.find(
                (template: EnumeratedStaticTemplate3) =>
                    template.index === searcherFormState.staticPokemon
            );
            if (!cancelled) {
                setSelectedStaticTargetName(
                    matchingTemplate
                        ? getName(
                            resources,
                            matchingTemplate.species,
                            matchingTemplate.form
                        )
                        : undefined
                );
            }
        };

        void loadStaticTargetName();
        return () => {
            cancelled = true;
        };
    }, [
        isStatic,
        resources,
        searcherFormState.staticCategory,
        searcherFormState.staticPokemon,
    ]);

    useEffect(() => {
        let nextStaticCategory = searcherFormState.staticCategory;

        if (nextStaticCategory === 3 && !isFRLG) {
            nextStaticCategory = 0;
        }
        if (nextStaticCategory === 6 && !isFRLGE) {
            nextStaticCategory = 0;
        }
        if (nextStaticCategory === 8 && isFRLG) {
            nextStaticCategory = 0;
        }

        if (nextStaticCategory !== searcherFormState.staticCategory) {
            setSearcherFormState((current) => ({
                ...current,
                staticCategory: nextStaticCategory,
            }));
        }
    }, [isFRLG, isFRLGE, searcherFormState.staticCategory]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isNotSubmittable) return;
        const submit = async () => {
            const tenLines = await fetchTenLines();
            setRows([]);
            setSearching(true);
            try {
                const seedData = game.endsWith("painting")
                    ? new Uint8Array()
                    : await fetchSeedData(game);
                const filterResultsByRequiredAdvances = async <
                    T extends ExtendedSearcherState | ExtendedWildSearcherState,
                >(
                    results: T[]
                ) => {
                    if (!isReachableAdvancesFilterEnabled) {
                        return results as SearcherRowWithAdvances[];
                    }
                    const targetSeeds = results.map((result) => result.seed);
                    const soundFilters =
                        isFRLG && sound === "any"
                            ? ["mono", "stereo"]
                            : [isFRLG ? sound : ""];
                    const reachabilityResultsPerSound = await Promise.all(
                        soundFilters.map((soundFilter) =>
                            tenLines.filter_reachable_target_seeds_with_sound(
                                targetSeeds,
                                requiredAdvancesRange,
                                game,
                                0,
                                soundFilter,
                                seedData
                            )
                        )
                    );

                    return mergeRowsBySeed(
                        results
                            .map((result, index) => {
                                const reachableResults =
                                    reachabilityResultsPerSound
                                        .map(
                                            (
                                                reachabilityResults: ReachabilityResult[]
                                            ) =>
                                                reachabilityResults[index]
                                        )
                                        .filter(
                                            (
                                                reachabilityResult: ReachabilityResult
                                            ) =>
                                                reachabilityResult.reachable
                                        );
                                const minimumReachableAdvances =
                                    reachableResults.length === 0
                                        ? undefined
                                        : Math.min(
                                            ...reachableResults.map(
                                                (
                                                    reachabilityResult: ReachabilityResult
                                                ) =>
                                                    reachabilityResult.advances
                                            )
                                        );

                                return {
                                    ...result,
                                    reachableAdvances:
                                        minimumReachableAdvances,
                                };
                            })
                            .filter(
                                (result) =>
                                    result.reachableAdvances !== undefined
                            ) as SearcherRowWithAdvances[]
                    );
                };
                const appendResults = (results: SearcherRowWithAdvances[]) => {
                    setRows((rows) => {
                        if (rows.length > 1000 || results.length === 0) {
                            return rows;
                        }
                        return mergeRowsBySeed([...rows, ...results]);
                    });
                };
                const searchingCallback = proxy(() => {});

                for (const natureFilter of submittedNatureFilters) {
                    for (const currentIvRanges of submittedIvRanges) {
                        if (isStatic) {
                            await tenLines.search_seeds_static(
                                SEED_IDENTIFIER_TO_GAME[game],
                                parseInt(trainerID),
                                parseInt(secretID),
                                searcherFormState.staticCategory,
                                searcherFormState.staticPokemon,
                                searcherFormState.method,
                                searcherFormState.shininess,
                                natureFilter,
                                searcherFormState.gender,
                                searcherFormState.hiddenPower,
                                currentIvRanges,
                                proxy(async (results: ExtendedSearcherState[]) => {
                                    appendResults(
                                        await filterResultsByRequiredAdvances(results)
                                    );
                                }),
                                searchingCallback
                            );
                        } else {
                            await tenLines.search_seeds_wild(
                                SEED_IDENTIFIER_TO_GAME[game],
                                parseInt(trainerID),
                                parseInt(secretID),
                                searcherFormState.wildCategory,
                                searcherFormState.wildLocation,
                                searcherFormState.wildPokemon,
                                searcherFormState.method,
                                searcherFormState.wildLead,
                                searcherFormState.shininess,
                                natureFilter,
                                searcherFormState.gender,
                                searcherFormState.hiddenPower,
                                currentIvRanges,
                                proxy(async (results: ExtendedWildSearcherState[]) => {
                                    appendResults(
                                        await filterResultsByRequiredAdvances(results)
                                    );
                                }),
                                searchingCallback
                            );
                        }
                    }
                }
            } finally {
                setSearching(false);
            }
        };
        submit();
    };

    if (hidden) {
        return null;
    }

    return (
        <Box component="form" onSubmit={handleSubmit} sx={sx}>
            <TextField
                label={t("labels.game")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    const nextGame = event.target.value;
                    setSearcherURLState({
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
            <Box sx={{ flexDirection: "row", display: "flex" }}>
                <NumericalInput
                    label={t("labels.trainerId")}
                    margin="normal"
                    onChange={(_event, value) => {
                        setSearcherURLState({ trainerID: value.value });
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
                        setSearcherURLState({ secretID: value.value });
                        setSecretIDIsValid(value.isValid);
                    }}
                    value={secretID}
                    minimumValue={0}
                    maximumValue={65535}
                    isHex={false}
                    name="secretID"
                />
            </Box>
            <FormControlLabel
                control={
                    <Checkbox
                        checked={isReachableAdvancesFilterEnabled}
                        onChange={(event) =>
                            setSearcherURLState({
                                reachableAdvancesFilter:
                                    event.target.checked.toString(),
                            })
                        }
                    />
                }
                label={t("messages.filterByReachableAdvances")}
            />
            {isReachableAdvancesFilterEnabled && isFRLG && (
                <TextField
                    label={t("labels.sound")}
                    margin="normal"
                    style={{ textAlign: "left" }}
                    onChange={(event) =>
                        setSearcherURLState({
                            sound: event.target.value,
                        })
                    }
                    value={sound}
                    select
                    fullWidth
                >
                    <MenuItem value="any">{t("common.any")}</MenuItem>
                    <MenuItem value="mono">{t("common.mono")}</MenuItem>
                    <MenuItem value="stereo">{t("common.stereo")}</MenuItem>
                </TextField>
            )}
            {isReachableAdvancesFilterEnabled && (
                <RangeInput
                    label={t("labels.allowedAdvances")}
                    name="requiredAdvances"
                    minimumValue={0}
                    maximumValue={4294967295}
                    value={[advancesMin, advancesMax]}
                    onChange={(_, value) => {
                        setSearcherURLState({
                            advancesMin: value.value[0],
                            advancesMax: value.value[1],
                        });
                        setRequiredAdvancesRangeIsValid(value.isValid);
                    }}
                />
            )}
            <TextField
                label={t("labels.method")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    setSearcherFormState((data) => ({
                        ...data,
                        method: parseInt(event.target.value),
                    }));
                }}
                value={searcherFormState.method}
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
            {isStatic && (
                <StaticEncounterSelector
                    staticCategory={searcherFormState.staticCategory}
                    staticPokemon={searcherFormState.staticPokemon}
                    game={SEED_IDENTIFIER_TO_GAME[game]}
                    onChange={(staticCategory, staticPokemon) => {
                        setSearcherFormState((data) => ({
                            ...data,
                            staticCategory,
                            staticPokemon,
                        }));
                    }}
                />
            )}
            {!isStatic && (
                <WildEncounterSelector
                    wildCategory={searcherFormState.wildCategory}
                    wildLocation={searcherFormState.wildLocation}
                    wildPokemon={searcherFormState.wildPokemon}
                    wildLead={searcherFormState.wildLead}
                    game={SEED_IDENTIFIER_TO_GAME[game]}
                    onChange={(
                        wildCategory,
                        wildLocation,
                        wildPokemon,
                        wildLead
                    ) => {
                        setSearcherFormState((data) => ({
                            ...data,
                            wildCategory,
                            wildLocation,
                            wildPokemon,
                            wildLead,
                        }));
                    }}
                    shouldFilterPokemon={true}
                    allowAnyPokemon
                    isSearcher
                />
            )}
            <TextField
                label={t("labels.shininess")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    setSearcherFormState((data) => ({
                        ...data,
                        shininess: parseInt(event.target.value),
                    }));
                }}
                value={searcherFormState.shininess}
                select
                fullWidth
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
                value={searcherFormState.natures}
                filterOptions={filterNatureOptions}
                onChange={(_event, value) => {
                    setSearcherFormState((data) => ({
                        ...data,
                        natures: value,
                    }));
                }}
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
                                    visibility: isSelected ? "visible" : "hidden",
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
                            searcherFormState.natures.length === 0
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
                    setSearcherFormState((data) => ({
                        ...data,
                        gender: parseInt(event.target.value),
                    }));
                }}
                value={searcherFormState.gender}
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
            <TextField
                label={t("labels.hiddenPower")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    setSearcherFormState((data) => ({
                        ...data,
                        hiddenPower: parseInt(event.target.value),
                    }));
                }}
                value={searcherFormState.hiddenPower}
                select
                fullWidth
            >
                <MenuItem value="-1">{t("common.any")}</MenuItem>
                {resources.types.map((type, index) => (
                    <MenuItem key={index} value={index}>
                        {type}
                    </MenuItem>
                ))}
            </TextField>
            <FormControlLabel
                control={
                    <Switch
                        checked={searcherFormState.usePerfectIvFilter}
                        onChange={(event) => {
                            setSearcherFormState((data) => ({
                                ...data,
                                usePerfectIvFilter: event.target.checked,
                            }));
                        }}
                    />
                }
                label={t("messages.usePerfectIvFilter")}
            />
            {searcherFormState.usePerfectIvFilter ? (
                <TextField
                    label={t("labels.perfectIvPreset")}
                    margin="normal"
                    style={{ textAlign: "left" }}
                    onChange={(event) => {
                        const value = event.target.value;
                        setSearcherFormState((data) => ({
                            ...data,
                            perfectIvPreset:
                                typeof value === "number"
                                    ? value
                                    : (/^\d+$/.test(value)
                                          ? parseInt(value, 10)
                                          : value) as PerfectIvPreset,
                        }));
                    }}
                    value={searcherFormState.perfectIvPreset}
                    select
                    fullWidth
                >
                    {Array.from({ length: 6 }, (_, index) => index + 1).map(
                        (count) => (
                            <MenuItem key={count} value={count}>
                                {t(`options.perfect${count}v`)}
                            </MenuItem>
                        )
                    )}
                    {FRLG_EGG_IV_PRESETS.filter(
                        (option) => option.value !== "6v"
                    ).map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                            {t(option.labelKey)}
                        </MenuItem>
                    ))}
                </TextField>
            ) : (
                <IvEntry
                    onChange={(_event, value) => {
                        setIvRangesAreValid(value.isValid);
                        setSearcherFormState((data) => ({
                            ...data,
                            ivRangeStrings: value.value,
                        }));
                    }}
                    value={searcherFormState.ivRangeStrings}
                />
            )}
            <Button
                variant="contained"
                color="primary"
                type="submit"
                disabled={isNotSubmittable}
                fullWidth
            >
                {searching ? t("common.searching") : t("common.submit")}
            </Button>
            <SearcherTable
                rows={visibleRows}
                isStatic={isStatic}
                isMultiMethod={
                    searcherFormState.method === COMBINED_WILD_METHOD
                }
                showRequiredAdvances={isReachableAdvancesFilterEnabled}
                compareTargetName={compareTargetName}
                calibrationContext={calibrationContext}
            />
        </Box>
    );
}
