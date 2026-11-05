/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts_age from "../accounts/age.js";
import type * as accounts_authOptions from "../accounts/authOptions.js";
import type * as accounts_consent from "../accounts/consent.js";
import type * as accounts_consentText from "../accounts/consentText.js";
import type * as accounts_deletion from "../accounts/deletion.js";
import type * as accounts_mail from "../accounts/mail.js";
import type * as accounts_outbox from "../accounts/outbox.js";
import type * as accounts_profiles from "../accounts/profiles.js";
import type * as accounts_progress from "../accounts/progress.js";
import type * as accounts_sms from "../accounts/sms.js";
import type * as accounts_styles from "../accounts/styles.js";
import type * as ai_models from "../ai/models.js";
import type * as ai_prices from "../ai/prices.js";
import type * as ai_router from "../ai/router.js";
import type * as ai_secondOpinion from "../ai/secondOpinion.js";
import type * as ai_usage from "../ai/usage.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as chat_chats from "../chat/chats.js";
import type * as crons from "../crons.js";
import type * as data_generated from "../data/generated.js";
import type * as data_types from "../data/types.js";
import type * as http from "../http.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_accessQueries from "../lib/accessQueries.js";
import type * as lib_canonical from "../lib/canonical.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_tokens from "../lib/tokens.js";
import type * as modes_package from "../modes/package.js";
import type * as notebooks_ask from "../notebooks/ask.js";
import type * as notebooks_liveCheck from "../notebooks/liveCheck.js";
import type * as notebooks_notebooks from "../notebooks/notebooks.js";
import type * as notebooks_read from "../notebooks/read.js";
import type * as notebooks_sample from "../notebooks/sample.js";
import type * as notebooks_sources from "../notebooks/sources.js";
import type * as privacy_retention from "../privacy/retention.js";
import type * as safety_prefilter from "../safety/prefilter.js";
import type * as safety_redteam from "../safety/redteam.js";
import type * as sources_docx from "../sources/docx.js";
import type * as sources_fileText from "../sources/fileText.js";
import type * as sources_limits from "../sources/limits.js";
import type * as sources_linkFetch from "../sources/linkFetch.js";
import type * as sources_linkGuard from "../sources/linkGuard.js";
import type * as sources_modes from "../sources/modes.js";
import type * as sources_text from "../sources/text.js";
import type * as study_cards from "../study/cards.js";
import type * as study_opinion from "../study/opinion.js";
import type * as study_quizzes from "../study/quizzes.js";
import type * as study_shapes from "../study/shapes.js";
import type * as study_tools from "../study/tools.js";
import type * as study_widgets from "../study/widgets.js";
import type * as widgets_equationSteps from "../widgets/equationSteps.js";
import type * as widgets_fillBlanks from "../widgets/fillBlanks.js";
import type * as widgets_inline from "../widgets/inline.js";
import type * as widgets_longDivision from "../widgets/longDivision.js";
import type * as widgets_package from "../widgets/package.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "accounts/age": typeof accounts_age;
  "accounts/authOptions": typeof accounts_authOptions;
  "accounts/consent": typeof accounts_consent;
  "accounts/consentText": typeof accounts_consentText;
  "accounts/deletion": typeof accounts_deletion;
  "accounts/mail": typeof accounts_mail;
  "accounts/outbox": typeof accounts_outbox;
  "accounts/profiles": typeof accounts_profiles;
  "accounts/progress": typeof accounts_progress;
  "accounts/sms": typeof accounts_sms;
  "accounts/styles": typeof accounts_styles;
  "ai/models": typeof ai_models;
  "ai/prices": typeof ai_prices;
  "ai/router": typeof ai_router;
  "ai/secondOpinion": typeof ai_secondOpinion;
  "ai/usage": typeof ai_usage;
  analytics: typeof analytics;
  auth: typeof auth;
  "chat/chats": typeof chat_chats;
  crons: typeof crons;
  "data/generated": typeof data_generated;
  "data/types": typeof data_types;
  http: typeof http;
  "lib/access": typeof lib_access;
  "lib/accessQueries": typeof lib_accessQueries;
  "lib/canonical": typeof lib_canonical;
  "lib/dates": typeof lib_dates;
  "lib/env": typeof lib_env;
  "lib/tokens": typeof lib_tokens;
  "modes/package": typeof modes_package;
  "notebooks/ask": typeof notebooks_ask;
  "notebooks/liveCheck": typeof notebooks_liveCheck;
  "notebooks/notebooks": typeof notebooks_notebooks;
  "notebooks/read": typeof notebooks_read;
  "notebooks/sample": typeof notebooks_sample;
  "notebooks/sources": typeof notebooks_sources;
  "privacy/retention": typeof privacy_retention;
  "safety/prefilter": typeof safety_prefilter;
  "safety/redteam": typeof safety_redteam;
  "sources/docx": typeof sources_docx;
  "sources/fileText": typeof sources_fileText;
  "sources/limits": typeof sources_limits;
  "sources/linkFetch": typeof sources_linkFetch;
  "sources/linkGuard": typeof sources_linkGuard;
  "sources/modes": typeof sources_modes;
  "sources/text": typeof sources_text;
  "study/cards": typeof study_cards;
  "study/opinion": typeof study_opinion;
  "study/quizzes": typeof study_quizzes;
  "study/shapes": typeof study_shapes;
  "study/tools": typeof study_tools;
  "study/widgets": typeof study_widgets;
  "widgets/equationSteps": typeof widgets_equationSteps;
  "widgets/fillBlanks": typeof widgets_fillBlanks;
  "widgets/inline": typeof widgets_inline;
  "widgets/longDivision": typeof widgets_longDivision;
  "widgets/package": typeof widgets_package;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
