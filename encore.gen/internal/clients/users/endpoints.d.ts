import { CallOpts } from "encore.dev/api";

type Parameters<T> = T extends (...args: infer P) => unknown ? P : never;
type WithCallOpts<T extends (...args: any) => any> = (
  ...args: [...Parameters<T>, opts?: CallOpts]
) => ReturnType<T>;

import { me as me_handler } from "../../../../users/api.js";
declare const me: WithCallOpts<typeof me_handler>;
export { me };

import { updateProfile as updateProfile_handler } from "../../../../users/api.js";
declare const updateProfile: WithCallOpts<typeof updateProfile_handler>;
export { updateProfile };

import { getUserIds as getUserIds_handler } from "../../../../users/api.js";
declare const getUserIds: WithCallOpts<typeof getUserIds_handler>;
export { getUserIds };

import { userCreated as userCreated_handler } from "../../../../users/webhooks.js";
declare const userCreated: WithCallOpts<typeof userCreated_handler>;
export { userCreated };


