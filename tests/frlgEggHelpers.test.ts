import assert from "node:assert/strict";

import {
    DEFAULT_FRLG_EGG_ADVANCE_RANGE,
    DEFAULT_FRLG_EGG_COMPATIBILITY,
    DEFAULT_FRLG_EGG_MAX_RESULTS,
    DEFAULT_FRLG_EGG_METHOD,
    DEFAULT_FRLG_EGG_PARENT_IVS,
    DEFAULT_FRLG_EGG_SEED_SKIP_COUNT,
    FRLG_EGG_COMPATIBILITY_OPTIONS,
    EGG_GENDER_OPTIONS,
    FRLG_EGG_IV_PRESETS,
    FRLG_EGG_METHODS,
    applyEggIvPreset,
    buildEggSeedSearchPhases,
    buildEggSeedSettings,
    buildFrameLeewayRange,
    buildSeedSettingKey,
    calculateEggSearchProgress,
    countMatchingInitialSeedPairs,
    filterFrlgEggGameOptions,
    formatEggSearchError,
    formatEggSeedTime,
    formatInheritanceSlot,
    getEggCompareDeltas,
    getEggSeedTimeOffset,
    getPreferredEggSeedSettings,
    getSeedRangeAroundTarget,
    isCompatibleEggParentPair,
    isFrlgEggGame,
    paginateEggResults,
    parseEggSeedSettings,
    skipEggSeedTableEntries,
} from "../src/components/frlgEggHelpers.ts";

assert.equal(isFrlgEggGame("fr"), true);
assert.equal(isFrlgEggGame("fr_jpn_1_0"), true);
assert.equal(isFrlgEggGame("lg_mgba"), true);
assert.equal(isFrlgEggGame("e_painting"), false);
assert.equal(isFrlgEggGame("r_painting"), false);

assert.deepEqual(
    filterFrlgEggGameOptions([
        { value: "fr", label: "FireRed" },
        { value: "e_painting", label: "Emerald painting" },
        { value: "lg_mgba", label: "LeafGreen mGBA" },
        { value: "r_painting", label: "Ruby painting" },
    ]),
    [
        { value: "fr", label: "FireRed" },
        { value: "lg_mgba", label: "LeafGreen mGBA" },
    ]
);

assert.equal(buildSeedSettingKey("mono", "a", "a"), "mono_a_a");
assert.equal(buildSeedSettingKey("stereo", "h", "start"), "stereo_h_start");
assert.deepEqual(parseEggSeedSettings("stereo_h_start_blackout_r"), {
    sound: "stereo",
    buttonMode: "h",
    seedButton: "start",
    extraButton: "blackout_r",
});
assert.deepEqual(parseEggSeedSettings("mono_a_l_none"), {
    sound: "mono",
    buttonMode: "a",
    seedButton: "l",
    extraButton: "none",
});
assert.deepEqual(parseEggSeedSettings("bad"), {
    sound: "mono",
    buttonMode: "h",
    seedButton: "a",
    extraButton: "none",
});
assert.equal(
    buildEggSeedSettings({
        sound: "stereo",
        buttonMode: "r",
        seedButton: "start",
        extraButton: "startup_select",
    }),
    "stereo_r_start_startup_select"
);

assert.equal(isCompatibleEggParentPair(0, 1), true);
assert.equal(isCompatibleEggParentPair(1, 0), true);
assert.equal(isCompatibleEggParentPair(3, 1), true);
assert.equal(isCompatibleEggParentPair(1, 3), true);
assert.equal(isCompatibleEggParentPair(0, 3), true);
assert.equal(isCompatibleEggParentPair(3, 0), true);
assert.equal(isCompatibleEggParentPair(2, 3), true);
assert.equal(isCompatibleEggParentPair(3, 2), true);
assert.equal(isCompatibleEggParentPair(0, 0), false);
assert.equal(isCompatibleEggParentPair(1, 1), false);
assert.equal(isCompatibleEggParentPair(2, 2), false);

