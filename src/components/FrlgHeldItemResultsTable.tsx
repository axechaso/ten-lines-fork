import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { useSearchParams } from "react-router-dom";

import { setLocalStorageValue } from "../hooks/useLocalStorage";
import { getName, useI18n } from "../i18n";
import { hexSeed } from "../tenLines";
import type { ExtendedWildGeneratorState } from "../tenLines/generated";
import {
    advancePokeRng,
    getFrlgHeldItemName,
    getFrlgHeldSearchOffsets,
    predictFrlgHeldItemAtOffsets,
    type FrlgHeldSearchMode,
} from "../utils/frlgHeldItems";
import {
    COMPARE_TARGET_STORAGE_KEY,
    createStoredCompareEntry,
} from "./CalibrationForm";
import type { CalibrationCompareSettings } from "./CalibrationComparePanel";
import {
    setDynamicToolHitSeed,
    setDynamicToolTargetAdv,
} from "./calibrationDynamicToolStorage";

type CalibrationSeedSettings = {
    sound: string;
    buttonMode: string;
    button: string;
    heldButton: string;
};

export interface FrlgHeldItemResultsTableProps {
    rows: ExtendedWildGeneratorState[];
    standardOffset: number;
    searchMode: FrlgHeldSearchMode;
    game: string;
    gameConsole: string;
    encounterCategory: number;
    encounterLocation: number;
    encounterPokemon: number;
    calibrationSeedSettings: CalibrationSeedSettings;
}

