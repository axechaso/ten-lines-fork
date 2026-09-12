import { useEffect, useRef, useState } from "react";
import React from "react";
import { MenuItem, TextField } from "@mui/material";
import { useI18n, getName } from "../i18n";
import fetchTenLines, { Game } from "../tenLines";
import type { EnumeratedStaticTemplate3 } from "../tenLines/generated.d";

function StaticEncounterSelector({
    staticCategory,
    staticPokemon,
    onChange,
    game = Game.Gen3,
}: {
    staticCategory: number;
    staticPokemon: number;
    onChange: (staticCategory: number, staticPokemon: number) => void;
    game?: number;
}) {
    const { t, resources } = useI18n();
    const [staticTemplates, setStaticTemplates] = useState<
        EnumeratedStaticTemplate3[]
    >([]);
    const [resourceStatus, setResourceStatus] = useState<
        "loading" | "ready" | "error"
    >("loading");
    const onChangeRef = useRef(onChange);
    const staticPokemonRef = useRef(staticPokemon);
    onChangeRef.current = onChange;
    staticPokemonRef.current = staticPokemon;

    useEffect(() => {
        let cancelled = false;
        const fetchStaticTemplates = async () => {
            setResourceStatus("loading");
            try {
                const tenLines = await fetchTenLines();
                const templates = (
                    await tenLines.get_static_template_info(staticCategory)
                ).filter(
                    (template: EnumeratedStaticTemplate3) =>
                        template.version & game
                );
                if (cancelled) return;

                setStaticTemplates(templates);
                setResourceStatus("ready");
                const currentStaticPokemon = staticPokemonRef.current;
                onChangeRef.current(
                    staticCategory,
                    templates.some(
                        (template: EnumeratedStaticTemplate3) =>
                            template.index == currentStaticPokemon
                    )
                        ? currentStaticPokemon
                        : templates.length > 0
                          ? templates[0].index
                          : 0
                );
            } catch (error) {
                if (cancelled) return;
                console.error("Failed to load static encounter resources", error);
                setStaticTemplates([]);
                setResourceStatus("error");
            }
        };
        void fetchStaticTemplates();
        return () => {
            cancelled = true;
        };
    }, [staticCategory, game]);

    const isFRLG = game & Game.FRLG;
    const isFRLGE = game & (Game.FRLG | Game.Emerald);

    return (
        <React.Fragment>
            <TextField
                label={t("labels.category")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    onChange(parseInt(event.target.value), staticPokemon);
                }}
                value={staticCategory}
                select
                fullWidth
            >
                <MenuItem value="0">{t("options.starters")}</MenuItem>
                <MenuItem value="1">{t("options.fossils")}</MenuItem>
                <MenuItem value="2">{t("options.gifts")}</MenuItem>
                {isFRLG && <MenuItem value="3">{t("options.gameCorner")}</MenuItem>}
                <MenuItem value="4">{t("options.stationary")}</MenuItem>
                <MenuItem value="5">{t("options.legends")}</MenuItem>
                {isFRLGE && <MenuItem value="6">{t("options.events")}</MenuItem>}
                <MenuItem value="7">{t("options.roamers")}</MenuItem>
                {!isFRLG && (
                    <MenuItem value="8">{t("options.blisyEvents")}</MenuItem>
                )}
            </TextField>
            <TextField
                label={t("labels.pokemon")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    onChange(staticCategory, parseInt(event.target.value));
                }}
                value={staticPokemon}
                select
                fullWidth
                disabled={resourceStatus === "loading"}
                helperText={
                    resourceStatus === "loading"
                        ? t("common.loadingResources")
                        : resourceStatus === "error"
                          ? t("common.resourceLoadFailed")
                          : staticTemplates.length === 0
                            ? t("common.noOptions")
                            : undefined
                }
            >
                {staticTemplates.length === 0 && (
                    <MenuItem value={staticPokemon} disabled>
                        {resourceStatus === "loading"
                            ? t("common.loadingResources")
                            : resourceStatus === "error"
                              ? t("common.resourceLoadFailed")
                              : t("common.noOptions")}
                    </MenuItem>
                )}
                {staticTemplates.map((template) => (
                    <MenuItem key={template.index} value={template.index}>
                        {`${getName(resources, template.species, template.form)}${
                            template.shiny == 1
                                ? ` (${t("options.shinyLocked")})`
                                : template.species == 251
                                  ? ` (${t("options.lockBreak")})`
                                  : ""
                        } - ${resources.games[template.version]}`}
                    </MenuItem>
                ))}
            </TextField>
        </React.Fragment>
    );
}

export default StaticEncounterSelector;
