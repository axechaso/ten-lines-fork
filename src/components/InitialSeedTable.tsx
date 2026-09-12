import { Button } from "@mui/material";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { memo } from "react";
import { useSearchParams } from "react-router-dom";
import { useI18n } from "../i18n";
import { frameToMS, hexSeed, teachyTVConversion } from "../tenLines";
import type { InitialSeedResult } from "../tenLines/generated.d";
import { setLocalStorageValue } from "../hooks/useLocalStorage";
import {
    COMPARE_TARGET_STORAGE_KEY,
    createStoredCompareEntry,
    SEARCHER_COMPARE_TARGET_KEY,
} from "./CalibrationForm";
import {
    setDynamicToolHitSeed,
    setDynamicToolTargetAdv,
} from "./calibrationDynamicToolStorage";
import type { CalibrationCompareSettings, CalibrationStoredTarget } from "./CalibrationComparePanel";

dayjs.extend(duration);

const InitialSeedTable = memo(function InitialSeedTable({
    rows,
    isFRLG,
    gameConsole,
    isTeachyTVMode,
    teachyTVRegularOut,
}: {
    rows: InitialSeedResult[];
    isFRLG: boolean;
    gameConsole: string;
    isTeachyTVMode: boolean;
    teachyTVRegularOut: number;
}) {
    const { t } = useI18n();
    const [, setSearchParams] = useSearchParams();

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

    function getStoredSearcherTarget() {
        try {
            const storedTarget = localStorage.getItem(
                SEARCHER_COMPARE_TARGET_KEY
            );
            return storedTarget
                ? (JSON.parse(storedTarget) as Omit<
                    CalibrationStoredTarget,
                    "initialSeed" | "seedTime" | "advances"
                >)
                : null;
        } catch {
            return null;
        }
    }

    function setCompareTargetFromInitialSeed(row: InitialSeedResult) {
        if (!shouldAutoAddCompareTarget()) {
            return;
        }

        const storedSearcherTarget = getStoredSearcherTarget();
        const compareTarget = storedSearcherTarget
            ? ({
                initialSeed: row.initialSeed,
                seedTime: row.seedTime,
                advances: row.advances,
                ...storedSearcherTarget,
            } satisfies CalibrationStoredTarget)
            : {
                initialSeed: row.initialSeed,
                seedTime: row.seedTime,
                advances: row.advances,
            };

        setLocalStorageValue(
            COMPARE_TARGET_STORAGE_KEY,
            createStoredCompareEntry(compareTarget)
        );
        setDynamicToolTargetAdv(row.advances);
        setDynamicToolHitSeed(true);
        localStorage.removeItem(SEARCHER_COMPARE_TARGET_KEY);
    }

    function humanizeSettings(settings: string | undefined) {
        if (!settings) return "";
        const [sound, buttonMode, activeButton, heldButtonModifier, heldButton] =
            settings.split("_");
        const humanizedTerms: Record<string, string> = {
            stereo: t("common.stereo"),
            mono: t("common.mono"),
            start: t("options.start"),
            select: t("options.select"),
            a: "A",
            l: "L",
            r: "R",
            startup: t("options.startup"),
            blackout: t("options.blackout"),
            al: "A+L",
            none: t("common.none"),
            undefined: "",
        };
        const humanizedButtonModes: Record<string, string> = {
            a: "L=A",
            h: t("options.help"),
            r: "LR",
        };
        return `${humanizedTerms[sound]} | ${humanizedButtonModes[buttonMode]} | ${t(
            "messages.settingsSeedButton"
        )}: ${humanizedTerms[activeButton]} | ${t("messages.settingsExtraButton")}: ${
            humanizedTerms[heldButtonModifier]
        } ${humanizedTerms[heldButton]}`;
    }

    function openInCalibration(row: InitialSeedResult, isAuxClick: boolean) {
        setCompareTargetFromInitialSeed(row);
        setSearchParams((previous) => {
            const params = new URLSearchParams(previous);
            params.set("targetInitialSeed", hexSeed(row.initialSeed, 16));
            params.set(
                "calibrationTransfer",
                `${row.initialSeed}-${row.advances}-${Date.now()}`
            );
            if (isTeachyTVMode) {
                const ttv = teachyTVConversion(row.advances, teachyTVRegularOut);
                params.set(
                    "advancesMin",
                    Math.max(0, ttv.regular_advances + ttv.ttv_advances - 15).toString()
                );
                params.set(
                    "advancesMax",
                    (ttv.regular_advances + ttv.ttv_advances + 15).toString()
                );
                params.set(
                    "ttvAdvancesMin",
                    Math.max(0, ttv.ttv_advances - 15).toString()
                );
                params.set("ttvAdvancesMax", (ttv.ttv_advances + 15).toString());
            } else {
                params.set("advancesMin", Math.max(0, row.advances - 1000).toString());
                params.set("advancesMax", (row.advances + 1000).toString());
            }
            params.set("page", "1");
            if (isFRLG) {
                const [sound, buttonMode, activeButton, heldButtonModifier, heldButton] =
                    (row.settings as string).split("_");
                params.set("sound", sound);
                params.set("buttonMode", buttonMode);
                params.set("button", activeButton);
                params.set(
                    "heldButton",
                    heldButtonModifier + (heldButton ? "_" + heldButton : "")
                );
            }
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
                        {!isFRLG && <TableCell>{t("table.seedDec")}</TableCell>}
                        <TableCell>{t("table.seedHex")}</TableCell>
                        <TableCell>{t("table.advances")}</TableCell>
                        {isTeachyTVMode && (
                            <TableCell>{t("table.finalAPressFrame")}</TableCell>
                        )}
                        {isTeachyTVMode && (
                            <TableCell>{t("table.teachyTvAdvances")}</TableCell>
                        )}
                        <TableCell>{t("table.estimatedTotalFrames")}</TableCell>
                        <TableCell>{t("table.estimatedTotalTime")}</TableCell>
                        <TableCell>{t("table.seedTime")}</TableCell>
                        {isFRLG && <TableCell>{t("table.settings")}</TableCell>}
                        <TableCell>{t("table.openInCalibration")}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row, index) => {
                        let visualFrame = row.advances;
                        let ttvAdvances = 0;
                        if (isTeachyTVMode) {
                            const ttv = teachyTVConversion(row.advances, teachyTVRegularOut);
                            ttvAdvances = ttv.ttv_advances;
                            visualFrame = ttvAdvances + ttv.regular_advances;
                        }
                        return (
                            <TableRow key={index}>
                                {!isFRLG && <TableCell>{row.initialSeed}</TableCell>}
                                <TableCell>{hexSeed(row.initialSeed, 16)}</TableCell>
                                <TableCell>{row.advances}</TableCell>
                                {isTeachyTVMode && <TableCell>{visualFrame}</TableCell>}
                                {isTeachyTVMode && <TableCell>{ttvAdvances}</TableCell>}
                                <TableCell>
                                    {Math.round(row.seedTime / 16 + visualFrame)}
                                </TableCell>
                                <TableCell>
                                    {(() => {
                                        const totalDuration = dayjs.duration(
                                            frameToMS(
                                                row.seedTime / 16 + visualFrame,
                                                gameConsole
                                            )
                                        );
                                        if (totalDuration.days() > 0) {
                                            return `${Math.floor(
                                                totalDuration.asHours()
                                            )}:${totalDuration.format("mm:ss.SSS")}`;
                                        }
                                        return totalDuration.format("HH:mm:ss.SSS");
                                    })()}
                                </TableCell>
                                <TableCell>
                                    <div style={{ float: "left" }}>
                                        {frameToMS(row.seedTime / 16, gameConsole)}
                                    </div>
                                    <span>{t("messages.ms")}</span>
                                </TableCell>
                                {isFRLG && (
                                    <TableCell>{humanizeSettings(row.settings as string)}</TableCell>
                                )}
                                <TableCell>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => {
                                            openInCalibration(row, false);
                                        }}
                                        onMouseDown={(e) => {
                                            if (e.button === 1) {
                                                e.preventDefault();
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

export default InitialSeedTable;
