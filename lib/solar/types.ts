import { z } from "zod";
import { SERVICE_STATES } from "@/config";

/**
 * The states the installer serves. config.ts is the single source of truth;
 * adding a state there flows through to the tool schemas automatically (and
 * will then fail to compile until that state gets a profile and a tariff).
 */
export const serviceStateSchema = z.enum(SERVICE_STATES);
export type ServiceStateCode = z.infer<typeof serviceStateSchema>;

export const connectionPhaseSchema = z.enum(["single", "three"]);
export type ConnectionPhase = z.infer<typeof connectionPhaseSchema>;

export const productTierSchema = z.enum(["value", "standard", "premium"]);
export type ProductTier = z.infer<typeof productTierSchema>;

export const roofTypeSchema = z.enum(["rcc", "metal", "tile", "ground"]);
export type RoofType = z.infer<typeof roofTypeSchema>;

// --- Bill extraction (Feature 2) -------------------------------------------

export const billExtractionSchema = z.object({
  discom: z
    .string()
    .nullable()
    .describe(
      "Distribution company name exactly as printed, e.g. 'MSEDCL', 'Adani Electricity', 'MGVCL'. Null if not visible."
    ),
  state: z
    .enum(["GJ", "MH", "OTHER"])
    .nullable()
    .describe(
      "State inferred from the DISCOM or address: GJ for Gujarat, MH for Maharashtra, OTHER for anywhere else. Null if it cannot be determined."
    ),
  consumerNumber: z
    .string()
    .nullable()
    .describe("Consumer number / account number as printed. Null if not visible."),
  billingMonth: z
    .string()
    .nullable()
    .describe("Billing period or month, e.g. '2026-07' or 'July 2026'. Null if not visible."),
  unitsConsumed: z
    .number()
    .nullable()
    .describe("Units (kWh) consumed in this billing period. Null if not visible."),
  billAmountInr: z
    .number()
    .nullable()
    .describe("Total amount payable in rupees for this bill. Null if not visible."),
  sanctionedLoadKw: z
    .number()
    .nullable()
    .describe("Sanctioned load / contract demand in kW. Null if not visible."),
  tariffCategory: z
    .string()
    .nullable()
    .describe("Tariff category as printed, e.g. 'LT-I Residential', 'RGP'. Null if not visible."),
  connectionPhase: connectionPhaseSchema
    .nullable()
    .describe("'single' or 'three' phase, if stated on the bill. Null otherwise."),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe(
      "How confident you are in the figures above. 'low' if the image is blurry, cropped, or you had to guess any number."
    ),
  warnings: z
    .array(z.string())
    .describe(
      "Plain-language notes about anything unclear, e.g. 'Units consumed was partly obscured'. Empty array if everything was legible."
    ),
});
export type BillExtraction = z.infer<typeof billExtractionSchema>;

// --- Sizing (Feature 3) -----------------------------------------------------

export const sizingInputSchema = z.object({
  state: serviceStateSchema.describe(
    "State code: 'GJ' for Gujarat, 'MH' for Maharashtra. These are the only states served."
  ),
  monthlyBillInr: z
    .number()
    .positive()
    .optional()
    .describe("Average monthly electricity bill in rupees. Provide this OR monthlyUnits."),
  monthlyUnits: z
    .number()
    .positive()
    .optional()
    .describe("Average monthly consumption in units (kWh). Preferred over the bill amount when known."),
  discom: z
    .string()
    .optional()
    .describe("Distribution company, e.g. 'MSEDCL' or 'MGVCL'. Leave empty to use the state default."),
  roofAreaSqft: z
    .number()
    .positive()
    .optional()
    .describe("Usable shade-free roof area in square feet. Omit if unknown."),
  sanctionedLoadKw: z
    .number()
    .positive()
    .optional()
    .describe("Sanctioned load in kW from the bill. Caps the system size under net metering."),
  phase: connectionPhaseSchema
    .optional()
    .describe("Connection phase, if known."),
  tier: productTierSchema
    .optional()
    .describe("Price tier for the cost estimate. Defaults to 'standard'."),
  wantsSubsidy: z
    .boolean()
    .optional()
    .describe("Whether the homeowner intends to claim the PM Surya Ghar subsidy. Defaults to true."),
  shadingFactor: z
    .number()
    .min(0.3)
    .max(1)
    .optional()
    .describe("0-1 multiplier for shading losses. 1 = unshaded. Only pass if shading was discussed."),
});
export type SizingInput = z.infer<typeof sizingInputSchema>;

/** Which input ended up limiting the recommended system size. */
export type BindingConstraint =
  | "consumption"
  | "roof-area"
  | "sanctioned-load"
  | "state-cap";

export interface CashflowYear {
  year: number;
  generationKwh: number;
  savingsInr: number;
  cumulativeInr: number;
}

