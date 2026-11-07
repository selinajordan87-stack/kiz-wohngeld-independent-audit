(function initializeWohngeldData(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.WohngeldData = api;
})(typeof window !== "undefined" ? window : globalThis, function createWohngeldDataApi() {
  "use strict";

  const RULE_VERSION = "WG_RULESET_2025_2026";
  const MIETSTUFEN = Object.freeze(["I", "II", "III", "IV", "V", "VI", "VII"]);

  const HOUSING_MAXIMUMS = Object.freeze({
    1: Object.freeze({ I: 361, II: 408, III: 456, IV: 511, V: 562, VI: 615, VII: 677 }),
    2: Object.freeze({ I: 437, II: 493, III: 551, IV: 619, V: 680, VI: 745, VII: 820 }),
    3: Object.freeze({ I: 521, II: 587, III: 657, IV: 737, V: 809, VI: 887, VII: 975 }),
    4: Object.freeze({ I: 608, II: 686, III: 766, IV: 858, V: 946, VI: 1035, VII: 1139 }),
    5: Object.freeze({ I: 694, II: 782, III: 875, IV: 982, V: 1080, VI: 1183, VII: 1302 }),
  });
  const HOUSING_MAXIMUM_ADDITIONAL = Object.freeze({ I: 82, II: 94, III: 106, IV: 119, V: 129, VI: 149, VII: 163 });

  const CLIMATE_COMPONENTS = Object.freeze({ 1: "19.20", 2: "24.80", 3: "29.60", 4: "34.40", 5: "39.20" });
  const CLIMATE_COMPONENT_ADDITIONAL = "4.80";
  const HEATING_RELIEF = Object.freeze({ 1: "110.40", 2: "142.60", 3: "170.20", 4: "197.80", 5: "225.40" });
  const HEATING_RELIEF_ADDITIONAL = "27.60";

  const FORMULA_COEFFICIENTS = Object.freeze({
    1: Object.freeze({ a: "0.04", b: "0.0004797", c: "0.0000408" }),
    2: Object.freeze({ a: "0.03", b: "0.0003571", c: "0.0000304" }),
    3: Object.freeze({ a: "0.02", b: "0.0002917", c: "0.0000245" }),
    4: Object.freeze({ a: "0.01", b: "0.0002163", c: "0.0000176" }),
    5: Object.freeze({ a: "0", b: "0.0001907", c: "0.0000172" }),
    6: Object.freeze({ a: "-0.01", b: "0.0001722", c: "0.0000166" }),
    7: Object.freeze({ a: "-0.02", b: "0.0001592", c: "0.0000165" }),
    8: Object.freeze({ a: "-0.03", b: "0.0001583", c: "0.0000165" }),
    9: Object.freeze({ a: "-0.04", b: "0.0001376", c: "0.0000166" }),
    10: Object.freeze({ a: "-0.06", b: "0.0001249", c: "0.0000166" }),
    11: Object.freeze({ a: "-0.09", b: "0.0001141", c: "0.0000196" }),
    12: Object.freeze({ a: "-0.12", b: "0.0001107", c: "0.0000221" }),
  });

  const FORMULA_MINIMUMS = Object.freeze({
    1: Object.freeze({ M: 54, Y: 396 }),
    2: Object.freeze({ M: 67, Y: 679 }),
    3: Object.freeze({ M: 79, Y: 906 }),
    4: Object.freeze({ M: 92, Y: 1132 }),
    5: Object.freeze({ M: 103, Y: 1358 }),
    6: Object.freeze({ M: 103, Y: 1585 }),
    7: Object.freeze({ M: 115, Y: 1811 }),
    8: Object.freeze({ M: 128, Y: 2037 }),
    9: Object.freeze({ M: 140, Y: 2264 }),
    10: Object.freeze({ M: 152, Y: 2490 }),
    11: Object.freeze({ M: 187, Y: 2717 }),
    12: Object.freeze({ M: 298, Y: 2943 }),
  });

  const SOURCE_METADATA = Object.freeze({
    law: "Wohngeldgesetz",
    legalState: "2025/2026",
    retrievedAt: "2026-08-15",
    officialUrl: "https://www.gesetze-im-internet.de/wogg/",
    provisions: Object.freeze(["§ 11", "§ 12", "§ 19", "§ 21", "Anlage 1", "Anlage 2", "Anlage 3"]),
    federalGazette: "BGBl. 2024 I Nr. 314",
  });

  function validMemberCount(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 1 ? number : null;
  }

  function getHousingMaximum(memberCount, mietstufe) {
    const count = validMemberCount(memberCount);
    if (count === null || !MIETSTUFEN.includes(mietstufe)) return null;
    if (count <= 5) return HOUSING_MAXIMUMS[count][mietstufe];
    return HOUSING_MAXIMUMS[5][mietstufe] + (count - 5) * HOUSING_MAXIMUM_ADDITIONAL[mietstufe];
  }

  function addDecimalStrings(base, increment, factor) {
    function toCents(value) {
      const match = String(value).match(/^(\d+)(?:\.(\d{1,2}))?$/);
      if (!match) throw new TypeError(`Ungültiger Tabellenwert: ${value}`);
      return Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
    }
    const cents = toCents(base) + toCents(increment) * factor;
    return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
  }

  function getClimateComponent(memberCount) {
    const count = validMemberCount(memberCount);
    if (count === null) return null;
    return count <= 5 ? CLIMATE_COMPONENTS[count] : addDecimalStrings(CLIMATE_COMPONENTS[5], CLIMATE_COMPONENT_ADDITIONAL, count - 5);
  }

  function getHeatingRelief(memberCount) {
    const count = validMemberCount(memberCount);
    if (count === null) return null;
    return count <= 5 ? HEATING_RELIEF[count] : addDecimalStrings(HEATING_RELIEF[5], HEATING_RELIEF_ADDITIONAL, count - 5);
  }

  function getFormulaCoefficients(consideredMemberCount) {
    return FORMULA_COEFFICIENTS[Number(consideredMemberCount)] || null;
  }

  function getFormulaMinimums(consideredMemberCount) {
    return FORMULA_MINIMUMS[Number(consideredMemberCount)] || null;
  }

  return {
    RULE_VERSION,
    MIETSTUFEN,
    HOUSING_MAXIMUMS,
    HOUSING_MAXIMUM_ADDITIONAL,
    CLIMATE_COMPONENTS,
    CLIMATE_COMPONENT_ADDITIONAL,
    HEATING_RELIEF,
    HEATING_RELIEF_ADDITIONAL,
    FORMULA_COEFFICIENTS,
    FORMULA_MINIMUMS,
    SOURCE_METADATA,
    getHousingMaximum,
    getClimateComponent,
    getHeatingRelief,
    getFormulaCoefficients,
    getFormulaMinimums,
  };
});
