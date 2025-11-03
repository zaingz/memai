import { apiCall, streamIn, streamOut, streamInOut } from "encore.dev/internal/codegen/api";

const TEST_ENDPOINTS = typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test"
    ? await import("./endpoints_testing.js")
    : null;

export async function createTest(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.createTest(params, opts);
    }

    return apiCall("bookmarks", "createTest", params, opts);
}
export async function generateDigestTest(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.generateDigestTest(params, opts);
    }

    return apiCall("bookmarks", "generateDigestTest", params, opts);
}
export async function create(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.create(params, opts);
    }

    return apiCall("bookmarks", "create", params, opts);
}
export async function get(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.get(params, opts);
    }

    return apiCall("bookmarks", "get", params, opts);
}
export async function list(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.list(params, opts);
    }

    return apiCall("bookmarks", "list", params, opts);
}
export async function update(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.update(params, opts);
    }

    return apiCall("bookmarks", "update", params, opts);
}
export async function remove(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.remove(params, opts);
    }

    return apiCall("bookmarks", "remove", params, opts);
}
export async function getDetails(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getDetails(params, opts);
    }

    return apiCall("bookmarks", "getDetails", params, opts);
}
export async function generateDailyDigest(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.generateDailyDigest(params, opts);
    }

    return apiCall("bookmarks", "generateDailyDigest", params, opts);
}
export async function getDailyDigest(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getDailyDigest(params, opts);
    }

    return apiCall("bookmarks", "getDailyDigest", params, opts);
}
export async function listDailyDigests(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.listDailyDigests(params, opts);
    }

    return apiCall("bookmarks", "listDailyDigests", params, opts);
}
export async function generateYesterdaysDigest(opts) {
    const params = undefined;
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.generateYesterdaysDigest(params, opts);
    }

    return apiCall("bookmarks", "generateYesterdaysDigest", params, opts);
}
