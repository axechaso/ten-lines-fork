import { MenuItem, TextField } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";

import { getLocation, getName, useI18n } from "../i18n";
import fetchTenLines from "../tenLines";
import { getFrlgHeldItemSlots } from "../utils/frlgHeldItems";

export type FrlgHeldLocationOption = {
    /** Index into get_wild_locations(); required by the encounter APIs. */
    locationIndex: number;
    /** Actual FRLG map ID; required by profiles and localized names. */
    locationId: number;
};

export type FrlgHeldEncounterSelection = FrlgHeldLocationOption & {
    speciesForm: number;
};

export type FrlgHeldEncounterSelectorProps = {
    /** Resource loading is suspended while the page is hidden/inactive. */
    active: boolean;
    /** Inputs are disabled without restarting the resource lifecycle. */
    disabled?: boolean;
    game: number;
    encounterCategory: number;
    value?: FrlgHeldEncounterSelection;
    onChange: (selection: FrlgHeldEncounterSelection | undefined) => void;
};

type SpeciesOption = {
    speciesForm: number;
    locations: FrlgHeldLocationOption[];
};

type ResourceStatus = "idle" | "loading" | "ready" | "error";

function speciesHasHeldItem(speciesForm: number) {
    const slots = getFrlgHeldItemSlots(speciesForm & 0x7ff);
    return Boolean(slots && (slots.common !== 0 || slots.rare !== 0));
}

export default function FrlgHeldEncounterSelector({
    active,
    disabled = false,
    game,
    encounterCategory,
    value,
    onChange,
}: FrlgHeldEncounterSelectorProps) {
    const { t, resources } = useI18n();
    const [speciesOptions, setSpeciesOptions] = useState<SpeciesOption[]>([]);
    const [status, setStatus] = useState<ResourceStatus>("idle");
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        if (!active) {
            return;
        }

        let cancelled = false;
        setStatus("loading");
        setSpeciesOptions([]);

        const loadOptions = async () => {
            try {
                const tenLines = await fetchTenLines();
                const locationIds = (await tenLines.get_wild_locations(
                    game,
                    encounterCategory
                )) as number[];
                if (cancelled) return;

                const allLocations = locationIds.map(
                    (locationId: number, locationIndex: number) => ({
                        locationId,
                        locationIndex,
                    })
                );

                const locationsWithSpecies = await Promise.all(
                    allLocations.map(async (location) => ({
                        ...location,
                        speciesForms: await tenLines.get_area_species(
                            game,
                            encounterCategory,
                            location.locationIndex
                        ),
                    }))
                );
                if (cancelled) return;

                const locationsBySpecies = new Map<
                    number,
                    FrlgHeldLocationOption[]
                >();
                for (const {
                    locationIndex,
                    locationId,
                    speciesForms,
                } of locationsWithSpecies) {
                    for (const speciesForm of speciesForms as number[]) {
                        if (!speciesHasHeldItem(speciesForm)) {
                            continue;
                        }
                        const locations =
                            locationsBySpecies.get(speciesForm) ?? [];
                        if (
                            !locations.some(
                                (candidate) =>
                                    candidate.locationIndex === locationIndex
                            )
                        ) {
                            locations.push({ locationIndex, locationId });
                            locationsBySpecies.set(speciesForm, locations);
                        }
                    }
                }

                const nextOptions = [...locationsBySpecies.entries()]
                    .map(([speciesForm, locations]) => ({
                        speciesForm,
                        locations,
                    }))
                    .sort((left, right) =>
                        getName(
                            resources,
                            left.speciesForm & 0x7ff,
                            left.speciesForm >> 11
                        ).localeCompare(
                            getName(
                                resources,
                                right.speciesForm & 0x7ff,
                                right.speciesForm >> 11
                            )
                        )
                    );

                setSpeciesOptions(nextOptions);
                setStatus("ready");
            } catch (error) {
                if (cancelled) return;
                console.error(
                    "Failed to load FRLG held-item encounter resources",
                    error
                );
                setSpeciesOptions([]);
                setStatus("error");
            }
        };

        void loadOptions();
        return () => {
            cancelled = true;
        };
    }, [active, encounterCategory, game, resources]);

    useEffect(() => {
        if (!active || status !== "ready") {
            return;
        }

        const selectedSpecies = speciesOptions.find(
            (option) => option.speciesForm === value?.speciesForm
        );
        const normalizedSpecies = selectedSpecies ?? speciesOptions[0];
        const selectedLocation = normalizedSpecies?.locations.find(
            (location) =>
                location.locationIndex === value?.locationIndex &&
                location.locationId === value.locationId
        );
        const normalizedLocation =
            selectedLocation ?? normalizedSpecies?.locations[0];
        const normalizedSelection =
            normalizedSpecies && normalizedLocation
                ? {
                      speciesForm: normalizedSpecies.speciesForm,
                      ...normalizedLocation,
                  }
                : undefined;

        if (
            normalizedSelection?.speciesForm !== value?.speciesForm ||
            normalizedSelection?.locationIndex !== value?.locationIndex ||
            normalizedSelection?.locationId !== value?.locationId
        ) {
            onChangeRef.current(normalizedSelection);
        }
    }, [active, speciesOptions, status, value]);

    const selectedSpecies = useMemo(
        () =>
            speciesOptions.find(
                (option) => option.speciesForm === value?.speciesForm
            ) ?? speciesOptions[0],
        [speciesOptions, value?.speciesForm]
    );
    const locationOptions = selectedSpecies?.locations ?? [];
    const helperText =
        status === "loading"
            ? t("common.loadingResources")
            : status === "error"
              ? t("common.resourceLoadFailed")
              : status === "ready" && speciesOptions.length === 0
                ? t("common.noOptions")
                : undefined;

    return (
        <>
            <TextField
                label={t("labels.pokemon")}
                margin="normal"
                value={selectedSpecies?.speciesForm ?? ""}
                onChange={(event) => {
                    const speciesForm = Number(event.target.value);
                    const option = speciesOptions.find(
                        (candidate) => candidate.speciesForm === speciesForm
                    );
                    const location = option?.locations[0];
                    onChange(
                        option && location
                            ? { speciesForm, ...location }
                            : undefined
                    );
                }}
                select
                fullWidth
                disabled={!active || disabled || status !== "ready"}
                helperText={helperText}
            >
                {speciesOptions.map((option) => (
                    <MenuItem
                        key={option.speciesForm}
                        value={option.speciesForm}
                    >
                        {getName(
                            resources,
                            option.speciesForm & 0x7ff,
                            option.speciesForm >> 11
                        )}
                    </MenuItem>
                ))}
            </TextField>
            <TextField
                label={t("labels.location")}
                margin="normal"
                value={value?.locationIndex ?? ""}
                onChange={(event) => {
                    const locationIndex = Number(event.target.value);
                    const location = locationOptions.find(
                        (candidate) =>
                            candidate.locationIndex === locationIndex
                    );
                    onChange(
                        selectedSpecies && location
                            ? {
                                  speciesForm: selectedSpecies.speciesForm,
                                  ...location,
                              }
                            : undefined
                    );
                }}
                select
                fullWidth
                disabled={
                    !active ||
                    disabled ||
                    status !== "ready" ||
                    !selectedSpecies
                }
                helperText={helperText}
            >
                {locationOptions.map((location) => (
                    <MenuItem
                        key={`${location.locationIndex}-${location.locationId}`}
                        value={location.locationIndex}
                    >
                        {getLocation(resources, game, location.locationId)}
                    </MenuItem>
                ))}
            </TextField>
        </>
    );
}
