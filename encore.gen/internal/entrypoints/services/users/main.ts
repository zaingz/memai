import { registerHandlers, run, type Handler } from "encore.dev/internal/codegen/appinit";
import { Worker, isMainThread } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { availableParallelism } from "node:os";

import { me as meImpl0 } from "../../../../../users/api";
import { updateProfile as updateProfileImpl1 } from "../../../../../users/api";
import { getUserIds as getUserIdsImpl2 } from "../../../../../users/api";
import { userCreated as userCreatedImpl3 } from "../../../../../users/webhooks";
import * as users_service from "../../../../../users/encore.service";

const handlers: Handler[] = [
    {
        apiRoute: {
            service:           "users",
            name:              "me",
            handler:           meImpl0,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: users_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "users",
            name:              "updateProfile",
            handler:           updateProfileImpl1,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: users_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "users",
            name:              "getUserIds",
            handler:           getUserIdsImpl2,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":false,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: users_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "users",
            name:              "userCreated",
            handler:           userCreatedImpl3,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: users_service.default.cfg.middlewares || [],
    },
];

registerHandlers(handlers);

await run(import.meta.url);
