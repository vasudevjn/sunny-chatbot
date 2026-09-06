import { type ToolSet } from "ai";
import { createWebSearch } from "@/app/api/chat/tools/web-search";
import { createFetchOwnerProfiles } from "@/app/api/chat/tools/fetch-owner-profiles";
import { createVectorDatabaseSearch } from "@/app/api/chat/tools/search-vector-database";
import { createEstimateSolarSystem } from "@/app/api/chat/tools/estimate-system";
import { createMatchSolarProducts } from "@/app/api/chat/tools/match-products";
import { createPrepareProposal } from "@/app/api/chat/tools/prepare-proposal";
import {
  ENABLE_WEB_SEARCH,
  ENABLE_VECTOR_SEARCH,
  ENABLE_OWNER_PROFILES,
  ENABLE_SIZING,
  ENABLE_CATALOGUE,
  ENABLE_PROPOSAL,
  MAX_KB_SEARCHES,
  MAX_WEB_SEARCHES,
  MAX_SIZING_CALLS,
  MAX_CATALOGUE_CALLS,
} from "@/config";
import type { UISource } from "@/types/data";
import type { CollectArtifact } from "@/lib/solar/artifacts";

/** Collector callback: the source plus its retrieved text (for claim verification). */
export type CollectSource = (s: UISource, content?: string) => void;

/**
 * Assembles the enabled tool set.
 *
 * `collect` is called by each search tool for every source it uses, feeding the
 * code-rendered Sources box; the optional content is the text the model saw,
 * used to verify citation claims.
 *
 * `collectArtifact` is the equivalent for the solar tools: it carries their
 * structured results to the UI as typed data parts, so the cards the homeowner
 * sees come from the calculator rather than from the model's prose. Pass no-ops
 * to ignore either stream.
 */
export function buildToolSet(
  collect: CollectSource = () => {},
  collectArtifact: CollectArtifact = () => {}
): ToolSet {
  return {
    ...(ENABLE_SIZING
      ? { estimateSolarSystem: createEstimateSolarSystem(collectArtifact) }
      : {}),
    ...(ENABLE_CATALOGUE
      ? { matchSolarProducts: createMatchSolarProducts(collectArtifact) }
      : {}),
    ...(ENABLE_PROPOSAL
      ? { prepareProposal: createPrepareProposal(collectArtifact) }
      : {}),
    ...(ENABLE_VECTOR_SEARCH
      ? { vectorDatabaseSearch: createVectorDatabaseSearch(collect) }
      : {}),
    ...(ENABLE_WEB_SEARCH ? { webSearch: createWebSearch(collect) } : {}),
    ...(ENABLE_WEB_SEARCH && ENABLE_OWNER_PROFILES
      ? { fetchOwnerProfiles: createFetchOwnerProfiles(collect) }
      : {}),
  };
}

