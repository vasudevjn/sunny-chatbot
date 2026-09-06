/**
 * The draft proposal PDF.
 *
 * Every figure is read off a ProposalModel built by buildProposalModel(), which
 * recomputes from the sizing engine. Nothing here derives a number of its own.
 *
 * A DRAFT mark is fixed to every page: this document must never be mistaken
 * for a binding quotation.
 */

import React from "react";
import {
  Document,
  Font,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { formatInr, formatInrApprox, formatKw, formatPct, formatYears } from "./format";
import type { ProposalModel } from "./proposal";

// react-pdf hyphenates aggressively by default, producing breaks like
// "col-lateral" mid-table. Returning the whole word disables it.
Font.registerHyphenationCallback((word) => [word]);

const COLORS = {
  ink: "#1a1a1a",
  muted: "#5c6470",
  line: "#d8dce2",
  accent: "#b45309",
  accentSoft: "#fdf6ec",
  panel: "#f6f8fa",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 44,
    fontSize: 10,
    color: COLORS.ink,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
  },

  brandBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
    paddingBottom: 10,
    marginBottom: 18,
  },
  brandName: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  brandTagline: { fontSize: 9, color: COLORS.muted, marginTop: 2 },
  brandContact: { fontSize: 8, color: COLORS.muted, textAlign: "right" },

  docTitle: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  docMeta: { fontSize: 9, color: COLORS.muted, marginBottom: 16 },

  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 6,
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  rowBordered: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
  },
  label: { color: COLORS.muted, flex: 1, paddingRight: 8 },
  value: { fontFamily: "Helvetica-Bold", textAlign: "right" },

  headlineGrid: {
    flexDirection: "row",
    backgroundColor: COLORS.accentSoft,
    borderRadius: 4,
    padding: 12,
    marginTop: 6,
  },
  headlineCell: { flex: 1, paddingRight: 8 },
  headlineLabel: { fontSize: 7.5, color: COLORS.muted, textTransform: "uppercase" },
  headlineValue: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2 },

  para: { marginBottom: 6, color: COLORS.ink },
  bullet: { flexDirection: "row", marginBottom: 3, paddingRight: 8 },
  bulletDot: { width: 12, color: COLORS.accent },
  bulletText: { flex: 1 },

  panel: {
    backgroundColor: COLORS.panel,
    borderRadius: 4,
    padding: 10,
    marginTop: 4,
  },

  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    paddingBottom: 4,
    marginTop: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 2.5,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
  },
  th: { fontSize: 8, fontFamily: "Helvetica-Bold", color: COLORS.muted },
  td: { fontSize: 9 },

  disclaimer: { fontSize: 7.5, color: COLORS.muted, marginBottom: 3, lineHeight: 1.4 },

  draftMark: {
    position: "absolute",
    top: 18,
    right: 44,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
    letterSpacing: 1,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 44,
    right: 44,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.line,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: COLORS.muted,
  },
});

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>&bull;</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBordered}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function PageChrome({ model }: { model: ProposalModel }) {
  return (
    <>
      <Text style={styles.draftMark} fixed>
        DRAFT — NOT A QUOTATION
      </Text>
      <View style={styles.footer} fixed>
        <Text>
          {model.installer.name} &middot; {model.reference}
        </Text>
        <Text
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
      </View>
    </>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ProposalDocument({ model }: { model: ProposalModel }) {
  const s = model.sizing;
  // Show a readable slice of the 25-year cashflow rather than all of it.
  const cashflowRows = s.cashflow.filter(
    (r) => r.year <= 5 || r.year % 5 === 0
  );

  return (
    <Document
      title={`Draft solar proposal — ${model.contact.name}`}
      author={model.installer.name}
      subject={`Indicative rooftop solar proposal, reference ${model.reference}`}
    >
      {/* ---------------- Page 1: the offer ---------------- */}
      <Page size="A4" style={styles.page}>
        <PageChrome model={model} />

        <View style={styles.brandBar}>
          <View>
            <Text style={styles.brandName}>{model.installer.name}</Text>
            <Text style={styles.brandTagline}>{model.installer.tagline}</Text>
          </View>
          <View>
            <Text style={styles.brandContact}>{model.installer.phone}</Text>
            <Text style={styles.brandContact}>{model.installer.email}</Text>
            <Text style={styles.brandContact}>{model.installer.site}</Text>
          </View>
        </View>

        <Text style={styles.docTitle}>Draft rooftop solar proposal</Text>
        <Text style={styles.docMeta}>
          Prepared for {model.contact.name}, {model.contact.city} &nbsp;|&nbsp;{" "}
          {formatDate(model.createdAt)} &nbsp;|&nbsp; Reference {model.reference}
          {"\n"}
          Indicative until {formatDate(model.validUntil)}
        </Text>

        <Text style={styles.sectionTitle}>What this system would do for you</Text>
        <View style={styles.headlineGrid}>
          <View style={styles.headlineCell}>
            <Text style={styles.headlineLabel}>System size</Text>
            <Text style={styles.headlineValue}>
              {formatKw(s.recommendedSystemKw)}
            </Text>
          </View>
          <View style={styles.headlineCell}>
            <Text style={styles.headlineLabel}>Monthly saving</Text>
            <Text style={styles.headlineValue}>
              {formatInr(s.monthlySavingsInr)}
            </Text>
          </View>
          <View style={styles.headlineCell}>
            <Text style={styles.headlineLabel}>Net cost</Text>
            <Text style={styles.headlineValue}>
              {formatInr(model.selected?.netPriceInr ?? s.netCostInr)}
            </Text>
          </View>
          <View style={styles.headlineCell}>
            <Text style={styles.headlineLabel}>Pays back in</Text>
            <Text style={styles.headlineValue}>
              {formatYears(s.paybackYears)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Your electricity today</Text>
        <Line label="Distribution company" value={`${s.discom}, ${s.stateName}`} />
        <Line label="Average monthly consumption" value={`${s.monthlyUnits} units`} />
        <Line label="Average monthly bill" value={formatInr(s.monthlyBillInr)} />
        <Line
          label="Estimated bill after solar"
          value={`${formatInr(s.newMonthlyBillInr)} per month`}
        />

        <Text style={styles.sectionTitle}>The system we would install</Text>
        <Line label="Recommended capacity" value={formatKw(s.recommendedSystemKw)} />
        <Line
          label="Expected generation"
          value={`${s.annualGenerationKwh.toLocaleString("en-IN")} units per year`}
        />
        <Line
          label="Share of your usage covered"
          value={formatPct(s.offsetFraction)}
        />
        <Line
          label="Roof area required"
          value={`about ${s.roofAreaNeededSqft} sq ft, shade-free`}
        />
        {s.bindingConstraint !== "consumption" && (
          <View style={styles.panel}>
            <Text style={{ fontSize: 9 }}>
              {s.caveats.find((c) =>
                /roof|sanctioned|capped/i.test(c)
              ) ?? ""}
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Cost and subsidy</Text>
        <Line
          label="System cost before subsidy"
          value={formatInr(model.selected?.pkg.priceInr ?? s.grossCostInr)}
        />
        <Line
          label={`${model.subsidy.schemeName} subsidy`}
          value={`less ${formatInr(model.selected?.subsidyInr ?? s.subsidyInr)}`}
        />
        <Line
          label="Net cost to you"
          value={formatInr(model.selected?.netPriceInr ?? s.netCostInr)}
        />
        <Text style={[styles.para, { marginTop: 8, fontSize: 9, color: COLORS.muted }]}>
          The subsidy is credited to your bank account after the system is
          commissioned and inspected. It is not deducted from the amount payable
          upfront.
        </Text>
      </Page>

      {/* ---------------- Page 2: equipment, savings, financing ---------------- */}
      <Page size="A4" style={styles.page}>
        <PageChrome model={model} />

        {model.selected && (
          <>
            <Text style={styles.sectionTitle}>
              Recommended package: {model.selected.pkg.name}
            </Text>
            <Line
              label="Panels"
              value={`${model.selected.pkg.panelCount} x ${model.selected.panel.brand} ${model.selected.panel.model} (${model.selected.panel.wattage} W)`}
            />
            <Line
              label="Panel technology"
              value={`${model.selected.panel.technology}, ${model.selected.panel.efficiencyPct}% efficient`}
            />
            <Line
              label="Inverter"
              value={`${model.selected.inverter.brand} ${model.selected.inverter.model}, ${model.selected.inverter.type}`}
            />
            <Line label="Mounting structure" value={model.selected.pkg.structure} />
            <Line
              label="Panel warranty"
              value={`${model.selected.panel.productWarrantyYears} years product, ${model.selected.panel.performanceWarrantyYears} years performance`}
            />
            <Line
              label="Inverter warranty"
              value={`${model.selected.inverter.warrantyYears} years`}
            />
            <Line
              label="Workmanship warranty"
              value={`${model.selected.pkg.installationWarrantyYears} years, ${model.selected.pkg.freeServiceVisits} free service visits`}
            />
            <Line
              label="Subsidy eligible"
              value={
                model.selected.pkg.dcrCompliant
                  ? "Yes — domestically manufactured panels"
                  : "No — imported panels do not qualify"
              }
            />
          </>
        )}

        <Text style={styles.sectionTitle}>Savings over the system&apos;s life</Text>
        <Text style={styles.para}>
          Figures below are net of about {formatInr(s.annualOandMInr)} a year for
          cleaning and maintenance, and include one inverter replacement. They
          assume electricity tariffs rise gradually and panel output declines
          slowly, as it does in practice.
        </Text>

        <View style={styles.tableHead}>
          <Text style={[styles.th, { flex: 1 }]}>Year</Text>
          <Text style={[styles.th, { flex: 2, textAlign: "right" }]}>
            Generation (units)
          </Text>
          <Text style={[styles.th, { flex: 2, textAlign: "right" }]}>
            Saving that year
          </Text>
          <Text style={[styles.th, { flex: 2, textAlign: "right" }]}>
            Cumulative position
          </Text>
        </View>
        {cashflowRows.map((r) => (
          <View key={r.year} style={styles.tableRow}>
            <Text style={[styles.td, { flex: 1 }]}>{r.year}</Text>
            <Text style={[styles.td, { flex: 2, textAlign: "right" }]}>
              {r.generationKwh.toLocaleString("en-IN")}
            </Text>
            <Text style={[styles.td, { flex: 2, textAlign: "right" }]}>
              {formatInr(r.savingsInr)}
            </Text>
            <Text style={[styles.td, { flex: 2, textAlign: "right" }]}>
              {formatInr(r.cumulativeInr)}
            </Text>
          </View>
        ))}
        <View style={styles.row}>
          <Text style={styles.label}>
            Electricity cost avoided over 25 years
          </Text>
          <Text style={styles.value}>
            {formatInrApprox(s.lifetimeSavingsInr)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>
            Net gain, after paying for the system
          </Text>
          <Text style={styles.value}>
            {formatInrApprox(
              s.cashflow[s.cashflow.length - 1]?.cumulativeInr ?? 0
            )}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Carbon avoided</Text>
          <Text style={styles.value}>
            about {s.co2AvoidedTonnesPerYear} tonnes CO2 a year
          </Text>
        </View>

        <View wrap={false}>
          <Text style={styles.sectionTitle}>Financing — published terms</Text>
          <Text style={styles.para}>
            These are published lender terms, shown for information. They are not
            an offer of credit and not a recommendation. Which option suits you
            depends on your own circumstances — speak to your bank.
          </Text>
          <View style={styles.tableHead}>
            <Text style={[styles.th, { flex: 3.4 }]}>Lender / product</Text>
            <Text style={[styles.th, { flex: 1.6, textAlign: "right" }]}>Rate</Text>
            <Text style={[styles.th, { flex: 1.4, textAlign: "right" }]}>Tenure</Text>
            <Text style={[styles.th, { flex: 1.8, textAlign: "right" }]}>
              Amount financed
            </Text>
            <Text style={[styles.th, { flex: 1.8, textAlign: "right" }]}>
              Monthly
            </Text>
          </View>
          {model.financing.map((o) => (
            <View key={o.product.id} style={styles.tableRow}>
              <Text style={[styles.td, { flex: 3.4 }]}>
                {o.product.lender} — {o.product.productName}
              </Text>
              <Text style={[styles.td, { flex: 1.6, textAlign: "right" }]}>
                {o.product.minRatePct}–{o.product.maxRatePct}%
              </Text>
              <Text style={[styles.td, { flex: 1.4, textAlign: "right" }]}>
                {o.tenureYears} yrs
              </Text>
              <Text style={[styles.td, { flex: 1.8, textAlign: "right" }]}>
                {formatInr(o.financeableInr)}
              </Text>
              <Text style={[styles.td, { flex: 1.8, textAlign: "right" }]}>
                {formatInr(o.illustrativeMonthlyInr)}
              </Text>
            </View>
          ))}
          <Text style={[styles.disclaimer, { marginTop: 6 }]}>
            Monthly figures are illustrations at the midpoint of each published
            rate range and the full tenure, on the amount that lender would fund.
            The amounts financed differ, so these repayments are not directly
            comparable with one another.
          </Text>
        </View>
      </Page>

      {/* ---------------- Page 3: process and terms ---------------- */}
      <Page size="A4" style={styles.page}>
        <PageChrome model={model} />

        <Text style={styles.sectionTitle}>How the subsidy works</Text>
        <Text style={styles.para}>
          The {model.subsidy.schemeName} provides central financial assistance
          for residential rooftop solar. Applications are made on the national
          portal at {model.subsidy.portalUrl}.
        </Text>
        {model.subsidy.eligibilityNotes.map((note, i) => (
          <Bullet key={i}>{note}</Bullet>
        ))}

        <Text style={styles.sectionTitle}>What happens next</Text>
        {model.nextSteps.map((step, i) => (
          <View key={i} style={styles.bullet}>
            <Text style={styles.bulletDot}>{i + 1}.</Text>
            <Text style={styles.bulletText}>{step}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Assumptions behind these figures</Text>
        {s.assumptions.map((a, i) => (
          <Bullet key={i}>{a}</Bullet>
        ))}

        <Text style={styles.sectionTitle}>Important — please read</Text>
        {model.disclaimers.map((d, i) => (
          <Text key={i} style={styles.disclaimer}>
            {i + 1}. {d}
          </Text>
        ))}

        <View style={[styles.panel, { marginTop: 14 }]}>
          <Text style={{ fontSize: 9 }}>
            Questions about anything in this document? Call {model.installer.name}{" "}
            on {model.installer.phone} or email {model.installer.email}, quoting
            reference {model.reference}.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
