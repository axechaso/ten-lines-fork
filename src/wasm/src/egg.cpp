#include "initial_seed.hpp"
#include "pokefinder_glue.hpp"
#include "util.hpp"
#include <Core/Enum/Game.hpp>
#include <Core/Enum/Method.hpp>
#include <Core/Gen3/Generators/EggGenerator3.hpp>
#include <Core/Gen3/Profile3.hpp>
#include <Core/Gen3/States/EggState3.hpp>
#include <Core/Parents/Daycare.hpp>
#include <Core/Parents/Filters/StateFilter.hpp>
#include <Core/Parents/PersonalInfo.hpp>
#include <Core/Parents/PersonalLoader.hpp>
#include <Core/RNG/LCRNG.hpp>
#include <Core/Util/Utilities.hpp>
#include <array>
#include <emscripten.h>
#include <emscripten/bind.h>
#include <string>
#include <unordered_map>
#include <vector>

namespace
{
constexpr int RESULT_BATCH_SIZE = 100;
constexpr u32 PROGRESS_UPDATE_INTERVAL = 1024;

class SearchingStatus {
public:
    explicit SearchingStatus(emscripten::callback<void(bool)> callback)
        : callback(callback)
    {
        this->callback(true);
    }

    ~SearchingStatus()
    {
        if (active) {
            callback(false);
        }
    }