export function buildToolGuidance(): string {
  const sections: string[] = [];

  if (ENABLE_SIZING) {
    sections.push(
      `CALCULATION TOOLS — MANDATORY:
- estimateSolarSystem: MAX ${MAX_SIZING_CALLS} calls per response. This is the ONLY source of numbers about system size, cost, subsidy, savings or payback. You never compute, adjust or round any of these yourself.
- Call it as soon as you have a monthly bill amount OR monthly units, plus the state. Everything else is optional and only sharpens the result.
- Call it again when an input changes — a corrected bill, a roof measurement, a decision about the subsidy. Never patch an old result in your head.
- Its output includes ASSUMPTIONS and CAVEATS. Pass on the ones that matter to this homeowner, in your own plain words. The estimate-not-a-quotation caveat is not optional.
- If it returns "NO ESTIMATE PRODUCED", do not invent figures. Ask for what is missing, or offer a callback.`
    );
  }

  if (ENABLE_CATALOGUE) {
    sections.push(
      `- matchSolarProducts: MAX ${MAX_CATALOGUE_CALLS} calls per response. The ONLY source of product names, specifications, warranties and prices. Never describe or price a product from memory.
- Requires a system size, so run estimateSolarSystem first.
- ALWAYS pass wantsSubsidy. Claiming the PM Surya Ghar subsidy requires domestically made panels, and the tool filters on it. If the homeowner has not said either way, assume they are claiming it.
- The tool returns NOTES explaining what it excluded and why. If it excluded cheaper imported-panel options, mention that trade-off honestly rather than hiding it.
- Refer to a package by its name to the homeowner, but keep its [id: ...] to hand for prepareProposal.`
    );
  }

  if (ENABLE_PROPOSAL) {
    sections.push(
      `- prepareProposal: call when the homeowner asks for a proposal, a quote, or anything in writing. It needs a completed estimate plus their name, mobile number and city.
- It shows the homeowner a form and tells you what is still missing. Invite them to fill it in or tell you directly — never invent a name, number or city, and never fill the form on their behalf.
- Never ask for Aadhaar, PAN, bank or card details. If the homeowner volunteers any, do not repeat them and tell them not to share such details here.
- The document downloads from the form; you do not produce or attach it yourself.`
    );
  }

  if (ENABLE_VECTOR_SEARCH) {
    sections.push(
      `KNOWLEDGE TOOLS (limits per response):
- vectorDatabaseSearch: MAX ${MAX_KB_SEARCHES} calls. Usually 1 is enough. Use it for how the subsidy works, eligibility, the application process, net metering, warranties, loan scheme terms and product documentation. Use more calls ONLY if the first query returned poor results and needs rephrasing.
- Never use it to obtain a number you should have calculated with estimateSolarSystem.`
    );
    if (ENABLE_WEB_SEARCH) {
      sections.push(
        `- webSearch: MAX ${MAX_WEB_SEARCHES} calls, and only when the homeowner asks about something genuinely current that the reference documents do not cover — a scheme change, a new tariff order, a recent policy announcement. This is NOT a general search engine.
- Search the reference documents FIRST. Do not call both tools at once.
- Prefer a single webSearch call with 2-3 additionalQueries over several separate calls.`
      );
    }
    sections.push(
      `- After receiving results, compose your answer. Do NOT search again for the same information.

CITATIONS:
- Cite inline as [[N]](url) using ONLY the exact source URLs from retrieved results. For sources without a URL, use the exact kb: target from their Source Citation field. NEVER fabricate or guess URLs.
- Cite scheme rules, eligibility conditions, official subsidy amounts, process steps, warranty terms and loan terms. Do NOT attach citations to figures that came from estimateSolarSystem — those are computed estimates, not sourced claims.
- Citations are pure markers: every sentence must read completely with citations removed.
- Do NOT write a References or Sources section — the app renders a Sources box automatically from your inline citations.`
    );
  } else {
    // Reference documents disabled — override the search-first instructions in
    // the system prompt so the model does not promise sourcing it cannot do.
    sections.push(
      `NOTE: Reference documents are currently UNAVAILABLE. Ignore any instruction to consult them.
Answer scheme and process questions in general terms and tell the homeowner to confirm the details on the official portal. Do NOT state specific subsidy slab amounts, eligibility rules or DISCOM process steps as though you had verified them.`
    );
    if (ENABLE_WEB_SEARCH) {
      sections.push(
        `- webSearch: MAX ${MAX_WEB_SEARCHES} calls per response, only when the question genuinely needs current or external information. Prefer one call with 2-3 additionalQueries.
- Cite inline as [[N]](url) using ONLY exact URLs from results. NEVER fabricate URLs. Every sentence must read completely with citations removed.
- Do NOT write a References or Sources section.`
      );
    }
  }

  sections.push(
    `IMPORTANT:
- Model and vendor selection are controlled by the administrator backend.`
  );

  return sections.join("\n\n").trim();
}
