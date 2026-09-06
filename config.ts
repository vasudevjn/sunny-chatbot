// config.ts
// Central app config (NO static MODEL export) --> myAI6

function getDateAndTime(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return `The day today is ${dateStr} and the time right now is ${timeStr}.`;
}

export const DATE_AND_TIME = getDateAndTime();

// --- Assistant identity (all user-facing naming derives from these) ---
export const AI_NAME = "Sunny"; // the assistant's name

// --- Installer identity (the company Sunny represents) ---
export const INSTALLER_NAME = "Waaree Energies";
export const INSTALLER_TAGLINE = "Rooftop solar for homes in Gujarat and Maharashtra";
// DEMO PLACEHOLDERS. Deliberately not Waaree's real phone and inbox: this is a
// course build whose pricing in lib/solar/data/ is still unverified placeholder
// data, and a generated proposal must not route a homeowner to a real sales
// desk on the strength of an invented quote. Swap these only when the numbers
// behind the quote are real.
export const INSTALLER_PHONE = "+91 90000 00000";
export const INSTALLER_EMAIL = "demo@example.invalid";
export const INSTALLER_SITE = "https://www.waaree.com";

// Kept as an alias so template code that reads OWNER_NAME (page footer, prompts,
// search guidance) keeps working without a rename across the codebase.
export const OWNER_NAME = INSTALLER_NAME;

// Possessive form of the installer name. A name ending in "s" (Waaree Energies)
// takes a bare apostrophe, not "'s" — deriving it here keeps every user-facing
// string and the system prompt correct if the name changes again.
export const INSTALLER_NAME_POSSESSIVE = INSTALLER_NAME.endsWith("s")
  ? `${INSTALLER_NAME}'`
  : `${INSTALLER_NAME}'s`;

// --- Service area ---
// Sunny only advises on installations in these states. Anything else is politely
// declined (enforced in the system prompt and in the sizing engine's validation).
export const SERVICE_STATES = ["GJ", "MH"] as const;
export type ServiceState = (typeof SERVICE_STATES)[number];
export const SERVICE_STATE_NAMES: Record<ServiceState, string> = {
  GJ: "Gujarat",
  MH: "Maharashtra",
};
export const SERVICE_AREA_TEXT = "Gujarat and Maharashtra";

export const AI_DESCRIPTION = `
${AI_NAME} is ${INSTALLER_NAME_POSSESSIVE} solar assistant. It helps homeowners in ${SERVICE_AREA_TEXT} understand rooftop solar, estimate savings from their electricity bill, understand the PM Surya Ghar subsidy, compare systems, and get a draft proposal.
`.trim();

// Browser tab / metadata title. Change freely --- one line, no other edits needed.
export const BROWSER_TAB_TITLE = `${AI_NAME} | ${INSTALLER_NAME}`;

// Opens by introducing itself, then asks for what it needs. Note this repeats
// some of the welcome hero (app/parts/welcome-hero.tsx) directly above it.
export const WELCOME_MESSAGE = `Hi, I'm ${AI_NAME} — ${INSTALLER_NAME_POSSESSIVE} AI assistant for rooftop solar. I can estimate what solar would save you, explain the PM Surya Ghar subsidy, suggest a system that suits your roof, and put together a draft proposal.

To start, tell me your average monthly electricity bill and roughly where you live. If your bill is to hand, upload a photo of it and I'll read the figures myself.`;
export const CLEAR_CHAT_TEXT = "New";

// --- Defaults (PROF REQUIREMENT: Anthropic by default) ---
export const DEFAULT_VENDOR = "anthropic" as const;

// Use Claude Haiku 4.5 (cost-efficient, thinking budget separate from output)
export const DEFAULT_MODEL_ID = "claude-haiku-4-5" as const;

export const DEFAULT_MODE = "chat" as const; // "chat" | "reasoning"

// Default thinking level (used when reasoning is triggered)
export const DEFAULT_THINKING_LEVEL = "medium" as const; // "off" | "low" | "medium" | "high"