    SearchingStatus(const SearchingStatus&) = delete;
    SearchingStatus& operator=(const SearchingStatus&) = delete;

private:
    emscripten::callback<void(bool)> callback;
    bool active = true;
};

bool is_frlg_egg_method(Method method)
{
    return method == Method::RSFRLGBred
        || method == Method::RSFRLGBredSplit
        || method == Method::RSFRLGBredAlternate
        || method == Method::RSFRLGBredMixed;
}

std::array<u8, 6> build_iv_row(emscripten::typed_array<u8> row)
{
    return {
        row[0],
        row[1],
        row[2],
        row[3],
        row[4],
        row[5],
    };
}

std::array<std::array<u8, 6>, 2> build_parent_ivs(emscripten::typed_array<emscripten::typed_array<u8>> parent_ivs)
{
    return {
        build_iv_row(parent_ivs[0]),
        build_iv_row(parent_ivs[1]),
    };
}

StateFilter build_egg_filter(
    u8 shininess,
    int nature,
    u8 gender,
    u8 ability,
    int hidden_power,
    emscripten::typed_array<emscripten::typed_range<u8>> iv_ranges)
{
    std::array<u8, 6> min_ivs = {
        iv_ranges[0].min(),
        iv_ranges[1].min(),
        iv_ranges[2].min(),
        iv_ranges[3].min(),
        iv_ranges[4].min(),
        iv_ranges[5].min(),
    };
    std::array<u8, 6> max_ivs = {
        iv_ranges[0].max(),
        iv_ranges[1].max(),
        iv_ranges[2].max(),
        iv_ranges[3].max(),
        iv_ranges[4].max(),
        iv_ranges[5].max(),
    };

    std::array<bool, 25> natures;
    natures.fill(true);
    if (nature != -1) {
        natures.fill(false);
        natures[nature] = true;
    }

    std::array<bool, 16> powers;
    powers.fill(true);
    if (hidden_power != -1) {
        powers.fill(false);
        powers[hidden_power] = true;
    }

    return StateFilter(gender, ability, shininess, 0, 255, 0, 255, false, min_ivs, max_ivs, natures, powers);
}

void set_frlg_inheritance(
    const Daycare& daycare,
    std::array<u8, 6>& ivs,
    std::array<u8, 6>& inheritance,
    const u8* inherited_stats,
    const u8* inherited_parents)
{
    constexpr u8 stat_order[6] = { 0, 1, 2, 5, 3, 4 };
    u8 available[6] = { 0, 1, 2, 3, 4, 5 };
    auto remove_available = [&available](u8 index, u8 size) {
        for (u8 i = index; i < size; i++) {
            available[i] = available[i + 1];
        }
    };

    u8 stat = available[inherited_stats[0]];
    ivs[stat_order[stat]] = daycare.getParentIV(inherited_parents[0], stat_order[stat]);
    inheritance[stat_order[stat]] = inherited_parents[0] + 1;
    remove_available(stat, 5);

    stat = available[inherited_stats[1]];
    ivs[stat_order[stat]] = daycare.getParentIV(inherited_parents[1], stat_order[stat]);
    inheritance[stat_order[stat]] = inherited_parents[1] + 1;
    remove_available(stat, 4);

    stat = available[inherited_stats[2]];
    ivs[stat_order[stat]] = daycare.getParentIV(inherited_parents[2], stat_order[stat]);
    inheritance[stat_order[stat]] = inherited_parents[2] + 1;
}

std::vector<EggState3> generate_frlg_pid_states(
    u32 held_seed,
    u32 pickup_seed,
    u32 held_initial_advances,
    u32 held_max_advances,
    u32 held_offset,
    u32 pickup_initial_advances,
    u32 pickup_max_advances,
    u32 pickup_offset,
    Method method,
    u8 compatibility,
    const Daycare& daycare,
    const Profile3& profile,
    const StateFilter& filter,
    u32 target_pid)
{
    const PersonalInfo* base = PersonalLoader::getPersonal(profile.getVersion(), daycare.getEggSpecie());
    const PersonalInfo* male = nullptr;
    if (daycare.getEggSpecie() == 29) {
        male = PersonalLoader::getPersonal(profile.getVersion(), 32);
    } else if (daycare.getEggSpecie() == 314) {
        male = PersonalLoader::getPersonal(profile.getVersion(), 313);
    }

    const u16 target_low = target_pid & 0xffff;
    std::vector<EggState3> held_states;
    PokeRNG held_rng(held_seed, held_initial_advances + held_offset);
    for (u32 count = 0; count <= held_max_advances; count++, held_rng.next()) {
        PokeRNG go(held_rng);
        if (((go.nextUShort() * 100) / 0xffff) >= compatibility) {
            continue;
        }

        const u16 low = go.nextUShort(0xfffe) + 1;
        if (low != target_low) {
            continue;
        }

        const PersonalInfo* info = male && (low & 0x8000) ? male : base;
        EggState3 state(
            held_initial_advances + count,
            low,
            Utilities::getGender(low, info),
            info);
        if (filter.compareAbility(state.getAbility()) && filter.compareGender(state.getGender())) {
            held_states.emplace_back(state);
        }
    }

    if (held_states.empty()) {
        return held_states;
    }

    u8 iv1_advance = 0;
    u8 iv2_advance = 0;
    u8 inheritance_advance = 1;
    switch (method) {
    case Method::RSFRLGBred:
        iv1_advance = 1;
        break;
    case Method::RSFRLGBredSplit:
        iv2_advance = 1;
        break;
    case Method::RSFRLGBredAlternate:
        iv1_advance = 1;
        inheritance_advance = 2;
        break;
    case Method::RSFRLGBredMixed:
        inheritance_advance = 2;
        break;
    default:
        return {};
    }

    const u32 target_high = target_pid & 0xffff0000;
    const u16 trainer_shiny_value = profile.getTID() ^ profile.getSID();
    std::vector<EggState3> states;
    PokeRNG pickup_rng(pickup_seed, pickup_initial_advances + pickup_offset);
    for (u32 count = 0; count <= pickup_max_advances; count++, pickup_rng.next()) {
        PokeRNG go(pickup_rng);
        const u32 high = go.nextUShort() << 16;
        if (high != target_high) {
            continue;
        }

        go.advance(iv1_advance);
        const u16 iv1 = go.nextUShort();
        go.advance(iv2_advance);
        const u16 iv2 = go.nextUShort();
        std::array<u8, 6> ivs = {
            static_cast<u8>(iv1 & 31),
            static_cast<u8>((iv1 >> 5) & 31),
            static_cast<u8>((iv1 >> 10) & 31),
            static_cast<u8>((iv2 >> 5) & 31),
            static_cast<u8>((iv2 >> 10) & 31),
            static_cast<u8>(iv2 & 31),
        };

        go.advance(inheritance_advance);
        u8 inherited_stats[3] = {
            static_cast<u8>(go.nextUShort(6)),
            static_cast<u8>(go.nextUShort(5)),
            static_cast<u8>(go.nextUShort(4)),
        };
        u8 inherited_parents[3] = {
            static_cast<u8>(go.nextUShort(2)),
            static_cast<u8>(go.nextUShort(2)),
            static_cast<u8>(go.nextUShort(2)),
        };
        std::array<u8, 6> inheritance = { 0, 0, 0, 0, 0, 0 };
        set_frlg_inheritance(daycare, ivs, inheritance, inherited_stats, inherited_parents);

        for (auto state : held_states) {
            const PersonalInfo* info = male && (target_pid & 0x8000) ? male : base;
            state.update(
                pickup_initial_advances + count,
                target_pid,
                Utilities::getShiny<true>(target_pid, trainer_shiny_value),
                ivs,
                inheritance,
                info);
            if (filter.compareHiddenPower(state.getHiddenPower())
                && filter.compareNature(state.getNature())
                && filter.compareShiny(state.getShiny())
                && filter.compareIV(state.getIVs())) {
                states.emplace_back(state);
            }
        }
    }

    return states;
}

void flush_batch(
    emscripten::typed_array<ExtendedEggGeneratorState>& batch,
    emscripten::callback<void(emscripten::typed_array<ExtendedEggGeneratorState>)> result_callback)
{
    if (batch.size() > 0) {
        result_callback(batch);
        batch = emscripten::typed_array<ExtendedEggGeneratorState>();
    }
}
}