export interface SizingResult {
  state: ServiceStateCode;
  stateName: string;
  discom: string;

  /** Consumption the estimate is based on. */
  monthlyUnits: number;
  annualUnits: number;
  monthlyBillInr: number;
  /** True when monthlyUnits was derived from the bill amount rather than given. */
  unitsWereDerived: boolean;

  /** Size before any constraint was applied, from consumption alone. */
  idealSystemKw: number;
  /** The size actually recommended, after constraints. */
  recommendedSystemKw: number;
  bindingConstraint: BindingConstraint;
  roofAreaNeededSqft: number;

  annualGenerationKwh: number;
  /** Share of annual consumption the system covers, 0-1. */
  offsetFraction: number;

  grossCostInr: number;
  subsidyInr: number;
  centralSubsidyInr: number;
  stateSubsidyInr: number;
  netCostInr: number;
  tier: ProductTier;

  annualSavingsInr: number;
  monthlySavingsInr: number;
  /** Annual cleaning and maintenance, deducted in the lifetime cashflow. */
  annualOandMInr: number;
  /** Bill after solar, per month, at today's tariff. */
  newMonthlyBillInr: number;
  paybackYears: number;
  lifetimeSavingsInr: number;
  cashflow: CashflowYear[];

  co2AvoidedTonnesPerYear: number;

  assumptions: string[];
  caveats: string[];
}

// --- Catalogue (Feature 4) --------------------------------------------------

export interface SolarPanel {
  id: string;
  brand: string;
  model: string;
  wattage: number;
  technology: string;
  efficiencyPct: number;
  productWarrantyYears: number;
  performanceWarrantyYears: number;
  dcrCompliant: boolean;
  almmListed: boolean;
}

export interface SolarInverter {
  id: string;
  brand: string;
  model: string;
  capacityKw: number;
  phase: ConnectionPhase;
  type: string;
  efficiencyPct: number;
  warrantyYears: number;
  hasMonitoring: boolean;
}

export interface SolarPackage {
  id: string;
  name: string;
  sizeKw: number;
  tier: ProductTier;
  panelId: string;
  panelCount: number;
  inverterId: string;
  structure: string;
  priceInr: number;
  /** True when every module in the package meets the Domestic Content Requirement. */
  dcrCompliant: boolean;
  phase: ConnectionPhase;
  roofTypes: RoofType[];
  availableStates: ServiceStateCode[];
  installationWarrantyYears: number;
  freeServiceVisits: number;
  highlights: string[];
}

export interface MatchedPackage {
  pkg: SolarPackage;
  panel: SolarPanel;
  inverter: SolarInverter;
  subsidyInr: number;
  netPriceInr: number;
  whyThisFits: string[];
  score: number;
}

export const matchInputSchema = z.object({
  systemKw: z
    .number()
    .positive()
    .describe("Recommended system size in kW, from estimateSolarSystem."),
  state: serviceStateSchema.describe("State code: 'GJ' or 'MH'."),
  wantsSubsidy: z
    .boolean()
    .optional()
    .describe(
      "Whether the homeowner intends to claim the PM Surya Ghar subsidy. Defaults to true. When true, only DCR-compliant packages are eligible."
    ),
  tier: productTierSchema
    .optional()
    .describe("Preferred tier, if the homeowner expressed one. Leave empty to show a range."),
  budgetInr: z
    .number()
    .positive()
    .optional()
    .describe("Maximum the homeowner wants to spend, net of subsidy. Omit if not discussed."),
  roofType: roofTypeSchema
    .optional()
    .describe("Roof type, if known."),
  phase: connectionPhaseSchema.optional().describe("Connection phase, if known."),
});
export type MatchInput = z.infer<typeof matchInputSchema>;

// --- Proposal (Feature 5) ---------------------------------------------------

export const contactSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number."),
  city: z.string().min(2).max(80),
  email: z.string().email().optional().or(z.literal("")),
});
export type Contact = z.infer<typeof contactSchema>;

/**
 * Everything the PDF route needs. The sizing INPUTS are carried rather than the
 * sizing OUTPUTS: the route recomputes every figure server-side so a number the
 * model invented can never reach a document with the installer's name on it.
 */
export const proposalInputSchema = z.object({
  contact: contactSchema,
  sizing: sizingInputSchema,
  packageId: z.string().optional(),
});
export type ProposalInput = z.infer<typeof proposalInputSchema>;

// --- Client-side lead state -------------------------------------------------

export type LeadStage = "start" | "sized" | "matched" | "proposed";

export interface SolarLead {
  stage: LeadStage;
  bill?: BillExtraction;
  sizingInput?: SizingInput;
  sizingResult?: SizingResult;
  matchedPackageIds?: string[];
  selectedPackageId?: string;
  contact?: Contact;
  updatedAt: number;
}