// --- Utility Model (background tasks) ---
// Small, fast model used for background work: the moderation classifier and
// conversation compaction summaries. Independent of the chat model above, so you
// can run chat and utilities on different vendors — or switch everything to one
// vendor. The API key for the chosen vendor must be set.
export type UtilityVendor = "anthropic" | "openai" | "fireworks";
export const UTILITY_VENDOR: UtilityVendor = "anthropic";
export const UTILITY_MODEL_ID = "claude-haiku-4-5"; // e.g. "gpt-5.4-mini" for openai, "accounts/fireworks/models/deepseek-v3" for fireworks

// --- Moderation denial messages ---
export const MODERATION_DENIAL_MESSAGE_SEXUAL =
  "I can't discuss explicit sexual content. Please ask something else.";
export const MODERATION_DENIAL_MESSAGE_SEXUAL_MINORS =
  "I can't discuss content involving minors in a sexual context. Please ask something else.";
export const MODERATION_DENIAL_MESSAGE_HARASSMENT =
  "I can't engage with harassing content. Please be respectful.";
export const MODERATION_DENIAL_MESSAGE_HARASSMENT_THREATENING =
  "I can't engage with threatening or harassing content. Please be respectful.";
export const MODERATION_DENIAL_MESSAGE_HATE =
  "I can't engage with hateful content. Please be respectful.";
export const MODERATION_DENIAL_MESSAGE_HATE_THREATENING =
  "I can't engage with threatening hate speech. Please be respectful.";
export const MODERATION_DENIAL_MESSAGE_ILLICIT =
  "I can't discuss illegal activities. Please ask something else.";
export const MODERATION_DENIAL_MESSAGE_ILLICIT_VIOLENT =
  "I can't discuss violent illegal activities. Please ask something else.";
export const MODERATION_DENIAL_MESSAGE_SELF_HARM =
  "I can't discuss self-harm. If you're struggling, please reach out to a mental health professional or crisis helpline.";
export const MODERATION_DENIAL_MESSAGE_SELF_HARM_INTENT =
  "I can't discuss self-harm intentions. If you're struggling, please reach out to a mental health professional or crisis helpline.";
export const MODERATION_DENIAL_MESSAGE_SELF_HARM_INSTRUCTIONS =
  "I can't provide instructions related to self-harm. If you're struggling, please reach out to a mental health professional or crisis helpline.";
export const MODERATION_DENIAL_MESSAGE_VIOLENCE =
  "I can't discuss violent content. Please ask something else.";
export const MODERATION_DENIAL_MESSAGE_VIOLENCE_GRAPHIC =
  "I can't discuss graphic violent content. Please ask something else.";
export const MODERATION_DENIAL_MESSAGE_DEFAULT =
  "Your message violates our guidelines. I can't answer that.";

// --- Pinecone ---
export const PINECONE_TOP_K = 20; // sized for a multi-document KB; raise if the index grows substantially
export const PINECONE_MIN_SCORE = 0.1; // filter out low-relevance matches (lowered to catch acronym/abbreviation queries)
// Must match the index the RAGloader upserts into. The index has to be created
// WITH integrated inference (llama-text-embed-v2), because lib/pinecone.ts
// queries via searchRecords({ query: { inputs: { text } } }) — Pinecone embeds
// the query server-side. A plain vector index will return nothing.
// Names must be lowercase (letters, numbers, hyphens).
export const PINECONE_INDEX_NAME = "sunny-kb";