assert.deepEqual(
    FRLG_EGG_METHODS.map((option: { value: number }) => option.value),
    [11, 12, 13, 14]
);
assert.equal(DEFAULT_FRLG_EGG_METHOD, 12);
assert.equal(DEFAULT_FRLG_EGG_COMPATIBILITY, 20);
assert.deepEqual(DEFAULT_FRLG_EGG_ADVANCE_RANGE, [1000, 5000]);
assert.deepEqual(DEFAULT_FRLG_EGG_PARENT_IVS, [31, 31, 31, 31, 31, 31]);
assert.equal(DEFAULT_FRLG_EGG_MAX_RESULTS, 10);
assert.equal(DEFAULT_FRLG_EGG_SEED_SKIP_COUNT, 10);
assert.deepEqual(FRLG_EGG_METHODS, [
    { value: 11, labelKey: "options.normal" },
    { value: 12, labelKey: "options.split" },
    { value: 13, labelKey: "options.alternate" },
    { value: 14, labelKey: "options.mixed" },
]);
assert.deepEqual(FRLG_EGG_COMPATIBILITY_OPTIONS, [
    { value: 20, labelKey: "options.eggCompatibilityLow" },
    { value: 50, labelKey: "options.eggCompatibilityMedium" },
    { value: 70, labelKey: "options.eggCompatibilityHigh" },
]);
assert.deepEqual(
    EGG_GENDER_OPTIONS.map((option: { value: number }) => option.value),
    [0, 1, 2, 3]
);
assert.deepEqual(EGG_GENDER_OPTIONS, [
    { value: 0, labelKey: "options.male" },
    { value: 1, labelKey: "options.female" },
    { value: 2, labelKey: "options.genderless" },
    { value: 3, labelKey: "options.ditto" },
]);
assert.deepEqual(FRLG_EGG_IV_PRESETS, [
    { value: "6v", labelKey: "options.ivPreset6v" },
    { value: "0a", labelKey: "options.ivPreset0a" },
    { value: "0s", labelKey: "options.ivPreset0s" },
    { value: "0a0s", labelKey: "options.ivPreset0a0s" },
]);
assert.deepEqual(applyEggIvPreset("6v"), [
    ["31", "31"],
    ["31", "31"],
    ["31", "31"],
    ["31", "31"],
    ["31", "31"],
    ["31", "31"],
]);
assert.deepEqual(applyEggIvPreset("0a"), [
    ["31", "31"],
    ["0", "0"],
    ["31", "31"],
    ["31", "31"],
    ["31", "31"],
    ["31", "31"],
]);
assert.deepEqual(applyEggIvPreset("0s"), [
    ["31", "31"],
    ["31", "31"],
    ["31", "31"],
    ["31", "31"],
    ["31", "31"],
    ["0", "0"],
]);
assert.deepEqual(applyEggIvPreset("0a0s"), [
    ["31", "31"],
    ["0", "0"],
    ["31", "31"],
    ["31", "31"],
    ["31", "31"],
    ["0", "0"],
]);

assert.equal(calculateEggSearchProgress(0, 2, 0, 100), 0);
assert.equal(calculateEggSearchProgress(0, 2, 50, 100), 25);
assert.equal(calculateEggSearchProgress(1, 2, 0, 100), 50);
assert.equal(calculateEggSearchProgress(1, 2, 100, 100), 100);
assert.equal(calculateEggSearchProgress(0, 0, 50, 100), 0);
assert.equal(calculateEggSearchProgress(0, 1, 150, 100), 100);

assert.equal(formatEggSearchError(new Error("worker failed")), "worker failed");
assert.equal(formatEggSearchError({ message: "wasm failed" }), "wasm failed");
assert.equal(formatEggSearchError({ code: "OOM" }), '{"code":"OOM"}');

