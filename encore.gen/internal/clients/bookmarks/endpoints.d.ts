import { CallOpts } from "encore.dev/api";

type Parameters<T> = T extends (...args: infer P) => unknown ? P : never;
type WithCallOpts<T extends (...args: any) => any> = (
  ...args: [...Parameters<T>, opts?: CallOpts]
) => ReturnType<T>;

import { createTest as createTest_handler } from "../../../../bookmarks/api-test.js";
declare const createTest: WithCallOpts<typeof createTest_handler>;
export { createTest };

import { generateDigestTest as generateDigestTest_handler } from "../../../../bookmarks/api-test.js";
declare const generateDigestTest: WithCallOpts<typeof generateDigestTest_handler>;
export { generateDigestTest };

import { create as create_handler } from "../../../../bookmarks/api.js";
declare const create: WithCallOpts<typeof create_handler>;
export { create };

import { get as get_handler } from "../../../../bookmarks/api.js";
declare const get: WithCallOpts<typeof get_handler>;
export { get };

import { list as list_handler } from "../../../../bookmarks/api.js";
declare const list: WithCallOpts<typeof list_handler>;
export { list };

import { update as update_handler } from "../../../../bookmarks/api.js";
declare const update: WithCallOpts<typeof update_handler>;
export { update };

import { remove as remove_handler } from "../../../../bookmarks/api.js";
declare const remove: WithCallOpts<typeof remove_handler>;
export { remove };

import { getDetails as getDetails_handler } from "../../../../bookmarks/api.js";
declare const getDetails: WithCallOpts<typeof getDetails_handler>;
export { getDetails };

import { generateDailyDigest as generateDailyDigest_handler } from "../../../../bookmarks/api.js";
declare const generateDailyDigest: WithCallOpts<typeof generateDailyDigest_handler>;
export { generateDailyDigest };

import { getDailyDigest as getDailyDigest_handler } from "../../../../bookmarks/api.js";
declare const getDailyDigest: WithCallOpts<typeof getDailyDigest_handler>;
export { getDailyDigest };

import { listDailyDigests as listDailyDigests_handler } from "../../../../bookmarks/api.js";
declare const listDailyDigests: WithCallOpts<typeof listDailyDigests_handler>;
export { listDailyDigests };

import { generateYesterdaysDigest as generateYesterdaysDigest_handler } from "../../../../bookmarks/api.js";
declare const generateYesterdaysDigest: WithCallOpts<typeof generateYesterdaysDigest_handler>;
export { generateYesterdaysDigest };


