import { apiCall, streamIn, streamOut, streamInOut } from "encore.dev/internal/codegen/api";
import { registerTestHandler } from "encore.dev/internal/codegen/appinit";

import * as bookmarks_service from "../../../../bookmarks/encore.service";

export async function createTest(params, opts) {
    const handler = (await import("../../../../bookmarks/api-test")).createTest;
    registerTestHandler({
        apiRoute: { service: "bookmarks", name: "createTest", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: bookmarks_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("bookmarks", "createTest", params, opts);
}

export async function generateDigestTest(params, opts) {
    const handler = (await import("../../../../bookmarks/api-test")).generateDigestTest;
    registerTestHandler({
        apiRoute: { service: "bookmarks", name: "generateDigestTest", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: bookmarks_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("bookmarks", "generateDigestTest", params, opts);
}

export async function create(params, opts) {
    const handler = (await import("../../../../bookmarks/api")).create;
    registerTestHandler({
        apiRoute: { service: "bookmarks", name: "create", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: bookmarks_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("bookmarks", "create", params, opts);
}

export async function get(params, opts) {
    const handler = (await import("../../../../bookmarks/api")).get;
    registerTestHandler({
        apiRoute: { service: "bookmarks", name: "get", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: bookmarks_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("bookmarks", "get", params, opts);
}

export async function list(params, opts) {
    const handler = (await import("../../../../bookmarks/api")).list;
    registerTestHandler({
        apiRoute: { service: "bookmarks", name: "list", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: bookmarks_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("bookmarks", "list", params, opts);
}

export async function update(params, opts) {
    const handler = (await import("../../../../bookmarks/api")).update;
    registerTestHandler({
        apiRoute: { service: "bookmarks", name: "update", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: bookmarks_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("bookmarks", "update", params, opts);
}

export async function remove(params, opts) {
    const handler = (await import("../../../../bookmarks/api")).remove;
    registerTestHandler({
        apiRoute: { service: "bookmarks", name: "remove", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: bookmarks_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("bookmarks", "remove", params, opts);
}

export async function getDetails(params, opts) {
    const handler = (await import("../../../../bookmarks/api")).getDetails;
    registerTestHandler({
        apiRoute: { service: "bookmarks", name: "getDetails", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: bookmarks_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("bookmarks", "getDetails", params, opts);
}

export async function generateDailyDigest(params, opts) {
    const handler = (await import("../../../../bookmarks/api")).generateDailyDigest;
    registerTestHandler({
        apiRoute: { service: "bookmarks", name: "generateDailyDigest", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: bookmarks_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("bookmarks", "generateDailyDigest", params, opts);
}

export async function getDailyDigest(params, opts) {
    const handler = (await import("../../../../bookmarks/api")).getDailyDigest;
    registerTestHandler({
        apiRoute: { service: "bookmarks", name: "getDailyDigest", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: bookmarks_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("bookmarks", "getDailyDigest", params, opts);
}

export async function listDailyDigests(params, opts) {
    const handler = (await import("../../../../bookmarks/api")).listDailyDigests;
    registerTestHandler({
        apiRoute: { service: "bookmarks", name: "listDailyDigests", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: bookmarks_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("bookmarks", "listDailyDigests", params, opts);
}

export async function generateYesterdaysDigest(params, opts) {
    const handler = (await import("../../../../bookmarks/api")).generateYesterdaysDigest;
    registerTestHandler({
        apiRoute: { service: "bookmarks", name: "generateYesterdaysDigest", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: bookmarks_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":false,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("bookmarks", "generateYesterdaysDigest", params, opts);
}