const eggSeedSearchPhases = buildEggSeedSearchPhases([
    {
        id: "extraA",
        initialSeed: 0x10,
        settings: "mono_a_a_startup_select",
    },
    { id: "noneA", initialSeed: 0x10, settings: "mono_a_a_none" },
    {
        id: "extraB",
        initialSeed: 0x20,
        settings: "stereo_h_start_blackout_r",
    },
    { id: "noneB", initialSeed: 0x10, settings: "stereo_h_start_none" },
]);
assert.deepEqual(
    eggSeedSearchPhases.map((phase) => [
        phase.heldSeeds.map((seed) => seed.id),
        phase.pickupSeeds.map((seed) => seed.id),
        phase.pairOffset,
        phase.pairCount,
    ]),
    [
        [["noneA", "noneB"], ["noneA", "noneB"], 0, 4],
        [["noneA", "noneB"], ["extraA", "extraB"], 4, 4],
        [["extraA", "extraB"], ["noneA", "noneB"], 8, 4],
        [["extraA", "extraB"], ["extraA", "extraB"], 12, 4],
    ]
);
assert.deepEqual(
    buildEggSeedSearchPhases([
        { id: "noneA", initialSeed: 0x10, settings: "mono_a_a_none" },
    ]).map((phase) => [phase.pairOffset, phase.pairCount]),
    [[0, 1]]
);
assert.deepEqual(
    buildEggSeedSearchPhases(
        [
            {
                id: "extraA",
                initialSeed: 0x10,
                settings: "mono_a_a_startup_select",
            },
            { id: "noneA", initialSeed: 0x10, settings: "mono_a_a_none" },
            {
                id: "extraB",
                initialSeed: 0x20,
                settings: "stereo_h_start_blackout_r",
            },
            { id: "noneB", initialSeed: 0x10, settings: "stereo_h_start_none" },
        ],
        true
    ).map((phase) => [phase.pairOffset, phase.pairCount]),
    [
        [0, 4],
        [4, 2],
        [6, 2],
        [8, 2],
    ]
);
assert.equal(
    countMatchingInitialSeedPairs(
        [
            { initialSeed: 0x10 },
            { initialSeed: 0x10 },
            { initialSeed: 0x20 },
        ],
        [
            { initialSeed: 0x10 },
            { initialSeed: 0x20 },
            { initialSeed: 0x20 },
        ]
    ),
    4
);
assert.deepEqual(
    skipEggSeedTableEntries(
        [
            { id: "a0", settings: "mono_h_a_none" },
            { id: "a1", settings: "mono_h_a_none" },
            { id: "b0", settings: "stereo_h_a_none" },
            { id: "a2", settings: "mono_h_a_none" },
            { id: "b1", settings: "stereo_h_a_none" },
            { id: "b2", settings: "stereo_h_a_none" },
        ],
        2
    ).map((seed) => seed.id),
    ["a2", "b2"]
);
assert.deepEqual(
    skipEggSeedTableEntries(
        [{ id: "a0", settings: "mono_h_a_none" }],
        0
    ).map((seed) => seed.id),
    ["a0"]
);
assert.equal(
    getPreferredEggSeedSettings([
        { settings: "stereo_h_start_blackout_r" },
        { settings: "mono_h_a_none" },
    ]),
    "mono_h_a_none"
);
assert.equal(
    getPreferredEggSeedSettings([
        { settings: "stereo_h_start_blackout_r" },
    ]),
    "stereo_h_start_blackout_r"
);
assert.equal(getPreferredEggSeedSettings([]), null);

assert.deepEqual(
    getSeedRangeAroundTarget(
        [
            { initialSeed: 0x10 },
            { initialSeed: 0x20 },
            { initialSeed: 0x30 },
            { initialSeed: 0x40 },
        ],
        0x30,
        1
    ).map((seed) => seed.initialSeed),
    [0x20, 0x30, 0x40]
);
assert.deepEqual(
    getSeedRangeAroundTarget(
        [{ initialSeed: 0x10 }, { initialSeed: 0x20 }],
        0x10,
        10
    ).map((seed) => seed.initialSeed),
    [0x10, 0x20]
);
assert.deepEqual(
    getSeedRangeAroundTarget([{ initialSeed: 0x10 }], 0x99, 1),
    []
);
assert.deepEqual(buildFrameLeewayRange(1000, 10), [990, 1010]);
assert.deepEqual(buildFrameLeewayRange(5, 10), [0, 15]);
assert.deepEqual(paginateEggResults([0, 1, 2, 3, 4], 0, 2), [0, 1]);
assert.deepEqual(paginateEggResults([0, 1, 2, 3, 4], 2, 2), [4]);
assert.deepEqual(paginateEggResults([0, 1, 2], 1, 50), []);

const eggSeedTimeCalls: [number, string][] = [];
assert.equal(
    formatEggSeedTime(1600, "NX2", (frame, system) => {
        eggSeedTimeCalls.push([frame, system]);
        return system === "NX2" ? 1234 : 5678;
    }),
    1234
);
assert.deepEqual(eggSeedTimeCalls, [[100, "NX2"]]);
assert.equal(
    getEggSeedTimeOffset(1760, 1600, "NX2", (frame) => frame * 10),
    100
);
assert.equal(
    getEggSeedTimeOffset(1440, 1600, "NX2", (frame) => frame * 10),
    -100
);
assert.deepEqual(
    getEggCompareDeltas(
        {
            heldSeedTime: 1760,
            pickupSeedTime: 1440,
            heldAdvances: 1012,
            pickupAdvances: 998,
        },
        {
            heldSeedTime: 1600,
            pickupSeedTime: 1600,
            heldAdvances: 1000,
            pickupAdvances: 1000,
        },
        "NX",
        (frame) => frame * 10
    ),
    {
        heldSeedTime: 100,
        pickupSeedTime: -100,
        heldAdvances: 12,
        pickupAdvances: -2,
    }
);

assert.equal(formatInheritanceSlot(0), "");
assert.equal(formatInheritanceSlot(1), "A");
assert.equal(formatInheritanceSlot(2), "B");
