import type {
  ServiceStateCode,
  SolarInverter,
  SolarPackage,
  SolarPanel,
} from "../types";

export const CATALOGUE_LAST_VERIFIED =
  "2026-09-06 — model names, DCR status and two kit prices verified against Waaree product pages; all installed prices and efficiencies are estimates";

/** Structure, balance-of-system and installation, added to every kit price. ESTIMATE. */
const INSTALL_PER_KW_INR = 15_000;

export const PANELS: SolarPanel[] = [
  {
    id: "pnl-waaree-monoperc-500-dcr",
    brand: "Waaree",
    model: "Mono PERC 500 Wp (DCR)",
    wattage: 500,
    technology: "Mono PERC",
    // Efficiency not published on the kit page. ESTIMATE.
    efficiencyPct: 20.6,
    productWarrantyYears: 12,
    performanceWarrantyYears: 30,
    // Sold inside the "2 kW On-Grid Single Phase Bifacial DCR" kit (SKU 2KW_BOS_DCR).
    dcrCompliant: true,
    almmListed: true,
  },
  {
    id: "pnl-waaree-bin08-575-dcr",
    brand: "Waaree",
    model: "BiN-08-575 N-Type Bifacial (DCR)",
    wattage: 575,
    technology: "N-type bifacial",
    efficiencyPct: 22.1, // ESTIMATE
    productWarrantyYears: 12,
    performanceWarrantyYears: 30,
    // Radiance Lite kit lists "BiN-08-560/565/570/575/580 (DCR)".
    dcrCompliant: true,
    almmListed: true,
  },
  {
    id: "pnl-waaree-bin08-580-dcr",
    brand: "Waaree",
    model: "BiN-08-580 N-Type Bifacial (DCR)",
    wattage: 580,
    technology: "N-type bifacial",
    efficiencyPct: 22.3, // ESTIMATE
    productWarrantyYears: 12,
    performanceWarrantyYears: 30,
    dcrCompliant: true,
    almmListed: true,
  },
  {
    id: "pnl-waaree-580-ntype-nondcr",
    brand: "Waaree",
    model: "580 Wp 144-Cell N-Type Dual Glass Bifacial (Non-DCR)",
    wattage: 580,
    technology: "N-type dual glass bifacial",
    efficiencyPct: 22.3, // ESTIMATE
    productWarrantyYears: 12,
    performanceWarrantyYears: 30,
    // Sold by Waaree as Non-DCR. Cheaper per watt, but NOT eligible for the
    // PM Surya Ghar subsidy. This distinction is the whole point of the field.
    dcrCompliant: false,
    almmListed: true,
  },
];

export const INVERTERS: SolarInverter[] = [
  {
    id: "inv-waaree-ws-1p-3kva-gen4",
    brand: "Waaree",
    model: "WS On Grid 1 Phase 3 kVA Gen4",
    capacityKw: 3,
    phase: "single",
    type: "String inverter",
    efficiencyPct: 97.6, // ESTIMATE
    warrantyYears: 5,
    hasMonitoring: false,
  },
  {
    id: "inv-waaree-ws-1p-3kva-gen4-wifi",
    brand: "Waaree",
    model: "WS On Grid 1 Phase 3 kVA Gen4 (Wi-Fi)",
    capacityKw: 3,
    phase: "single",
    type: "String inverter with Wi-Fi monitoring",
    efficiencyPct: 97.9, // ESTIMATE
    warrantyYears: 5,
    hasMonitoring: true,
  },
  {
    // INFERRED family member — only the 3 kVA Gen4 is confirmed on a product page.
    id: "inv-waaree-ws-1p-5kva-gen4",
    brand: "Waaree",
    model: "WS On Grid 1 Phase 5 kVA Gen4",
    capacityKw: 5,
    phase: "single",
    type: "String inverter with Wi-Fi monitoring",
    efficiencyPct: 98.1, // ESTIMATE
    warrantyYears: 5,
    hasMonitoring: true,
  },
  {
    // INFERRED family member — not confirmed on a product page.
    id: "inv-waaree-ws-3p-8kva",
    brand: "Waaree",
    model: "WS On Grid 3 Phase 8 kVA",
    capacityKw: 8,
    phase: "three",
    type: "Three-phase string inverter",
    efficiencyPct: 98.3, // ESTIMATE
    warrantyYears: 5,
    hasMonitoring: true,
  },
];

