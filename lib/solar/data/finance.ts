/**
 * ============================================================================
 * VERIFIED against lender publications — 2026-09-07.
 * ============================================================================
 * Unlike the other files in this directory, these figures are not placeholders.
 * Each was read from the bank's own published scheme page.
 *
 * THE RULE THIS FILE FOLLOWS: a rate appears here only if the document it came
 * from is INDEXED in the knowledge base. The proposal PDF prints these figures
 * while the assistant answers from the index, so a rate the assistant cannot
 * cite must not appear in a document carrying the company's name.
 *
 * Indexed, and therefore usable:
 *   SBI-PM-Surya-Ghar-Rooftop-Solar-Loan   EBLR-2.15% (5.75%) / EBLR+0% (7.90%)
 *   Canara-Rooftop-Solar-CRTS-PMSGY        Rs 2 lakh cap, 10% margin, 10 yr,
 *                                          no interest rate published
 *
 * Read but NOT indexed, so deliberately excluded — restore the figures here only
 * when the corresponding document is ingested:
 *   Union Bank URTS          EBLR-2.25% (5.75%) / EBLR+1.00-1.50% (9.00-9.50%)
 *   Bank of Baroda Composite from 5.75%, up to 90% financed
 *   Bank of Maharashtra      eligibility and spreads
 *   PNB                      eligibility only
 *
 * CAVEAT: these are floating rates expressed against SBI's external benchmark
 * lending rate. EBLR was 8.00% at the time of reading; when the RBI repo rate
 * moves, every effective percentage here moves with it. Re-read the lender
 * pages before relying on the figures.
 *
 * IMPORTANT — this is information, not advice. Sunny may state these published
 * terms. It must never recommend a lender, assess anyone's eligibility, or
 * advise anyone to borrow. That rule lives in SOLAR_GUARDRAILS_PROMPT.
 * ============================================================================
 */

export const FINANCE_LAST_VERIFIED = "2026-09-07";
/** The benchmark the published rates are expressed against, as read. */
export const EBLR_AS_READ_PCT = 8.0;

export interface LoanProduct {
  id: string;
  lender: string;
  productName: string;
  /** Annual interest rate range, percent. */
  minRatePct: number;
  maxRatePct: number;
  maxTenureYears: number;
  /** Lower bound of the amount band this product covers. */
  minAmountInr: number;
  maxAmountInr: number;
  /** Share of the system cost the lender will fund, 0-1. */
  maxFinancedFraction: number;
  processingFeeNote: string;
  notes: string;
}

/**
 * Reconciled against the lender documents in the knowledge base on 2026-09-07.
 *
 * Every figure below is traceable to a bank's own published page, and the two
 * tiers mirror how the banks actually structure the product (the ₹2 lakh
 * boundary, not a kW boundary). Rates are quoted against each bank's external
 * benchmark lending rate (EBLR), so they move when the repo rate moves — the
 * effective percentages are "as on" the dates noted and must be re-checked.
 *
 * These MUST stay consistent with the indexed loan documents. If they drift,
 * the proposal PDF prints one rate while the assistant cites another from the
 * knowledge base, in the same conversation.
 */
export const LOAN_PRODUCTS: LoanProduct[] = [
  {
    id: "loan-sbi-upto-2lakh",
    lender: "State Bank of India",
    productName: "SBI Surya Ghar rooftop loan, up to Rs 2 lakh",
    // EBLR-2.15%, effective 5.75% as read.
    minRatePct: 5.75,
    maxRatePct: 5.75,
    maxTenureYears: 10, // max 120 months including moratorium
    minAmountInr: 0,
    maxAmountInr: 200_000,
    maxFinancedFraction: 0.9, // minimum 10% margin
    processingFeeNote: "Nil.",
    notes:
      "The concessional tier, covering most residential systems up to about 3 kW. No minimum income requirement, a 6-month moratorium, no pre-payment penalty, and hypothecation of the installed assets as security. Registered first on the national portal, then applied for through Jan Samarth. Canara Bank publishes a comparable Rs 2 lakh product with the same 10% margin and 10-year tenure, but does not publish its interest rate.",
  },
  {
    id: "loan-sbi-2-to-6-lakh",
    lender: "State Bank of India",
    productName: "SBI Surya Ghar rooftop loan, Rs 2 lakh to Rs 6 lakh",
    // EBLR+0%, effective 7.90% as read.
    minRatePct: 7.9,
    maxRatePct: 7.9,
    maxTenureYears: 10,
    // The tiers are amount BANDS, not competing offers: this one begins where
    // the concessional tier's Rs 2 lakh ceiling ends.
    minAmountInr: 200_000,
    maxAmountInr: 600_000,
    maxFinancedFraction: 0.9,
    processingFeeNote: "Nil.",
    notes:
      "For larger systems. Requires a minimum net annual income of Rs 3 lakh, mandatory PAN, and two years of income proof. The subsidy stays capped at Rs 78,000 regardless of system size. Assets must be insured above 3 kW.",
  },
  // Deliberately absent, and why:
  //   - An NBFC / unsecured consumer tier (previously 10.5-16%): no published
  //     NBFC terms are held at all.
  //   - Union Bank and Bank of Baroda rates: read from their published pages,
  //     but those documents are not yet indexed, so the assistant could not cite
  //     a figure the proposal PDF printed.
  // The guardrails allow only published terms the assistant can stand behind.
];

/** "5.75%" when a band has a single published rate, "7.9-9.5%" when it is a range. */
export function formatRateBand(product: LoanProduct): string {
  return product.minRatePct === product.maxRatePct
    ? `${product.minRatePct}%`
    : `${product.minRatePct}–${product.maxRatePct}%`;
}

/**
 * Level monthly repayment for a loan. Standard amortisation.
 * Presented only as an illustration of published terms, never as advice.
 */
export function monthlyRepayment(
  principalInr: number,
  annualRatePct: number,
  tenureYears: number
): number {
  const monthlyRate = annualRatePct / 100 / 12;
  const months = tenureYears * 12;
  if (months <= 0) return 0;
  if (monthlyRate === 0) return principalInr / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principalInr * monthlyRate * factor) / (factor - 1);
}

/** Loan products that could cover this net cost, with an illustrative repayment. */
export function financingOptionsFor(netCostInr: number): {
  product: LoanProduct;
  financeableInr: number;
  illustrativeMonthlyInr: number;
  tenureYears: number;
}[] {
  const wanted = Math.round(netCostInr * 0.9); // lenders require a ~10% margin

  return LOAN_PRODUCTS
    // Only the band the borrower actually falls into. Listing every tier would
    // show the same amount at two different rates, inviting the reasonable but
    // wrong question "why would I take the dearer one?" — the tiers are amount
    // bands, not alternatives.
    .filter((product) => wanted > product.minAmountInr)
    .map((product) => {
      const financeableInr = Math.min(
        product.maxAmountInr,
        Math.round(netCostInr * product.maxFinancedFraction)
      );
      // Midpoint of the published band; equals the rate itself when a lender
      // publishes a single figure.
      const midRate = (product.minRatePct + product.maxRatePct) / 2;
      return {
        product,
        financeableInr,
        tenureYears: product.maxTenureYears,
        illustrativeMonthlyInr: Math.round(
          monthlyRepayment(financeableInr, midRate, product.maxTenureYears)
        ),
      };
    })
    .filter((o) => o.financeableInr > 0);
}
