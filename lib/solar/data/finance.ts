/**
 * ============================================================================
 * PLACEHOLDER DATA — NOT VERIFIED. DO NOT USE FOR REAL CUSTOMER QUOTES.
 * ============================================================================
 * Published rooftop-solar loan terms. Replace with current terms from each
 * lender before use, and keep the corresponding scheme sheet in the knowledge
 * base so the assistant can cite it.
 *
 * IMPORTANT — this is information, not advice. Sunny may state these published
 * terms. It must never recommend a lender, assess anyone's eligibility, or
 * advise anyone to borrow. That rule lives in SOLAR_GUARDRAILS_PROMPT.
 * ============================================================================
 */

export const FINANCE_LAST_VERIFIED = "not verified";

export interface LoanProduct {
  id: string;
  lender: string;
  productName: string;
  /** Annual interest rate range, percent. */
  minRatePct: number;
  maxRatePct: number;
  maxTenureYears: number;
  maxAmountInr: number;
  /** Share of the system cost the lender will fund, 0-1. */
  maxFinancedFraction: number;
  processingFeeNote: string;
  notes: string;
}

export const LOAN_PRODUCTS: LoanProduct[] = [
  {
    id: "loan-psg-collateral-free",
    lender: "Public sector banks",
    productName: "PM Surya Ghar collateral-free rooftop loan",
    minRatePct: 6.75,
    maxRatePct: 7.5,
    maxTenureYears: 10,
    maxAmountInr: 200_000,
    maxFinancedFraction: 1,
    processingFeeNote: "Often waived under the scheme.",
    notes:
      "Concessional loan tied to the PM Surya Ghar scheme, for residential systems up to 3 kW. Applied for through the national portal alongside the subsidy.",
  },
  {
    id: "loan-psg-larger",
    lender: "Public sector banks",
    productName: "PM Surya Ghar rooftop loan (3-10 kW)",
    minRatePct: 7.5,
    maxRatePct: 9.5,
    maxTenureYears: 10,
    maxAmountInr: 600_000,
    maxFinancedFraction: 0.8,
    processingFeeNote: "Typically 0.5% of the loan amount.",
    notes:
      "For systems above 3 kW. The subsidy remains capped at the 3 kW amount regardless of system size.",
  },
  {
    id: "loan-nbfc-consumer",
    lender: "NBFCs and consumer finance",
    productName: "Unsecured solar consumer loan",
    minRatePct: 10.5,
    maxRatePct: 16,
    maxTenureYears: 5,
    maxAmountInr: 500_000,
    maxFinancedFraction: 1,
    processingFeeNote: "Typically 1-2% of the loan amount.",
    notes:
      "Faster approval and less paperwork, at a materially higher rate. No collateral.",
  },
];

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
  return LOAN_PRODUCTS.map((product) => {
    const financeableInr = Math.min(
      product.maxAmountInr,
      Math.round(netCostInr * product.maxFinancedFraction)
    );
    // Illustrate at the midpoint of the published range and the full tenure.
    const midRate = (product.minRatePct + product.maxRatePct) / 2;
    return {
      product,
      financeableInr,
      tenureYears: product.maxTenureYears,
      illustrativeMonthlyInr: Math.round(
        monthlyRepayment(financeableInr, midRate, product.maxTenureYears)
      ),
    };
  }).filter((o) => o.financeableInr > 0);
}