export const PACKAGES: SolarPackage[] = [
  // --- 2 kW ---------------------------------------------------------------
  {
    id: "pkg-2kw-value",
    name: "Waaree 2 kW Bifacial DCR Kit",
    sizeKw: 2,
    tier: "value",
    panelId: "pnl-waaree-monoperc-500-dcr",
    panelCount: 4,
    inverterId: "inv-waaree-ws-1p-3kva-gen4",
    structure: "Galvanised iron, standard elevation",
    // Kit Rs 91,999 (REAL) + 2 kW x Rs 15,000 installation (ESTIMATE).
    priceInr: 91_999 + 2 * INSTALL_PER_KW_INR,
    dcrCompliant: true,
    phase: "single",
    roofTypes: ["rcc", "metal"],
    availableStates: ["GJ", "MH"],
    installationWarrantyYears: 2,
    freeServiceVisits: 2,
    highlights: [
      "Waaree's own DCR kit, so it qualifies for the PM Surya Ghar subsidy",
      "Suits a household using up to about 250 units a month",
    ],
  },
  {
    id: "pkg-2kw-standard",
    name: "Waaree 2 kW Radiance Bifacial",
    sizeKw: 2,
    tier: "standard",
    panelId: "pnl-waaree-bin08-575-dcr",
    panelCount: 4,
    inverterId: "inv-waaree-ws-1p-3kva-gen4-wifi",
    structure: "Hot-dip galvanised, cyclone-rated fixings",
    priceInr: 104_000 + 2 * INSTALL_PER_KW_INR, // kit price ESTIMATED
    dcrCompliant: true,
    phase: "single",
    roofTypes: ["rcc", "metal", "tile"],
    availableStates: ["GJ", "MH"],
    installationWarrantyYears: 5,
    freeServiceVisits: 4,
    highlights: [
      "N-type bifacial modules need less roof for the same output",
      "Wi-Fi monitoring so you can see daily generation",
    ],
  },

  // --- 3 kW ---------------------------------------------------------------
  {
    id: "pkg-3kw-value",
    name: "Waaree 3 kW Mono PERC DCR",
    sizeKw: 3,
    tier: "value",
    panelId: "pnl-waaree-monoperc-500-dcr",
    panelCount: 6,
    inverterId: "inv-waaree-ws-1p-3kva-gen4",
    structure: "Galvanised iron, standard elevation",
    priceInr: 128_000 + 3 * INSTALL_PER_KW_INR, // kit price ESTIMATED
    dcrCompliant: true,
    phase: "single",
    roofTypes: ["rcc", "metal"],
    availableStates: ["GJ", "MH"],
    installationWarrantyYears: 2,
    freeServiceVisits: 2,
    highlights: [
      "Claims the full Rs 78,000 subsidy cap at 3 kW",
      "Suits a household using about 300 to 400 units a month",
    ],
  },
  {
    id: "pkg-3kw-standard",
    name: "Waaree Radiance Lite 3 kW",
    sizeKw: 3,
    tier: "standard",
    panelId: "pnl-waaree-bin08-575-dcr",
    panelCount: 6,
    inverterId: "inv-waaree-ws-1p-3kva-gen4-wifi",
    structure: "Hot-dip galvanised, cyclone-rated fixings",
    // Kit Rs 140,999 (REAL) + 3 kW x Rs 15,000 installation (ESTIMATE).
    priceInr: 140_999 + 3 * INSTALL_PER_KW_INR,
    dcrCompliant: true,
    phase: "single",
    roofTypes: ["rcc", "metal", "tile"],
    availableStates: ["GJ", "MH"],
    installationWarrantyYears: 5,
    freeServiceVisits: 4,
    highlights: [
      "Six BiN-08 bifacial modules with a 3 kVA Gen4 inverter",
      "30-year power output warranty on the modules",
    ],
  },
  {
    id: "pkg-3kw-premium",
    name: "Waaree Radiance 3 kW Premium",
    sizeKw: 3,
    tier: "premium",
    panelId: "pnl-waaree-bin08-580-dcr",
    panelCount: 6,
    inverterId: "inv-waaree-ws-1p-3kva-gen4-wifi",
    structure: "Hot-dip galvanised, heavier section, cyclone-rated",
    priceInr: 152_000 + 3 * INSTALL_PER_KW_INR, // kit price ESTIMATED
    dcrCompliant: true,
    phase: "single",
    roofTypes: ["rcc", "metal", "tile"],
    availableStates: ["GJ", "MH"],
    installationWarrantyYears: 5,
    freeServiceVisits: 6,
    highlights: [
      "Highest-output BiN-08 module for a tight roof",
      "Heavier mounting structure and more service visits",
    ],
  },
  {
    id: "pkg-3kw-nondcr",
    name: "Waaree 3 kW N-Type Bifacial (Non-DCR)",
    sizeKw: 3,
    tier: "value",
    panelId: "pnl-waaree-580-ntype-nondcr",
    panelCount: 6,
    inverterId: "inv-waaree-ws-1p-3kva-gen4",
    structure: "Galvanised iron, standard elevation",
    priceInr: 126_000 + 3 * INSTALL_PER_KW_INR, // kit price ESTIMATED
    // Non-DCR modules: cheaper, but NOT eligible for the subsidy.
    dcrCompliant: false,
    phase: "single",
    roofTypes: ["rcc", "metal"],
    availableStates: ["GJ", "MH"],
    installationWarrantyYears: 2,
    freeServiceVisits: 2,
    highlights: [
      "Lowest upfront price of the 3 kW options",
      "Uses imported panels, so it cannot claim the PM Surya Ghar subsidy",
    ],
  },

  // --- 5 kW ---------------------------------------------------------------
  {
    id: "pkg-5kw-value",
    name: "Waaree 5 kW Mono PERC DCR",
    sizeKw: 5,
    tier: "value",
    panelId: "pnl-waaree-monoperc-500-dcr",
    panelCount: 10,
    inverterId: "inv-waaree-ws-1p-5kva-gen4",
    structure: "Galvanised iron, standard elevation",
    priceInr: 230_000 + 5 * INSTALL_PER_KW_INR, // kit price ESTIMATED
    dcrCompliant: true,
    phase: "single",
    roofTypes: ["rcc", "metal"],
    availableStates: ["GJ", "MH"],
    installationWarrantyYears: 2,
    freeServiceVisits: 2,
    highlights: [
      "For a home using around 600 units a month",
      "Subsidy is still capped at Rs 78,000 above 3 kW",
    ],
  },
  {
    id: "pkg-5kw-standard",
    name: "Waaree Radiance 5 kW",
    sizeKw: 5,
    tier: "standard",
    panelId: "pnl-waaree-bin08-575-dcr",
    panelCount: 9,
    inverterId: "inv-waaree-ws-1p-5kva-gen4",
    structure: "Hot-dip galvanised, cyclone-rated fixings",
    priceInr: 248_000 + 5 * INSTALL_PER_KW_INR, // kit price ESTIMATED
    dcrCompliant: true,
    phase: "single",
    roofTypes: ["rcc", "metal", "tile"],
    availableStates: ["GJ", "MH"],
    installationWarrantyYears: 5,
    freeServiceVisits: 4,
    highlights: [
      "Nine bifacial modules instead of ten, so less roof used",
      "Wi-Fi monitoring included",
    ],
  },
  {
    id: "pkg-5kw-nondcr",
    name: "Waaree 5 kW N-Type Bifacial (Non-DCR)",
    sizeKw: 5,
    tier: "value",
    panelId: "pnl-waaree-580-ntype-nondcr",
    panelCount: 9,
    inverterId: "inv-waaree-ws-1p-5kva-gen4",
    structure: "Galvanised iron, standard elevation",
    priceInr: 222_000 + 5 * INSTALL_PER_KW_INR, // kit price ESTIMATED
    dcrCompliant: false,
    phase: "single",
    roofTypes: ["rcc", "metal"],
    availableStates: ["GJ", "MH"],
    installationWarrantyYears: 2,
    freeServiceVisits: 2,
    highlights: [
      "Lowest upfront price at 5 kW",
      "Uses imported panels, so it cannot claim the PM Surya Ghar subsidy",
    ],
  },

  // --- 8 kW, three-phase --------------------------------------------------
  {
    id: "pkg-8kw-3p-standard",
    name: "Waaree Radiance 8 kW Three-Phase",
    sizeKw: 8,
    tier: "standard",
    panelId: "pnl-waaree-bin08-575-dcr",
    panelCount: 14,
    inverterId: "inv-waaree-ws-3p-8kva",
    structure: "Hot-dip galvanised, cyclone-rated fixings",
    priceInr: 360_000 + 8 * INSTALL_PER_KW_INR, // kit price ESTIMATED
    dcrCompliant: true,
    phase: "three",
    roofTypes: ["rcc", "metal", "tile"],
    availableStates: ["GJ", "MH"],
    installationWarrantyYears: 5,
    freeServiceVisits: 4,
    highlights: [
      "Needs a three-phase connection",
      "For large homes or a home with an EV charger",
    ],
  },
];

export function getPanel(id: string): SolarPanel | undefined {
  return PANELS.find((p) => p.id === id);
}

export function getInverter(id: string): SolarInverter | undefined {
  return INVERTERS.find((i) => i.id === id);
}

export function getPackage(id: string): SolarPackage | undefined {
  return PACKAGES.find((p) => p.id === id);
}

export function packagesForState(state: ServiceStateCode): SolarPackage[] {
  return PACKAGES.filter((p) => p.availableStates.includes(state));
}