const FrlgHeldItemResultsTable = memo(function FrlgHeldItemResultsTable({
    rows,
    standardOffset,
    searchMode,
    game,
    gameConsole,
    encounterCategory,
    encounterLocation,
    encounterPokemon,
    calibrationSeedSettings,
}: FrlgHeldItemResultsTableProps) {
    const { locale, t, resources } = useI18n();
    const [, setSearchParams] = useSearchParams();
    const searchOffsets = getFrlgHeldSearchOffsets(
        standardOffset,
        searchMode
    );

    function shouldAutoAddCompareTarget() {
        try {
            const storedSettings = localStorage.getItem(
                "calibration-compare-settings"
            );
            if (!storedSettings) {
                return true;
            }
            const parsedSettings = JSON.parse(storedSettings) as
                Partial<CalibrationCompareSettings>;
            return parsedSettings.autoAddTarget ?? true;
        } catch {
            return true;
        }
    }

    function openInCalibration(
        row: ExtendedWildGeneratorState,
        isAuxClick: boolean
    ) {
        if (shouldAutoAddCompareTarget()) {
            setLocalStorageValue(
                COMPARE_TARGET_STORAGE_KEY,
                createStoredCompareEntry(row)
            );
            setDynamicToolTargetAdv(row.advances);
            setDynamicToolHitSeed(true);
        }

        setSearchParams((previous) => {
            const params = new URLSearchParams(previous);
            params.set("targetInitialSeed", hexSeed(row.initialSeed, 16));
            params.set(
                "advancesMin",
                Math.max(0, row.advances - 1000).toString()
            );
            params.set("advancesMax", (row.advances + 1000).toString());
            params.set("sound", calibrationSeedSettings.sound);
            params.set("buttonMode", calibrationSeedSettings.buttonMode);
            params.set("button", calibrationSeedSettings.button);
            params.set("heldButton", calibrationSeedSettings.heldButton);
            setCalibrationContextParams(params, row);
            params.set(
                "calibrationTransfer",
                `${row.initialSeed}-${row.advances}-${row.pid}-${Date.now()}`
            );
            params.set("page", "1");
            if (isAuxClick) {
                window.open(`?${params.toString()}`);
                return previous;
            }
            return params;
        });
    }

    function openInInitialSeed(
        row: ExtendedWildGeneratorState,
        isAuxClick: boolean
    ) {
        setSearchParams((previous) => {
            const params = new URLSearchParams(previous);
            params.set(
                "targetSeed",
                hexSeed(
                    advancePokeRng(row.initialSeed, row.advances),
                    32
                )
            );
            params.set("page", "0");
            params.set("game", game);
            params.set("gameConsole", gameConsole);
            setCalibrationContextParams(params, row);
            if (isAuxClick) {
                window.open(`?${params.toString()}`);
                return previous;
            }
            return params;
        });
    }

    function setCalibrationContextParams(
        params: URLSearchParams,
        row: ExtendedWildGeneratorState
    ) {
        params.set("calibrationMethod", row.method.toString());
        params.set(
            "calibrationWildCategory",
            encounterCategory.toString()
        );
        params.set(
            "calibrationWildLocation",
            encounterLocation.toString()
        );
        params.set(
            "calibrationWildPokemon",
            encounterPokemon.toString()
        );
        params.set("calibrationWildLead", "255");
        params.set("calibrationFilterPokemon", "true");
    }

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>{t("table.advances")}</TableCell>
                        <TableCell>{t("table.seed")}</TableCell>
                        <TableCell>{t("table.slot")}</TableCell>
                        <TableCell>{t("table.level")}</TableCell>
                        <TableCell>{t("table.shiny")}</TableCell>
                        <TableCell>{t("table.heldItem")}</TableCell>
                        <TableCell>{t("table.heldRng")}</TableCell>
                        <TableCell>{t("table.pid")}</TableCell>
                        <TableCell>{t("table.nature")}</TableCell>
                        <TableCell>{t("table.ability")}</TableCell>
                        <TableCell>{t("table.ivs")}</TableCell>
                        <TableCell>{t("table.hidden")}</TableCell>
                        <TableCell>{t("table.power")}</TableCell>
                        <TableCell>{t("table.gender")}</TableCell>
                        <TableCell>
                            {t("table.openInInitialSeed")}
                        </TableCell>
                        <TableCell>
                            {t("table.openInCalibration")}
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.slice(0, 1000).map((row, index) => {
                        const heldPrediction = predictFrlgHeldItemAtOffsets({
                            species: row.species,
                            iv2EndSeed: row.iv2EndSeed,
                            offsets: searchOffsets,
                        });

                        return (
                            <TableRow
                                key={`${row.initialSeed}-${row.advances}-${row.method}-${row.pid}-${index}`}
                            >
                                <TableCell>{row.advances}</TableCell>
                                <TableCell>
                                    {hexSeed(
                                        advancePokeRng(
                                            row.initialSeed,
                                            row.advances
                                        ),
                                        32
                                    )}
                                </TableCell>
                                <TableCell>
                                    {row.encounterSlot}: {getName(
                                        resources,
                                        row.species,
                                        row.form
                                    )}
                                </TableCell>
                                <TableCell>{row.level}</TableCell>
                                <TableCell>
                                    {resources.shininess[row.shiny]}
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ whiteSpace: "nowrap" }}>
                                        {heldPrediction?.rolls.map((roll) => (
                                            <Typography
                                                key={roll.offset}
                                                component="div"
                                                variant="body2"
                                            >
                                                +{roll.offset}: {getFrlgHeldItemName(
                                                    locale,
                                                    roll.itemId
                                                )}
                                            </Typography>
                                        )) ?? "—"}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ whiteSpace: "nowrap" }}>
                                        {heldPrediction?.rolls.map((roll) => (
                                            <Typography
                                                key={roll.offset}
                                                component="div"
                                                variant="body2"
                                            >
                                                +{roll.offset}: {hexSeed(
                                                    roll.seed >>> 16,
                                                    16
                                                )} % 100 = {roll.roll}
                                            </Typography>
                                        )) ?? "—"}
                                    </Box>
                                </TableCell>
                                <TableCell>{hexSeed(row.pid, 32)}</TableCell>
                                <TableCell>
                                    {resources.natures[row.nature]}
                                </TableCell>
                                <TableCell>
                                    {row.ability}: {resources.abilities[
                                        row.abilityIndex - 1
                                    ]}
                                </TableCell>
                                <TableCell>{row.ivs.join("/")}</TableCell>
                                <TableCell>
                                    {resources.types[row.hiddenPower]}
                                </TableCell>
                                <TableCell>{row.hiddenPowerStrength}</TableCell>
                                <TableCell>
                                    {resources.genders[row.gender]}
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() =>
                                            openInInitialSeed(row, false)
                                        }
                                        onMouseDown={(event) => {
                                            if (event.button === 1) {
                                                event.preventDefault();
                                                openInInitialSeed(row, true);
                                            }
                                        }}
                                    >
                                        {t("table.initialSeed")}
                                    </Button>
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() =>
                                            openInCalibration(row, false)
                                        }
                                        onMouseDown={(event) => {
                                            if (event.button === 1) {
                                                event.preventDefault();
                                                openInCalibration(row, true);
                                            }
                                        }}
                                    >
                                        {t("table.calibration")}
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

export default FrlgHeldItemResultsTable;
