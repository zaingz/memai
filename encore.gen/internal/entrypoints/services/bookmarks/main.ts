import { registerHandlers, run, type Handler } from "encore.dev/internal/codegen/appinit";
import { Worker, isMainThread } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { availableParallelism } from "node:os";

import { createTest as createTestImpl0 } from "../../../../../bookmarks/api-test";
import { generateDigestTest as generateDigestTestImpl1 } from "../../../../../bookmarks/api-test";
import { create as createImpl2 } from "../../../../../bookmarks/api";
import { get as getImpl3 } from "../../../../../bookmarks/api";
import { list as listImpl4 } from "../../../../../bookmarks/api";
import { update as updateImpl5 } from "../../../../../bookmarks/api";
import { remove as removeImpl6 } from "../../../../../bookmarks/api";
import { getDetails as getDetailsImpl7 } from "../../../../../bookmarks/api";
import { generateDailyDigest as generateDailyDigestImpl8 } from "../../../../../bookmarks/api";
import { getDailyDigest as getDailyDigestImpl9 } from "../../../../../bookmarks/api";
import { listDailyDigests as listDailyDigestsImpl10 } from "../../../../../bookmarks/api";
import { generateYesterdaysDigest as generateYesterdaysDigestImpl11 } from "../../../../../bookmarks/api";
import "../../../../../bookmarks/processors/audio-download.processor";
import "../../../../../bookmarks/processors/audio-transcription.processor";
import "../../../../../bookmarks/processors/bookmark-classification.processor";
import "../../../../../bookmarks/processors/bookmark-metadata.processor";
import "../../../../../bookmarks/processors/content-extraction.processor";
import "../../../../../bookmarks/processors/content-summary.processor";
import "../../../../../bookmarks/processors/summary-generation.processor";
import * as bookmarks_service from "../../../../../bookmarks/encore.service";

const handlers: Handler[] = [
    {
        apiRoute: {
            service:           "bookmarks",
            name:              "createTest",
            handler:           createTestImpl0,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: bookmarks_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "bookmarks",
            name:              "generateDigestTest",
            handler:           generateDigestTestImpl1,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: bookmarks_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "bookmarks",
            name:              "create",
            handler:           createImpl2,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: bookmarks_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "bookmarks",
            name:              "get",
            handler:           getImpl3,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: bookmarks_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "bookmarks",
            name:              "list",
            handler:           listImpl4,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: bookmarks_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "bookmarks",
            name:              "update",
            handler:           updateImpl5,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: bookmarks_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "bookmarks",
            name:              "remove",
            handler:           removeImpl6,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: bookmarks_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "bookmarks",
            name:              "getDetails",
            handler:           getDetailsImpl7,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: bookmarks_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "bookmarks",
            name:              "generateDailyDigest",
            handler:           generateDailyDigestImpl8,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: bookmarks_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "bookmarks",
            name:              "getDailyDigest",
            handler:           getDailyDigestImpl9,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: bookmarks_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "bookmarks",
            name:              "listDailyDigests",
            handler:           listDailyDigestsImpl10,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: bookmarks_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "bookmarks",
            name:              "generateYesterdaysDigest",
            handler:           generateYesterdaysDigestImpl11,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":false,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: bookmarks_service.default.cfg.middlewares || [],
    },
];

registerHandlers(handlers);

await run(import.meta.url);
