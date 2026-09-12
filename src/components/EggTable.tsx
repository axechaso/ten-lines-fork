import { Box, Button, IconButton, Tooltip } from "@mui/material";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import { memo, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useI18n } from "../i18n";
import { setLocalStorageValue } from "../hooks/useLocalStorage";
import { frameToMS, hexSeed } from "../tenLines";
import type { ExtendedEggGeneratorState } from "../tenLines/generated.d";
import {
    buildFrameLeewayRange,
    formatEggSeedTime,
    formatInheritanceSlot,
    getEggSeedTimeOffset,
    paginateEggResults,
} from "./frlgEggHelpers";
import {
    createEggCalibrationCompareEntry,
    EGG_COMPARE_TARGET_STORAGE_KEY,
} from "./EggCalibrationComparePanel";

const EGG_RESULTS_PER_PAGE = 50;

export type EggCalibrationContext = {
    game: string;
    gameConsole: string;
    trainerID: string;
    secretID: string;
    method: string;
    compatibility: string;
    eggSpecies: string;
    parentAIvs: string[];
    parentBIvs: string[];
    parentAGender: string;
    parentBGender: string;
    heldOffset: string;
    pickupOffset: string;
};

const EggTable = memo(function EggTable({
    rows,
    showInheritance,
    calibrationContext,
    gameConsole,
    targetSeedTimes,
    compareTargetExists = false,
    onAddCompareEntry,
}: {
    rows: ExtendedEggGeneratorState[];
    showInheritance: boolean;
    calibrationContext?: EggCalibrationContext;
    gameConsole: string;
    targetSeedTimes?: {
        held: number;
        pickup: number;
    };
    compareTargetExists?: boolean;
    onAddCompareEntry?: (
        row: ExtendedEggGeneratorState,
        destination: "target" | "history"
    ) => void;
}) {
    const { t, resources } = useI18n();
    const [, setSearchParams] = useSearchParams();
    const [page, setPage] = useState(0);
    const paginatedRows = paginateEggResults(rows, page, EGG_RESULTS_PER_PAGE);

    useEffect(() => {
        const maxPage = Math.max(
            0,
            Math.ceil(rows.length / EGG_RESULTS_PER_PAGE) - 1
        );
        if (page > maxPage) {
            setPage(maxPage);
        }
    }, [page, rows.length]);

    function openInEggCalibration(
        row: ExtendedEggGeneratorState,
        isAuxClick: boolean
    ) {
        if (!calibrationContext) {
            return;
        }

        setLocalStorageValue(
            EGG_COMPARE_TARGET_STORAGE_KEY,
            createEggCalibrationCompareEntry(row)
        );
        setSearchParams((previous) => {
            const params = new URLSearchParams(previous);
            params.set("page", "6");
            params.set("game", calibrationContext.game);
            params.set("gameConsole", calibrationContext.gameConsole);
            params.set("heldSeed", hexSeed(row.heldInitialSeed, 16));
            params.set("pickupSeed", hexSeed(row.pickupInitialSeed, 16));
            params.set("heldSettings", row.heldSettings);
            params.set("pickupSettings", row.pickupSettings);
            params.set("seedLeeway", "20");
            const [heldAdvancesMin, heldAdvancesMax] = buildFrameLeewayRange(
                row.heldAdvances,
                10
            );
            const [pickupAdvancesMin, pickupAdvancesMax] = buildFrameLeewayRange(
                row.pickupAdvances,
                10
            );
            params.set("heldAdvancesMin", heldAdvancesMin.toString());
            params.set("heldAdvancesMax", heldAdvancesMax.toString());
            params.set("pickupAdvancesMin", pickupAdvancesMin.toString());
            params.set("pickupAdvancesMax", pickupAdvancesMax.toString());
            params.set("heldOffset", calibrationContext.heldOffset);
            params.set("pickupOffset", calibrationContext.pickupOffset);
            params.set("trainerID", calibrationContext.trainerID);
            params.set("secretID", calibrationContext.secretID);
            params.set("eggMethod", calibrationContext.method);
            params.set("compatibility", calibrationContext.compatibility);
            params.set("eggSpecies", calibrationContext.eggSpecies);
            params.set("parentAIvs", calibrationContext.parentAIvs.join(","));
            params.set("parentBIvs", calibrationContext.parentBIvs.join(","));
            params.set("parentAGender", calibrationContext.parentAGender);
            params.set("parentBGender", calibrationContext.parentBGender);
            params.delete("usePidFilter");
            params.delete("childPid");
            params.delete("childNature");
            params.delete("childAbility");
            params.delete("childGender");
            params.delete("childHiddenPower");
            params.delete("childIvRanges");

            if (isAuxClick) {
                window.open(`?${params.toString()}`);
                return previous;
            }
            return params;
        });
    }

    return (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
                <TableHead>
                    <TableRow>
                        {onAddCompareEntry && (
                            <TableCell width={72} align="center">
                                {t("table.actions")}
                            </TableCell>
                        )}
                        <TableCell>{t("table.heldSeed")}</TableCell>
                        <TableCell>{t("table.heldSeedTime")}</TableCell>
                        <TableCell>{t("table.heldSettings")}</TableCell>
                        <TableCell>{t("table.heldAdvances")}</TableCell>
                        <TableCell>{t("table.pickupSeed")}</TableCell>
                        <TableCell>{t("table.pickupSeedTime")}</TableCell>
                        <TableCell>{t("table.pickupSettings")}</TableCell>
                        <TableCell>{t("table.pickupAdvances")}</TableCell>
                        <TableCell>{t("table.pid")}</TableCell>
                        <TableCell>{t("table.shiny")}</TableCell>
                        <TableCell>{t("table.nature")}</TableCell>
                        <TableCell>{t("table.ability")}</TableCell>
                        <TableCell>{t("table.ivs")}</TableCell>
                        {showInheritance && (
                            <TableCell>{t("table.inheritance")}</TableCell>
                        )}
                        <TableCell>{t("table.hidden")}</TableCell>
                        <TableCell>{t("table.power")}</TableCell>
                        <TableCell>{t("table.gender")}</TableCell>
                        {calibrationContext && (
                            <TableCell>{t("table.openInEggCalibration")}</TableCell>
                        )}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {paginatedRows.map((row, index) => {
                        const absoluteIndex = page * EGG_RESULTS_PER_PAGE + index;
                        const heldSeedMs = formatEggSeedTime(
                            row.heldSeedTime,
                            gameConsole,
                            frameToMS
                        );
                        const pickupSeedMs = formatEggSeedTime(
                            row.pickupSeedTime,
                            gameConsole,
                            frameToMS
                        );
                        const heldOffsetMs =
                            targetSeedTimes === undefined
                                ? null
                                : getEggSeedTimeOffset(
                                      row.heldSeedTime,
                                      targetSeedTimes.held,
                                      gameConsole,
                                      frameToMS
                                  );
                        const pickupOffsetMs =
                            targetSeedTimes === undefined
                                ? null
                                : getEggSeedTimeOffset(
                                      row.pickupSeedTime,
                                      targetSeedTimes.pickup,
                                      gameConsole,
                                      frameToMS
                                  );

                        return (
                            <TableRow key={absoluteIndex}>
                                {onAddCompareEntry && (
                                    <TableCell align="center">
                                        <Tooltip
                                            title={t(
                                                compareTargetExists
                                                    ? "compare.addToHistory"
                                                    : "compare.addToTarget"
                                            )}
                                        >
                                            <IconButton
                                                type="button"
                                                size="small"
                                                color="primary"
                                                aria-label={t(
                                                    compareTargetExists
                                                        ? "compare.addToHistory"
                                                        : "compare.addToTarget"
                                                )}
                                                onClick={() =>
                                                    onAddCompareEntry(
                                                        row,
                                                        compareTargetExists
                                                            ? "history"
                                                            : "target"
                                                    )
                                                }
                                                sx={{
                                                    width: 28,
                                                    height: 28,
                                                    backgroundColor:
                                                        "primary.main",
                                                    color: "primary.contrastText",
                                                    "&:hover": {
                                                        backgroundColor:
                                                            "primary.dark",
                                                    },
                                                }}
                                            >
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        fontWeight: 700,
                                                        lineHeight: 1,
                                                    }}
                                                >
                                                    +
                                                </Box>
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                )}
                                <TableCell>
                                    {hexSeed(row.heldInitialSeed, 16)}
                                </TableCell>
                                <TableCell>
                                    {heldSeedMs}
                                    {t("messages.ms")}
                                    {heldOffsetMs !== null && (
                                        <>
                                            {" ("}
                                            {heldOffsetMs >= 0 && "+"}
                                            {heldOffsetMs}
                                            {t("messages.ms")})
                                        </>
                                    )}
                                </TableCell>
                                <TableCell>{row.heldSettings}</TableCell>
                                <TableCell>{row.heldAdvances}</TableCell>
                                <TableCell>
                                    {hexSeed(row.pickupInitialSeed, 16)}
                                </TableCell>
                                <TableCell>
                                    {pickupSeedMs}
                                    {t("messages.ms")}
                                    {pickupOffsetMs !== null && (
                                        <>
                                            {" ("}
                                            {pickupOffsetMs >= 0 && "+"}
                                            {pickupOffsetMs}
                                            {t("messages.ms")})
                                        </>
                                    )}
                                </TableCell>
                                <TableCell>{row.pickupSettings}</TableCell>
                                <TableCell>{row.pickupAdvances}</TableCell>
                                <TableCell>{hexSeed(row.pid, 32)}</TableCell>
                                <TableCell>{resources.shininess[row.shiny]}</TableCell>
                                <TableCell>{resources.natures[row.nature]}</TableCell>
                                <TableCell>
                                    {row.ability}:{" "}
                                    {resources.abilities[row.abilityIndex - 1]}
                                </TableCell>
                                <TableCell>{row.ivs.join("/")}</TableCell>
                                {showInheritance && (
                                    <TableCell>
                                        {row.inheritance
                                            .map(formatInheritanceSlot)
                                            .join("/")}
                                    </TableCell>
                                )}
                                <TableCell>{resources.types[row.hiddenPower]}</TableCell>
                                <TableCell>{row.hiddenPowerStrength}</TableCell>
                                <TableCell>{resources.genders[row.gender]}</TableCell>
                                {calibrationContext && (
                                    <TableCell>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={() =>
                                                openInEggCalibration(row, false)
                                            }
                                            onMouseDown={(event) => {
                                                if (event.button === 1) {
                                                    event.preventDefault();
                                                    openInEggCalibration(row, true);
                                                }
                                            }}
                                        >
                                            {t("table.calibration")}
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            <TablePagination
                component="div"
                count={rows.length}
                page={page}
                onPageChange={(_event, nextPage) => {
                    setPage(nextPage);
                }}
                rowsPerPage={EGG_RESULTS_PER_PAGE}
                rowsPerPageOptions={[EGG_RESULTS_PER_PAGE]}
                labelRowsPerPage={t("table.rowsPerPage")}
            />
        </TableContainer>
    );
});

export default EggTable;