void check_seeds_frlg_egg(
    emscripten::typed_array<FRLGContiguousSeedEntry> held_seeds,
    emscripten::typed_array<FRLGContiguousSeedEntry> pickup_seeds,
    emscripten::typed_range<u32> held_advances_range,
    emscripten::typed_range<u32> pickup_advances_range,
    u32 held_offset,
    u32 pickup_offset,
    Game game,
    u16 trainer_id,
    u16 secret_id,
    Method method,
    u8 compatibility,
    emscripten::typed_array<emscripten::typed_array<u8>> parent_ivs_input,
    emscripten::typed_array<u8> parent_genders_input,
    u16 egg_species,
    u8 shininess,
    int nature,
    u8 gender,
    u8 ability,
    int hidden_power,
    emscripten::typed_array<emscripten::typed_range<u8>> iv_ranges,
    u32 max_results,
    std::string held_settings,
    std::string pickup_settings,
    double target_pid,
    bool same_initial_seed_only,
    emscripten::callback<void(emscripten::typed_array<ExtendedEggGeneratorState>)> result_callback,
    emscripten::callback<void(u32, u32)> progress_callback,
    emscripten::callback<void(bool)> searching_callback)
{
    SearchingStatus searching(searching_callback);

    if (!is_frlg_egg_method(method)) {
        return;
    }

    std::array<std::array<u8, 6>, 2> parent_ivs = build_parent_ivs(parent_ivs_input);
    std::array<u8, 2> parent_ability = { 0, 0 };
    std::array<u8, 2> parent_gender = { parent_genders_input[0], parent_genders_input[1] };
    std::array<u8, 2> parent_item = { 0, 0 };
    std::array<u8, 2> parent_nature = { 0, 0 };

    Daycare daycare(parent_ivs, parent_ability, parent_gender, parent_item, parent_nature, egg_species, false);
    Profile3 profile = build_profile(game, trainer_id, secret_id);
    StateFilter filter = build_egg_filter(shininess, nature, gender, ability, hidden_power, iv_ranges);

    u32 held_initial_advances = held_advances_range.min();
    u32 held_max_advances = held_advances_range.max() - held_initial_advances;
    u32 pickup_initial_advances = pickup_advances_range.min();
    u32 pickup_max_advances = pickup_advances_range.max() - pickup_initial_advances;

    u32 result_count = 0;
    u32 checked_seed_pairs = 0;
    std::unordered_map<u16, std::vector<int>> pickup_indices_by_seed;
    u32 total_seed_pairs = 0;
    if (same_initial_seed_only) {
        pickup_indices_by_seed.reserve(pickup_seeds.size());
        for (int pickup_index = 0; pickup_index < pickup_seeds.size(); pickup_index++) {
            FRLGContiguousSeedEntry pickup_entry = pickup_seeds[pickup_index];
            pickup_indices_by_seed[pickup_entry.initialSeed].push_back(pickup_index);
        }
        for (int held_index = 0; held_index < held_seeds.size(); held_index++) {
            FRLGContiguousSeedEntry held_entry = held_seeds[held_index];
            auto matching_pickups = pickup_indices_by_seed.find(held_entry.initialSeed);
            if (matching_pickups != pickup_indices_by_seed.end()) {
                total_seed_pairs += matching_pickups->second.size();
            }
        }
    } else {
        total_seed_pairs = static_cast<u32>(held_seeds.size()) * static_cast<u32>(pickup_seeds.size());
    }
    emscripten::typed_array<ExtendedEggGeneratorState> batch;
    progress_callback(checked_seed_pairs, total_seed_pairs);

    auto report_progress = [&](bool force = false) {
        if (force || checked_seed_pairs % PROGRESS_UPDATE_INTERVAL == 0 || checked_seed_pairs == total_seed_pairs) {
            progress_callback(checked_seed_pairs, total_seed_pairs);
        }
    };

    auto process_seed_pair = [&](const FRLGContiguousSeedEntry& held_entry, const FRLGContiguousSeedEntry& pickup_entry) {
        const std::string resolved_held_settings = held_entry.settings.empty() ? held_settings : held_entry.settings;
        const std::string resolved_pickup_settings = pickup_entry.settings.empty() ? pickup_settings : pickup_entry.settings;

        EggGenerator3 generator(
            held_initial_advances,
            held_max_advances,
            held_offset,
            pickup_initial_advances,
            pickup_max_advances,
            pickup_offset,
            0,
            0,
            0,
            method,
            compatibility,
            daycare,
            profile,
            filter);

        auto states = target_pid < 0
            ? generator.generate(held_entry.initialSeed, pickup_entry.initialSeed)
            : generate_frlg_pid_states(
                held_entry.initialSeed,
                pickup_entry.initialSeed,
                held_initial_advances,
                held_max_advances,
                held_offset,
                pickup_initial_advances,
                pickup_max_advances,
                pickup_offset,
                method,
                compatibility,
                daycare,
                profile,
                filter,
                static_cast<u32>(target_pid));
        for (const auto& state : states) {
            batch.push_back(ExtendedEggGeneratorState(
                held_entry.initialSeed,
                held_entry.seedTime,
                resolved_held_settings,
                pickup_entry.initialSeed,
                pickup_entry.seedTime,
                resolved_pickup_settings,
                state));
            result_count++;

            if (batch.size() >= RESULT_BATCH_SIZE) {
                flush_batch(batch, result_callback);
            }

            if (max_results > 0 && result_count >= max_results) {
                checked_seed_pairs++;
                report_progress(true);
                flush_batch(batch, result_callback);
                return true;
            }
        }
        checked_seed_pairs++;
        report_progress();
        return false;
    };

    for (int held_index = 0; held_index < held_seeds.size(); held_index++) {
        FRLGContiguousSeedEntry held_entry = held_seeds[held_index];
        if (same_initial_seed_only) {
            auto matching_pickups = pickup_indices_by_seed.find(held_entry.initialSeed);
            if (matching_pickups == pickup_indices_by_seed.end()) {
                continue;
            }
            for (int pickup_index : matching_pickups->second) {
                if (process_seed_pair(held_entry, pickup_seeds[pickup_index])) {
                    return;
                }
            }
        } else {
            for (int pickup_index = 0; pickup_index < pickup_seeds.size(); pickup_index++) {
                if (process_seed_pair(held_entry, pickup_seeds[pickup_index])) {
                    return;
                }
            }
        }
    }

    report_progress(true);
    flush_batch(batch, result_callback);
}

EMSCRIPTEN_BINDINGS(egg)
{
    emscripten::smart_function("check_seeds_frlg_egg", &check_seeds_frlg_egg);
}
