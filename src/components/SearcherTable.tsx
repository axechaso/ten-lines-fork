import { Button } from "@mui/material";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { memo } from "react";
import { useSearchParams } from "react-router-dom";
import { getName, useI18n } from "../i18n";
import { hexSeed } from "../tenLines";
import type {
    ExtendedSearcherState,
    ExtendedWildSearcherState,
} from "../tenLines/generated.d";
import { SEARCHER_COMPARE_TARGET_KEY } from "./CalibrationForm";
import { setLocalStorageValue } from "../hooks/useLocalStorage";

type SearcherCompareTarget = {
    displayName?: string;
    pid: number;
    shiny: number;
    nature: number;
    ability: number;
    abilityIndex: number;
    ivs: number[];
    hiddenPower: number;
    hiddenPowerStrength: number;
    gender: number;
    species?: number;
    form?: number;
};

export type SearcherCalibrationContext =
    | {
          method: number;
          isStatic: true;
          staticCategory: number;
          staticPokemon: number;
      }
    | {
          method: number;
          isStatic: false;
          wildCategory: number;
          wildLocation: number;
          wildPokemon: number;
          wildLead: number;
      };

const SearcherTable = memo(function SearcherTable({
    rows,
    isStatic,
    isMultiMethod,
    showRequiredAdvances,
    compareTargetName,
    calibrationContext,
}: {
    rows:
        | (ExtendedSearcherState & { reachableAdvances?: number })[]
        | (ExtendedWildSearcherState & { reachableAdvances?: number })[];
    isStatic: boolean;
    isMultiMethod: boolean;
    showRequiredAdvances: boolean;
    compareTargetName?: string;
    calibrationContext: SearcherCalibrationContext;
}) {
    const { t, resources } = useI18n();
    const [, setSearchParams] = useSearchParams();

    function cacheCompareTarget(
        row: ExtendedSearcherState | ExtendedWildSearcherState
    ) {
        const cachedTarget: SearcherCompareTarget = {
            displayName:
                "species" in row
                    ? getName(resources, row.species, row.form)
                    : compareTargetName,
            pid: row.pid,
            shiny: row.shiny,
            nature: row.nature,
            ability: row.ability,
            abilityIndex: row.abilityIndex,
            ivs: [...row.ivs],
            hiddenPower: row.hiddenPower,
            hiddenPowerStrength: row.hiddenPowerStrength,
            gender: row.gender,
            ...("species" in row
                ? {
                    species: row.species,
                    form: row.form,
                }
                : {}),
        };
        setLocalStorageValue(SEARCHER_COMPARE_TARGET_KEY, cachedTarget);
    }

    function openInInitialSeed(
        row: ExtendedSearcherState | ExtendedWildSearcherState,
        isAuxClick: boolean
    ) {
        cacheCompareTarget(row);
        setSearchParams((previous) => {
            const params = new URLSearchParams(previous);
            params.set("targetSeed", hexSeed(row.seed, 32));
            const method =
                !calibrationContext.isStatic && "method" in row
                    ? row.method
                    : calibrationContext.method;
            params.set("calibrationMethod", method.toString());
            if (calibrationContext.isStatic) {
                params.set(
                    "calibrationStaticCategory",
                    calibrationContext.staticCategory.toString()
                );
                params.set(
                    "calibrationStaticPokemon",
                    calibrationContext.staticPokemon.toString()
                );
            } else {
                params.set(
                    "calibrationWildCategory",
                    calibrationContext.wildCategory.toString()
                );
                params.set(
                    "calibrationWildLocation",
                    calibrationContext.wildLocation.toString()
                );
                params.set(
                    "calibrationWildPokemon",
                    (
                        "species" in row
                            ? row.species | (row.form << 11)
                            : calibrationContext.wildPokemon
                    ).toString()
                );
                params.set(
                    "calibrationWildLead",
                    calibrationContext.wildLead.toString()
                );
                params.set("calibrationFilterPokemon", "true");
            }
            params.set("page", "0");
            if (isAuxClick) {
                window.open(`?${params.toString()}`);
                return previous;
            }
            return params;
        });
    }

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>{t("table.seed")}</TableCell>
                        {isMultiMethod && <TableCell>{t("table.method")}</TableCell>}
                        {!isStatic && <TableCell>{t("table.slot")}</TableCell>}
                        {!isStatic && <TableCell>{t("table.level")}</TableCell>}
                        <TableCell>{t("table.pid")}</TableCell>
                        <TableCell>{t("table.shiny")}</TableCell>
                        <TableCell>{t("table.nature")}</TableCell>
                        <TableCell>{t("table.ability")}</TableCell>
                        <TableCell>{t("table.ivs")}</TableCell>
                        <TableCell>{t("table.hidden")}</TableCell>
                        <TableCell>{t("table.power")}</TableCell>
                        <TableCell>{t("table.gender")}</TableCell>
                        {showRequiredAdvances && (
                            <TableCell>{t("table.minReachableAdvances")}</TableCell>
                        )}
                        <TableCell>{t("table.openInInitialSeed")}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row, index) => {
                        if (index === 1000) {
                            return <TableRow key={index}>...</TableRow>;
                        } else if (index > 1000) {
                            return null;
                        }
                        return (
                            <TableRow key={index}>
                                <TableCell>{hexSeed(row.seed, 32)}</TableCell>
                                {isMultiMethod && (
                                    <TableCell>
                                        {
                                            resources.methods[
                                                (row as ExtendedWildSearcherState).method
                                            ]
                                        }
                                    </TableCell>
                                )}
                                {!isStatic && (
                                    <TableCell>
                                        {(row as ExtendedWildSearcherState).encounterSlot}:{" "}
                                        {getName(
                                            resources,
                                            (row as ExtendedWildSearcherState).species,
                                            (row as ExtendedWildSearcherState).form
                                        )}
                                    </TableCell>
                                )}
                                {!isStatic && (
                                    <TableCell>
                                        {(row as ExtendedWildSearcherState).level}
                                    </TableCell>
                                )}
                                <TableCell>{hexSeed(row.pid, 32)}</TableCell>
                                <TableCell>{resources.shininess[row.shiny]}</TableCell>
                                <TableCell>{resources.natures[row.nature]}</TableCell>
                                <TableCell>
                                    {row.ability}: {resources.abilities[row.abilityIndex - 1]}
                                </TableCell>
                                <TableCell>{row.ivs.join("/")}</TableCell>
                                <TableCell>{resources.types[row.hiddenPower]}</TableCell>
                                <TableCell>{row.hiddenPowerStrength}</TableCell>
                                <TableCell>{resources.genders[row.gender]}</TableCell>
                                {showRequiredAdvances && (
                                    <TableCell>{row.reachableAdvances ?? "-"}</TableCell>
                                )}

                                <TableCell>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => {
                                            openInInitialSeed(row, false);
                                        }}
                                        onMouseDown={(e) => {
                                            if (e.button === 1) {
                                                e.preventDefault();
                                                openInInitialSeed(row, true);
                                            }
                                        }}
                                    >
                                        {t("table.initialSeed")}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
});

export default SearcherTable;
