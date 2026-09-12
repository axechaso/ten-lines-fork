import { useEffect, useRef, useState } from "react";
import React from "react";
import {
    Autocomplete,
    Box,
    Checkbox,
    FormControlLabel,
    MenuItem,
    TextField,
} from "@mui/material";
import { getLocation, getName, useI18n } from "../i18n";
import fetchTenLines, { Game } from "../tenLines";
import {
    getWildLocationId,
    getWildLocationOptions,
    normalizeWildLocationIndex,
} from "./wildEncounterLocation";

function WildEncounterSelector({
    wildCategory,
    wildLocation,
    wildPokemon,
    wildLead,
    shouldFilterPokemon,
    onChange,
    game = Game.Gen3,
    allowAnyPokemon = false,
    isSearcher = false,
}: {
    wildCategory: number;
    wildLocation: number;
    wildPokemon: number;
    wildLead: number;
    shouldFilterPokemon: boolean;
    onChange: (
        wildCategory: number,
        wildLocation: number,
        wildPokemon: number,
        wildLead: number,
        shouldFilterPokemon: boolean
    ) => void;
    game?: number;
    allowAnyPokemon?: boolean;
    isSearcher?: boolean;
}) {
    const { t, resources } = useI18n();
    const [wildLocations, setWildLocations] = useState<number[]>([]);
    const [areaSpecies, setAreaSpecies] = useState<number[]>([]);
    const [locationStatus, setLocationStatus] = useState<
        "loading" | "ready" | "error"
    >("loading");
    const [speciesStatus, setSpeciesStatus] = useState<
        "loading" | "ready" | "error"
    >("loading");
    const onChangeRef = useRef(onChange);
    const selectionRef = useRef({
        wildLocation,
        wildPokemon,
        wildLead,
        shouldFilterPokemon,
    });
    onChangeRef.current = onChange;
    selectionRef.current = {
        wildLocation,
        wildPokemon,
        wildLead,
        shouldFilterPokemon,
    };

    useEffect(() => {
        let cancelled = false;
        const fetchWildLocations = async () => {
            setLocationStatus("loading");
            setSpeciesStatus("loading");
            try {
                const tenLines = await fetchTenLines();
                const locations = await tenLines.get_wild_locations(
                    game,
                    wildCategory
                );
                if (cancelled) return;

                setWildLocations(locations);
                setLocationStatus("ready");
                if (locations.length === 0) {
                    setAreaSpecies([]);
                    setSpeciesStatus("ready");
                }
                const current = selectionRef.current;
                onChangeRef.current(
                    wildCategory,
                    normalizeWildLocationIndex(
                        locations,
                        current.wildLocation
                    ),
                    current.wildPokemon,
                    current.wildLead,
                    current.shouldFilterPokemon
                );
            } catch (error) {
                if (cancelled) return;
                console.error("Failed to load wild encounter resources", error);
                setWildLocations([]);
                setAreaSpecies([]);
                setLocationStatus("error");
                setSpeciesStatus("error");
            }
        };
        void fetchWildLocations();
        return () => {
            cancelled = true;
        };
    }, [game, wildCategory]);

    useEffect(() => {
        let cancelled = false;
        const fetchAreaSpecies = async () => {
            if (wildLocations.length === 0) {
                return;
            }

            const current = selectionRef.current;
            const normalizedLocation = normalizeWildLocationIndex(
                wildLocations,
                current.wildLocation
            );
            if (normalizedLocation !== current.wildLocation) {
                onChangeRef.current(
                    wildCategory,
                    normalizedLocation,
                    current.wildPokemon,
                    current.wildLead,
                    current.shouldFilterPokemon
                );
                return;
            }

            setSpeciesStatus("loading");
            try {
                const tenLines = await fetchTenLines();
                const species = await tenLines.get_area_species(
                    game,
                    wildCategory,
                    normalizedLocation
                );
                if (cancelled) return;

                setAreaSpecies(species);
                setSpeciesStatus("ready");
                onChangeRef.current(
                    wildCategory,
                    normalizedLocation,
                    allowAnyPokemon
                        ? current.wildPokemon === -1 ||
                          species.includes(current.wildPokemon)
                            ? current.wildPokemon
                            : -1
                        : species.includes(current.wildPokemon)
                          ? current.wildPokemon
                          : species.length > 0
                            ? species[0]
                            : 0,
                    current.wildLead,
                    current.shouldFilterPokemon
                );
            } catch (error) {
                if (cancelled) return;
                console.error("Failed to load wild area species", error);
                setAreaSpecies([]);
                setSpeciesStatus("error");
            }
        };
        void fetchAreaSpecies();
        return () => {
            cancelled = true;
        };
    }, [allowAnyPokemon, game, wildCategory, wildLocation, wildLocations]);

    const isEmerald = (game & Game.Emerald) == Game.Emerald;

    return (
        <React.Fragment>
            <TextField
                label={t("labels.category")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    onChange(
                        parseInt(event.target.value),
                        wildLocation,
                        wildPokemon,
                        wildLead,
                        shouldFilterPokemon
                    );
                }}
                value={wildCategory}
                select
                fullWidth
            >
                <MenuItem value="0">{t("options.grass")}</MenuItem>
                <MenuItem value="3">{t("options.rockSmash")}</MenuItem>
                <MenuItem value="4">{t("options.surfing")}</MenuItem>
                <MenuItem value="6">{t("options.oldRod")}</MenuItem>
                <MenuItem value="7">{t("options.goodRod")}</MenuItem>
                <MenuItem value="8">{t("options.superRod")}</MenuItem>
            </TextField>
            <Autocomplete
                options={
                    wildLocations.length > 0
                        ? getWildLocationOptions(wildLocations)
                        : [0]
                }
                onChange={(_event, newValue) => {
                    onChange(
                        wildCategory,
                        newValue ?? 0,
                        wildPokemon,
                        wildLead,
                        shouldFilterPokemon
                    );
                }}
                getOptionLabel={(option) =>
                    wildLocations.length === 0
                        ? ""
                        : getLocation(
                              resources,
                              game,
                              getWildLocationId(wildLocations, option)
                          ) || ""
                }
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label={t("labels.location")}
                        margin="normal"
                        helperText={
                            locationStatus === "loading"
                                ? t("common.loadingResources")
                                : locationStatus === "error"
                                  ? t("common.resourceLoadFailed")
                                  : wildLocations.length === 0
                                    ? t("common.noOptions")
                                    : undefined
                        }
                    />
                )}
                value={
                    wildLocations.length > 0
                        ? normalizeWildLocationIndex(wildLocations, wildLocation)
                        : 0
                }
                isOptionEqualToValue={(option, value) => option === value}
                disablePortal
                disableClearable
                selectOnFocus
                fullWidth
                disabled={
                    locationStatus !== "ready" || wildLocations.length === 0
                }
                loading={locationStatus === "loading"}
                loadingText={t("common.loadingResources")}
                noOptionsText={
                    locationStatus === "error"
                        ? t("common.resourceLoadFailed")
                        : t("common.noOptions")
                }
            />
            <Box sx={{ display: "flex", alignItems: "center" }}>
                <TextField
                    label={t("labels.pokemon")}
                    margin="normal"
                    style={{ textAlign: "left" }}
                    onChange={(event) => {
                        onChange(
                            wildCategory,
                            wildLocation,
                            parseInt(event.target.value),
                            wildLead,
                            shouldFilterPokemon
                        );
                    }}
                    value={wildPokemon}
                    select
                    fullWidth
                    disabled={speciesStatus === "loading"}
                    helperText={
                        speciesStatus === "loading"
                            ? t("common.loadingResources")
                            : speciesStatus === "error"
                              ? t("common.resourceLoadFailed")
                              : areaSpecies.length === 0
                                ? t("common.noOptions")
                                : undefined
                    }
                >
                    {areaSpecies.length === 0 && !allowAnyPokemon && (
                        <MenuItem value={wildPokemon} disabled>
                            {speciesStatus === "loading"
                                ? t("common.loadingResources")
                                : speciesStatus === "error"
                                  ? t("common.resourceLoadFailed")
                                  : t("common.noOptions")}
                        </MenuItem>
                    )}
                    {allowAnyPokemon && (
                        <MenuItem value="-1">{t("common.any")}</MenuItem>
                    )}
                    {areaSpecies.map((speciesForm) => (
                        <MenuItem key={speciesForm} value={speciesForm}>
                            {getName(resources, speciesForm & 0x7ff, speciesForm >> 11)}
                        </MenuItem>
                    ))}
                </TextField>
                {!allowAnyPokemon && (
                    <FormControlLabel
                        style={{ marginLeft: 8 }}
                        control={
                            <Checkbox
                                checked={shouldFilterPokemon}
                                onChange={(event) => {
                                    onChange(
                                        wildCategory,
                                        wildLocation,
                                        wildPokemon,
                                        wildLead,
                                        event.target.checked
                                    );
                                }}
                            />
                        }
                        label={t("common.filter")}
                        sx={{
                            whiteSpace: "nowrap",
                        }}
                    />
                )}
            </Box>
            {isEmerald && (
                <TextField
                    label={t("labels.lead")}
                    margin="normal"
                    style={{ textAlign: "left" }}
                    onChange={(event) => {
                        onChange(
                            wildCategory,
                            wildLocation,
                            wildPokemon,
                            parseInt(event.target.value),
                            shouldFilterPokemon
                        );
                    }}
                    value={wildLead}
                    select
                    fullWidth
                >
                    <MenuItem value="255">{t("common.none")}</MenuItem>
                    <MenuItem value="25">{t("options.femaleCuteCharm")}</MenuItem>
                    <MenuItem value="26">{t("options.maleCuteCharm")}</MenuItem>
                    <MenuItem value="27">{t("options.magnetPull")}</MenuItem>
                    <MenuItem value="28">{t("options.static")}</MenuItem>
                    <MenuItem value="32">
                        {t("options.hustlePressureVitalSpirit")}
                    </MenuItem>
                    {isSearcher ? (
                        <MenuItem value="0">{t("options.matchingSynchronize")}</MenuItem>
                    ) : (
                        resources.natures.map((nature, index) => (
                            <MenuItem key={index} value={index}>
                                {`${nature} ${t("messages.matchingSynchronizeSuffix")}`}
                            </MenuItem>
                        ))
                    )}
                </TextField>
            )}
        </React.Fragment>
    );
}

export default WildEncounterSelector;
