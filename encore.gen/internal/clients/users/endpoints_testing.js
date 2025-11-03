import { apiCall, streamIn, streamOut, streamInOut } from "encore.dev/internal/codegen/api";
import { registerTestHandler } from "encore.dev/internal/codegen/appinit";

import * as users_service from "../../../../users/encore.service";

export async function me(params, opts) {
    const handler = (await import("../../../../users/api")).me;
    registerTestHandler({
        apiRoute: { service: "users", name: "me", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: users_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("users", "me", params, opts);
}

export async function updateProfile(params, opts) {
    const handler = (await import("../../../../users/api")).updateProfile;
    registerTestHandler({
        apiRoute: { service: "users", name: "updateProfile", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: users_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("users", "updateProfile", params, opts);
}

export async function getUserIds(params, opts) {
    const handler = (await import("../../../../users/api")).getUserIds;
    registerTestHandler({
        apiRoute: { service: "users", name: "getUserIds", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: users_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":false,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("users", "getUserIds", params, opts);
}

export async function userCreated(params, opts) {
    const handler = (await import("../../../../users/webhooks")).userCreated;
    registerTestHandler({
        apiRoute: { service: "users", name: "userCreated", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: users_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("users", "userCreated", params, opts);
}

