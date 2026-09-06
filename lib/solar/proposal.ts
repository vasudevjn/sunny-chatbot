/**
 * Assembles the data model the proposal PDF renders from.
 *
 * The critical property: this takes sizing INPUTS and recomputes the figures
 * through the same engine the chat used. Nothing numeric is accepted from the
 * client. A number the model invented, or a payload someone edited in flight,
 * cannot reach a document carrying the installer's name.
 */

import {
  INSTALLER_EMAIL,
  INSTALLER_NAME,
  INSTALLER_PHONE,
  INSTALLER_SITE,
  INSTALLER_TAGLINE,
} from "@/config";
import { sizeSystem } from "./sizing";
import { getPackage, getPanel, getInverter } from "./data/catalogue";
import { financingOptionsFor } from "./data/finance";
import { subsidyFor, SUBSIDY_ELIGIBILITY_NOTES, SUBSIDY_SCHEME_NAME, SUBSIDY_PORTAL_URL } from "./data/subsidy";
import type {
  Contact,
  ProposalInput,
  SizingResult,
  SolarInverter,
  SolarPackage,
  SolarPanel,
} from "./types";

export class ProposalError extends Error {}

/** How long a draft proposal is presented as being indicative for. */
export const PROPOSAL_VALIDITY_DAYS = 30;

export interface ProposalModel {
  reference: string;
  createdAt: Date;
  validUntil: Date;

  installer: {
    name: string;
    tagline: string;
    phone: string;
    email: string;
    site: string;
  };

  contact: Contact;
  sizing: SizingResult;

  selected?: {
    pkg: SolarPackage;
    panel: SolarPanel;
    inverter: SolarInverter;
    subsidyInr: number;
    netPriceInr: number;
  };

  financing: ReturnType<typeof financingOptionsFor>;

  subsidy: {
    schemeName: string;
    portalUrl: string;
    eligibilityNotes: string[];
  };

  nextSteps: string[];
  disclaimers: string[];
}

function reference(contact: Contact, createdAt: Date): string {
  const stamp = createdAt.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = contact.phone.slice(-4);
  return `DRAFT-${stamp}-${suffix}`;
}

export function buildProposalModel(input: ProposalInput): ProposalModel {
  // Recompute. Never trust a client-supplied figure.
  const sizing = sizeSystem(input.sizing);

  let selected: ProposalModel["selected"];
  if (input.packageId) {
    const pkg = getPackage(input.packageId);
    if (!pkg) {
      throw new ProposalError(
        `Unknown package "${input.packageId}". Re-run the product match before preparing a proposal.`
      );
    }
    const panel = getPanel(pkg.panelId);
    const inverter = getInverter(pkg.inverterId);
    if (!panel || !inverter) {
      throw new ProposalError(
        `Package "${pkg.id}" references a component that is not in the catalogue.`
      );
    }
    const subsidyInr = pkg.dcrCompliant
      ? subsidyFor(pkg.sizeKw, sizing.state, input.sizing.wantsSubsidy ?? true)
          .totalInr
      : 0;
    selected = {
      pkg,
      panel,
      inverter,
      subsidyInr,
      netPriceInr: pkg.priceInr - subsidyInr,
    };
  }

  const createdAt = new Date();
  const validUntil = new Date(
    createdAt.getTime() + PROPOSAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000
  );

  const netForFinance = selected?.netPriceInr ?? sizing.netCostInr;

  const nextSteps = [
    // The contact promise leads, because it is the only step the homeowner has
    // to do nothing to trigger. Everything below it follows from this call.
    `A ${INSTALLER_NAME} representative will contact you on the mobile number you gave us, to answer questions and arrange the site survey. Quote reference ${reference(input.contact, createdAt)} when you speak to them.`,
    `A ${INSTALLER_NAME} engineer visits to survey the roof, check shading and inspect your meter and wiring.`,
    "We confirm the final system design and issue a firm quotation.",
    `We register your application on the ${SUBSIDY_SCHEME_NAME} national portal and apply to ${sizing.discom} for net metering.`,
    "Installation, typically completed in a few days once materials and approvals are in place.",
    `${sizing.discom} inspects the installation and fits the net meter.`,
    "The subsidy is credited to your bank account after commissioning.",
  ];

  const disclaimers = [
    "This is a DRAFT proposal, not a binding quotation. Prices, system design and savings are indicative and subject to a site survey.",
    "Savings are estimated from the consumption figures you provided and current tariffs. Actual savings vary with weather, shading, roof orientation, your consumption pattern and future tariff revisions.",
    `Subsidy amounts are subject to eligibility and to approval by the ${SUBSIDY_SCHEME_NAME} portal and ${sizing.discom}. ${INSTALLER_NAME} cannot guarantee approval or the timing of disbursal.`,
    "Financing terms shown are published lender terms for information only. They are not an offer of credit, not advice, and not an assessment of your eligibility. Speak to the lender or your bank.",
    "No installation or commissioning dates are promised in this document.",
  ];

  return {
    reference: reference(input.contact, createdAt),
    createdAt,
    validUntil,
    installer: {
      name: INSTALLER_NAME,
      tagline: INSTALLER_TAGLINE,
      phone: INSTALLER_PHONE,
      email: INSTALLER_EMAIL,
      site: INSTALLER_SITE,
    },
    contact: input.contact,
    sizing,
    selected,
    financing: financingOptionsFor(netForFinance),
    subsidy: {
      schemeName: SUBSIDY_SCHEME_NAME,
      portalUrl: SUBSIDY_PORTAL_URL,
      eligibilityNotes: SUBSIDY_ELIGIBILITY_NOTES,
    },
    nextSteps,
    disclaimers,
  };
}

/**
 * What is still missing before a proposal can be produced. Used by the
 * prepareProposal tool to tell the assistant what to ask for, rather than
 * failing after the homeowner has already asked for the document.
 */
export function missingForProposal(payload: {
  contact?: Partial<Contact>;
  hasSizing: boolean;
}): string[] {
  const missing: string[] = [];
  if (!payload.hasSizing) {
    missing.push("a savings estimate (run estimateSolarSystem first)");
  }
  if (!payload.contact?.name) missing.push("their name");
  if (!payload.contact?.phone) missing.push("a 10-digit mobile number");
  if (!payload.contact?.city) missing.push("their city or town");
  return missing;
}
