[![](public/icon-180x180.png)](https://tenlines.skrxiaoyu.com)

[English](./README.md) | [简体中文](./README.zh-CN.md)

## Ten Lines Fork

This repository is a personal fork of Lincoln-LM's **Ten Lines**, focused on practical FRLG target filtering and easier self-hosted deployment.

Original upstream project:
[Lincoln-LM/ten-lines](https://github.com/Lincoln-LM/ten-lines)

## What Changed

- Searcher now supports **reachable advance filtering**
- You can enter an **Allowed Advances** range directly in the Searcher tab
- Searcher results are automatically checked against Initial Seed reachability logic
- Results with no reachable Initial Seed route inside the allowed range are filtered out
- Searcher can display **Min Reachable Advances** for each remaining target
- FRLG Searcher reachability filtering now includes a **Sound** selector with `Any`, `Mono`, and `Stereo`
- Searcher now supports a **perfect IV count filter** so you can search for `1V` through `6V` targets by enumerating all valid 31-IV combinations automatically
- The UI now supports **English / Chinese language switching**
- Core in-game naming resources can now render in **Chinese**, including species, natures, abilities, types, and locations
- Chinese UI terminology was cleaned up to better match common community naming and PokeWiki usage
- ID Combo search now supports **multi-select nature filters** and shows **example IV spreads** in the result table
- Calibration now includes a **target / history comparison panel** with quick-add workflow, column visibility controls, delta display, floating window mode, and an optional calculator
- Calibration now also includes a **dynamic correction tool** intended to be used together with [Xuan Yelin](https://space.bilibili.com/29039016?spm_id_from=333.1387.fans.user_card.click)'s script workflow
- Calibration page settings now also control the **dynamic correction tool toggle**, **result-table visible columns**, and an optional **wild-level filter based on the first IV input line**
- Calibration search now runs **manually on submit**, avoiding repeated automatic reruns while users are still entering values
- Searcher and Initial Seed can now **carry a chosen target forward into Calibration compare automatically**
- Calibration compare settings now include an **auto-add target** toggle, enabled by default
- Bingo confirmations can now **append directly into calibration history**, and repeated confirmations of the same result are recorded repeatedly
- Compare target seed display now includes both **hex seed and timing in milliseconds**
- Build flow supports **offline cached FRLG seed data**
- Vite base path is configurable so the site can be deployed cleanly on a custom domain or subdomain

## Why This Fork Exists

In the original workflow, a target found in the Searcher could still be useless in practice:

1. You find a desirable target seed in Searcher
2. You open it in Initial Seed
3. The reachable advances are far too large to be realistic

This fork reduces that problem by letting Searcher pre-filter targets using an allowed advance range, so obviously unreachable targets can be removed earlier.

## Main Features

- FRLG / RSE search tools
- Initial Seed lookup
- ID Combo search with multi-nature filtering and sample IV display
- Calibration tools
- Calibration compare panel with target/history tracking, delta readouts, floating mode, optional calculator, and automatic target carry-over from earlier steps
- Dynamic correction tool for use alongside [Xuan Yelin](https://space.bilibili.com/29039016?spm_id_from=333.1387.fans.user_card.click)'s script, with TV / non-TV support, preserved previous-round values, and split history tables
- Reachable-advance prefiltering in Searcher
- Searcher perfect-IV-count filtering for `1V` to `6V`
- A separate experimental FRLG wild held-item tab using the field-tested English FireRed Sweet Scent profile
- FRLG reachable-search sound filtering with an `Any` option
- English / Chinese UI toggle
- Chinese naming resources for Gen 3 data shown in the interface
- Offline-friendly generated FRLG seed cache
- Self-hostable Vite build output

## Localization Notes

- The site now includes a built-in language toggle in the top navigation bar
- Language choice is stored locally in the browser and persists across reloads
- Chinese text is intended to follow established Pokémon community terminology where practical
- Imported game data names are sourced from bundled PokeFinder i18n resources, while UI copy is maintained in the web app layer
- In Chinese mode, natures are shown with their English counterpart in parentheses for easier cross-reference

## Calibration Notes

- Calibration results can be added directly into a compare panel as either a target or history entry
- History rows can compare against either the target or the previous history row for Seed and advance deltas
- Compare history columns are configurable, including a separate **Stats** column that shows the actual six battle stats (`HP/Atk/Def/SpA/SpD/Spe`)
- History rows include a quick **add again** button so repeated confirmations of the same result can be appended back into history immediately
- Calibration page settings also control the **result table visible columns** and the **dynamic correction tool** toggle
- When using a wild calibration method, calibration page settings can enable a **wild level filter** that only uses the **first line** of the IV calculator input as the filter level
- Compare panel can be switched into a draggable floating window
- The floating compare panel includes an optional built-in calculator for quick frame and timing math
- Calibration searches now run only when you press submit, which helps avoid UI stalls while editing input values
- Clicking **Calibration** from Initial Seed can automatically add the selected target into the compare panel before you search
- If the target originated from Searcher, Calibration compare will try to preserve the selected target's full info, including species/display name and matching search attributes
- Compare panel settings include an **Auto-add target** switch so this behavior can be disabled if you want a manual workflow
- Compare target seed values are shown as `SEED (xxx ms)` for easier timing reference
- Bingo confirmations now sync into compare history automatically, so confirmed hits can be kept as a running calibration log
- The dynamic correction tool is designed to be used together with [Xuan Yelin](https://space.bilibili.com/29039016?spm_id_from=333.1387.fans.user_card.click)'s FRLG script workflow
- Quick-add behavior now routes **Add to Target** into the dynamic tool's `Target Advances` field, while **Add to History** routes into `Actual Hit Advances`
- Opening Calibration from Initial Seed and auto-adding the compare target also syncs that target's advances into the dynamic tool's `Target Advances`
- The dynamic correction tool supports editable TV / non-TV base times, previous-round carry-over, and separate TV / non-TV history tables with `ms` units

## Searcher Notes

- The Searcher nature filter supports multi-select input, with an empty selection meaning `Any`
- The perfect-IV-count filter is separate from manual IV ranges: once enabled, it enumerates every possible combination of exactly `N` perfect stats and searches across those combinations automatically
- For FRLG reachable filtering, choosing Sound = `Any` checks both `Mono` and `Stereo` routes internally and keeps the lower reachable advance result for the same seed
- Searcher rows can pass a selected target forward into Initial Seed / Calibration so later steps can reuse the intended species and spread context

## Held Items Notes

- Held-item searching lives in its own top-level tab and does not add controls or columns to Searcher or Calibration
- The tab only offers Pokémon that actually have a held item in FireRed/LeafGreen; all of their grass/cave locations remain selectable
- It scans a 16-bit initial seed forward over a selected Advance range (up to 100,000 per search); TID, SID, and IV filters are not required
- Known locations automatically fill the field-tested H1 standard Offset; unknown locations use `0` and require a manual Offset before searching
- **H1 stable** checks `O` and `O+1`; **H1/H2/H4 coverage** checks `O-1`, `O`, and `O+1`; **four-track coverage** adds `O+2`; the two five-track modes cover `O-1` through `O+3` and `O-2` through `O+2`
- Shiny + frame range mode searches the entire seed library and filters only by shiny status and Advance range; coverage mode only controls the held-item tracks displayed in its results
- Results show every checked Offset, roll, and predicted item

## ID Combo Notes

- ID Combo search supports selecting multiple target natures at once
- Result rows include a sample IV spread, PID, and seed so you can inspect the kind of hit each TID/SID pair is matching

## Building Locally

Requirements:

- `git`
- `node` / `npm`
- Python with `numpy` and `requests`
- Emscripten / `emsdk`
- `cmake`
- `ninja`

Typical setup:

```bash
git clone --recursive <your-fork-url>
cd ten-lines
npm install
python3 -m pip install --user numpy requests pytest
source ~/emsdk/emsdk_env.sh
npm run build
```

On Windows, use the equivalent Python and emsdk activation commands for your local environment.

## Offline Build Notes

This fork supports cached FRLG seed binaries in:

- `src/wasm/src/generated`
- `public/generated`

If those generated files already exist, the build can reuse them without re-downloading seed data from Google Sheets.

To force a refresh of FRLG seed cache during build:

```bash
TEN_LINES_REFRESH_FRLG_SEEDS=true npm run build
```

## Deployment

After building, deploy the contents of `dist/` to a static web root.

Example:

```bash
npm run build
rsync -av --delete dist/ /var/www/ten-lines/
```

For subdomain deployment, this fork defaults to root-path hosting and no longer requires a hardcoded `/ten-lines/` base path.

## Credit

- Original Ten Lines concept and implementation by Lincoln-LM and upstream contributors
- PokeFinderCore by [Admiral-Fish](https://github.com/Admiral-Fish/PokeFinder)
