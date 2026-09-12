import assert from "node:assert/strict";

import { createServer } from "vite";

const server = await createServer({
    appType: "custom",
    configFile: false,
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true },
});

try {
    const tenLines = await server.ssrLoadModule("/src/tenLines/index.ts");
    const heldItems = await server.ssrLoadModule(
        "/src/utils/frlgHeldItems.ts"
    );
    const { WILD_2, WILD_4 } = tenLines;

    const {
        FRLG_HELD_ENCOUNTER_CATEGORIES,
        FRLG_HELD_ENCOUNTER_GRASS,
        FRLG_HELD_ENCOUNTER_SUPER_ROD,
        FRLG_HELD_PROFILE_ENGLISH_SWITCH,
        FRLG_HELD_PROFILE_FIRE_RED_ENGLISH_SWEET_SCENT,
        FRLG_HELD_SEARCH_MODE_ALL_METHODS,
        FRLG_HELD_SEARCH_MODE_FIVE_TRACKS,
        FRLG_HELD_SEARCH_MODE_FOUR_TRACKS,
        FRLG_HELD_SEARCH_MODE_H1_STABLE,
        HELD_ITEM_FILTER_ANY_ITEM,
        advancePokeRng,
        getFrlgHeldItemForRoll,
        getFrlgHeldItemProbabilities,
        getFrlgHeldItemSlots,
        getFrlgHeldOffsetProfile,
        getFrlgHeldSearchOffsets,
        matchesFrlgHeldItemSearchFilter,
        matchesFrlgHeldShinyFilter,
        predictFrlgHeldItemAtOffsets,
        predictFrlgHeldItem,
    } = heldItems;

    assert.equal(
        FRLG_HELD_PROFILE_FIRE_RED_ENGLISH_SWEET_SCENT,
        FRLG_HELD_PROFILE_ENGLISH_SWITCH
    );
    assert.deepEqual(FRLG_HELD_ENCOUNTER_CATEGORIES, [0, 3, 4, 6, 7, 8]);

    assert.equal(
        matchesFrlgHeldShinyFilter({ shiny: 1 }, 1),
        true
    );
    assert.equal(
        matchesFrlgHeldShinyFilter({ shiny: 2 }, 1),
        true
    );
    assert.equal(
        matchesFrlgHeldShinyFilter({ shiny: 0 }, 1),
        false
    );
    assert.equal(
        matchesFrlgHeldShinyFilter({ shiny: 0 }, 0),
        true
    );

    assert.deepEqual(getFrlgHeldItemSlots(35), {
        common: 0,
        rare: 94,
    });
    assert.deepEqual(getFrlgHeldItemSlots(52), {
        common: 0,
        rare: 110,
    });
    assert.deepEqual(getFrlgHeldItemSlots(1), {
        common: 0,
        rare: 0,
    });
    assert.equal(getFrlgHeldItemSlots(0), undefined);
    assert.equal(getFrlgHeldItemSlots(387), undefined);

    const meowth = { common: 0, rare: 110 };
    assert.equal(getFrlgHeldItemForRoll(meowth, 94), 0);
    assert.equal(getFrlgHeldItemForRoll(meowth, 95), 110);

    const paras = { common: 103, rare: 104 };
    assert.equal(getFrlgHeldItemForRoll(paras, 44), 0);
    assert.equal(getFrlgHeldItemForRoll(paras, 45), 103);
    assert.equal(getFrlgHeldItemForRoll(paras, 94), 103);
    assert.equal(getFrlgHeldItemForRoll(paras, 95), 104);

    // FRLG still consumes the rare branch when it is ITEM_NONE.
    const growlithe = { common: 136, rare: 0 };
    assert.equal(getFrlgHeldItemForRoll(growlithe, 45), 136);
    assert.equal(getFrlgHeldItemForRoll(growlithe, 94), 136);
    assert.equal(getFrlgHeldItemForRoll(growlithe, 95), 0);
    assert.deepEqual(getFrlgHeldItemProbabilities(growlithe), [
        { itemId: 0, percent: 50 },
        { itemId: 136, percent: 50 },
    ]);

    // Equal non-zero slots are assigned unconditionally in the source.
    const snorlax = { common: 134, rare: 134 };
    assert.equal(getFrlgHeldItemForRoll(snorlax, 0), 134);
    assert.equal(getFrlgHeldItemForRoll(snorlax, 99), 134);
    assert.deepEqual(getFrlgHeldItemProbabilities(snorlax), [
        { itemId: 134, percent: 100 },
    ]);

    // Reproduces a captured Mt. Moon B2F Paras H1 sample.
    const iv2EndSeed = 0xcc39bd73;
    assert.equal(advancePokeRng(iv2EndSeed, 1), 0x4641146a);
    assert.equal(advancePokeRng(iv2EndSeed, 164), 0x070793a7);
    let linearState = iv2EndSeed;
    for (let index = 0; index < 100_000; index += 1) {
        linearState =
            (Math.imul(linearState, 0x41c64e6d) + 0x6073) >>> 0;
    }
    assert.equal(advancePokeRng(iv2EndSeed, 100_000), linearState);

    assert.deepEqual(
        getFrlgHeldSearchOffsets(
            166,
            FRLG_HELD_SEARCH_MODE_H1_STABLE
        ),
        [166, 167]
    );
    assert.deepEqual(
        getFrlgHeldSearchOffsets(
            166,
            FRLG_HELD_SEARCH_MODE_ALL_METHODS
        ),
        [165, 166, 167]
    );
    assert.deepEqual(
        getFrlgHeldSearchOffsets(
            166,
            FRLG_HELD_SEARCH_MODE_FOUR_TRACKS
        ),
        [165, 166, 167, 168]
    );
    assert.deepEqual(
        getFrlgHeldSearchOffsets(
            166,
            FRLG_HELD_SEARCH_MODE_FIVE_TRACKS
        ),
        [165, 166, 167, 168, 169]
    );
    assert.deepEqual(
        getFrlgHeldSearchOffsets(
            0,
            FRLG_HELD_SEARCH_MODE_H1_STABLE
        ),
        []
    );

    const prediction = predictFrlgHeldItem({
        profileSet: FRLG_HELD_PROFILE_FIRE_RED_ENGLISH_SWEET_SCENT,
        game: 1 << 3,
        encounterCategory: 0,
        location: 10,
        method: 5,
        species: 46,
        iv2EndSeed,
    });
    assert.equal(prediction?.baseline.offset, 164);
    assert.equal(prediction?.baseline.roll, 99);
    assert.equal(prediction?.baseline.itemId, 104);

    // Captured Route 5 Meowth H1 sample (PID B888E594): +166 is no item.
    const meowthPrediction = predictFrlgHeldItem({
        profileSet: FRLG_HELD_PROFILE_FIRE_RED_ENGLISH_SWEET_SCENT,
        game: 1 << 3,
        encounterCategory: 0,
        location: 91,
        method: 5,
        species: 52,
        iv2EndSeed: 0xc5084076,
    });
    assert.equal(meowthPrediction?.baseline.offset, 166);
    assert.equal(meowthPrediction?.baseline.seed, 0xe13a8b54);
    assert.equal(meowthPrediction?.baseline.roll, 58);
    assert.equal(meowthPrediction?.baseline.itemId, 0);

    const multiOffsetPrediction = predictFrlgHeldItemAtOffsets({
        species: 52,
        iv2EndSeed: 0xc5084076,
        offsets: [165, 166, 167],
    });
    assert.deepEqual(
        multiOffsetPrediction?.rolls.map(({ offset }) => offset),
        [165, 166, 167]
    );
    assert.equal(
        matchesFrlgHeldItemSearchFilter(
            multiOffsetPrediction,
            HELD_ITEM_FILTER_ANY_ITEM
        ),
        multiOffsetPrediction?.rolls.every(({ itemId }) => itemId !== 0)
    );

    // Species omitted from the sparse source table are known no-item species,
    // not unknown predictions (important for the Any Pokemon result view).
    const bulbasaurPrediction = predictFrlgHeldItem({
        profileSet: FRLG_HELD_PROFILE_FIRE_RED_ENGLISH_SWEET_SCENT,
        game: 1 << 3,
        encounterCategory: 0,
        location: 91,
        method: 5,
        species: 1,
        iv2EndSeed: 0xc5084076,
    });
    assert.equal(bulbasaurPrediction?.baseline.itemId, 0);

    assert.equal(
        getFrlgHeldOffsetProfile(
            FRLG_HELD_PROFILE_FIRE_RED_ENGLISH_SWEET_SCENT,
            1 << 3,
            FRLG_HELD_ENCOUNTER_GRASS,
            110,
            5
        )?.baseOffset,
        170
    );
    assert.equal(
        getFrlgHeldOffsetProfile(
            FRLG_HELD_PROFILE_FIRE_RED_ENGLISH_SWEET_SCENT,
            1 << 3,
            FRLG_HELD_ENCOUNTER_GRASS,
            27,
            5
        )?.baseOffset,
        181
    );
    assert.equal(
        getFrlgHeldOffsetProfile(
            FRLG_HELD_PROFILE_FIRE_RED_ENGLISH_SWEET_SCENT,
            1 << 3,
            FRLG_HELD_ENCOUNTER_GRASS,
            14,
            5
        )?.baseOffset,
        170
    );
    assert.equal(
        getFrlgHeldOffsetProfile(
            FRLG_HELD_PROFILE_FIRE_RED_ENGLISH_SWEET_SCENT,
            1 << 4,
            FRLG_HELD_ENCOUNTER_GRASS,
            110,
            5
        ),
        undefined
    );
    assert.equal(
        getFrlgHeldOffsetProfile("unsupported", 1 << 3, 0, 110, 5),
        undefined
    );

    const safariSuperRodH1 = getFrlgHeldOffsetProfile(
        FRLG_HELD_PROFILE_ENGLISH_SWITCH,
        1 << 3,
        FRLG_HELD_ENCOUNTER_SUPER_ROD,
        20,
        5
    );
    assert.equal(safariSuperRodH1?.baseOffset, 170);
    assert.equal(safariSuperRodH1?.alternateOffset, 171);
    assert.equal(safariSuperRodH1?.encounterCategory, 8);
    assert.equal(safariSuperRodH1?.samples, 9);
    assert.equal(
        getFrlgHeldOffsetProfile(
            FRLG_HELD_PROFILE_ENGLISH_SWITCH,
            1 << 3,
            FRLG_HELD_ENCOUNTER_SUPER_ROD,
            20,
            WILD_2
        )?.baseOffset,
        169
    );
    assert.equal(
        getFrlgHeldOffsetProfile(
            FRLG_HELD_PROFILE_ENGLISH_SWITCH,
            1 << 3,
            FRLG_HELD_ENCOUNTER_SUPER_ROD,
            20,
            WILD_4
        )?.baseOffset,
        169
    );
    assert.equal(
        getFrlgHeldOffsetProfile(
            FRLG_HELD_PROFILE_ENGLISH_SWITCH,
            1 << 4,
            FRLG_HELD_ENCOUNTER_SUPER_ROD,
            20,
            5
        ),
        undefined
    );
} finally {
    await server.close();
}
