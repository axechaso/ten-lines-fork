import { TextField } from "@mui/material";
import { useMemo, useState } from "react";
import React from "react";
import { useI18n } from "../i18n";
import type { IVRange } from "../tenLines/generated.d";

const splitIvLine = (line: string) =>
    line
        .trim()
        .split(/[\s-]+/)
        .filter((entry) => entry !== "");

function IvCalculator({
    value,
    onChange,
    calculateIVs,
}: {
    value: string;
    onChange: (
        event: React.ChangeEvent<HTMLInputElement>,
        value: { value: string; isValid: boolean; calculatedValue: IVRange[] }
    ) => void;
    calculateIVs: (parsedLines: number[][]) => Promise<IVRange[]>;
}) {
    const { t } = useI18n();
    const ivNames = [
        t("stats.hp"),
        t("stats.attack"),
        t("stats.defense"),
        t("stats.specialAttack"),
        t("stats.specialDefense"),
        t("stats.speed"),
    ];

    const [calculatingError, setCalculatingError] = useState("");

    const getError = (currentValue: string, checkCalculatingError: boolean = true) => {
        if (checkCalculatingError && calculatingError !== "") {
            return calculatingError;
        }
        const lines = currentValue.split("\n");
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineEntries = splitIvLine(line);
            if (line.trim() == "") {
                return t("errors.lineMissing", {
                    line: `${i + 1}`,
                    field: t("labels.level"),
                });
            }
            const level = parseInt(lineEntries[0]) ?? 0;
            if (level > 100 || level < 1) {
                return t("errors.lineInvalid", {
                    line: `${i + 1}`,
                    field: t("labels.level"),
                });
            }
            if (lineEntries.length == 1) {
                return t("errors.lineMissing", {
                    line: `${i + 1}`,
                    field: t("stats.hp"),
                });
            }
            const hp = parseInt(lineEntries[1]) ?? 0;
            if (hp > 651 || hp < 1) {
                return t("errors.lineInvalid", {
                    line: `${i + 1}`,
                    field: t("stats.hp"),
                });
            }
            if (lineEntries.length == 2) {
                return t("errors.lineMissing", {
                    line: `${i + 1}`,
                    field: t("stats.attack"),
                });
            }
            const atk = parseInt(lineEntries[2]) ?? 0;
            if (atk > 437 || atk < 1) {
                return t("errors.lineInvalid", {
                    line: `${i + 1}`,
                    field: t("stats.attack"),
                });
            }
            if (lineEntries.length == 3) {
                return t("errors.lineMissing", {
                    line: `${i + 1}`,
                    field: t("stats.defense"),
                });
            }
            const def = parseInt(lineEntries[3]) ?? 0;
            if (def > 545 || def < 1) {
                return t("errors.lineInvalid", {
                    line: `${i + 1}`,
                    field: t("stats.defense"),
                });
            }
            if (lineEntries.length == 4) {
                return t("errors.lineMissing", {
                    line: `${i + 1}`,
                    field: t("stats.specialAttack"),
                });
            }
            const spa = parseInt(lineEntries[4]) ?? 0;
            if (spa > 435 || spa < 1) {
                return t("errors.lineInvalid", {
                    line: `${i + 1}`,
                    field: t("stats.specialAttack"),
                });
            }
            if (lineEntries.length == 5) {
                return t("errors.lineMissing", {
                    line: `${i + 1}`,
                    field: t("stats.specialDefense"),
                });
            }
            const spd = parseInt(lineEntries[5]) ?? 0;
            if (spd > 545 || spd < 1) {
                return t("errors.lineInvalid", {
                    line: `${i + 1}`,
                    field: t("stats.specialDefense"),
                });
            }
            if (lineEntries.length == 6) {
                return t("errors.lineMissing", {
                    line: `${i + 1}`,
                    field: t("stats.speed"),
                });
            }
            const spe = parseInt(lineEntries[6]) ?? 0;
            if (spe > 479 || spe < 1) {
                return t("errors.lineInvalid", {
                    line: `${i + 1}`,
                    field: t("stats.speed"),
                });
            }
        }
        return "";
    };

    const error = useMemo(() => getError(value), [value, calculatingError, t]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCalculatingError("");
        const baseValidity = getError(event.target.value, false) === "";
        onChange(event, {
            value: event.target.value,
            isValid: false,
            calculatedValue: [],
        });
        if (!baseValidity) {
            return;
        }
        const lines = event.target.value.split("\n");
        const parsedLines = lines.map((line) =>
            splitIvLine(line).map((entry) => parseInt(entry, 10))
        );

        const calculate = async () => {
            const ivRanges = await calculateIVs(parsedLines);
            for (let i = 0; i < 6; i++) {
                if (ivRanges[i].min === 32) {
                    setCalculatingError(
                        t("errors.noPossibleIv", { stat: ivNames[i] })
                    );
                    onChange(event, {
                        value: event.target.value,
                        isValid: false,
                        calculatedValue: [],
                    });
                    return;
                }
            }
            onChange(event, {
                value: event.target.value,
                isValid: true,
                calculatedValue: ivRanges,
            });
            setCalculatingError("");
        };

        calculate();
    };

    return (
        <TextField
            label={t("labels.ivCalculator")}
            margin="normal"
            value={value}
            error={error !== ""}
            helperText={error}
            onChange={handleChange}
            multiline
            fullWidth
        />
    );
}

export default IvCalculator;
