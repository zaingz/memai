import { registerGateways, registerHandlers, run, type Handler } from "encore.dev/internal/codegen/appinit";

import { gateway as api_gatewayGW } from "../../../../users/auth";
import { createTest as bookmarks_createTestImpl0 } from "../../../../bookmarks/api-test";
import { generateDigestTest as bookmarks_generateDigestTestImpl1 } from "../../../../bookmarks/api-test";
import { create as bookmarks_createImpl2 } from "../../../../bookmarks/api";
import { get as bookmarks_getImpl3 } from "../../../../bookmarks/api";
import { list as bookmarks_listImpl4 } from "../../../../bookmarks/api";
import { update as bookmarks_updateImpl5 } from "../../../../bookmarks/api";
import { remove as bookmarks_removeImpl6 } from "../../../../bookmarks/api";
import { getDetails as bookmarks_getDetailsImpl7 } from "../../../../bookmarks/api";
import { generateDailyDigest as bookmarks_generateDailyDigestImpl8 } from "../../../../bookmarks/api";
import { getDailyDigest as bookmarks_getDailyDigestImpl9 } from "../../../../bookmarks/api";
import { listDailyDigests as bookmarks_listDailyDigestsImpl10 } from "../../../../bookmarks/api";
import { generateYesterdaysDigest as bookmarks_generateYesterdaysDigestImpl11 } from "../../../../bookmarks/api";
import { me as users_meImpl12 } from "../../../../users/api";
import { updateProfile as users_updateProfileImpl13 } from "../../../../users/api";
import { getUserIds as users_getUserIdsImpl14 } from "../../../../users/api";
import { userCreated as users_userCreatedImpl15 } from "../../../../users/webhooks";
import "../../../../bookmarks/processors/audio-download.processor";
import "../../../../bookmarks/processors/audio-transcription.processor";
import "../../../../bookmarks/processors/bookmark-classification.processor";
import "../../../../bookmarks/processors/bookmark-metadata.processor";
import "../../../../bookmarks/processors/content-extraction.processor";
import "../../../../bookmarks/processors/content-summary.processor";
import "../../../../bookmarks/processors/summary-generation.processor";
import * as bookmarks_service from "../../../../bookmarks/encore.service";
import * as users_service from "../../../../users/encore.service";

const gateways: any[] = [
    api_gatewayGW,
];

const handlers: Handler[] = [
    {
        apiRoute: {
            service:           "bookmarks",
            name:              "createTest",
            handler:           bookmarks_createTestImpl0,
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
            handler:           bookmarks_generateDigestTestImpl1,
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
            handler:           bookmarks_createImpl2,
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
            handler:           bookmarks_getImpl3,
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
            handler:           bookmarks_listImpl4,
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
            handler:           bookmarks_updateImpl5,
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
            handler:           bookmarks_removeImpl6,
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
            handler:           bookmarks_getDetailsImpl7,
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
            handler:           bookmarks_generateDailyDigestImpl8,
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
            handler:           bookmarks_getDailyDigestImpl9,
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
            handler:           bookmarks_listDailyDigestsImpl10,
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
            handler:           bookmarks_generateYesterdaysDigestImpl11,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":false,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: bookmarks_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "users",
            name:              "me",
            handler:           users_meImpl12,
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
            handler:           users_updateProfileImpl13,
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
            handler:           users_getUserIdsImpl14,
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
            handler:           users_userCreatedImpl15,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: users_service.default.cfg.middlewares || [],
    },
];

registerGateways(gateways);
registerHandlers(handlers);

await run(import.meta.url);
