import { useEffect, useMemo, useState } from "react";
import React from "react";
import {
    Autocomplete,
    Box,
    Button,
    MenuItem,
    TextField,
    type SxProps,
    type Theme,
} from "@mui/material";
import { proxy } from "comlink";
import { useSearchParams } from "react-router-dom";

import fetchTenLines, {
    fetchSeedData,
    fixGameConsole,
    SEED_IDENTIFIER_TO_GAME,
    STATIC_2,
    STATIC_4,
} from "../tenLines";
import type { ExtendedIDState, ExtendedSearcherState } from "../tenLines/generated.d";
import { getIdComboGameOptions, useI18n } from "../i18n";
import IvEntry from "./IvEntry";
import NumericalInput from "./NumericalInput";
import RangeInput from "./RangeInput";
import StaticEncounterSelector from "./StaticEncounterSelector";
import IdComboTable, { type IDComboRow } from "./IdComboTable";
import { filterNatureOptions } from "../utils/natureSearch";
import {
    applyEggIvPreset,
    FRLG_EGG_IV_PRESETS,
} from "./frlgEggHelpers";

const MAX_ID_ADVANCES_SEARCH = 65535;

interface IdComboFormState {
    shininess: number;
    natures: number[];
    gender: number;
    hiddenPower: number;
    ivRangeStrings: [string, string][];
    staticCategory: number;
    staticPokemon: number;
    method: number;
}

interface IdComboURLState {
    game: string;
    gameConsole: string;
    idAdvancesMin: string;
    idAdvancesMax: string;
    idMaxResults: string;
    trainerID: string;
    secretID: string;
}

function useIdComboURLState() {
    const [searchParams, setSearchParams] = useSearchParams();
    const requestedGame = searchParams.get("game");
    const legacyGame = searchParams.get("idGame");
    const requestedGameConsole = searchParams.get("gameConsole");
    const requestedGameValue = requestedGame || legacyGame;
    const fallbackGame = requestedGameConsole?.startsWith("NX")
        ? "fr_nx"
        : "e_painting";
    const game =
        requestedGameValue === "e_painting" ||
        requestedGameValue?.startsWith("fr") ||
        requestedGameValue?.startsWith("lg")
            ? requestedGameValue
            : fallbackGame;
    const gameConsole = fixGameConsole(
        game,
        requestedGameConsole || (game.endsWith("nx") ? "NX" : "GBA")
    );
    const sharedGameNeedsNormalization =
        requestedGame !== game ||
        requestedGameConsole !== gameConsole ||
        legacyGame !== null;
    const idAdvancesMin = searchParams.get("idAdvancesMin") || "1000";
    const idAdvancesMax = searchParams.get("idAdvancesMax") || "10000";
    const maxResults = searchParams.get("idMaxResults") || "2000";
    const tid =
        searchParams.get("trainerID") ??
        searchParams.get("idTid") ??
        "";
    const sid =
        searchParams.get("secretID") ??
        searchParams.get("idSid") ??
        "";

    const setIdComboURLState = (state: Partial<IdComboURLState>) => {
        setSearchParams((prev) => {
            for (const [key, value] of Object.entries(state)) {
                prev.set(key, value);
            }
            if (state.game !== undefined) {
                prev.delete("idGame");
            }
            if (state.trainerID !== undefined) {
                prev.delete("idTid");
            }
            if (state.secretID !== undefined) {
                prev.delete("idSid");
            }
            return prev;
        });
    };

    return {
        game,
        gameConsole,
        sharedGameNeedsNormalization,
        idAdvancesMin,
        idAdvancesMax,
        maxResults,
        tid,
        sid,
        setIdComboURLState,
    };
}

function pidToTSV(pid: number) {
    const high = (pid >>> 16) & 0xffff;
    const low = pid & 0xffff;
    return ((high ^ low) >>> 3) & 0x1fff;
}

function getShinyType(pid: number, tid: number, sid: number) {
    const high = (pid >>> 16) & 0xffff;
    const low = pid & 0xffff;
    const psv = high ^ low;
    const tsv = tid ^ sid;

    if (tsv === psv) {
        return 2;
    }
    if ((tsv ^ psv) < 8) {
        return 1;
    }
    return 0;
}

