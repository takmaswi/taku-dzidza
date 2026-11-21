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
import type * as accounts_migrations from "../accounts/migrations.js";
import type * as accounts_outbox from "../accounts/outbox.js";
import type * as accounts_profiles from "../accounts/profiles.js";
import type * as accounts_progress from "../accounts/progress.js";
import type * as accounts_sms from "../accounts/sms.js";
import type * as accounts_voices from "../accounts/voices.js";
import type * as ai_embeddings from "../ai/embeddings.js";
import type * as ai_models from "../ai/models.js";
import type * as ai_prices from "../ai/prices.js";
import type * as ai_promptLines from "../ai/promptLines.js";
import type * as ai_router from "../ai/router.js";
import type * as ai_secondOpinion from "../ai/secondOpinion.js";
import type * as ai_usage from "../ai/usage.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as chat_chats from "../chat/chats.js";
import type * as chat_testTurns from "../chat/testTurns.js";
import type * as classes_access from "../classes/access.js";
import type * as classes_accessQueries from "../classes/accessQueries.js";
import type * as classes_assignments from "../classes/assignments.js";
import type * as classes_classes from "../classes/classes.js";
import type * as classes_codes from "../classes/codes.js";
import type * as classes_guardians from "../classes/guardians.js";
import type * as classes_joining from "../classes/joining.js";
import type * as classes_marking from "../classes/marking.js";
import type * as classes_requests from "../classes/requests.js";
import type * as classes_roles from "../classes/roles.js";
import type * as classes_sharing from "../classes/sharing.js";
import type * as crons from "../crons.js";
import type * as curriculum_catalogue from "../curriculum/catalogue.js";
import type * as data_generated from "../data/generated.js";
import type * as data_types from "../data/types.js";
import type * as flags from "../flags.js";
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
import type * as notebooks_uploads from "../notebooks/uploads.js";
import type * as organisations_access from "../organisations/access.js";
import type * as organisations_codes from "../organisations/codes.js";
import type * as organisations_members from "../organisations/members.js";
import type * as organisations_organisations from "../organisations/organisations.js";
import type * as organisations_owner from "../organisations/owner.js";
import type * as packs_packs from "../packs/packs.js";
import type * as packs_publish from "../packs/publish.js";
import type * as packs_scope from "../packs/scope.js";
import type * as privacy_purge from "../privacy/purge.js";
import type * as privacy_retention from "../privacy/retention.js";
import type * as safety_checks from "../safety/checks.js";
import type * as safety_minorCheck from "../safety/minorCheck.js";
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
import type * as study_testCards from "../study/testCards.js";
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
  "accounts/migrations": typeof accounts_migrations;
  "accounts/outbox": typeof accounts_outbox;
  "accounts/profiles": typeof accounts_profiles;
  "accounts/progress": typeof accounts_progress;
  "accounts/sms": typeof accounts_sms;
  "accounts/voices": typeof accounts_voices;
  "ai/embeddings": typeof ai_embeddings;
  "ai/models": typeof ai_models;
  "ai/prices": typeof ai_prices;
  "ai/promptLines": typeof ai_promptLines;
  "ai/router": typeof ai_router;
  "ai/secondOpinion": typeof ai_secondOpinion;
  "ai/usage": typeof ai_usage;
  analytics: typeof analytics;
  auth: typeof auth;
  "chat/chats": typeof chat_chats;
  "chat/testTurns": typeof chat_testTurns;
  "classes/access": typeof classes_access;
  "classes/accessQueries": typeof classes_accessQueries;
  "classes/assignments": typeof classes_assignments;
  "classes/classes": typeof classes_classes;
  "classes/codes": typeof classes_codes;
  "classes/guardians": typeof classes_guardians;
  "classes/joining": typeof classes_joining;
  "classes/marking": typeof classes_marking;
  "classes/requests": typeof classes_requests;
  "classes/roles": typeof classes_roles;
  "classes/sharing": typeof classes_sharing;
  crons: typeof crons;
  "curriculum/catalogue": typeof curriculum_catalogue;
  "data/generated": typeof data_generated;
  "data/types": typeof data_types;
  flags: typeof flags;
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
  "notebooks/uploads": typeof notebooks_uploads;
  "organisations/access": typeof organisations_access;
  "organisations/codes": typeof organisations_codes;
  "organisations/members": typeof organisations_members;
  "organisations/organisations": typeof organisations_organisations;
  "organisations/owner": typeof organisations_owner;
  "packs/packs": typeof packs_packs;
  "packs/publish": typeof packs_publish;
  "packs/scope": typeof packs_scope;
  "privacy/purge": typeof privacy_purge;
  "privacy/retention": typeof privacy_retention;
  "safety/checks": typeof safety_checks;
  "safety/minorCheck": typeof safety_minorCheck;
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
  "study/testCards": typeof study_testCards;
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