// Parent-child retrieval (3-namespace architecture)
export const PINECONE_USE_PARENT_CHILD = true; // false = legacy "default" namespace
export const PINECONE_NS_CHILDREN = "children";
export const PINECONE_NS_PARENTS = "parents";
export const PINECONE_NS_PROPOSITIONS = "propositions";
export const PINECONE_PROP_BOOST = 0.5; // proposition score weight
export const PINECONE_PROP_K = 15; // propositions retrieved per search to boost children
export const PINECONE_VISUAL_TOP_K = 20; // topK for the visual-enrichment query (figures/tables/slides of a retrieved source)
export const PINECONE_VISUALS_PER_SOURCE = 20; // max figure/table chunks merged into context per retrieved source (keep >= PINECONE_VISUAL_TOP_K so late-document figures are not cut)

// --- Knowledge Base Scope (tells the model what topics are indexed) ---
// Update this list whenever you ingest new content into Pinecone.
// The model uses this to decide whether to search the KB or skip it entirely.
export const KB_SCOPE = `
The knowledge base currently holds FIVE documents, and nothing else:

1. MNRE's guidelines for Central Financial Assistance to residential consumers under PM Surya Ghar Muft Bijli Yojana — eligibility, the subsidy slabs and cap, the domestic content requirement (DCR) for modules, the national portal application journey, vendor empanelment, inspection, and disbursal to the beneficiary's bank account
2. A one-page MNRE summary of the same subsidy structure, with an indicative table of system size against average monthly consumption
3. MNRE's homeowner FAQ on grid-connected rooftop solar — how such a system works, what happens to surplus generation, roof and shading needs, typical generation, maintenance, and the DISCOM's role
4. MSEDCL's net metering application procedure for Maharashtra — where to get the form, the technical details and documents to submit, the fee, and which office receives it
5. ${INSTALLER_NAME}'s own customer FAQ — what a kit contains, ordering and delivery, installation, subsidy handling, warranty and after-sales service

NOT in the knowledge base. Do not search for these; answer from your own knowledge, say you are not certain, or offer a callback:
- Gujarat-specific net metering rules and GERC regulations
- The MERC regulations and any Maharashtra rule beyond the application procedure above
- Bank loan terms, interest rates and financing schemes
- Panel and inverter datasheets, and detailed warranty documents
- ALMM model lists, installation standards and electrical safety rules
- ${INSTALLER_NAME} company profile, case studies, or service contract terms

NEVER search for a number used in an estimate. Electricity tariffs, slab rates, system prices and rupee subsidy amounts come from the sizing and catalogue tools, never from a document.

Search the knowledge base only for the subsidy scheme and its process, how rooftop solar works, the Maharashtra net metering application, or ${INSTALLER_NAME} customer-service questions.
`.trim();

// --- Exa Web Search ---
export const EXA_NUM_RESULTS = 10;
export const EXA_SEARCH_TYPE = "deep" as const; // "auto" | "neural" | "deep" | "deep-reasoning"
export const EXA_MAX_CHARACTERS = 3000; // max chars of page text per result
// "preferred" makes Exa fetch live page content when possible, reducing the odds
// that stale or deleted pages (e.g. dead university URLs) surface in results.
export const EXA_LIVECRAWL = "preferred" as const; // "never" | "fallback" | "preferred" | "always"
export const EXA_SYSTEM_PROMPT = `Prefer authoritative Indian sources on rooftop solar: mnre.gov.in, pmsuryaghar.gov.in, national and state DISCOM portals (GUVNL, MSEDCL), CEA and SECI publications, and established solar industry press. Avoid lead-generation sites, price-comparison spam, and outdated pages. Never prefer a blog over a government source for scheme rules.`;

// --- Owner Profile Sources (latest information and news) ---
// The owner's official profile pages. For "latest on the owner" questions, the
// model is instructed to web-search these places FIRST: the exact URLs are
// listed in the system prompt, and webSearch restricts results to their
// domains via includeDomains. Update here when a profile moves; everything
// else derives from this list.
export const OWNER_PROFILE_SOURCES = [
  // The installer's own public pages. Used only for webSearch domain hints;
  // the fetchOwnerProfiles tool is disabled for Sunny (see lib/ai/tools.ts).
  { name: `${INSTALLER_NAME} website`, url: INSTALLER_SITE },
];