export default function IdComboForm({
    sx,
    hidden,
}: {
    sx?: SxProps<Theme>;
    hidden?: boolean;
}) {
    const { t, resources } = useI18n();
    const [formState, setFormState] = useState<IdComboFormState>({
        shininess: 3,
        natures: [],
        gender: 255,
        hiddenPower: -1,
        ivRangeStrings: [
            ["0", "31"],
            ["0", "31"],
            ["0", "31"],
            ["0", "31"],
            ["0", "31"],
            ["0", "31"],
        ],
        staticCategory: 0,
        staticPokemon: 0,
        method: 1,
    });

    const {
        game,
        gameConsole,
        sharedGameNeedsNormalization,
        idAdvancesMin,
        idAdvancesMax,
        maxResults,
        tid,
        sid,
        setIdComboURLState,
    } = useIdComboURLState();
    useEffect(() => {
        if (hidden || !sharedGameNeedsNormalization) {
            return;
        }
        setIdComboURLState({ game, gameConsole });
    }, [
        game,
        gameConsole,
        hidden,
        setIdComboURLState,
        sharedGameNeedsNormalization,
    ]);

    const [rows, setRows] = useState<IDComboRow[]>([]);
    const [searching, setSearching] = useState(false);
    const [summary, setSummary] = useState("");
    const [ivPreset, setIvPreset] = useState("");

    const [ivRangesAreValid, setIvRangesAreValid] = useState(true);
    const [idRangeIsValid, setIdRangeIsValid] = useState(true);
    const [maxResultsIsValid, setMaxResultsIsValid] = useState(true);
    const [tidIsValid, setTidIsValid] = useState(true);
    const [sidIsValid, setSidIsValid] = useState(true);

    const ivRanges = ivRangesAreValid
        ? formState.ivRangeStrings.map((range) => [
              parseInt(range[0], 10),
              parseInt(range[1], 10),
          ])
        : [];

    const idRange = useMemo(
        () =>
            idRangeIsValid
                ? [parseInt(idAdvancesMin, 10), parseInt(idAdvancesMax, 10)]
                : [0, 0],
        [idAdvancesMin, idAdvancesMax, idRangeIsValid]
    );

    const isNotSubmittable =
        searching ||
        !ivRangesAreValid ||
        !idRangeIsValid ||
        !maxResultsIsValid ||
        !tidIsValid ||
        !sidIsValid;
    const selectedNatureSet = useMemo(
        () => new Set(formState.natures),
        [formState.natures]
    );
    const submittedNatureFilters =
        formState.natures.length === 0 ? [-1] : formState.natures;

    const parseOptionalId = (value: string) => {
        if (value === "") {
            return -1;
        }
        return parseInt(value, 10);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isNotSubmittable) {
            return;
        }

        const submit = async () => {
            const tenLines = await fetchTenLines();
            setSearching(true);
            setRows([]);
            setSummary("");
            const seedData = game.endsWith("painting")
                ? new Uint8Array()
                : await fetchSeedData(game);
            const hasExactIdPair = tid !== "" && sid !== "";
            const candidateTid = hasExactIdPair ? parseInt(tid, 10) : 0;
            const candidateSid = hasExactIdPair ? parseInt(sid, 10) : 0;
            const candidateShininess = hasExactIdPair ? formState.shininess : 255;

            const candidateResults: ExtendedSearcherState[] = [];

            for (const natureFilter of submittedNatureFilters) {
                await tenLines.search_seeds_static(
                    SEED_IDENTIFIER_TO_GAME[game],
                    candidateTid,
                    candidateSid,
                    formState.staticCategory,
                    formState.staticPokemon,
                    formState.method,
                    candidateShininess,
                    natureFilter,
                    formState.gender,
                    formState.hiddenPower,
                    ivRanges,
                    proxy((results: ExtendedSearcherState[]) => {
                        candidateResults.push(...results);
                    }),
                    proxy(() => {})
                );
            }

            if (candidateResults.length === 0) {
                setSummary(t("messages.noMatchingStaticTargets"));
                setSearching(false);
                return;
            }

            const reachabilityResults =
                await tenLines.filter_reachable_target_seeds(
                    candidateResults.map((result) => result.seed),
                    idRange,
                    game,
                    0,
                    seedData
                );
            const eligibleCandidateResults = candidateResults
                .map((result, index) => ({
                    result,
                    reachability: reachabilityResults[index],
                }))
                .filter(({ reachability }) => reachability.reachable);

            if (eligibleCandidateResults.length === 0) {
                setSummary(t("messages.noMatchingAdvances"));
                setSearching(false);
                return;
            }

            const tsvAdvances = new Map<number, number>();
            const tsvCounts = new Map<number, number>();
            const tsvExamples = new Map<number, ExtendedSearcherState>();
            for (const { result, reachability } of eligibleCandidateResults) {
                const tsv = pidToTSV(result.pid);
                tsvCounts.set(tsv, (tsvCounts.get(tsv) ?? 0) + 1);
                if (!tsvExamples.has(tsv)) {
                    tsvExamples.set(tsv, result);
                    tsvAdvances.set(tsv, reachability.advances);
                }
            }

            if (hasExactIdPair) {
                const exactRows = eligibleCandidateResults.map(({ result, reachability }) => ({
                    advances: reachability.advances,
                    tid: candidateTid,
                    sid: candidateSid,
                    tsv: pidToTSV(result.pid),
                    shiny: getShinyType(result.pid, candidateTid, candidateSid),
                    matchCount: 1,
                    exampleIvs: result.ivs,
                    examplePid: result.pid,
                    exampleSeed: result.seed,
                    game,
                }));

                setRows(exactRows);
                setSummary(
                    t("messages.exactIdSummary", {
                        candidateCount: `${candidateResults.length}`,
                        tsvCount: `${tsvCounts.size}`,
                        resultCount: `${exactRows.length}`,
                    })
                );
                setSearching(false);
                return;
            }

            const eligibleTSVs = [...tsvCounts.keys()];

            const idResults: ExtendedIDState[] =
                await tenLines.search_frlge_id_combos(
                    eligibleTSVs,
                    0,
                    MAX_ID_ADVANCES_SEARCH,
                    parseOptionalId(tid),
                    parseOptionalId(sid),
                    parseInt(maxResults, 10)
                );

            const mappedRows = idResults.map((idState) => {
                const example = tsvExamples.get(idState.tsv)!;
                const shiny = getShinyType(
                    example.pid,
                    idState.tid,
                    idState.sid
                );
                return {
                    advances: tsvAdvances.get(idState.tsv) ?? 0,
                    tid: idState.tid,
                    sid: idState.sid,
                    tsv: idState.tsv,
                    shiny,
                    matchCount: tsvCounts.get(idState.tsv) ?? 0,
                    exampleIvs: example.ivs,
                    examplePid: example.pid,
                    exampleSeed: example.seed,
                    game,
                };
            }).filter((row) => {
                if (row.advances < idRange[0] || row.advances > idRange[1]) {
                    return false;
                }
                if (formState.shininess === 3) {
                    return row.shiny === 1 || row.shiny === 2;
                }
                return row.shiny === formState.shininess;
            });

            const dedupedRows = [
                ...new Map(
                    mappedRows.map((row) => [
                        [
                            row.advances,
                            row.tid,
                            row.sid,
                            row.tsv,
                            row.shiny,
                            row.matchCount,
                            row.exampleIvs.join("/"),
                            row.exampleSeed,
                            row.examplePid,
                            row.game,
                        ].join(":"),
                        row,
                    ])
                ).values(),
            ];

            setRows(dedupedRows);
            setSummary(
                `${t("messages.comboSummary", {
                    candidateCount: `${candidateResults.length}`,
                    tsvCount: `${tsvCounts.size}`,
                    resultCount: `${dedupedRows.length}`,
                })}${
                    dedupedRows.length === parseInt(maxResults, 10)
                        ? ` ${t("messages.resultsCapHit")}`
                        : ""
                }`
            );
            setSearching(false);
        };

        submit();
    };

    const isFRLGE = game.startsWith("fr") || game.startsWith("lg") || game.startsWith("e_");
    if (formState.staticCategory == 3 && !(game.startsWith("fr") || game.startsWith("lg"))) {
        formState.staticCategory = 0;
        setFormState(formState);
    }
    if (formState.staticCategory == 6 && !isFRLGE) {
        formState.staticCategory = 0;
        setFormState(formState);
    }
    if (formState.staticCategory == 8 && (game.startsWith("fr") || game.startsWith("lg"))) {
        formState.staticCategory = 0;
        setFormState(formState);
    }

    if (hidden) {
        return null;
    }

    return (
        <Box component="form" onSubmit={handleSubmit} sx={sx}>
            <Box sx={{ mt: 2, textAlign: "left" }}>
                {t("messages.idComboIntro")}
            </Box>
            <TextField
                label={t("labels.game")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    const nextGame = event.target.value;
                    setIdComboURLState({
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
                {getIdComboGameOptions(t).map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {option.label}
                    </MenuItem>
                ))}
            </TextField>
            <RangeInput
                label={t("labels.advances")}
                name="idAdvances"
                minimumValue={0}
                maximumValue={4294967295}
                value={[idAdvancesMin, idAdvancesMax]}
                onChange={(_, value) => {
                    setIdComboURLState({
                        idAdvancesMin: value.value[0],
                        idAdvancesMax: value.value[1],
                    });
                    setIdRangeIsValid(value.isValid);
                }}
            />
            <Box sx={{ flexDirection: "row", display: "flex" }}>
                <TextField
                    label={t("labels.tidFilter")}
                    margin="normal"
                    value={tid}
                    onChange={(event) => {
                        const value = event.target.value;
                        const isValid =
                            value === "" ||
                            (/^\d+$/.test(value) &&
                                parseInt(value, 10) >= 0 &&
                                parseInt(value, 10) <= 65535);
                        setIdComboURLState({ trainerID: value });
                        setTidIsValid(isValid);
                    }}
                    error={!tidIsValid}
                    helperText={
                        !tidIsValid
                            ? t("messages.leaveBlankOrEnterId")
                            : t("messages.optionalExactTidFilter")
                    }
                    fullWidth
                    slotProps={{
                        htmlInput: {
                            inputMode: "numeric",
                        },
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
                <TextField
                    label={t("labels.sidFilter")}
                    margin="normal"
                    value={sid}
                    onChange={(event) => {
                        const value = event.target.value;
                        const isValid =
                            value === "" ||
                            (/^\d+$/.test(value) &&
                                parseInt(value, 10) >= 0 &&
                                parseInt(value, 10) <= 65535);
                        setIdComboURLState({ secretID: value });
                        setSidIsValid(isValid);
                    }}
                    error={!sidIsValid}
                    helperText={
                        !sidIsValid
                            ? t("messages.leaveBlankOrEnterId")
                            : t("messages.optionalExactSidFilter")
                    }
                    fullWidth
                    slotProps={{
                        htmlInput: {
                            inputMode: "numeric",
                        },
                    }}
                />
            </Box>
            <TextField
                label={t("labels.shininess")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    setFormState((data) => ({
                        ...data,
                        shininess: parseInt(event.target.value),
                    }));
                }}
                value={formState.shininess}
                select
                fullWidth
            >
                <MenuItem value="3">{t("options.starSquare")}</MenuItem>
                <MenuItem value="1">{t("options.star")}</MenuItem>
                <MenuItem value="2">{t("options.square")}</MenuItem>
            </TextField>
            <NumericalInput
                label={t("labels.maxResults")}
                margin="normal"
                onChange={(_event, value) => {
                    setIdComboURLState({ idMaxResults: value.value });
                    setMaxResultsIsValid(value.isValid);
                }}
                value={maxResults}
                minimumValue={1}
                maximumValue={20000}
                isHex={false}
                name="maxResults"
            />
            <TextField
                label={t("labels.method")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    setFormState((data) => ({
                        ...data,
                        method: parseInt(event.target.value),
                    }));
                }}
                value={formState.method}
                select
                fullWidth
            >
                {Object.entries(resources.methods)
                    .filter(([value]) => parseInt(value) <= STATIC_4 && parseInt(value) != STATIC_2)
                    .map(([value, name], index) => (
                        <MenuItem key={index} value={parseInt(value)}>
                            {name}
                        </MenuItem>
                    ))}
            </TextField>
            <StaticEncounterSelector
                staticCategory={formState.staticCategory}
                staticPokemon={formState.staticPokemon}
                game={SEED_IDENTIFIER_TO_GAME[game]}
                onChange={(staticCategory, staticPokemon) => {
                    setFormState((data) => ({
                        ...data,
                        staticCategory,
                        staticPokemon,
                    }));
                }}
            />
            <Autocomplete
                multiple
                disableCloseOnSelect
                options={resources.natures.map((_nature, index) => index)}
                value={formState.natures}
                filterOptions={filterNatureOptions}
                onChange={(_event, value) => {
                    setFormState((data) => ({
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
                            formState.natures.length === 0
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
                    setFormState((data) => ({
                        ...data,
                        gender: parseInt(event.target.value),
                    }));
                }}
                value={formState.gender}
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
                    setFormState((data) => ({
                        ...data,
                        hiddenPower: parseInt(event.target.value),
                    }));
                }}
                value={formState.hiddenPower}
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
            <TextField
                label={t("labels.ivPreset")}
                margin="normal"
                value={ivPreset}
                onChange={(event) => {
                    const nextPreset = event.target.value;
                    setIvPreset(nextPreset);
                    const presetOption = FRLG_EGG_IV_PRESETS.find(
                        (option) => option.value === nextPreset
                    );
                    if (presetOption) {
                        setIvRangesAreValid(true);
                        setFormState((data) => ({
                            ...data,
                            ivRangeStrings: applyEggIvPreset(
                                presetOption.value
                            ),
                        }));
                    }
                }}
                select
                fullWidth
            >
                <MenuItem value="">{t("common.any")}</MenuItem>
                {FRLG_EGG_IV_PRESETS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                    </MenuItem>
                ))}
            </TextField>
            <IvEntry
                onChange={(_event, value) => {
                    setIvPreset("");
                    setIvRangesAreValid(value.isValid);
                    setFormState((data) => ({
                        ...data,
                        ivRangeStrings: value.value,
                    }));
                }}
                value={formState.ivRangeStrings}
            />
            <Button
                variant="contained"
                color="primary"
                type="submit"
                disabled={isNotSubmittable}
                fullWidth
            >
                {searching ? t("common.searching") : t("messages.findTidSidCombos")}
            </Button>
            {summary && (
                <Box sx={{ mt: 2, mb: 2, textAlign: "left" }}>
                    {summary}
                </Box>
            )}
            <IdComboTable rows={rows} />
        </Box>
    );
}
