import type { MainModule } from "./generated.d";
import GeneratedMainModuleFactory from "./generated/index-combined.js";
import { expose } from "comlink";

let main_module: MainModule;
const MainModuleFactory =
    GeneratedMainModuleFactory as unknown as () => Promise<MainModule>;

MainModuleFactory()
    .then((module) => {
        main_module = module;
        expose(main_module);
        postMessage({ ready: true });
    })
    .catch((error) => {
        postMessage({
            ready: false,
            error: error instanceof Error ? error.message : String(error),
        });
    });
