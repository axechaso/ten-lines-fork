import {
    Box,
    Chip,
    Divider,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from "@mui/material";
import { memo } from "react";

import { useI18n } from "../i18n";
import { frameToMS, hexSeed } from "../tenLines";
import type { ExtendedEggGeneratorState } from "../tenLines/generated.d";
import {
    formatEggSeedTime,
    getEggCompareDeltas,
} from "./frlgEggHelpers";

export const EGG_COMPARE_TARGET_STORAGE_KEY = "egg-calibration-compare-target";
export const EGG_COMPARE_HISTORY_STORAGE_KEY = "egg-calibration-compare-history";

export interface EggCalibrationCompareEntry {
    id: string;
    row: ExtendedEggGeneratorState;
}

type EggCompareColumn =
    | "heldSeed"
    | "heldAdvances"
    | "pickupSeed"
    | "pickupAdvances"
    | "pid"
    | "nature"
    | "ivs"
    | "hidden"
    | "power";

const EGG_COMPARE_COLUMNS: EggCompareColumn[] = [
    "heldSeed",
    "heldAdvances",
    "pickupSeed",
    "pickupAdvances",
    "pid",
    "nature",
    "ivs",
    "hidden",
    "power",
];

export function createEggCalibrationCompareEntry(
    row: ExtendedEggGeneratorState
): EggCalibrationCompareEntry {
    return {
        id:
            globalThis.crypto?.randomUUID?.() ??
            `${Date.now()}-${Math.random()}`,
        row: {
            ...row,
            ivs: [...row.ivs] as ExtendedEggGeneratorState["ivs"],
            stats: [...row.stats] as ExtendedEggGeneratorState["stats"],
            inheritance: [
                ...row.inheritance,
            ] as ExtendedEggGeneratorState["inheritance"],
        },
    };
}

function formatSignedDelta(value: number) {
    return value > 0 ? `+${value}` : String(value);
}

function getDeltaColor(value: number) {
    if (value > 0) {
        return "success.main";
    }
    if (value < 0) {
        return "error.main";
    }
    return "text.secondary";
}

function EggCompareCell({
    column,
    row,
    baseline,
    gameConsole,
}: {
    column: EggCompareColumn;
    row: ExtendedEggGeneratorState;
    baseline: ExtendedEggGeneratorState | null;
    gameConsole: string;
}) {
    const { t, resources } = useI18n();
    const deltas =
        baseline === null
            ? null
            : getEggCompareDeltas(row, baseline, gameConsole, frameToMS);

    if (column === "heldSeed" || column === "pickupSeed") {
        const isHeld = column === "heldSeed";
        const initialSeed = isHeld
            ? row.heldInitialSeed
            : row.pickupInitialSeed;
        const seedTime = isHeld ? row.heldSeedTime : row.pickupSeedTime;
        const delta = deltas?.[isHeld ? "heldSeedTime" : "pickupSeedTime"];

        return (
            <Box>
                <Typography variant="body2" fontWeight={600}>
                    {hexSeed(initialSeed, 16)} (
                    {formatEggSeedTime(seedTime, gameConsole, frameToMS)}
                    {t("messages.ms")})
                </Typography>
                {delta !== undefined && (
                    <Typography
                        variant="caption"
                        sx={{ color: getDeltaColor(delta) }}
                    >
                        ({formatSignedDelta(delta)}
                        {t("messages.ms")})
                    </Typography>
                )}
            </Box>
        );
    }

    if (column === "heldAdvances" || column === "pickupAdvances") {
        const isHeld = column === "heldAdvances";
        const advances = isHeld ? row.heldAdvances : row.pickupAdvances;
        const delta = deltas?.[
            isHeld ? "heldAdvances" : "pickupAdvances"
        ];

        return (
            <Box>
                <Typography variant="body2" fontWeight={600}>
                    {advances}
                </Typography>
                {delta !== undefined && (
                    <Typography
                        variant="caption"
                        sx={{ color: getDeltaColor(delta) }}
                    >
                        ({formatSignedDelta(delta)})
                    </Typography>
                )}
            </Box>
        );
    }

    switch (column) {
        case "pid":
            return <>{hexSeed(row.pid, 32)}</>;
        case "nature":
            return <>{resources.natures[row.nature]}</>;
        case "ivs":
            return <>{row.ivs.join("/")}</>;
        case "hidden":
            return <>{resources.types[row.hiddenPower]}</>;
        case "power":
            return <>{row.hiddenPowerStrength}</>;
    }
}

function EggTargetSummary({
    entry,
    gameConsole,
    onDelete,
}: {
    entry: EggCalibrationCompareEntry;
    gameConsole: string;
    onDelete: () => void;
}) {
    const { t } = useI18n();
    const isShiny = entry.row.shiny > 0;

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                borderRadius: 3,
                borderColor: isShiny ? "#d4af37" : "primary.main",
                background: isShiny
                    ? "linear-gradient(135deg, rgba(212,175,55,0.30), rgba(212,175,55,0.10))"
                    : "linear-gradient(135deg, rgba(25,118,210,0.22), rgba(25,118,210,0.08))",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                }}
            >
                <Chip
                    label={t("compare.target")}
                    color={isShiny ? "warning" : "primary"}
                    size="small"
                />
                <Tooltip title={t("compare.deleteTarget")}>
                    <IconButton
                        type="button"
                        size="small"
                        aria-label={t("compare.deleteTarget")}
                        onClick={onDelete}
                        sx={{
                            width: 30,
                            height: 30,
                            border: "1px solid rgba(255,255,255,0.12)",
                        }}
                    >
                        <Box component="span" sx={{ fontSize: "1.1rem" }}>
                            ×
                        </Box>
                    </IconButton>
                </Tooltip>
            </Box>
            <Box
                sx={{
                    mt: 1.5,
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 1.25,
                }}
            >
                {EGG_COMPARE_COLUMNS.map((column) => (
                    <Box
                        key={column}
                        sx={{
                            px: 1.25,
                            py: 1,
                            borderRadius: 2,
                            backgroundColor: "rgba(255,255,255,0.04)",
                            minWidth: 0,
                        }}
                    >
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mb: 0.5 }}
                        >
                            {t(`table.${column}`)}
                        </Typography>
                        <EggCompareCell
                            column={column}
                            row={entry.row}
                            baseline={null}
                            gameConsole={gameConsole}
                        />
                    </Box>
                ))}
            </Box>
        </Paper>
    );
}

