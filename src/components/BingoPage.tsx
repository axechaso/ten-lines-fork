import { Alert, Box, Button, Tab, Tabs } from "@mui/material";
import { useEffect, useState } from "react";
import type {
    ExtendedGeneratorState,
    ExtendedWildGeneratorState,
    FRLGContiguousSeedEntry,
} from "../tenLines/generated.d";
import fetchTenLines, { hexSeed, SEED_IDENTIFIER_TO_GAME } from "../tenLines";
import { useI18n } from "../i18n";
import type { CalibrationFormState } from "./CalibrationForm";
import { createStoredCompareEntry } from "./CalibrationForm";
import { proxy } from "comlink";
import useLocalStorage from "../hooks/useLocalStorage";
import type { CalibrationCompareEntry } from "./CalibrationComparePanel";
import { buildBingoAdvanceRangePages } from "./bingoHelpers";

type BingoState = ExtendedGeneratorState | ExtendedWildGeneratorState;
export type BingoBoardPage = {
    label: string;
    board: BingoState[][];
};
export type BingoCounterPage = {
    label: string;
    counters: number[][];
};
type StoredBingoBoard = BingoBoardPage[] | BingoState[][];
type StoredBingoCounters = BingoCounterPage[] | number[][];

function isBingoBoardPage(value: unknown): value is BingoBoardPage {
    return (
        typeof value === "object" &&
        value !== null &&
        "label" in value &&
        "board" in value
    );
}

function isBingoCounterPage(value: unknown): value is BingoCounterPage {
    return (
        typeof value === "object" &&
        value !== null &&
        "label" in value &&
        "counters" in value
    );
}

function normalizeBingoBoardPages(value: StoredBingoBoard): BingoBoardPage[] {
    if (value.length === 0) {
        return [];
    }
    if (isBingoBoardPage(value[0])) {
        return value as BingoBoardPage[];
    }
    return [{ label: "0", board: value as BingoState[][] }];
}

function normalizeBingoCounterPages(
    value: StoredBingoCounters
): BingoCounterPage[] {
    if (value.length === 0) {
        return [];
    }
    if (isBingoCounterPage(value[0])) {
        return value as BingoCounterPage[];
    }
    return [{ label: "0", counters: value as number[][] }];
}

export function useBingoBoard() {
    const [storedBingoPages, setStoredBingoPages] = useLocalStorage<StoredBingoBoard>(
        "bingo-board",
        []
    );
    const [storedCounterPages, setStoredCounterPages] = useLocalStorage<StoredBingoCounters>(
        "bingo-counters",
        []
    );
    const bingoPages = normalizeBingoBoardPages(storedBingoPages);
    const counterPages = normalizeBingoCounterPages(storedCounterPages);
    const setBingoPages: React.Dispatch<
        React.SetStateAction<BingoBoardPage[]>
    > = (value) => {
        setStoredBingoPages((currentValue: StoredBingoBoard) => {
            const currentPages = normalizeBingoBoardPages(currentValue);
            return typeof value === "function"
                ? value(currentPages)
                : value;
        });
    };
    const setCounterPages: React.Dispatch<
        React.SetStateAction<BingoCounterPage[]>
    > = (value) => {
        setStoredCounterPages((currentValue: StoredBingoCounters) => {
            const currentPages = normalizeBingoCounterPages(currentValue);
            return typeof value === "function"
                ? value(currentPages)
                : value;
        });
    };

    return [bingoPages, setBingoPages, counterPages, setCounterPages] as const;
}

export function getBingoActive() {
    return true;
}