// Max characters of live page text fetched per profile (fetchOwnerProfiles tool).
export const OWNER_PROFILE_MAX_CHARACTERS = 5000;

// Domains derived from the profile sources, used for webSearch includeDomains.
export const OWNER_PROFILE_DOMAINS = OWNER_PROFILE_SOURCES.map((s) => {
  try {
    return new URL(s.url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}).filter(Boolean);

// --- Chat Route Limits ---
// Hard cap on tool-use steps per request. Must be large enough to cover the
// per-response soft budgets below plus one fetchOwnerProfiles call and the
// final compose step, i.e. >= MAX_KB_SEARCHES + MAX_WEB_SEARCHES + 2.
// Sunny adds three chaining tools (estimate -> match -> prepare proposal) on top
// of the search budgets, so this is raised from the template's 8.
export const MAX_STEPS = 12; // max tool-use steps per request
// Per-response soft budgets (enforced via prompt guidance in lib/ai/tools.ts).
export const MAX_KB_SEARCHES = 2; // max vectorDatabaseSearch calls per response
export const MAX_WEB_SEARCHES = 3; // max webSearch calls per response
export const MAX_MESSAGES = 100; // max messages in conversation history
export const MAX_MESSAGE_TEXT_LENGTH = 10000; // max chars per user message
export const VERCEL_MAX_DURATION = 60; // Vercel Hobby plan function timeout in seconds

// --- Conversation Compaction ---
// Summarizes older messages when token count exceeds threshold to reduce input costs.
export const COMPACTION_ENABLED = true; // set false to disable compaction
export const COMPACTION_TOKEN_THRESHOLD = 40000; // compact when summary + unsummarized messages exceed this (tokens)
export const COMPACTION_KEEP_RECENT = 4; // keep last N messages intact when compacting (2 user + 2 assistant turns)
export const COMPACTION_CHARS_PER_TOKEN = 4; // heuristic: chars/token ratio for estimation (lower = more conservative)
export const COMPACTION_MAX_SUMMARY_WORDS = 1500; // max word limit for LLM summary (LLM should be concise but not artificially short)
export const COMPACTION_MAX_SUMMARY_CHARS = 8000; // hard safety cap on summary length (truncates if LLM exceeds — should rarely trigger)
export const COMPACTION_SHOW_CONTEXT_MEMORY = true; // show "Context Memory" button in header to view summary

// --- Thinking Budget (tokens) ---
export const THINKING_BUDGET_LOW = 2000;
export const THINKING_BUDGET_MEDIUM = 8000;
export const THINKING_BUDGET_HIGH = 15000;
// Thinking level used in plain "chat" mode (reasoning mode uses the routed level).
export const CHAT_THINKING_LEVEL = "low" as const; // "low" | "medium" | "high"

// --- Output Tokens ---
// Hard cap on response tokens per request. undefined = the provider's default.
// If set while Anthropic thinking is enabled, it must EXCEED the thinking
// budget in use (the API rejects max_tokens <= thinking budget).
// 4000 is a RUNAWAY GUARD, not the brevity mechanism — brevity comes from the
// length rules in TONE_STYLE_PROMPT. Hitting this cap truncates mid-sentence,
// so it is set well above any legitimate answer. Must exceed the thinking
// budget in use (CHAT_THINKING_LEVEL "low" = 2000).
export const MAX_OUTPUT_TOKENS: number | undefined = 4000;

// --- Reasoning Escalation ---
export const STRONG_REASONING_LENGTH_THRESHOLD = 1800; // long messages with code keywords → high reasoning

// --- Citation Verification (green check in the Sources box) ---
// The sentence preceding each citation (its claim) is checked against the
// cited source's retrieved text by significant-word containment; legacy
// in-citation quotes, when present, are checked by substring/containment.
export const CITATION_CLAIM_MIN_CHARS = 20; // shorter preceding fragments are not treated as claims
export const CITATION_CLAIM_MAX_CHARS = 300; // claims are trimmed to their last N chars
export const CITATION_CLAIM_MIN_WORD_LENGTH = 4; // "significant" words for claim matching
export const CITATION_CLAIM_MIN_WORDS = 3; // claims with fewer significant words are unverifiable
export const CITATION_CLAIM_MATCH_RATIO = 0.6; // share of significant words that must appear in the source
export const CITATION_QUOTE_MIN_WORD_LENGTH = 3; // "significant" words for quote matching
export const CITATION_QUOTE_MATCH_RATIO = 0.8; // share of quote words that must appear in the source

// --- Rate Limiting ---
export const RATE_LIMIT_ENABLED = true; // set false to disable rate limiting
export const RATE_LIMIT_WINDOW_MS = 60_000; // sliding window size (1 minute)
export const RATE_LIMIT_MAX_REQUESTS = 20; // max requests per window per IP

// --- Pinecone Cache ---
export const PINECONE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// --- Moderation ---
// Provider that checks user messages for harmful content BEFORE they reach the chat model.
// Set via the env var MODERATION_PROVIDER (in Vercel or .env.local); defaults to "llm":
// "llm"    = LLM classifier running on the utility model above (any vendor)
//            ("anthropic" is accepted as a legacy alias for this value)
// "openai" = OpenAI's dedicated moderation API (requires OPENAI_API_KEY with access to omni-moderation-latest)
// "off"    = no moderation call at all; relies solely on the system prompt guardrails
export type ModerationProvider = "llm" | "openai" | "off";
const _moderationEnv = process.env.MODERATION_PROVIDER?.toLowerCase();
export const MODERATION_PROVIDER: ModerationProvider =
  _moderationEnv === "openai" || _moderationEnv === "off"
    ? _moderationEnv
    : "llm";

// "open" = allow requests when the moderation service is unavailable
// "closed" = block requests when the moderation service is unavailable
// (irrelevant when MODERATION_PROVIDER = "off")
export const MODERATION_FAIL_POLICY = "closed" as const;

// --- Reasoning Display ---
// Controls how the thinking/reasoning block is shown in the chat UI.
// "full"       = show collapsible reasoning with full text (debugging only — exposes prompts!)
// "truncated"  = show first N words of reasoning, then "..." (safe, gives a glimpse)
// "hidden"     = show only the past-tense label (e.g., "Reasoned for 2 seconds"), no expandable content
export type ReasoningDisplayMode = "full" | "truncated" | "hidden";
export const REASONING_DISPLAY_MODE: ReasoningDisplayMode = "truncated";
export const REASONING_TRUNCATE_WORDS = 15; // words to show in "truncated" mode

// --- Backend toggles (enabled by default) ---
// Disable web search by setting the env var: ENABLE_WEB_SEARCH=false
export const ENABLE_WEB_SEARCH =
  process.env.ENABLE_WEB_SEARCH?.toLowerCase() !== "false";

// Disable the Pinecone knowledge base by setting the env var: ENABLE_VECTOR_SEARCH=false
// When off: the KB tool is removed from the model, no Pinecone connection is made,
// and PINECONE_API_KEY is not needed. The bot answers from general knowledge (+ web search if enabled). 
export const ENABLE_VECTOR_SEARCH =
  process.env.ENABLE_VECTOR_SEARCH?.toLowerCase() !== "false";

// The template's fetchOwnerProfiles tool fetches an academic's profile pages.
// It has no role for a solar installer; off by default.
export const ENABLE_OWNER_PROFILES =
  process.env.ENABLE_OWNER_PROFILES?.toLowerCase() === "true";

// --- Sunny feature toggles ---
export const ENABLE_BILL_UPLOAD =
  process.env.ENABLE_BILL_UPLOAD?.toLowerCase() !== "false";
export const ENABLE_SIZING =
  process.env.ENABLE_SIZING?.toLowerCase() !== "false";
export const ENABLE_CATALOGUE =
  process.env.ENABLE_CATALOGUE?.toLowerCase() !== "false";
export const ENABLE_PROPOSAL =
  process.env.ENABLE_PROPOSAL?.toLowerCase() !== "false";

// --- Bill upload limits ---
// Base64 inflates payloads by ~33% and Vercel's serverless body limit is 4.5 MB,
// so 3 MB of raw file is the safe ceiling. Images are downscaled in the browser
// before upload, so most phone photos land far below this.
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;
// Longest-edge pixels for the client-side downscale of uploaded photos.
export const UPLOAD_IMAGE_MAX_EDGE = 2000;
export const UPLOAD_IMAGE_QUALITY = 0.85;

// --- Suggested prompts strip ---
// Chips shown above the composer. Grouped by where the homeowner is in the
// journey; the stage is derived from the stored lead (lib/solar/lead-store.ts),
// so the strip moves the conversation forward instead of repeating itself.
export const ENABLE_SUGGESTED_PROMPTS = true;

export type SuggestedPrompt = {
  /** Short text on the chip. */
  label: string;
  /** What actually gets sent when the chip is tapped. */
  prompt: string;
  /** Lucide icon name, resolved in app/parts/suggested-prompts.tsx. */
  icon?: "sun" | "calculator" | "receipt" | "panel" | "wallet" | "file" | "help";
};

export const SUGGESTED_PROMPTS: Record<
  "start" | "sized" | "matched" | "proposed",
  SuggestedPrompt[]
> = {
  start: [
    {
      label: "What would I save?",
      prompt:
        "I would like to know what rooftop solar would save me. What do you need from me to work that out?",
      icon: "calculator",
    },
    {
      label: "Read my bill",
      prompt:
        "I have my electricity bill with me. How do I share it with you so you can work out my savings?",
      icon: "receipt",
    },
    {
      label: "How does solar work?",
      prompt:
        "I am new to this. Can you explain in simple terms how rooftop solar works for a home?",
      icon: "sun",
    },
    {
      label: "Is it worth it?",
      prompt:
        "Honestly, is rooftop solar worth it for an average household, or is it oversold?",
      icon: "help",
    },
  ],
  sized: [
    {
      label: "Explain the subsidy",
      prompt:
        "How does the PM Surya Ghar subsidy work, how much would I get, and what do I have to do to claim it?",
      icon: "wallet",
    },
    {
      label: "Which system suits me?",
      prompt: "Which system would you recommend for me, and what does it include?",
      icon: "panel",
    },
    {
      label: "Loan options",
      prompt:
        "What loan options exist for rooftop solar, and what are their typical terms?",
      icon: "wallet",
    },
    {
      label: "What if my roof is shaded?",
      prompt:
        "Part of my roof gets shade during the day. How much does that change things?",
      icon: "help",
    },
  ],
  matched: [
    {
      label: "Get my draft proposal",
      prompt: "Could you put together a draft proposal I can keep?",
      icon: "file",
    },
    {
      label: "Compare these options",
      prompt:
        "Can you compare the options you showed me and explain what I actually get for the extra money?",
      icon: "panel",
    },
    {
      label: "What is the warranty?",
      prompt:
        "What warranties come with the panels, the inverter and the installation itself?",
      icon: "help",
    },
  ],
  proposed: [
    {
      label: "What happens next?",
      prompt:
        "If I go ahead, what are the steps from here to the system actually running?",
      icon: "help",
    },
    {
      label: "Net metering process",
      prompt:
        "How does the net metering application work, and how long does it usually take?",
      icon: "file",
    },
    {
      label: "Talk to someone",
      prompt: "I would like to speak to a person about this. How do I arrange that?",
      icon: "help",
    },
  ],
};

// --- Solar tool budgets ---
export const MAX_SIZING_CALLS = 3; // re-estimates per response (e.g. user revises the bill)
export const MAX_CATALOGUE_CALLS = 2;
