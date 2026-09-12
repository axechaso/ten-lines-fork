import {
    Box,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tooltip,
} from "@mui/material";
import { memo, useEffect, useMemo, useState } from "react";

import { getName, useI18n } from "../i18n";
import { frameToMS, hexSeed } from "../tenLines";
import type {
    ExtendedGeneratorState,
    ExtendedWildGeneratorState,
    FRLGContiguousSeedEntry,
} from "../tenLines/generated.d";

import type { CalibrationResultRow } from "./CalibrationComparePanel";

export type CalibrationTableColumn =
    | "seed"
    | "advances"
    | "method"
    | "finalAPressFrame"
    | "teachyTvAdvances"
    | "slot"
    | "level"
    | "pid"
    | "shiny"
    | "nature"
    | "stats"
    | "ability"
    | "ivs"
    | "hidden"
    | "power"
    | "gender";

export const CALIBRATION_TABLE_COLUMN_OPTIONS: CalibrationTableColumn[] = [
    "seed",
    "advances",
    "method",
    "finalAPressFrame",
    "teachyTvAdvances",
    "slot",
    "level",
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

const CalibrationTable = memo(function CalibrationTable({
    rows,
    target,
    gameConsole,
    isStatic,
    isMultiMethod,
    isTeachyTVMode,
    hasTarget,
    visibleColumns,
    onAdd,
}: {
    rows: ExtendedGeneratorState[] | ExtendedWildGeneratorState[];
    target: FRLGContiguousSeedEntry;
    gameConsole: string;
    isStatic: boolean;
    isMultiMethod: boolean;
    isTeachyTVMode: boolean;
    hasTarget: boolean;
    visibleColumns: CalibrationTableColumn[];
    onAdd: (row: CalibrationResultRow, destination: "target" | "history") => void;
}) {
    const { t, resources } = useI18n();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    const defaultAddToTarget = !hasTarget;
    const cappedRows = useMemo(() => rows.slice(0, 1000), [rows]);
    const paginatedRows = useMemo(
        () =>
            cappedRows.slice(
                page * rowsPerPage,
                page * rowsPerPage + rowsPerPage
            ),
        [cappedRows, page, rowsPerPage]
    );
    const activeColumns = useMemo(
        () =>
            visibleColumns.filter((column) => {
                if (column === "method") {
                    return isMultiMethod;
                }
                if (
                    column === "finalAPressFrame" ||
                    column === "teachyTvAdvances"
                ) {
                    return isTeachyTVMode;
                }
                if (column === "slot" || column === "level") {
                    return !isStatic;
                }
                return true;
            }),
        [isMultiMethod, isStatic, isTeachyTVMode, visibleColumns]
    );

    useEffect(() => {
        const maxPage = Math.max(
            0,
            Math.ceil(cappedRows.length / rowsPerPage) - 1
        );
        if (page > maxPage) {
            setPage(maxPage);
        }
    }, [cappedRows.length, page, rowsPerPage]);

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell width={72} align="center">
                            {t("table.actions")}
                        </TableCell>
                        {activeColumns.map((column) => (
                            <TableCell key={column}>{t(`table.${column}`)}</TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {paginatedRows.map((row, index) => {
                        const absoluteIndex = page * rowsPerPage + index;
                        const seedMS = frameToMS(row.seedTime / 16, gameConsole);
                        const offsetMS =
                            seedMS - frameToMS(target.seedTime / 16, gameConsole);

                        return (
                            <TableRow key={absoluteIndex}>
                                <TableCell align="center">
                                    <Box
                                        sx={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 0.5,
                                            p: 0.25,
                                            borderRadius: 999,
                                            border: "1px solid rgba(144,202,249,0.28)",
                                            backgroundColor: "rgba(144,202,249,0.08)",
                                        }}
                                    >
                                        <Tooltip
                                            title={t(
                                                defaultAddToTarget
                                                    ? "compare.addToTarget"
                                                    : "compare.addToHistory"
                                            )}
                                        >
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                aria-label={t(
                                                    defaultAddToTarget
                                                        ? "compare.addToTarget"
                                                        : "compare.addToHistory"
                                                )}
                                                sx={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 999,
                                                    backgroundColor:
                                                        "primary.main",
                                                    color: "primary.contrastText",
                                                    "&:hover": {
                                                        backgroundColor:
                                                            "primary.dark",
                                                    },
                                                }}
                                                onClick={() =>
                                                    onAdd(
                                                        row,
                                                        defaultAddToTarget
                                                            ? "target"
                                                            : "history"
                                                    )
                                                }
                                            >
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        fontSize: "1.05rem",
                                                        fontWeight: 700,
                                                        lineHeight: 1,
                                                    }}
                                                >
                                                    +
                                                </Box>
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                                {activeColumns.map((column) => {
                                    switch (column) {
                                        case "seed":
                                            return (
                                                <TableCell key={`${absoluteIndex}-${column}`}>
                                                    <div style={{ float: "left" }}>
                                                        {hexSeed(row.initialSeed, 16)} | {seedMS}
                                                    </div>
                                                    <span>{t("messages.ms")}</span> (
                                                    {offsetMS >= 0 && "+"}
                                                    {offsetMS}
                                                    {t("messages.ms")})
                                                </TableCell>
                                            );
                                        case "advances":
                                            return (
                                                <TableCell key={`${absoluteIndex}-${column}`}>
                                                    {row.advances}
                                                </TableCell>
                                            );
                                        case "method":
                                            return (
                                                <TableCell key={`${absoluteIndex}-${column}`}>
                                                    {
                                                        resources.methods[
                                                            (row as ExtendedWildGeneratorState).method
                                                        ]
                                                    }
                                                </TableCell>
                                            );
                                        case "finalAPressFrame":
                                            return (
                                                <TableCell key={`${absoluteIndex}-${column}`}>
                                                    {row.advances -
                                                        row.ttvAdvances * 313 +
                                                        row.ttvAdvances}
                                                </TableCell>
                                            );
                                        case "teachyTvAdvances":
                                            return (
                                                <TableCell key={`${absoluteIndex}-${column}`}>
                                                    {row.ttvAdvances}
                                                </TableCell>
                                            );
                                        case "slot":
                                            return (
                                                <TableCell key={`${absoluteIndex}-${column}`}>
                                                    {
                                                        (row as ExtendedWildGeneratorState)
                                                            .encounterSlot
                                                    }
                                                    :{" "}
                                                    {getName(
                                                        resources,
                                                        (
                                                            row as ExtendedWildGeneratorState
                                                        ).species,
                                                        (
                                                            row as ExtendedWildGeneratorState
                                                        ).form
                                                    )}
                                                </TableCell>
                                            );
                                        case "level":
                                            return (
                                                <TableCell key={`${absoluteIndex}-${column}`}>
                                                    {
                                                        (row as ExtendedWildGeneratorState)
                                                            .level
                                                    }
                                                </TableCell>
                                            );
                                        case "pid":
                                            return (
                                                <TableCell key={`${absoluteIndex}-${column}`}>
                                                    {hexSeed(row.pid, 32)}
                                                </TableCell>
                                            );
                                        case "shiny":
                                            return (
                                                <TableCell key={`${absoluteIndex}-${column}`}>
                                                    {resources.shininess[row.shiny]}
                                                </TableCell>
                                            );
                                        case "nature":
                                            return (
                                                <TableCell key={`${absoluteIndex}-${column}`}>
                                                    {resources.natures[row.nature]}
                                                </TableCell>
                                            );
                                        case "stats":
                                            return (
                                                <TableCell key={`${absoluteIndex}-${column}`}>
                                                    {row.stats.join("/")}
                                                </TableCell>
                                            );
                                        case "ability":
                                            return (
                                                <TableCell key={`${absoluteIndex}-${column}`}>
                                                    {row.ability}:{" "}
                                                    {resources.abilities[row.abilityIndex - 1]}
                                                </TableCell>
                                            );
                                        case "ivs":
                                            return (
                                                <TableCell key={`${absoluteIndex}-${column}`}>
                                                    {row.ivs.join("/")}
                                                </TableCell>
                                            );
                                        case "hidden":
                                            return (
                                                <TableCell key={`${absoluteIndex}-${column}`}>
                                                    {resources.types[row.hiddenPower]}
                                                </TableCell>
                                            );
                                        case "power":
                                            return (
                                                <TableCell key={`${absoluteIndex}-${column}`}>
                                                    {row.hiddenPowerStrength}
                                                </TableCell>
                                            );
                                        case "gender":
                                            return (
                                                <TableCell key={`${absoluteIndex}-${column}`}>
                                                    {resources.genders[row.gender]}
                                                </TableCell>
                                            );
                                    }
                                })}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            <TablePagination
                component="div"
                count={cappedRows.length}
                page={page}
                onPageChange={(_event, nextPage) => {
                    setPage(nextPage);
                }}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(event) => {
                    setRowsPerPage(parseInt(event.target.value, 10));
                    setPage(0);
                }}
                rowsPerPageOptions={[20, 50, 100]}
                labelRowsPerPage={t("table.rowsPerPage")}
            />
        </TableContainer>
    );
});

export default CalibrationTable;