const EggCalibrationComparePanel = memo(function EggCalibrationComparePanel({
    targetEntry,
    historyEntries,
    gameConsole,
    onDeleteTarget,
    onDeleteHistoryEntry,
    onClearAll,
    onClearHistory,
}: {
    targetEntry: EggCalibrationCompareEntry | null;
    historyEntries: EggCalibrationCompareEntry[];
    gameConsole: string;
    onDeleteTarget: () => void;
    onDeleteHistoryEntry: (id: string) => void;
    onClearAll: () => void;
    onClearHistory: () => void;
}) {
    const { t } = useI18n();

    return (
        <Paper
            variant="outlined"
            sx={{
                mb: 2,
                p: 2,
                borderRadius: 4,
                background:
                    "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                borderColor: "rgba(255,255,255,0.12)",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    mb: 2,
                }}
            >
                <Box>
                    <Typography variant="h6">{t("compare.title")}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {t("compare.modeTarget")}
                    </Typography>
                </Box>
                <Tooltip title={t("compare.clearAll")}>
                    <span>
                        <IconButton
                            type="button"
                            size="small"
                            aria-label={t("compare.clearAll")}
                            disabled={
                                targetEntry === null &&
                                historyEntries.length === 0
                            }
                            onClick={onClearAll}
                            sx={{
                                width: 32,
                                height: 32,
                                border:
                                    "1px solid rgba(255,255,255,0.12)",
                            }}
                        >
                            <Box component="span" sx={{ fontSize: "1.1rem" }}>
                                ×
                            </Box>
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>

            {targetEntry ? (
                <EggTargetSummary
                    entry={targetEntry}
                    gameConsole={gameConsole}
                    onDelete={onDeleteTarget}
                />
            ) : (
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ py: 2 }}
                >
                    {t("compare.emptyTarget")}
                </Typography>
            )}

            <Divider sx={{ my: 2 }} />
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    mb: 1,
                }}
            >
                <Typography variant="subtitle2">
                    {t("compare.history")} ({historyEntries.length})
                </Typography>
                {historyEntries.length > 0 && (
                    <Tooltip title={t("compare.clearHistory")}>
                        <IconButton
                            type="button"
                            size="small"
                            aria-label={t("compare.clearHistory")}
                            onClick={onClearHistory}
                        >
                            <Box component="span">×</Box>
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            {historyEntries.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    {t("compare.emptyHistory")}
                </Typography>
            ) : (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t("table.actions")}</TableCell>
                                {EGG_COMPARE_COLUMNS.map((column) => (
                                    <TableCell key={column}>
                                        {t(`table.${column}`)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {historyEntries.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell>
                                        <Tooltip title={t("compare.delete")}>
                                            <IconButton
                                                type="button"
                                                size="small"
                                                aria-label={t("compare.delete")}
                                                onClick={() =>
                                                    onDeleteHistoryEntry(
                                                        entry.id
                                                    )
                                                }
                                            >
                                                <Box component="span">×</Box>
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                    {EGG_COMPARE_COLUMNS.map((column) => (
                                        <TableCell
                                            key={`${entry.id}-${column}`}
                                        >
                                            <EggCompareCell
                                                column={column}
                                                row={entry.row}
                                                baseline={
                                                    targetEntry?.row ?? null
                                                }
                                                gameConsole={gameConsole}
                                            />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Paper>
    );
});

export default EggCalibrationComparePanel;