export async function fetchBingo(
    searchSeeds: FRLGContiguousSeedEntry[],
    advancesRange: number[],
    offset: string,
    isStatic: boolean,
    trainerID: string,
    secretID: string,
    game: string,
    calibrationFormState: CalibrationFormState,
    setBingoBoard: React.Dispatch<
        React.SetStateAction<BingoBoardPage[]>
    >,
    setBingoCounters: React.Dispatch<
        React.SetStateAction<BingoCounterPage[]>
    >,
    tvFluctuationMode = false
) {
    const tenLines = await fetchTenLines();
    const advanceRangePages = buildBingoAdvanceRangePages(
        advancesRange,
        tvFluctuationMode
    );
    setBingoBoard(
        advanceRangePages.map((page) => ({
            label: page.label,
            board: [],
        }))
    );
    setBingoCounters(
        advanceRangePages.map((page) => ({
            label: page.label,
            counters: [],
        }))
    );
    const doneCallback = () => {};

    for (
        let pageIndex = 0;
        pageIndex < advanceRangePages.length;
        pageIndex += 1
    ) {
        const advanceRangePage = advanceRangePages[pageIndex];
        const resultCallback = (results: BingoState[]) => {
            setBingoBoard((currentPages) =>
                currentPages.map((page, index) =>
                    index === pageIndex
                        ? {
                              ...page,
                              board: [...page.board, [...results]],
                          }
                        : page
                )
            );
            setBingoCounters((currentPages) =>
                currentPages.map((page, index) =>
                    index === pageIndex
                        ? {
                              ...page,
                              counters: [
                                  ...page.counters,
                                  results.map(() => 0),
                              ],
                          }
                        : page
                )
            );
        };
        if (isStatic) {
            await tenLines.check_seeds_static(
                searchSeeds,
                advanceRangePage.range,
                [0, 0],
                parseInt(offset),
                SEED_IDENTIFIER_TO_GAME[game],
                parseInt(trainerID),
                parseInt(secretID),
                calibrationFormState.staticCategory,
                calibrationFormState.staticPokemon,
                calibrationFormState.method,
                255,
                -1,
                -1,
                [
                    [0, 31],
                    [0, 31],
                    [0, 31],
                    [0, 31],
                    [0, 31],
                    [0, 31],
                ],
                proxy(resultCallback),
                proxy(doneCallback)
            );
        } else {
            await tenLines.check_seeds_wild(
                searchSeeds,
                advanceRangePage.range,
                [0, 0],
                parseInt(offset),
                SEED_IDENTIFIER_TO_GAME[game],
                parseInt(trainerID),
                parseInt(secretID),
                calibrationFormState.wildCategory,
                calibrationFormState.wildLocation,
                -1,
                -1,
                calibrationFormState.method,
                calibrationFormState.wildLead,
                255,
                -1,
                [
                    [0, 31],
                    [0, 31],
                    [0, 31],
                    [0, 31],
                    [0, 31],
                    [0, 31],
                ],
                proxy(resultCallback),
                proxy(doneCallback)
            );
        }
    }
}

function SpriteImage({
    species,
    form = 0,
    gender = 0,
    shiny = false,
}: {
    species: number;
    form?: number;
    gender?: number;
    shiny?: boolean;
}) {
    const [url, setUrl] = useState(
        `https://github.com/lincoln-lm/g5-sprites/blob/master/sprites/${
            shiny ? "s" : ""
        }${gender == 1 ? "f" : ""}${species.toString().padStart(3, "0")}${
            form ? "-" + form : ""
        }.gif?raw=true`
    );
    return (
        <Box
            component="img"
            src={url}
            sx={{
                imageRendering: "pixelated",
            }}
            onError={() =>
                setUrl(
                    `https://github.com/lincoln-lm/g5-sprites/blob/master/sprites/${
                        shiny ? "s" : ""
                    }${species.toString().padStart(3, "0")}${
                        form ? "-" + form : ""
                    }.gif?raw=true`
                )
            }
        />
    );
}

export default function BingoPage({
    sx,
    hidden,
}: {
    sx?: any;
    hidden?: boolean;
}) {
    const { resources, t } = useI18n();
    const [bingoPages, _setBingoPages, counterPages, setCounterPages] =
        useBingoBoard();
    const [, setCompareHistory] = useLocalStorage<CalibrationCompareEntry[]>(
        "calibration-compare-history",
        []
    );
    const [activePageIndex, setActivePageIndex] = useState(0);

    useEffect(() => {
        if (activePageIndex > Math.max(0, bingoPages.length - 1)) {
            setActivePageIndex(Math.max(0, bingoPages.length - 1));
        }
    }, [activePageIndex, bingoPages.length]);

    const activePage = bingoPages[activePageIndex] ?? bingoPages[0];
    const activeCounterPage =
        counterPages[activePageIndex] ?? counterPages[0];
    const bingoBoard = activePage?.board ?? [];
    const counters = activeCounterPage?.counters ?? [];
    const width = bingoBoard[0]?.length ?? 0;
    const height = bingoBoard.length;

    const getGenderBadgeSx = (gender: number) => {
        if (gender === 0) {
            return {
                color: "#dff1ff",
                backgroundColor: "rgba(77, 171, 247, 0.22)",
                border: "1px solid rgba(77, 171, 247, 0.55)",
                boxShadow: "0 0 0 1px rgba(77, 171, 247, 0.1)",
            };
        }
        if (gender === 1) {
            return {
                color: "#ffe4ef",
                backgroundColor: "rgba(255, 107, 154, 0.2)",
                border: "1px solid rgba(255, 107, 154, 0.5)",
                boxShadow: "0 0 0 1px rgba(255, 107, 154, 0.1)",
            };
        }
        return {
            color: "rgba(255, 255, 255, 0.75)",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.06)",
        };
    };

    const getCardSx = (shiny: boolean, marked: boolean) => {
        if (!shiny) {
            return {};
        }
        if (marked) {
            return {
                color: "#2f2100",
                background:
                    "linear-gradient(180deg, #f4dd8c 0%, #d9c56a 100%)",
                boxShadow:
                    "inset 0 0 0 1px rgba(120, 92, 12, 0.28), 0 8px 16px rgba(120, 92, 12, 0.12)",
                "&:hover": {
                    background:
                        "linear-gradient(180deg, #f6e39d 0%, #decb74 100%)",
                },
            };
        }
        return {
            color: "#2f2100",
            background:
                "linear-gradient(180deg, #ffe89c 0%, #f0c44e 100%)",
            boxShadow:
                "inset 0 0 0 1px rgba(130, 96, 8, 0.3), 0 8px 18px rgba(184, 134, 11, 0.16)",
            "&:hover": {
                background:
                    "linear-gradient(180deg, #ffedaa 0%, #f3cc60 100%)",
            },
        };
    };

    if (hidden) {
        return null;
    }
    if (bingoPages.length === 0) {
        return (
            <Box my={2} sx={sx}>
                <Alert severity="info" sx={{ textAlign: "left" }}>
                    {t("messages.emptyBingoBoard")}
                </Alert>
            </Box>
        );
    }
    return (
        <Box sx={{ width: "100%", maxWidth: "100%", overflowX: "auto", ...sx }}>
        {bingoPages.length > 1 && (
            <Tabs
                value={activePageIndex}
                onChange={(_event, nextPage) => setActivePageIndex(nextPage)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{ mb: 2 }}
            >
                {bingoPages.map((page, index) => (
                    <Tab key={`${page.label}-${index}`} label={page.label} />
                ))}
            </Tabs>
        )}
        {width === 0 || height === 0 ? (
            <Alert severity="info" sx={{ textAlign: "left", my: 2 }}>
                {t("messages.emptyBingoBoard")}
            </Alert>
        ) : (
        <Box
            display="grid"
            gridTemplateColumns={`minmax(4.5rem, max-content) repeat(${width}, minmax(10rem, 1fr))`}
            gap={2}
            my={2}
            sx={{
                minWidth: {
                    xs: `calc(4.5rem + ${width} * 10rem + ${width} * 16px)`,
                    md: 0,
                },
            }}
        >
            {Array.from({ length: (width + 1) * (height + 1) }, (_, i) => {
                const [x, y] = [i % (width + 1), Math.floor(i / (width + 1))];
                if (y == 0 && x == 0) return <Box key={i}></Box>;
                if (y == 0)
                    return (
                        <Box
                            key={i}
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            {bingoBoard?.[0]?.[x - 1]?.advances}
                        </Box>
                    );
                if (x == 0)
                    return (
                        <Box
                            key={i}
                            sx={{
                                display: "flex",
                                justifyContent: "right",
                                alignItems: "center",
                            }}
                        >
                            {hexSeed(
                                bingoBoard?.[y - 1]?.[0]?.initialSeed ?? 0,
                                16
                            )}
                        </Box>
                    );
                const entry = bingoBoard?.[y - 1]?.[x - 1];
                const counter = counters?.[y - 1]?.[x - 1];
                if (!entry) return null;
                if (counter === undefined) return null;
                return (
                    <Box
                        key={i}
                        sx={{
                            aspectRatio: "1 / 1",
                            width: "100%",
                        }}
                    >
                        <Button
                            variant="contained"
                            color={counter > 0 ? "success" : "secondary"}
                            fullWidth
                            sx={{
                                height: "100%",
                                position: "relative",
                                px: 1.5,
                                py: 1.25,
                                ...getCardSx(entry.shiny !== 0, counter > 0),
                            }}
                            style={{ display: "block", lineHeight: 1 }}
                            onClick={() => {
                                const newCounters = counters.map((row) => [
                                    ...row,
                                ]);
                                const nextCounter = counter + 1;
                                newCounters[y - 1][x - 1] = nextCounter;
                                setCounterPages((currentPages) =>
                                    currentPages.map((page, pageIndex) =>
                                        pageIndex === activePageIndex
                                            ? {
                                                  ...page,
                                                  counters: newCounters,
                                              }
                                            : page
                                    )
                                );
                                setCompareHistory(
                                    (history: CalibrationCompareEntry[]) => [
                                        ...history,
                                        createStoredCompareEntry(entry),
                                    ]
                                );
                            }}
                            onMouseDown={(e) => {
                                if (e.button === 1) {
                                    e.preventDefault();
                                    const newCounters = counters.map((row) => [
                                        ...row,
                                    ]);
                                    newCounters[y - 1][x - 1] = counter - 1;
                                    if (newCounters[y - 1][x - 1] < 0)
                                        newCounters[y - 1][x - 1] = 0;
                                    setCounterPages((currentPages) =>
                                        currentPages.map((page, pageIndex) =>
                                            pageIndex === activePageIndex
                                                ? {
                                                      ...page,
                                                      counters: newCounters,
                                                  }
                                                : page
                                        )
                                    );
                                }
                            }}
                        >
                            <Box
                                component="span"
                                sx={{
                                    position: "absolute",
                                    top: 10,
                                    left: 10,
                                    minWidth: 28,
                                    height: 28,
                                    px: 1,
                                    borderRadius: "999px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "1.15rem",
                                    fontWeight: 800,
                                    lineHeight: 1,
                                    ...getGenderBadgeSx(entry.gender),
                                }}
                            >
                                {resources.genders[entry.gender]}
                            </Box>
                            <SpriteImage
                                species={entry.species}
                                form={entry.form}
                                gender={entry.gender}
                                shiny={entry.shiny !== 0}
                            />
                            <br />
                            <span>
                                {resources.natures[entry.nature]}
                            </span>
                            <br />
                            <span>{entry.stats.join("/")}</span>
                        </Button>
                        <span>{counters[y - 1][x - 1]}</span>
                    </Box>
                );
            })}
        </Box>
        )}
        </Box>
    );
}
