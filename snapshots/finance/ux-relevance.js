(function initializeUxRelevance(root, factory) {
  const calculationRules = typeof module !== "undefined" && module.exports
    ? require("./calculation-rules.js")
    : root?.KizCalculationRules;
  const wohngeld = typeof module !== "undefined" && module.exports
    ? require("./wohngeld.js")
    : root?.WohngeldCalculator;
  const api = factory(calculationRules, wohngeld);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.KizUxRelevance = api;
})(typeof window !== "undefined" ? window : globalThis, function createUxRelevanceApi(calculationRules, wohngeld) {
  "use strict";

  const asArray = (value) => Array.isArray(value) ? value : [];
  const unique = (values) => [...new Set(values.filter(Boolean))];
  const EMPLOYMENT_RELATED_INCOME_TYPES = Object.freeze(["employment", "minijob", "training"]);
  const ADULT_EMPLOYMENT_TYPES = Object.freeze(["social-insurance", "minijob", "not-social-insurance", "not-applicable"]);
  const childLabel = (state, childId) => asArray(state?.centralChildren).find((child) => child?.id === childId)?.name || "das Kind";
  const householdLabel = (state, householdId) => state?.households?.[householdId]?.label || `Haushalt ${householdId}`;

  function getRelevantChildrenForHousehold(state, householdId) {
    if (!new Set(["A", "B"]).has(householdId)) return [];
    return asArray(state?.centralChildren).filter((child) => {
      if (calculationRules?.evaluateChildRelevanceForHousehold) {
        return calculationRules.evaluateChildRelevanceForHousehold(child, householdId)?.isRelevantForHousehold === true;
      }
      return asArray(child?.affectedHouseholds).includes(householdId);
    });
  }

  function getRelevantChildrenForWohngeld(state, householdId) {
    const household = state?.households?.[householdId] || {};
    if (!wohngeld?.evaluateWohngeldHousehold) return getRelevantChildrenForHousehold(state, householdId);
    const result = wohngeld.evaluateWohngeldHousehold(household, asArray(state?.centralChildren), { householdId });
    const ids = new Set(asArray(result?.members).filter((member) => member?.role === "child").map((member) => member.childId));
    return asArray(state?.centralChildren).filter((child) => ids.has(child?.id));
  }

  function getRelevantPeopleForHotWater(state, householdId) {
    const household = state?.households?.[householdId] || {};
    const people = [{ entityType: "adult", entityId: "applicant", role: "applicant", name: household.person1 || "Antragstellende Person" }];
    if (household.adults === "couple") people.push({ entityType: "adult", entityId: "partner", role: "partner", name: household.partner || "Partner/in" });
    getRelevantChildrenForHousehold(state, householdId).forEach((child) => {
      people.push({ entityType: "child", entityId: child.id, role: "child", name: child.name || "Kind", child });
    });
    return people;
  }

  function effectiveHotWaterStatus(state, householdId, person) {
    const household = state?.households?.[householdId] || {};
    if (household.hotWaterType === "central") return "no";
    if (household.hotWaterType === "decentral") return "yes";
    if (person?.entityType === "child") return person.child?.decentralHotWaterStatus?.[householdId] ?? "unknown";
    return household.decentralHotWaterAdults?.[person?.role] ?? "unknown";
  }

  function applyHotWaterInheritance(state, householdId) {
    const household = state?.households?.[householdId];
    if (!household || !["central", "decentral"].includes(household.hotWaterType)) return state;
    const inherited = household.hotWaterType === "central" ? "no" : "yes";
    household.decentralHotWaterAdults ||= { applicant: "unknown", partner: "unknown" };
    getRelevantPeopleForHotWater(state, householdId).forEach((person) => {
      if (person.entityType === "child") {
        person.child.decentralHotWaterStatus ||= { A: "unknown", B: "unknown" };
        person.child.decentralHotWaterStatus[householdId] = inherited;
      } else {
        household.decentralHotWaterAdults[person.role] = inherited;
      }
    });
    return state;
  }

  function makeTargetKey({ household = "", entityType = "calculator", entityId = "", field = "" } = {}) {
    return [household || "global", entityType || "calculator", entityId ?? "", field || ""].map((value) => String(value)).join(":");
  }

  // UI-only inventory.  The calculator remains the source of truth for all
  // legal and monetary decisions; this table only describes when a question
  // deserves a place in the current input view.
  const QUESTION_INVENTORY = Object.freeze([
    { id: "household.adults", field: "adults", category: "A", group: "household-adults", required: true, priority: 10, section: "household" },
    { id: "household.person1", field: "person1", category: "A", group: "household-person1", required: true, priority: 20, section: "household" },
    { id: "household.partner", field: "partner", category: "B", group: "household-partner", required: true, priority: 25, section: "household" },
    { id: "adult.incomeType", field: "incomeType", category: "A", group: "adult-income-type", required: true, priority: 30, section: "income" },
    { id: "adult.amountType", field: "amountType", category: "B", group: "adult-income-amount-type", required: true, priority: 34, section: "income" },
    { id: "adult.entryMethod", field: "entryMethod", category: "B", group: "adult-income-entry-method", required: true, priority: 35, section: "income" },
    { id: "adult.incomeAmount", field: "monthlyAverage/monthlyValues[6]", category: "B", group: "adult-income-amount", required: true, priority: 36, section: "income" },
    { id: "adult.incomeDetails", field: "employmentType", category: "B", group: "adult-income-details", required: true, priority: 38, section: "income" },
    { id: "adult.expenses", field: "expenseType", category: "C", group: "adult-expenses", required: false, priority: 50, section: "income" },
    { id: "adult.incomeSummary", field: "incomeSummary", category: "D", group: "adult-income-summary", required: false, priority: 55, section: "income" },
    { id: "child.name", field: "name", category: "A", group: "child-name", required: true, priority: 10, section: "children" },
    { id: "child.age", field: "age", category: "A", group: "child-age", required: true, priority: 12, section: "children" },
    { id: "child.careSituation", field: "careSituation", category: "A", group: "child-care", required: true, priority: 15, section: "children" },
    { id: "child.stayDays", field: "stayDays", category: "B", group: "child-stay-days", required: true, priority: 22, section: "children" },
    { id: "child.childBenefitAt", field: "childBenefitAt", category: "A", group: "child-benefit-location", required: true, priority: 25, section: "children" },
    { id: "child.childBenefitPerson", field: "childBenefitPerson", category: "B", group: "child-benefit-person", required: true, priority: 26, section: "children" },
    { id: "child.externalBenefitPerson", field: "externalChildBenefitPerson", category: "B", group: "child-external-benefit-person", required: true, priority: 27, section: "children" },
    { id: "child.halfForwarded", field: "halfForwarded", category: "B", group: "child-half-forwarded", required: true, priority: 28, section: "children" },
    { id: "child.hasOwnIncome", field: "hasOwnIncome", category: "A", group: "child-own-income", required: true, priority: 30, section: "children" },
    { id: "child.insurance", field: "eligiblePrivateInsuranceStatus", category: "C", group: "child-insurance", required: true, priority: 31, section: "children" },
    { id: "child.incomeType", field: "incomeType", category: "B", group: "child-income-type", required: false, priority: 35, section: "children" },
    { id: "child.sourceType", field: "incomeSources[].incomeType", category: "B", group: "child-income-source-type", required: true, priority: 35, section: "children" },
    { id: "child.sourceAmountType", field: "incomeSources[].amountType", category: "B", group: "child-income-source-amount-type", required: true, priority: 36, section: "children" },
    { id: "child.sourceEntryMethod", field: "incomeSources[].entryMethod", category: "B", group: "child-income-source-entry-method", required: true, priority: 37, section: "children" },
    { id: "child.sourceValue", field: "incomeSources[].monthlyAverage/monthlyValues[6]", category: "B", group: "child-income-source-value", required: true, priority: 38, section: "children" },
    { id: "child.sourceSubtype", field: "incomeSources[].subtype", category: "C", group: "child-income-source-subtype", required: false, priority: 40, section: "children" },
    { id: "child.sourceDeductions", field: "incomeSources[].directDeductions", category: "C", group: "child-income-source-deductions", required: false, priority: 41, section: "children" },
    { id: "child.u25", field: "u25RuleStageStatus", category: "C", group: "child-u25", required: true, priority: 45, section: "children" },
    { id: "child.additionalNeed", field: "additionalNeedStatus", category: "C", group: "child-additional-need", required: true, priority: 46, section: "children" },
    { id: "housing.type", field: "housingType", category: "A", group: "housing-type", required: true, priority: 10, section: "housing" },
    { id: "housing.rent", field: "housingCosts.rent", category: "B", group: "housing-rent", required: false, priority: 20, section: "housing" },
    { id: "housing.rentColdRent", field: "housingCosts.rent.coldRent", category: "B", group: "housing-rent-cold-rent", required: true, priority: 21, section: "housing" },
    { id: "housing.rentColdUtilities", field: "housingCosts.rent.coldUtilities", category: "B", group: "housing-rent-cold-utilities", required: true, priority: 22, section: "housing" },
    { id: "housing.rentHeating", field: "housingCosts.rent.heating", category: "B", group: "housing-rent-heating", required: true, priority: 23, section: "housing" },
    { id: "housing.owner", field: "housingCosts.owner", category: "B", group: "housing-owner", required: true, priority: 20, section: "housing" },
    { id: "housing.subletting", field: "sublettingStatus", category: "C", group: "housing-subletting", required: true, priority: 40, section: "housing" },
    { id: "housing.parking", field: "parkingAmount", category: "C", group: "housing-parking", required: false, priority: 45, section: "housing" },
    { id: "housing.otherResidents", field: "otherResidentsStatus", category: "C", group: "housing-other-residents", required: true, priority: 48, section: "housing" },
    { id: "housing.hotWater", field: "hotWaterType", category: "B", group: "housing-hot-water", required: true, priority: 30, section: "housing" },
    { id: "housing.welfare", field: "wohngeldChoice", category: "A", group: "housing-welfare", required: true, priority: 35, section: "housing" },
    { id: "housing.derivedTotal", field: "housingCostTotal", category: "D", group: "housing-derived-total", required: false, priority: 56, section: "housing" },
    { id: "special.assets", field: "assetsStatus", category: "C", group: "special-assets", required: true, priority: 60, section: "special" },
    { id: "special.situations", field: "specialSituations", category: "C", group: "special-situations", required: false, priority: 62, section: "special" },
    { id: "special.coverageAssets", field: "coverageAssetStatus", category: "C", group: "special-coverage-assets", required: true, priority: 64, section: "special" },
    { id: "special.extendedAccess", field: "extendedAccessSgbBenefitStatus", category: "C", group: "special-extended-access", required: true, priority: 66, section: "special" },
    { id: "special.assetDetails", field: "assetPersons[].assets[].details", category: "C", group: "special-asset-details", required: false, priority: 67, section: "special" },
    { id: "special.situationDetails", field: "specialSituations[]", category: "C", group: "special-situation-details", required: false, priority: 68, section: "special" },
    { id: "wg.rootPrechecks", field: "wohngeldData.section20Status/significantAssetsStatus", category: "C", group: "wg-root-prechecks", required: false, priority: 70, section: "housing" },
    { id: "wg.section20", field: "wohngeldData.section20Status", category: "C", group: "wg-section20", required: true, priority: 70, section: "housing" },
    { id: "wg.significantAssets", field: "wohngeldData.significantAssetsStatus", category: "C", group: "wg-significant-assets", required: true, priority: 70, section: "housing" },
    { id: "wg.mietstufe", field: "wohngeldData.mietstufe", category: "C", group: "wg-mietstufe", required: true, priority: 70, section: "housing" },
    { id: "wg.nonHousehold", field: "wohngeldData.nonHouseholdAdjustmentStatus", category: "C", group: "wg-non-household", required: true, priority: 70, section: "housing" },
    { id: "wg.complexUse", field: "wohngeldData.complexUseStatus", category: "C", group: "wg-complex-use", required: true, priority: 70, section: "housing" },
    { id: "wg.singleParent", field: "wohngeldData.singleParentAllowanceStatus", category: "C", group: "wg-single-parent", required: true, priority: 70, section: "housing" },
    { id: "wg.personExclusions", field: "wohngeldData.persons[].wohngeldExclusionStatus", category: "C", group: "wg-person-exclusions", required: false, priority: 71, section: "housing" },
    { id: "wg.personExclusionStatus", field: "wohngeldData.persons[].wohngeldExclusionStatus", category: "C", group: "wg-person-exclusion-status", required: true, priority: 71, section: "housing" },
    { id: "wg.personDisability", field: "wohngeldData.persons[].disabilityAllowanceStatus", category: "C", group: "wg-person-disability", required: true, priority: 71, section: "housing" },
    { id: "wg.personNs", field: "wohngeldData.persons[].nsPersecutionStatus", category: "C", group: "wg-person-ns", required: true, priority: 71, section: "housing" },
    { id: "wg.personGrundrente", field: "wohngeldData.persons[].wohngeldGrundrentenTimesStatus", category: "C", group: "wg-person-grundrente", required: true, priority: 71, section: "housing" },
    { id: "wg.forecast", field: "incomeForecast.basis/incomeStatus/mode", category: "C", group: "wg-forecast", required: false, priority: 72, section: "housing" },
    { id: "wg.forecastBasis", field: "incomeForecast.basis", category: "C", group: "wg-forecast-basis", required: true, priority: 72, section: "housing" },
    { id: "wg.forecastIncomeStatus", field: "incomeForecast.incomeStatus", category: "C", group: "wg-forecast-income-status", required: true, priority: 72, section: "housing" },
    { id: "wg.forecastMode", field: "incomeForecast.mode", category: "C", group: "wg-forecast-mode", required: true, priority: 72, section: "housing" },
    { id: "wg.forecastContributions", field: "incomeForecast.taxExpected/healthCareContributionExpected/pensionContributionExpected", category: "C", group: "wg-forecast-contributions", required: false, priority: 73, section: "housing" },
    { id: "wg.forecastTax", field: "incomeForecast.taxExpected", category: "C", group: "wg-forecast-tax", required: true, priority: 73, section: "housing" },
    { id: "wg.forecastHealth", field: "incomeForecast.healthCareContributionExpected", category: "C", group: "wg-forecast-health", required: true, priority: 73, section: "housing" },
    { id: "wg.forecastPension", field: "incomeForecast.pensionContributionExpected", category: "C", group: "wg-forecast-pension", required: true, priority: 73, section: "housing" },
    { id: "wg.maintenance", field: "maintenanceDeductions[]", category: "C", group: "wg-maintenance", required: false, priority: 74, section: "housing" },
    { id: "wg.confirmedIncomeReuse", field: "confirmed-from-current-income", category: "E", group: "wg-confirmed-income-reuse", required: false, priority: 70, section: "housing" },
    { id: "child.householdMembership", field: "affectedHouseholds", category: "E", group: "child-household-membership", required: false, priority: 72, section: "children" },
    { id: "technical.applicationMonth", field: "applicationMonth", category: "D", group: "technical-application-month", required: false, priority: 90, section: "technical" },
    { id: "technical.applicationYear", field: "applicationYear", category: "D", group: "technical-application-year", required: false, priority: 91, section: "technical" },
    { id: "technical.mode", field: "mode", category: "D", group: "technical-mode", required: false, priority: 92, section: "technical" },
  ]);

  // Binding coverage inventory.  Dynamic families (six-/twelve-month values,
  // repeated people and repeated sources) are represented by one explicit
  // family entry instead of pretending that every generated DOM node is a
  // separate semantic question.
  const FIELD_FAMILY_INVENTORY = Object.freeze([
    { family: "household", fields: ["label", "adults", "person1", "partner", "housingType", "housingBenefit", "housingBenefitStatus", "otherResidentsStatus", "otherResidents", "hotWaterType", "hotWaterNote", "additionalNeedOverride", "assetsStatus", "coverageAssetStatus", "extendedAccessSgbBenefitStatus"] },
    { family: "child-core", fields: ["name", "age", "careSituation", "maritalPartnershipStatus", "affectedHouseholds", "hasExternalHousehold", "stayDays", "childBenefitAt", "childBenefitPerson", "externalChildBenefitPerson", "halfForwarded", "hasOwnIncome", "eligiblePrivateInsuranceStatus", "u25RuleStageStatus", "additionalNeedStatus", "additionalNeedMonthlyAmount"] },
    { family: "adult-income", fields: ["incomeType", "customLabel", "amountType", "entryMethod", "monthlyAverage", "monthlyValues[6]", "employmentType", "u25SpecialAllowanceStatus", "parentalAllowanceType", "confirmedExemptionMonthly"] },
    { family: "adult-deductions", fields: ["deductions.tax.enabled", "deductions.tax.entryMethod", "deductions.tax.monthlyAverage", "deductions.healthInsurance.enabled", "deductions.healthInsurance.mandatoryStatus", "deductions.healthInsurance.entryMethod", "deductions.healthInsurance.monthlyAverage", "deductions.careInsurance.enabled", "deductions.careInsurance.mandatoryStatus", "deductions.careInsurance.entryMethod", "deductions.careInsurance.monthlyAverage", "deductions.pensionInsurance.enabled", "deductions.pensionInsurance.mandatoryStatus", "deductions.pensionInsurance.entryMethod", "deductions.pensionInsurance.monthlyAverage", "deductions.unemploymentInsurance.enabled", "deductions.unemploymentInsurance.mandatoryStatus", "deductions.unemploymentInsurance.entryMethod", "deductions.unemploymentInsurance.monthlyAverage", "deductions.otherRegular.enabled", "deductions.otherRegular.description", "deductions.otherRegular.entryMethod", "deductions.otherRegular.monthlyAverage"] },
    { family: "adult-expenses", fields: ["expenseType", "entryMethod", "monthlyAverage", "monthlyValues[6]", "description", "commuteMode", "distanceKm", "workDaysPerMonth", "reasonablePublicTransport", "monthlyPublicTransportAlternativeCost", "legalDeductibleAmountConfirmed", "liabilityOnlyConfirmed", "proofStatus", "pureCareCostsConfirmed", "incomeConnectionConfirmed", "legalObligationConfirmed", "titleOrNotarialMonthlyMaximum"] },
    { family: "child-income", fields: ["incomeSources[].incomeType", "incomeSources[].subtype", "incomeSources[].customLabel", "incomeSources[].amountType", "incomeSources[].entryMethod", "incomeSources[].monthlyAverage", "incomeSources[].monthlyValues[6]"] },
    { family: "child-deductions", fields: ["incomeSources[].directDeductions.tax.entryMethod", "incomeSources[].directDeductions.tax.monthlyAverage", "incomeSources[].directDeductions.tax.monthlyValues[6]", "incomeSources[].directDeductions.socialInsurance.entryMethod", "incomeSources[].directDeductions.socialInsurance.monthlyAverage", "incomeSources[].directDeductions.socialInsurance.monthlyValues[6]"] },
    { family: "rent", fields: ["housingCosts.rent.costMonth", "housingCosts.rent.coldRent", "housingCosts.rent.coldUtilities", "housingCosts.rent.heating", "housingCosts.rent.sublettingStatus", "housingCosts.rent.sublettingAmount", "housingCosts.rent.parkingAmount", "housingCosts.rent.parkingInseparableStatus"] },
    { family: "owner", fields: ["housingCosts.owner.costPeriodStatus", "housingCosts.owner.costYear", "housingCosts.owner.debtInterest", "housingCosts.owner.debtInterestFrequency", "housingCosts.owner.propertyTax", "housingCosts.owner.propertyTaxFrequency", "housingCosts.owner.buildingInsurance", "housingCosts.owner.buildingInsuranceFrequency", "housingCosts.owner.heating", "housingCosts.owner.heatingFrequency", "housingCosts.owner.otherCostsDescription", "housingCosts.owner.otherCostsAmount", "housingCosts.owner.otherCostsFrequency", "housingCosts.owner.recentMonthlyValues[12]"] },
    { family: "wohngeld-root", fields: ["wohngeldData.calculationMode", "wohngeldData.section20Status", "wohngeldData.significantAssetsStatus", "wohngeldData.mietstufe", "wohngeldData.nonHouseholdAdjustmentStatus", "wohngeldData.complexUseStatus", "wohngeldData.singleParentAllowanceStatus", "wohngeldData.ownerCosts.livingAreaSqm", "wohngeldData.ownerCosts.annualInterest", "wohngeldData.ownerCosts.annualPrincipalRepayment", "wohngeldData.ownerCosts.annualLoanAncillaryCosts", "wohngeldData.ownerCosts.annualGuaranteeCosts", "wohngeldData.ownerCosts.annualLeaseholdPayment", "wohngeldData.ownerCosts.annualTotalLoanPayments", "wohngeldData.ownerCosts.annualPropertyTax", "wohngeldData.ownerCosts.annualThirdPartyAdministrationCosts"] },
    { family: "wohngeld-person", fields: ["wohngeldData.persons[].wohngeldExclusionStatus", "wohngeldData.persons[].wohngeldExclusionReason", "wohngeldData.persons[].careDaysInReferenceMonth", "wohngeldData.persons[].disabilityAllowanceStatus", "wohngeldData.persons[].nsPersecutionStatus", "wohngeldData.persons[].wohngeldGrundrentenTimesStatus"] },
    { family: "wohngeld-forecast", fields: ["incomeForecast.basis", "incomeForecast.incomeStatus", "incomeForecast.mode", "incomeForecast.taxExpected", "incomeForecast.healthCareContributionExpected", "incomeForecast.pensionContributionExpected", "incomeForecast.sources[].type", "incomeForecast.sources[].expectedMonthlyAmount", "incomeForecast.sources[].expectedAnnualAmount", "incomeForecast.sources[].monthlyValues[12]", "incomeForecast.sources[].confirmedHigherAnnualWorkExpenses", "incomeForecast.sources[].confirmedAnnualWorkExpenses", "incomeForecast.sources[].confirmedExpectedAnnualTaxProfit", "incomeForecast.sources[].confirmedExpectedAnnualPositiveTaxIncome", "incomeForecast.sources[].confirmedParentalAllowanceExemptionAnnual"] },
    { family: "wohngeld-maintenance", fields: ["maintenanceDeductions[].type", "maintenanceDeductions[].annualPaidAmount", "maintenanceDeductions[].legalObligationStatus", "maintenanceDeductions[].titleStatus", "maintenanceDeductions[].titleAnnualMaximum"] },
    { family: "assets", fields: ["assetPersons[].assets[].type", "assetPersons[].assets[].value", "assetPersons[].assets[].ownerRole", "assetPersons[].assets[].protectedStatus", "assetPersons[].assets[].details.realizableStatus", "assetPersons[].assets[].details.incomeDoubleCountStatus", "assetPersons[].assets[].details.appropriateVehicleDeclared", "assetPersons[].assets[].details.protectedRetirementConfirmed", "assetPersons[].assets[].details.selfUsedStatus", "assetPersons[].assets[].details.propertyType", "assetPersons[].assets[].details.livingAreaSqm", "assetPersons[].assets[].details.residentCount", "assetPersons[].assets[].details.hardshipProtection"] },
    { family: "special-situations", fields: ["specialSituations[].situationType", "specialSituations[].personRole", "specialSituations[].confirmationStatus", "specialSituations[].recurringStatus", "specialSituations[].description", "specialSituations[].monthlyAmount"] },
    { family: "hot-water-people", fields: ["decentralHotWaterAdults.applicant", "decentralHotWaterAdults.partner", "decentralHotWaterStatus[childId][A]", "decentralHotWaterStatus[childId][B]"] },
    { family: "global", fields: ["applicationMonth", "applicationYear", "mode", "scenarioHalfForwarding", "dataVersion"] },
  ]);
  const analyzedFieldCount = FIELD_FAMILY_INVENTORY.reduce((total, family) => total + family.fields.length, 0);

  const cloneInventory = () => QUESTION_INVENTORY.map((entry) => ({ ...entry }));
  const ANSWERED_DOMAIN_VALUES = new Set([
    "single", "couple", "rent", "owner", "A", "B", "external", "present", "received-or-applied", "confirmed-none",
    "not-excluded", "excluded", "none", "approved", "estimated", "automatic", "not-received", "central", "decentral", "mixed",
    "confirmed-from-current-income", "custom", "same-monthly", "custom-monthly", "annual", "not-applicable", "confirmed-1800", "insufficient",
    "simple-resident-share", "complex", "I", "II", "III", "IV", "V", "VI", "VII",
  ]);
  const stateValue = (value) => ["yes", "no", "unknown", "irrelevant", "answered"].includes(value)
    ? value
    : ANSWERED_DOMAIN_VALUES.has(value) ? "answered" : "unknown";
  const activeEntry = (entry, status, reason = "") => ({
    ...entry,
    status: stateValue(status),
    visible: status !== "irrelevant",
    relevant: status !== "irrelevant",
    active: status !== "irrelevant" && Boolean(entry.required),
    needsDecision: status === "unknown" && Boolean(entry.required),
    priority: entry.priority,
    reason,
  });

  function evaluateUiRelevance(state = {}, { householdId = "A", childId = null, role = "applicant", sourceId = null, scope = "all" } = {}) {
    const household = state?.households?.[householdId] || {};
    const child = childId ? asArray(state?.centralChildren).find((item) => item?.id === childId) : null;
    const sourceList = role === "partner" ? household.partnerIncomeSources : household.applicantIncomeSources;
    const source = asArray(sourceList).find((item) => !sourceId || item?.id === sourceId) || null;
    const entries = cloneInventory().filter((entry) => {
      if (scope === "wohngeld-person") return entry.id.startsWith("wg.person") || entry.id.startsWith("wg.forecast");
      if (scope === "wohngeld-root") return entry.id.startsWith("wg.") && !entry.id.startsWith("wg.person") && !entry.id.startsWith("wg.forecast");
      if (scope === "child-source") return entry.id === "child.incomeType" || entry.id.startsWith("child.source");
      if (childId) return entry.id.startsWith("child.");
      if (scope === "household") return !entry.id.startsWith("child.") && !entry.id.startsWith("adult.") && !entry.id.startsWith("wg.");
      if (scope === "adult") return entry.id.startsWith("adult.");
      return !entry.id.startsWith("child.");
    });
    const hasCouple = household.adults === "couple";
    const hasRent = household.housingType === "rent";
    const hasOwner = household.housingType === "owner";
    const hasCare = child && asArray(["umgang-a", "umgang-b"]).includes(child.careSituation);
    const childCareAnswered = child && asArray(["wechselmodell-50-50", "wechselmodell-a-external", "wechselmodell-b-external", "dauerhaft-a", "dauerhaft-b", "ueberwiegend-a", "ueberwiegend-b", "umgang-a", "umgang-b"]).includes(child.careSituation);
    const rent = household.housingCosts?.rent || {};
    const owner = household.housingCosts?.owner || {};
    const rentCoreAnswered = [rent.coldRent, rent.coldUtilities, rent.heating].every((value) => String(value ?? "").trim() !== "");
    const ownerCoreAnswered = [owner.costPeriodStatus, owner.costYear, owner.debtInterest, owner.propertyTax, owner.buildingInsurance, owner.heating].every((value) => String(value ?? "").trim() !== "");
    const wohngeldPersons = household.wohngeldData?.persons || {};
    const person = child ? wohngeldPersons.children?.[child.id] : wohngeldPersons[role];
    const personForecast = person?.incomeForecast || {};
    const hasExchange = child && String(child.careSituation || "").startsWith("wechselmodell");
    const childSource = child ? asArray(child.incomeSources).find((item) => !sourceId || item?.id === sourceId) || null : null;
    const incomeType = child ? childSource?.incomeType : source?.incomeType;
    const statusFor = (id) => {
      if (id === "household.adults") return ["single", "couple"].includes(household.adults) ? "answered" : "unknown";
      if (id === "household.person1") return household.person1 ? "yes" : "unknown";
      if (id === "household.partner") return hasCouple ? (household.partner ? "yes" : "unknown") : "irrelevant";
      if (id === "adult.incomeType") return source && source.incomeType && source.incomeType !== "unknown" ? "answered" : "unknown";
      if (id === "adult.amountType") return source && source.incomeType !== "unknown" ? (["gross", "net", "notice", "other"].includes(source.amountType) ? "answered" : "unknown") : "irrelevant";
      if (id === "adult.entryMethod") return source && source.incomeType !== "unknown" ? (["average", "monthly"].includes(source.entryMethod) ? "answered" : "unknown") : "irrelevant";
      if (id === "adult.incomeAmount") return source && source.incomeType !== "unknown" ? (String(source.monthlyAverage || source.monthlyValues?.[0] || "").trim() ? "yes" : "unknown") : "irrelevant";
      if (id === "adult.incomeDetails") {
        if (!source || !EMPLOYMENT_RELATED_INCOME_TYPES.includes(source.incomeType)) return "irrelevant";
        return ADULT_EMPLOYMENT_TYPES.includes(source.employmentType)
          ? "answered"
          : "unknown";
      }
      if (id === "adult.expenses") return "unknown";
      if (!child && id.startsWith("child.")) return "irrelevant";
      if (id === "child.name") return child.name ? "yes" : "unknown";
      if (id === "child.age") return String(child.age || "").trim() ? "yes" : "unknown";
      if (id === "child.careSituation") return childCareAnswered ? "answered" : "unknown";
      if (id === "child.stayDays") return hasCare ? (String(child.stayDays || "").trim() ? "yes" : "unknown") : "irrelevant";
      if (id === "child.childBenefitAt") return ["A", "B", "external"].includes(child.childBenefitAt) ? "answered" : "unknown";
      if (id === "child.childBenefitPerson") return child.childBenefitAt && child.childBenefitAt !== "unknown" ? (child.childBenefitPerson ? "yes" : "unknown") : "irrelevant";
      if (id === "child.externalBenefitPerson") return child.childBenefitAt === "external" ? (child.externalChildBenefitPerson ? "yes" : "unknown") : "irrelevant";
      if (id === "child.halfForwarded") return hasExchange ? "unknown" : "irrelevant";
      if (id === "child.hasOwnIncome") return stateValue(child.hasOwnIncome);
      if (id === "child.insurance") return child.hasOwnIncome === "yes" && (!Number.isInteger(Number(child.age)) || Number(child.age) < 18) ? stateValue(child.eligiblePrivateInsuranceStatus) : "irrelevant";
      if (id === "child.incomeType") return child.hasOwnIncome === "yes" ? (incomeType && incomeType !== "unknown" ? "answered" : "unknown") : "irrelevant";
      if (id === "child.sourceType") return child.hasOwnIncome === "yes" && childSource ? (incomeType && incomeType !== "unknown" ? "answered" : "unknown") : "irrelevant";
      if (id === "child.sourceAmountType") return child.hasOwnIncome === "yes" && childSource && incomeType !== "unknown" ? ( ["gross", "net", "notice", "other"].includes(childSource.amountType) ? "answered" : "unknown") : "irrelevant";
      if (id === "child.sourceEntryMethod") return child.hasOwnIncome === "yes" && childSource && incomeType !== "unknown" ? (["average", "monthly"].includes(childSource.entryMethod) ? "answered" : "unknown") : "irrelevant";
      if (id === "child.sourceValue") return child.hasOwnIncome === "yes" && childSource && ["average", "monthly"].includes(childSource.entryMethod) ? (String(childSource.monthlyAverage || childSource.monthlyValues?.[0] || "").trim() ? "yes" : "unknown") : "irrelevant";
      if (id === "child.sourceSubtype") return child.hasOwnIncome === "yes" && childSource && incomeType !== "unknown" ? (childSource.subtype && childSource.subtype !== "unknown" ? "answered" : "unknown") : "irrelevant";
      if (id === "child.sourceDeductions") return child.hasOwnIncome === "yes" && childSource && incomeType !== "unknown" ? "unknown" : "irrelevant";
      if (id === "child.u25") return Number(child.age) >= 18 && Number(child.age) <= 24 ? stateValue(child.u25RuleStageStatus) : "irrelevant";
      if (id === "child.additionalNeed") return stateValue(child.additionalNeedStatus);
      if (id === "housing.type") return ["rent", "owner"].includes(household.housingType) ? "answered" : "unknown";
      if (id === "housing.rent") return hasRent ? (rentCoreAnswered ? "answered" : "unknown") : "irrelevant";
      if (id === "housing.rentColdRent") return hasRent ? (String(rent.coldRent ?? "").trim() ? "yes" : "unknown") : "irrelevant";
      if (id === "housing.rentColdUtilities") return hasRent ? (String(rent.coldUtilities ?? "").trim() ? "yes" : "unknown") : "irrelevant";
      if (id === "housing.rentHeating") return hasRent ? (String(rent.heating ?? "").trim() ? "yes" : "unknown") : "irrelevant";
      if (id === "housing.owner") return hasOwner ? (ownerCoreAnswered ? "answered" : "unknown") : "irrelevant";
      if (id === "housing.subletting") return hasRent ? (["yes", "no"].includes(household.housingCosts?.rent?.sublettingStatus) ? household.housingCosts.rent.sublettingStatus : "unknown") : "irrelevant";
      if (id === "housing.parking") return hasRent && String(household.housingCosts?.rent?.parkingAmount || "").trim() ? "unknown" : "irrelevant";
      if (id === "housing.otherResidents") return hasRent || hasOwner ? (["yes", "no"].includes(household.otherResidentsStatus) ? household.otherResidentsStatus : "unknown") : "irrelevant";
      if (id === "housing.hotWater") return hasRent || hasOwner ? (["central", "decentral", "mixed"].includes(household.hotWaterType) ? "answered" : "unknown") : "irrelevant";
      if (id === "housing.welfare") {
        if (!(hasRent || hasOwner)) return "irrelevant";
        if (["approved", "estimated", "automatic", "none"].includes(household.housingBenefitStatus) || household.wohngeldData?.calculationMode === "automatic") return "answered";
        return "unknown";
      }
      if (id === "special.assets") return stateValue(household.assetsStatus);
      if (id === "special.situations") return "unknown";
      if (id === "special.assetDetails") return household.assetsStatus === "yes" ? "unknown" : "irrelevant";
      if (id === "special.situationDetails") return asArray(household.specialSituations).length ? "unknown" : "irrelevant";
      if (id === "special.coverageAssets") return stateValue(household.coverageAssetStatus);
      if (id === "special.extendedAccess") return stateValue(household.extendedAccessSgbBenefitStatus);
      if (id === "wg.rootPrechecks") return household.wohngeldData?.calculationMode === "automatic" ? (household.wohngeldData.section20Status === "unknown" || household.wohngeldData.significantAssetsStatus === "unknown" ? "unknown" : "answered") : "irrelevant";
      if (id === "wg.section20") return household.wohngeldData?.calculationMode === "automatic" ? stateValue(household.wohngeldData.section20Status) : "irrelevant";
      if (id === "wg.significantAssets") return household.wohngeldData?.calculationMode === "automatic" ? stateValue(household.wohngeldData.significantAssetsStatus) : "irrelevant";
      if (id === "wg.mietstufe") return household.wohngeldData?.calculationMode === "automatic" ? (["I", "II", "III", "IV", "V", "VI", "VII"].includes(household.wohngeldData.mietstufe) ? "answered" : "unknown") : "irrelevant";
      if (id === "wg.nonHousehold") return household.wohngeldData?.calculationMode === "automatic" ? stateValue(household.wohngeldData.nonHouseholdAdjustmentStatus) : "irrelevant";
      if (id === "wg.complexUse") return household.wohngeldData?.calculationMode === "automatic" ? stateValue(household.wohngeldData.complexUseStatus) : "irrelevant";
      if (id === "wg.singleParent") return household.wohngeldData?.calculationMode === "automatic" ? stateValue(household.wohngeldData.singleParentAllowanceStatus) : "irrelevant";
      if (id === "wg.personExclusions") return household.wohngeldData?.calculationMode === "automatic" ? (["not-excluded", "excluded"].includes(person?.wohngeldExclusionStatus) ? "answered" : "unknown") : "irrelevant";
      if (id === "wg.personExclusionStatus") return household.wohngeldData?.calculationMode === "automatic" ? stateValue(person?.wohngeldExclusionStatus) : "irrelevant";
      if (id === "wg.personDisability") return household.wohngeldData?.calculationMode === "automatic" ? stateValue(person?.disabilityAllowanceStatus) : "irrelevant";
      if (id === "wg.personNs") return household.wohngeldData?.calculationMode === "automatic" ? stateValue(person?.nsPersecutionStatus) : "irrelevant";
      if (id === "wg.personGrundrente") return household.wohngeldData?.calculationMode === "automatic" ? stateValue(person?.wohngeldGrundrentenTimesStatus) : "irrelevant";
      if (id === "wg.forecast") return household.wohngeldData?.calculationMode === "automatic" ? (personForecast.basis && personForecast.basis !== "unknown" ? "answered" : "unknown") : "irrelevant";
      if (id === "wg.forecastBasis") return household.wohngeldData?.calculationMode === "automatic" ? stateValue(personForecast.basis) : "irrelevant";
      if (id === "wg.forecastIncomeStatus") return household.wohngeldData?.calculationMode === "automatic" ? stateValue(personForecast.incomeStatus) : "irrelevant";
      if (id === "wg.forecastMode") return household.wohngeldData?.calculationMode === "automatic" && personForecast.incomeStatus === "present" ? stateValue(personForecast.mode) : "irrelevant";
      if (id === "wg.forecastContributions") {
        if (household.wohngeldData?.calculationMode !== "automatic") return "irrelevant";
        if (!personForecast || !Object.keys(personForecast).length || personForecast.incomeStatus === "unknown") return "unknown";
        if (personForecast.incomeStatus !== "present") return "irrelevant";
        return personForecast.taxExpected !== "unknown" && personForecast.healthCareContributionExpected !== "unknown" && personForecast.pensionContributionExpected !== "unknown" ? "answered" : "unknown";
      }
      if (id === "wg.forecastTax") return household.wohngeldData?.calculationMode === "automatic" && personForecast.incomeStatus === "present" ? stateValue(personForecast.taxExpected) : "irrelevant";
      if (id === "wg.forecastHealth") return household.wohngeldData?.calculationMode === "automatic" && personForecast.incomeStatus === "present" ? stateValue(personForecast.healthCareContributionExpected) : "irrelevant";
      if (id === "wg.forecastPension") return household.wohngeldData?.calculationMode === "automatic" && personForecast.incomeStatus === "present" ? stateValue(personForecast.pensionContributionExpected) : "irrelevant";
      if (id === "wg.maintenance") return household.wohngeldData?.calculationMode === "automatic" && asArray(household.wohngeldData.maintenanceDeductions).length ? "unknown" : "irrelevant";
      return "unknown";
    };
    return entries
      .map((entry) => activeEntry(entry, statusFor(entry.id), entry.category === "C" ? "Weitere Besonderheit" : "abhängig vom aktuellen Pfad"))
      .map((entry) => ({ ...entry, entityKey: `${childId || sourceId || `${role}-${householdId}`}:${entry.id}` }));
  }

  function getQuestionInventory() { return cloneInventory(); }
  function getFieldFamilyInventory() { return FIELD_FAMILY_INVENTORY.map((family) => ({ ...family, fields: [...family.fields] })); }
  function getUiPresentationSelectors(state = {}, options = {}) {
    const matrix = evaluateUiRelevance(state, options);
    const visible = (id) => matrix.find((item) => item.id === id)?.visible === true;
    const status = (id) => matrix.find((item) => item.id === id)?.status || "unknown";
    return {
      showChildExternalBenefitPerson: visible("child.externalBenefitPerson"),
      showChildInsurance: visible("child.insurance"),
      showChildSourceSubtype: visible("child.sourceSubtype"),
      showChildSourceDeductions: visible("child.sourceDeductions"),
      showAdultTrainingDetails: status("adult.incomeType") === "answered" && visible("adult.incomeDetails"),
      showAdultParentalDetails: status("adult.incomeType") === "answered" && visible("adult.incomeDetails"),
      showWohngeldSourceType: visible("wg.forecastIncomeStatus"),
    };
  }
  function createEffectiveUiState(state = {}) {
    const copy = typeof structuredClone === "function"
      ? structuredClone(state)
      : JSON.parse(JSON.stringify(state));
    asArray(copy.centralChildren).forEach((child) => {
      if (child?.hasOwnIncome !== "yes") {
        child.incomeSources = [];
        const households = copy.households || {};
        Object.values(households).forEach((household) => {
          const person = household?.wohngeldData?.persons?.children?.[child.id];
          if (person?.incomeForecast) person.incomeForecast.sources = [];
        });
      }
    });
    return copy;
  }
  function getRelevanceMatrix(state = {}, options = {}) { return evaluateUiRelevance(state, options); }
  function getRelevanceEntry(state = {}, options = {}, id) { return getRelevanceMatrix(state, options).find((entry) => entry.id === id) || null; }
  function isUiFieldVisible(state = {}, options = {}, id) { return getRelevanceEntry(state, options, id)?.visible === true; }
  function countDecisions(matrix = [], remainingOnly = false) {
    const seen = new Set();
    return asArray(matrix).filter((entry) => {
      if (!entry?.active || entry.status === "irrelevant" || entry.required === false || (remainingOnly && !entry.needsDecision)) return false;
      const key = entry.entityKey || entry.group || entry.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).length;
  }
  function countActiveDecisions(matrix = []) { return countDecisions(matrix, true); }
  function measureActiveDecisions(state = {}, options = {}) {
    const matrix = [...evaluateUiRelevance(state, { ...options, scope: "household" })];
    matrix.push(...evaluateUiRelevance(state, { ...options, scope: "wohngeld-root" }));
    ["applicant", ...(state?.households?.[options.householdId || "A"]?.adults === "couple" ? ["partner"] : [])].forEach((role) => {
      const sources = asArray(state?.households?.[options.householdId || "A"]?.[role === "partner" ? "partnerIncomeSources" : "applicantIncomeSources"]);
      const adultMatrix = sources.length
        ? sources.flatMap((source) => evaluateUiRelevance(state, { ...options, role, sourceId: source.id, scope: "adult" }))
        : evaluateUiRelevance(state, { ...options, role, scope: "adult" });
      matrix.push(...adultMatrix);
      matrix.push(...evaluateUiRelevance(state, { ...options, role, scope: "wohngeld-person" }));
    });
    matrix.push(...asArray(state?.centralChildren).flatMap((child) => [
      ...evaluateUiRelevance(state, { ...options, childId: child.id }),
      ...asArray(child.incomeSources).flatMap((source) => evaluateUiRelevance(state, { ...options, childId: child.id, sourceId: source.id, scope: "child-source" })),
      ...evaluateUiRelevance(state, { ...options, childId: child.id, scope: "wohngeld-person" }),
    ]));
    // Presentation counts are supplied by the renderer harness.  Relevance
    // decides which questions are eligible; it must not pretend that a
    // category is a DOM visibility rule.  Keeping the two measurements
    // separate also makes closed native <details> auditable.
    const presentation = options.presentationMetrics || {};
    const groups = Number.isFinite(presentation.visibleGroups) ? presentation.visibleGroups : 0;
    const special = Number.isFinite(presentation.visibleSpecialQuestions) ? presentation.visibleSpecialQuestions : 0;
    const technical = matrix.filter((entry) => entry.visible && /technical|internal|applicationMonth|applicationYear|(^|\.)mode$/.test(entry.field || ""));
    return {
      activeDecisions: countActiveDecisions(matrix),
      requiredDecisions: countDecisions(matrix),
      remainingDecisions: countDecisions(matrix, true),
      visibleGroups: groups,
      visibleSpecialQuestions: special,
      presentationGroups: presentation.groups || [],
      presentationSpecialQuestions: presentation.specialFields || [],
      technicalControls: technical.length,
      matrix,
    };
  }

  const DEFINITIONS = {
    HOUSING_BENEFIT_STATUS_UNKNOWN: { canonical: "HOUSING_BENEFIT_STATUS", title: "Wohngeld-Auswahl fehlt", description: "Bitte wähle aus, wie Wohngeld berücksichtigt werden soll.", field: "wohngeldChoice" },
    HOUSING_BENEFIT_STATUS_INVALID: { canonical: "HOUSING_BENEFIT_STATUS", title: "Wohngeld-Auswahl ist ungültig", description: "Bitte wähle erneut aus, wie Wohngeld berücksichtigt werden soll.", field: "wohngeldChoice" },
    HOUSING_BENEFIT_AMOUNT_MISSING: { canonical: "HOUSING_BENEFIT_AMOUNT", title: "Wohngeldbetrag fehlt", description: "Bitte trage den bewilligten oder geschätzten monatlichen Wohngeldbetrag ein.", field: "housingBenefit" },
    WG_CALCULATION_MODE_INVALID: { canonical: "WG_CALCULATION_MODE", title: "Wohngeld-Berechnungsart fehlt", description: "Bitte wähle aus, wie Wohngeld berücksichtigt werden soll.", field: "wohngeldChoice" },
    FICTIVE_HOUSING_BENEFIT_REQUIRED: { canonical: "WG_CALCULATION_MODE", title: "Automatische Wohngeldprüfung auswählen", description: "Bitte wähle „Ich bekomme aktuell kein Wohngeld – automatisch prüfen“ oder trage einen bekannten Wohngeldwert ein.", field: "wohngeldChoice" },
    AUTOMATIC_HOUSING_BENEFIT_NOT_EVALUATED: { canonical: "WG_CALCULATION_MODE", title: "Automatische Wohngeldprüfung auswählen", description: "Bitte wähle aus, wie Wohngeld berücksichtigt werden soll.", field: "wohngeldChoice" },
    WOHNGELD_NOT_EVALUATED: { canonical: "WG_CALCULATION_MODE", title: "Wohngeldbehandlung ungeklärt", description: "Bitte wähle aus, wie Wohngeld berücksichtigt werden soll.", field: "wohngeldChoice" },
    HOUSING_BENEFIT_AMOUNT_REQUIRED: { canonical: "HOUSING_BENEFIT_AMOUNT", title: "Wohngeldbetrag fehlt", description: "Bitte trage den bekannten monatlichen Wohngeldbetrag ein.", field: "housingBenefit" },
    WG_MIETSTUFE_INVALID: { canonical: "WG_MIETSTUFE", title: "Mietstufe fehlt", description: "Bitte wähle die Mietstufe I bis VII für die automatische Wohngeldberechnung.", field: "wohngeldData.mietstufe" },
    WG_MIETSTUFE_REQUIRED_FOR_AMOUNT: { canonical: "WG_MIETSTUFE", title: "Mietstufe fehlt", description: "Bitte wähle die Mietstufe I bis VII für die automatische Wohngeldberechnung.", field: "wohngeldData.mietstufe" },
    WG_SECTION_20_STATUS_REQUIRED_FOR_FICTIVE_AMOUNT: { canonical: "WG_SECTION_20", title: "§-20-Wohngeldprüfung fehlt", description: "Bitte gib an, ob ein Ausschluss wegen Ausbildungsförderung besteht.", field: "wohngeldData.section20Status" },
    WG_SECTION_20_STATUS_INVALID: { canonical: "WG_SECTION_20", title: "§-20-Wohngeldstatus ist ungültig", description: "Bitte prüfe die Angabe zum Ausschluss wegen Ausbildungsförderung.", field: "wohngeldData.section20Status" },
    WG_SIGNIFICANT_ASSETS_STATUS_REQUIRED_FOR_FICTIVE_AMOUNT: { canonical: "WG_SECTION_21_3", title: "§-21-Nr.-3-Wohngeldprüfung fehlt", description: "Bitte kläre den erheblichen Vermögensstatus für die Wohngeldprüfung.", field: "wohngeldData.significantAssetsStatus" },
    WG_SIGNIFICANT_ASSETS_STATUS_INVALID: { canonical: "WG_SECTION_21_3", title: "Wohngeld-Vermögensstatus ist ungültig", description: "Bitte prüfe die Angabe zu § 21 Nummer 3 WoGG.", field: "wohngeldData.significantAssetsStatus" },
    SGBII_COVERAGE_ASSET_AMOUNT_NOT_EVALUATED: { canonical: "COVERAGE_ASSETS", title: "Vermögen für die Bedarfsdeckung ungeklärt", description: "Bitte gib an, ob für die Bedarfsdeckung relevantes Vermögen vorhanden ist.", field: "coverageAssetStatus" },
    SGBII_COVERAGE_ASSET_ENGINE_NOT_EVALUATED: { canonical: "COVERAGE_ASSETS", title: "Vermögensprüfung nicht automatisch unterstützt", description: "Dieser Vermögensfall kann derzeit nicht vollständig automatisch berechnet werden.", classification: "UNSUPPORTED_CASE" },
    COVERAGE_ASSET_STATUS_INVALID: { canonical: "COVERAGE_ASSETS", title: "Coverage-Vermögensstatus ist ungültig", description: "Bitte prüfe die Vermögensangabe für die Bedarfsdeckung.", field: "coverageAssetStatus" },
    ASSETS_STATUS_UNKNOWN: { canonical: "KIZ_ASSETS", title: "Vermögensstatus für KiZ fehlt", description: "Bitte gib an, ob relevantes Vermögen vorhanden ist.", field: "assetsStatus", includeHousehold: true },
    ASSETS_STATUS_REQUIRED: { canonical: "KIZ_ASSETS", title: "Vermögensstatus für KiZ fehlt", description: "Bitte gib an, ob relevantes Vermögen vorhanden ist.", field: "assetsStatus", includeHousehold: true },
    ASSETS_STATUS_INVALID: { canonical: "KIZ_ASSETS", title: "KiZ-Vermögensstatus ist ungültig", description: "Bitte prüfe die Vermögensangabe.", field: "assetsStatus", includeHousehold: true },
    ASSET_INTEGRATION_FINAL_REQUIRED: { canonical: "KIZ_ASSETS_PIPELINE", title: "Vermögensprüfung noch nicht abgeschlossen", description: "Dieser technische Folgestatus wird durch eine frühere offene Vermögensangabe ausgelöst.", classification: "UNSUPPORTED_CASE", suppressedWhenAny: ["ASSETS_STATUS_REQUIRED", "ASSET_DETAILS_REQUIRED", "ASSET_ASSESSMENT_DATE_REQUIRED"] },
    HOT_WATER_TYPE_UNKNOWN: { canonical: "HOT_WATER_TYPE", title: "Warmwasserart fehlt", description: "Bitte gib an, wie das Warmwasser in diesem Haushalt erzeugt wird.", field: "hotWaterType" },
    HOT_WATER_TYPE_INVALID: { canonical: "HOT_WATER_TYPE", title: "Warmwasserart ist ungültig", description: "Bitte wähle die Warmwasserart erneut aus.", field: "hotWaterType" },
    HOT_WATER_MIXED_NOTE_MISSING: { canonical: "HOT_WATER_NOTE", title: "Hinweis zur gemischten Warmwassererzeugung fehlt", description: "Bitte ergänze einen kurzen Hinweis zur unterschiedlichen Warmwassererzeugung.", field: "hotWaterNote" },
    HOT_WATER_TYPE_UNRESOLVED: { canonical: "HOT_WATER_MIXED_UNSUPPORTED", title: "Gemischte Warmwassererzeugung ist fachlich offen", description: "Dieser gemischte Erwachsenenfall kann derzeit noch nicht vollständig automatisch berechnet werden.", classification: "UNSUPPORTED_CASE" },
    CHILD_DECENTRAL_HOT_WATER_STATUS_UNKNOWN: { canonical: "CHILD_HOT_WATER", title: "Warmwasser-Angabe fehlt", description: "In diesem Haushalt wird Warmwasser unterschiedlich erzeugt. Bitte gib an, ob das Warmwasser dieser Person dezentral erzeugt wird.", field: "hotWaterPerson" },
    CHILD_DECENTRAL_HOT_WATER_STATUS_REQUIRED: { canonical: "CHILD_HOT_WATER", title: "Warmwasser-Angabe fehlt", description: "In diesem Haushalt wird Warmwasser unterschiedlich erzeugt. Bitte gib an, ob das Warmwasser dieser Person dezentral erzeugt wird.", field: "hotWaterPerson" },
    DECENTRAL_HOT_WATER_PERSON_STATUS_REQUIRED: { canonical: "ADULT_HOT_WATER", title: "Warmwasser-Angabe fehlt", description: "Bitte gib an, ob das Warmwasser dieser Person dezentral erzeugt wird.", field: "hotWaterPerson" },
    CHILD_ADDITIONAL_NEED_STATUS_UNKNOWN: { canonical: "CHILD_ADDITIONAL_NEED", title: "Weitere laufende Mehrbedarfe ungeklärt", description: "Bitte gib an, ob für dieses Kind weitere anerkannte laufende Mehrbedarfe bestehen.", field: "additionalNeedStatus" },
    CHILD_ADDITIONAL_NEED_STATUS_REQUIRED: { canonical: "CHILD_ADDITIONAL_NEED", title: "Weitere laufende Mehrbedarfe ungeklärt", description: "Bitte gib an, ob für dieses Kind weitere anerkannte laufende Mehrbedarfe bestehen.", field: "additionalNeedStatus" },
    CHILD_ADDITIONAL_NEED_AMOUNT_MISSING: { canonical: "CHILD_ADDITIONAL_NEED_AMOUNT", title: "Betrag des laufenden Mehrbedarfs fehlt", description: "Bitte trage den bestätigten monatlichen Betrag ein; 0 ist zulässig.", field: "additionalNeedMonthlyAmount" },
    CHILD_ADDITIONAL_NEED_AMOUNT_REQUIRED: { canonical: "CHILD_ADDITIONAL_NEED_AMOUNT", title: "Betrag des laufenden Mehrbedarfs fehlt", description: "Bitte trage den bestätigten monatlichen Betrag ein; 0 ist zulässig.", field: "additionalNeedMonthlyAmount" },
    OTHER_RESIDENTS_UNKNOWN: { canonical: "OTHER_RESIDENTS", title: "Weitere Bewohner noch ungeklärt", description: "Bitte gib an, ob außer den bereits genannten Personen noch weitere Menschen in der Wohnung leben.", field: "otherResidentsStatus" },
    OTHER_RESIDENTS_REQUIRED: { canonical: "OTHER_RESIDENTS_COUNT", title: "Anzahl weiterer Bewohner fehlt", description: "Bitte gib an, wie viele weitere Menschen in der Wohnung leben.", field: "otherResidents" },
    OWNER_OTHER_COST_DESCRIPTION_MISSING: { canonical: "OWNER_OTHER_COST_DESCRIPTION", title: "Wohneigentum – Beschreibung weiterer Nebenkosten fehlt", description: "Bitte beschreibe die eingetragenen positiven sonstigen Eigentumskosten.", field: "housingCosts.owner.otherCostsDescription" },
    OWNER_OTHER_COST_DESCRIPTION_REQUIRED: { canonical: "OWNER_OTHER_COST_DESCRIPTION", title: "Wohneigentum – Beschreibung weiterer Nebenkosten fehlt", description: "Bitte beschreibe die eingetragenen positiven sonstigen Eigentumskosten.", field: "housingCosts.owner.otherCostsDescription" },
    OWNER_COST_PERIOD_REQUIRED: { canonical: "OWNER_COST_PERIOD", title: "Zeitraum der Eigentumskosten fehlt", description: "Bitte wähle den Bezugszeitraum der Eigentumskosten.", field: "housingCosts.owner.costPeriodStatus" },
    OWNER_FINANCING_STATUS_REQUIRED: { canonical: "OWNER_FINANCING_STATUS", title: "Immobilienfinanzierung noch ungeklärt", description: "Bitte gib an, ob für die Immobilie noch ein Darlehen oder eine Finanzierung läuft.", field: "housingCosts.owner.financingStatus" },
    OWNER_FINANCING_STATUS_INVALID: { canonical: "OWNER_FINANCING_STATUS", title: "Angabe zur Immobilienfinanzierung ungültig", description: "Bitte wähle Ja, Nein oder Noch unbekannt.", field: "housingCosts.owner.financingStatus" },
    OWNER_DEBT_INTEREST_MISSING: { canonical: "OWNER_DEBT_INTEREST", title: "Schuldzinsen fehlen", description: "Bitte trage die Schuldzinsen ein; 0 ist zulässig.", field: "housingCosts.owner.debtInterest" },
    OWNER_PROPERTY_TAX_MISSING: { canonical: "OWNER_PROPERTY_TAX", title: "Grundsteuer fehlt", description: "Bitte trage die Grundsteuer ein; 0 ist zulässig.", field: "housingCosts.owner.propertyTax" },
    OWNER_BUILDING_INSURANCE_MISSING: { canonical: "OWNER_BUILDING_INSURANCE", title: "Gebäudeversicherung fehlt", description: "Bitte trage die Gebäudeversicherung ein; 0 ist zulässig.", field: "housingCosts.owner.buildingInsurance" },
    OWNER_HEATING_MISSING: { canonical: "OWNER_HEATING", title: "Heizkosten fehlen", description: "Bitte trage die Heizkosten ein; 0 ist zulässig.", field: "housingCosts.owner.heating" },
    CHILD_CARE_SITUATION_MISSING: { canonical: "CHILD_CARE", title: "Betreuungssituation fehlt", description: "Bitte wähle die Betreuungssituation des Kindes aus.", field: "careSituation" },
    CHILD_CARE_SITUATION_INVALID: { canonical: "CHILD_CARE", title: "Betreuungssituation ist ungültig", description: "Bitte wähle die Betreuungssituation des Kindes erneut aus.", field: "careSituation" },
    CHILD_BENEFIT_LOCATION_UNKNOWN: { canonical: "CHILD_BENEFIT", title: "Kindergeldzuordnung fehlt", description: "Bitte gib an, in welchem Haushalt das Kindergeld bezogen wird.", field: "childBenefitAt" },
    CHILD_BENEFIT_LOCATION_REQUIRED_FOR_SGBII: { canonical: "CHILD_BENEFIT", title: "Kindergeldzuordnung fehlt", description: "Bitte gib an, in welchem Haushalt das Kindergeld bezogen wird.", field: "childBenefitAt" },
    CHILD_BENEFIT_PERSON_MISSING: { canonical: "CHILD_BENEFIT_PERSON", title: "Kindergeldberechtigte Person fehlt", description: "Bitte wähle die kindergeldberechtigte Person aus.", field: "childBenefitPerson" },
    CHILD_MARITAL_PARTNERSHIP_STATUS_UNKNOWN: { canonical: "CHILD_PARTNER_STATUS", title: "Partnerschaftsstatus des Kindes fehlt", description: "Bitte gib an, ob das Kind verheiratet oder verpartnert ist.", field: "maritalPartnershipStatus" },
    CHILD_MARITAL_PARTNERSHIP_STATUS_REQUIRED: { canonical: "CHILD_PARTNER_STATUS", title: "Partnerschaftsstatus des Kindes fehlt", description: "Bitte gib an, ob das Kind verheiratet oder verpartnert ist.", field: "maritalPartnershipStatus" },
    HOUSEHOLD_PARTNER_NAME_MISSING: { canonical: "HOUSEHOLD_PARTNER", title: "Name der Partnerperson fehlt", description: "Bitte trage die Partnerperson dieses Haushalts ein.", field: "partner" },
    WG_EXCLUSION_STATUS_INVALID: { canonical: "WG_EXCLUSION_STATUS", title: "Wohngeld-Personenausschluss fehlt", description: "Bitte gib an, ob die Person vom Wohngeld ausgeschlossen ist.", field: "wohngeldExclusionStatus" },
    WG_PERSON_DATA_MISSING: { canonical: "WG_PERSON_DATA", title: "Wohngeld-Personenangaben fehlen", description: "Bitte beginne mit der Angabe, ob diese Person vom Wohngeld ausgeschlossen ist.", field: "wohngeldExclusionStatus" },
    WG_INCOME_STATUS_INVALID: { canonical: "WG_INCOME_STATUS", title: "Wohngeld-Prognoseeinkommen fehlt", description: "Bitte gib an, ob die Person im Wohngeldzeitraum Einkommen erwartet.", field: "incomeStatus" },
    WG_INCOME_STATUS_REQUIRED: { canonical: "WG_INCOME_STATUS", title: "Wohngeld-Prognoseeinkommen fehlt", description: "Bitte gib an, ob die Person im Wohngeldzeitraum Einkommen erwartet.", field: "incomeStatus" },
    WG_INCOME_BASIS_REQUIRED: { canonical: "WG_INCOME_BASIS", title: "Grundlage der Wohngeld-Prognose fehlt", description: "Bitte entscheide, ob das aktuelle Einkommen übernommen oder eine andere Prognose angegeben wird.", field: "incomeForecastBasis" },
    WG_INCOME_BASIS_INVALID: { canonical: "WG_INCOME_BASIS", title: "Grundlage der Wohngeld-Prognose ist ungültig", description: "Bitte wähle die Prognosegrundlage erneut aus.", field: "incomeForecastBasis" },
    WG_FORECAST_MODE_REQUIRED: { canonical: "WG_FORECAST_MODE", title: "Prognoseart fehlt", description: "Bitte wähle aus, ob Monats-, Einzelmonats- oder Jahreswerte angegeben werden.", field: "mode" },
    WG_FORECAST_MODE_INVALID: { canonical: "WG_FORECAST_MODE", title: "Prognoseart fehlt", description: "Bitte wähle eine gültige Prognoseart aus.", field: "mode" },
    WG_INCOME_SOURCE_REQUIRED: { canonical: "WG_INCOME_SOURCE", title: "Wohngeld-Einkommensquelle fehlt", description: "Bitte füge für die eigene Wohngeld-Prognose eine Einkommensquelle hinzu.", field: "incomeStatus" },
    WG_INCOME_SOURCE_MISSING: { canonical: "WG_INCOME_SOURCE", title: "Wohngeld-Einkommensquelle fehlt", description: "Bitte füge für die eigene Wohngeld-Prognose eine Einkommensquelle hinzu.", field: "incomeStatus" },
    WG_INCOME_TYPE_INVALID: { canonical: "WG_INCOME_TYPE", title: "Einkommensart fehlt", description: "Bitte wähle die Einkommensart der Wohngeld-Prognosequelle aus.", field: "type" },
    WG_MONTHLY_FORECAST_AMOUNT_INVALID: { canonical: "WG_FORECAST_AMOUNT", title: "Monatsbetrag der Wohngeld-Prognose fehlt", description: "Bitte gib den erwarteten monatlichen Betrag an.", field: "expectedMonthlyAmount" },
    WG_ANNUAL_FORECAST_AMOUNT_INVALID: { canonical: "WG_FORECAST_AMOUNT", title: "Jahresbetrag der Wohngeld-Prognose fehlt", description: "Bitte gib den erwarteten jährlichen Betrag an.", field: "expectedAnnualAmount" },
    WG_FORECAST_AMOUNT_REQUIRED: { canonical: "WG_FORECAST_AMOUNT", title: "Betrag der Wohngeld-Prognose fehlt", description: "Bitte gib den erwarteten Betrag für diese Einkommensquelle an.", field: "expectedMonthlyAmount" },
    WG_PERCENTAGE_DEDUCTION_STATUS_REQUIRED: { canonical: "WG_PERCENTAGE_DEDUCTIONS", title: "Abzugsstatus für Wohngeld fehlt", description: "Bitte beantworte die Fragen zu Steuer-, Kranken-/Pflege- und Rentenversicherungsbeiträgen.", field: "taxExpected" },
    WG_DISABILITY_ALLOWANCE_STATUS_REQUIRED: { canonical: "WG_DISABILITY_ALLOWANCE", title: "Behindertenfreibetrag noch ungeklärt", description: "Bitte beantworte die Frage zum Behindertenfreibetrag.", field: "disabilityAllowanceStatus" },
    WG_NS_ALLOWANCE_STATUS_REQUIRED: { canonical: "WG_NS_ALLOWANCE", title: "Freibetrag für NS-Verfolgte noch ungeklärt", description: "Bitte beantworte die Frage zum Freibetrag für NS-Verfolgte.", field: "nsPersecutionStatus" },
    WG_GRUNDRENTE_TIMES_STATUS_REQUIRED: { canonical: "WG_GRUNDRENTE_TIMES", title: "Grundrentenzeiten noch ungeklärt", description: "Bitte beantworte die Frage zu mindestens 33 Jahren Grundrentenzeiten.", field: "wohngeldGrundrentenTimesStatus" },
    WG_GRUNDRENTE_ALLOWANCE_OPEN: { canonical: "WG_GRUNDRENTE_ALLOWANCE", title: "Grundrentenfreibetrag nicht automatisch unterstützt", description: "Die konkrete Höhe des Grundrentenfreibetrags kann derzeit nicht automatisch bestimmt werden.", classification: "UNSUPPORTED_CASE" },
    WG_SINGLE_PARENT_ALLOWANCE_STATUS_REQUIRED: { canonical: "WG_SINGLE_PARENT_ALLOWANCE", title: "Wohngeld-Alleinerziehendenfreibetrag ungeklärt", description: "Bitte beantworte die Frage zum Wohngeld-Alleinerziehendenfreibetrag.", field: "wohngeldData.singleParentAllowanceStatus" },
    WG_NON_HOUSEHOLD_ADJUSTMENT_STATUS_REQUIRED: { canonical: "WG_NON_HOUSEHOLD_ADJUSTMENT", title: "Bewohneranteil für Wohngeld ungeklärt", description: "Bitte wähle, ob wegen weiterer Bewohner eine einfache Anpassung nötig ist.", field: "wohngeldData.nonHouseholdAdjustmentStatus" },
    WG_HOUSING_COMPLEX_USE_STATUS_REQUIRED: { canonical: "WG_COMPLEX_USE", title: "Nutzung der Wohnfläche ungeklärt", description: "Bitte gib an, ob Flächen gewerblich oder gemischt genutzt werden.", field: "wohngeldData.complexUseStatus" },
    WG_HOUSING_COMPLEX_USE_OPEN: { canonical: "WG_COMPLEX_USE", title: "Gemischte oder gewerbliche Nutzung nicht automatisch unterstützt", description: "Die Wohngeld-Wohnkosten können bei gemischter oder gewerblicher Nutzung derzeit nicht automatisch bestimmt werden.", classification: "UNSUPPORTED_CASE" },
    WG_SELF_EMPLOYED_PROFIT_REQUIRED: { canonical: "WG_SELF_EMPLOYED_PROFIT", title: "Jahresgewinn fehlt", description: "Bitte gib den bestätigten erwarteten steuerlichen Jahresgewinn an.", field: "confirmedExpectedAnnualTaxProfit" },
    WG_POSITIVE_TAX_INCOME_REQUIRED: { canonical: "WG_POSITIVE_TAX_INCOME", title: "Positive steuerliche Jahreseinkünfte fehlen", description: "Bitte gib die bestätigten erwarteten positiven steuerlichen Jahreseinkünfte an.", field: "confirmedExpectedAnnualPositiveTaxIncome" },
    WG_MINIJOB_EXPENSES_REQUIRED: { canonical: "WG_MINIJOB_EXPENSES", title: "Minijob-Aufwendungen fehlen", description: "Bitte gib die bestätigten jährlichen Minijob-Aufwendungen an; 0 ist zulässig.", field: "confirmedAnnualWorkExpenses" },
    WG_PARENTAL_ALLOWANCE_EXEMPTION_OPEN: { canonical: "WG_PARENTAL_ALLOWANCE_EXEMPTION", title: "Elterngeldfreibetrag fehlt", description: "Bitte gib den bestätigten jährlichen Elterngeldfreibetrag an; 0 ist zulässig.", field: "confirmedParentalAllowanceExemptionAnnual" },
    WG_INCOME_SOURCE_OPEN: { canonical: "WG_INCOME_SOURCE_UNSUPPORTED", title: "Einkommensart nicht automatisch unterstützt", description: "Diese Einkommensart kann im Wohngeldkern derzeit nicht automatisch ausgewertet werden.", classification: "UNSUPPORTED_CASE" },
    UNSUPPORTED_AMOUNT_TYPE: { canonical: "ADULT_INCOME_AMOUNT_TYPE", title: "Betragsart passt nicht zur KiZ-Prüfung", description: "Bitte wähle die für diese Einkommensart unterstützte Betragsart.", field: "amountType" },
    GROSS_AMOUNT_REQUIRED: { canonical: "ADULT_INCOME_AMOUNT_TYPE", title: "Bruttobetrag für KiZ erforderlich", description: "Bitte erfasse diese Einkommensquelle als Bruttobetrag.", field: "amountType" },
    PAYMENT_OR_NOTICE_AMOUNT_REQUIRED: { canonical: "ADULT_INCOME_AMOUNT_TYPE", title: "Auszahlungs- oder Bescheidbetrag erforderlich", description: "Bitte erfasse für diese laufende Leistung den Auszahlungs- oder Bescheidbetrag.", field: "amountType" },
    EXPENSE_MAINTENANCE_STATUS_UNKNOWN: { canonical: "PAID_MAINTENANCE_LEGAL_BASIS", title: "Unterhalt – gesetzliche Verpflichtung noch angeben", description: "Bitte bestätige, ob eine gesetzliche Unterhaltsverpflichtung besteht.", field: "legalObligationConfirmed" },
    EXPENSE_MAINTENANCE_STATUS_INVALID: { canonical: "PAID_MAINTENANCE_LEGAL_BASIS", title: "Unterhalt – gesetzliche Verpflichtung prüfen", description: "Bitte wähle für die gesetzliche Unterhaltsverpflichtung Ja oder Nein.", field: "legalObligationConfirmed" },
    EXPENSE_MAINTENANCE_MAXIMUM_MISSING: { canonical: "PAID_MAINTENANCE_MAXIMUM", title: "Unterhalt – tituliertes Monatsmaximum fehlt", description: "Bitte trage das titulierte oder notariell vereinbarte Monatsmaximum ein; 0 ist zulässig.", field: "titleOrNotarialMonthlyMaximum" },
    PAID_MAINTENANCE_LEGAL_BASIS_REQUIRED: { canonical: "PAID_MAINTENANCE_LEGAL_BASIS", title: "Unterhaltsgrundlage ist noch unvollständig", description: "Bitte ergänze die gesetzliche Verpflichtung und gegebenenfalls das titulierte Monatsmaximum.", field: "legalObligationConfirmed" },
    WG_OWNER_LIVING_AREA_REQUIRED: { canonical: "WG_OWNER_LIVING_AREA", title: "Wohnfläche für den Lastenzuschuss fehlt", description: "Bitte trage die relevante Wohnfläche ein.", field: "wohngeldData.ownerCosts.livingAreaSqm" },
    WG_OWNER_LIVING_AREA_INVALID: { canonical: "WG_OWNER_LIVING_AREA", title: "Wohnfläche für den Lastenzuschuss fehlt", description: "Bitte trage eine Wohnfläche größer als 0 ein.", field: "wohngeldData.ownerCosts.livingAreaSqm" },
    WG_OWNER_INTEREST_REQUIRED: { canonical: "WG_OWNER_INTEREST", title: "Jährliche Zinsen fehlen", description: "Bitte trage die jährlichen Zinsen ein; 0 ist zulässig.", field: "wohngeldData.ownerCosts.annualInterest" },
    WG_OWNER_PRINCIPAL_REQUIRED: { canonical: "WG_OWNER_PRINCIPAL", title: "Jährliche Tilgung fehlt", description: "Bitte trage die jährliche Tilgung ein; 0 ist zulässig.", field: "wohngeldData.ownerCosts.annualPrincipalRepayment" },
    WG_OWNER_LOAN_ANCILLARY_REQUIRED: { canonical: "WG_OWNER_LOAN_ANCILLARY", title: "Darlehensnebenkosten fehlen", description: "Bitte trage die jährlichen Darlehensnebenkosten ein; 0 ist zulässig.", field: "wohngeldData.ownerCosts.annualLoanAncillaryCosts" },
    WG_OWNER_GUARANTEE_REQUIRED: { canonical: "WG_OWNER_GUARANTEE", title: "Bürgschaftskosten fehlen", description: "Bitte trage die jährlichen Bürgschaftskosten ein; 0 ist zulässig.", field: "wohngeldData.ownerCosts.annualGuaranteeCosts" },
    WG_OWNER_LEASEHOLD_REQUIRED: { canonical: "WG_OWNER_LEASEHOLD", title: "Erbbauzinsen fehlen", description: "Bitte trage die jährlichen Erbbauzinsen ein; 0 ist zulässig.", field: "wohngeldData.ownerCosts.annualLeaseholdPayment" },
    WG_OWNER_PROPERTY_TAX_REQUIRED: { canonical: "WG_OWNER_PROPERTY_TAX", title: "Grundsteuer für Wohngeld fehlt", description: "Bitte trage die jährliche Grundsteuer ein; 0 ist zulässig.", field: "wohngeldData.ownerCosts.annualPropertyTax" },
    WG_OWNER_ADMINISTRATION_REQUIRED: { canonical: "WG_OWNER_ADMINISTRATION", title: "Verwaltungskosten fehlen", description: "Bitte trage die an Dritte gezahlten Verwaltungskosten ein; 0 ist zulässig.", field: "wohngeldData.ownerCosts.annualThirdPartyAdministrationCosts" },
    ADULT_INCOME_FINAL_REQUIRED: { canonical: "ADULT_INCOME", title: "Erwachseneneinkommen konnte noch nicht abschließend ausgewertet werden", description: "Dieser Status folgt aus einer früheren offenen Einkommensprüfung.", classification: "UNSUPPORTED_CASE", suppressedWhenAny: ["CHILD_BENEFIT_SURPLUS_WITH_FORWARDING_OPEN", "CHILD_BENEFIT_SURPLUS_INPUT_REQUIRED", "PAID_MAINTENANCE_LEGAL_BASIS_REQUIRED"] },
    CHILD_INCOME_FINAL_REQUIRED: { canonical: "CHILD_INCOME", title: "Kindeseinkommen ist noch unvollständig", description: "Bitte prüfe die Einkommensangaben des Kindes.", field: "hasOwnIncome", classification: "MISSING_INPUT" },
  };

  function inferContext(item, householdId) {
    const context = {
      household: item?.household ?? item?.householdId ?? householdId ?? null,
      entityType: item?.entityType || "household",
      entityId: item?.entityId ?? item?.household ?? householdId ?? null,
      field: item?.field || null,
    };
    if (context.entityType === "wohngeld") context.entityType = "household";
    if (context.entityType === "wohngeldPerson") {
      if (String(context.entityId).startsWith("child:")) {
        context.entityType = "child";
        context.entityId = String(context.entityId).slice(6);
      } else {
        context.entityType = "adult";
      }
    }
    return context;
  }

  function issueFromCode(code, context, state, severity = "blocking") {
    const definition = DEFINITIONS[code] || {};
    const field = context.field || definition.field || null;
    const entityType = context.entityType || "household";
    const entityId = context.entityId ?? context.household ?? null;
    const name = entityType === "child" ? childLabel(state, entityId) : entityType === "adult" ? (entityId === "partner" ? "Partner/in" : "antragstellende Person") : householdLabel(state, context.household);
    const baseTitle = definition.title || "Fachliche Prüfung noch offen";
    const title = definition.includeHousehold && context.household ? `${name} – ${baseTitle}` : baseTitle;
    const description = definition.description || "Dieser Sonderfall kann derzeit noch nicht vollständig automatisch berechnet werden.";
    const classification = definition.classification || (field ? "MISSING_INPUT" : "UNSUPPORTED_CASE");
    return {
      code: definition.canonical || code,
      sourceCodes: [code],
      technicalCode: code,
      technicalCodes: [code],
      technicalSource: context.technicalSource || null,
      severity,
      classification,
      title: entityType === "child" && definition.title ? `${definition.title} – ${name}` : title,
      description,
      household: context.household ?? null,
      entityType,
      entityId,
      field,
      targetKey: classification === "MISSING_INPUT" && field ? makeTargetKey({ household: context.household, entityType, entityId, field }) : null,
      actionLabel: classification === "MISSING_INPUT" && field ? "Angabe ergänzen" : null,
      priority: classification === "MISSING_INPUT" ? 1 : 3,
    };
  }

  function expandHouseholdOpenCheck(code, householdId, state) {
    const household = state?.households?.[householdId] || {};
    const amountTypeMatch = String(code).match(/^UNSUPPORTED_AMOUNT_TYPE:(.+)$/);
    if (amountTypeMatch) {
      const sourceId = amountTypeMatch[1];
      const source = [...asArray(household.applicantIncomeSources), ...asArray(household.partnerIncomeSources)].find((entry) => entry?.id === sourceId);
      if (source) {
        const issue = issueFromCode("UNSUPPORTED_AMOUNT_TYPE", { household: householdId, entityType: "adultIncomeSource", entityId: sourceId, field: "amountType", technicalSource: source.incomeType }, state);
        issue.technicalCode = code;
        issue.technicalCodes = [code];
        issue.sourceCodes = [code];
        return [issue];
      }
    }
    if (["GROSS_AMOUNT_REQUIRED", "PAYMENT_OR_NOTICE_AMOUNT_REQUIRED"].includes(code)) {
      const requiresGross = code === "GROSS_AMOUNT_REQUIRED";
      const relevantTypes = requiresGross ? new Set(["employment", "minijob", "training"]) : new Set(["sick-pay", "unemployment-1", "adult-maintenance"]);
      const sources = [...asArray(household.applicantIncomeSources), ...asArray(household.partnerIncomeSources)]
        .filter((source) => relevantTypes.has(source?.incomeType) && (requiresGross ? source.amountType !== "gross" : !["net", "notice"].includes(source.amountType)));
      if (sources.length) return sources.map((source) => issueFromCode(code, { household: householdId, entityType: "adultIncomeSource", entityId: source.id, field: "amountType", technicalSource: source.incomeType }, state));
    }
    if (code === "PAID_MAINTENANCE_LEGAL_BASIS_REQUIRED") {
      const expenses = [...asArray(household.applicantExpenses), ...asArray(household.partnerExpenses)].filter((expense) => expense?.expenseType === "paid-maintenance" && (expense.legalObligationConfirmed !== "yes" || expense.titleOrNotarialMonthlyMaximum === "" || expense.titleOrNotarialMonthlyMaximum == null || !Number.isFinite(Number(expense.titleOrNotarialMonthlyMaximum)) || Number(expense.titleOrNotarialMonthlyMaximum) < 0));
      if (expenses.length) return expenses.map((expense) => issueFromCode(code, {
        household: householdId,
        entityType: "expense",
        entityId: expense.id,
        field: expense.legalObligationConfirmed === "yes" ? "titleOrNotarialMonthlyMaximum" : "legalObligationConfirmed",
      }, state));
    }
    if (code === "CHILD_DECENTRAL_HOT_WATER_STATUS_REQUIRED") {
      return getRelevantChildrenForHousehold(state, householdId)
        .filter((child) => (child?.decentralHotWaterStatus?.[householdId] ?? "unknown") === "unknown")
        .map((child) => issueFromCode(code, { household: householdId, entityType: "child", entityId: child.id, field: "hotWaterPerson" }, state));
    }
    if (["CHILD_ADDITIONAL_NEED_STATUS_REQUIRED", "CHILD_ADDITIONAL_NEED_AMOUNT_REQUIRED"].includes(code)) {
      return getRelevantChildrenForHousehold(state, householdId)
        .filter((child) => code.endsWith("STATUS_REQUIRED") ? (child?.additionalNeedStatus ?? "unknown") === "unknown" : child?.additionalNeedStatus === "yes" && (child?.additionalNeedMonthlyAmount === "" || child?.additionalNeedMonthlyAmount == null))
        .map((child) => issueFromCode(code, { household: householdId, entityType: "child", entityId: child.id, field: code.endsWith("STATUS_REQUIRED") ? "additionalNeedStatus" : "additionalNeedMonthlyAmount" }, state));
    }
    if (code === "DECENTRAL_HOT_WATER_PERSON_STATUS_REQUIRED") {
      return getRelevantPeopleForHotWater(state, householdId)
        .filter((person) => person.entityType === "adult" && (household?.decentralHotWaterAdults?.[person.role] ?? "unknown") === "unknown")
        .map((person) => issueFromCode(code, { household: householdId, entityType: "adult", entityId: person.role, field: "hotWaterPerson" }, state));
    }
    if (code === "WG_EXCLUSION_STATUS_REQUIRED") {
      const members = wohngeld?.evaluateWohngeldHousehold?.(household, asArray(state?.centralChildren), { householdId })?.members || [];
      return members.filter((member) => member.wohngeldExclusionStatus === "unknown").map((member) => issueFromCode("WG_EXCLUSION_STATUS_INVALID", {
        household: householdId,
        entityType: member.role === "child" ? "child" : "adult",
        entityId: member.role === "child" ? member.childId : member.role,
        field: "wohngeldExclusionStatus",
      }, state));
    }
    const personCodes = new Set([
      "WG_INCOME_STATUS_REQUIRED", "WG_INCOME_SOURCE_REQUIRED", "WG_FORECAST_MODE_REQUIRED",
      "WG_FORECAST_AMOUNT_REQUIRED", "WG_FORECAST_MONTHS_REQUIRED", "WG_INCOME_SOURCE_OPEN",
      "WG_PERCENTAGE_DEDUCTION_STATUS_REQUIRED", "WG_DISABILITY_ALLOWANCE_STATUS_REQUIRED",
      "WG_NS_ALLOWANCE_STATUS_REQUIRED", "WG_GRUNDRENTE_TIMES_STATUS_REQUIRED", "WG_GRUNDRENTE_ALLOWANCE_OPEN",
      "WG_SELF_EMPLOYED_PROFIT_REQUIRED", "WG_POSITIVE_TAX_INCOME_REQUIRED", "WG_MINIJOB_EXPENSES_REQUIRED",
      "WG_PARENTAL_ALLOWANCE_EXEMPTION_OPEN",
    ]);
    if (personCodes.has(code)) {
      const persons = household?.wohngeldData?.persons || {};
      const entries = [{ entityType: "adult", entityId: "applicant", data: persons.applicant }];
      if (household.adults === "couple") entries.push({ entityType: "adult", entityId: "partner", data: persons.partner });
      getRelevantChildrenForWohngeld(state, householdId).forEach((child) => entries.push({ entityType: "child", entityId: child.id, data: persons.children?.[child.id] }));
      const expanded = [];
      entries.forEach((entry) => {
        const person = entry.data || {};
        const forecast = person.incomeForecast || {};
        const base = { household: householdId, entityType: entry.entityType, entityId: entry.entityId };
        const personIssue = (field) => expanded.push(issueFromCode(code, { ...base, field }, state));
        if (code === "WG_INCOME_STATUS_REQUIRED" && forecast.incomeStatus !== "present" && forecast.incomeStatus !== "none") personIssue("incomeForecastBasis");
        if (code === "WG_INCOME_SOURCE_REQUIRED" && forecast.incomeStatus === "present" && !asArray(forecast.sources).length) personIssue("incomeStatus");
        if (code === "WG_FORECAST_MODE_REQUIRED" && forecast.incomeStatus === "present" && !["same-monthly", "annual", "custom-monthly"].includes(forecast.mode)) personIssue("mode");
        if (code === "WG_PERCENTAGE_DEDUCTION_STATUS_REQUIRED" && forecast.incomeStatus === "present") {
          ["taxExpected", "healthCareContributionExpected", "pensionContributionExpected"].filter((field) => !["yes", "no"].includes(forecast[field])).forEach(personIssue);
        }
        if (code === "WG_DISABILITY_ALLOWANCE_STATUS_REQUIRED" && person.disabilityAllowanceStatus === "unknown") personIssue("disabilityAllowanceStatus");
        if (code === "WG_NS_ALLOWANCE_STATUS_REQUIRED" && person.nsPersecutionStatus === "unknown") personIssue("nsPersecutionStatus");
        if (code === "WG_GRUNDRENTE_TIMES_STATUS_REQUIRED" && person.wohngeldGrundrentenTimesStatus === "unknown") personIssue("wohngeldGrundrentenTimesStatus");
        if (code === "WG_GRUNDRENTE_ALLOWANCE_OPEN" && person.wohngeldGrundrentenTimesStatus === "yes") personIssue(null);
        asArray(forecast.sources).forEach((source) => {
          const sourceBase = { household: householdId, entityType: "wohngeldIncomeSource", entityId: source?.id || null, technicalSource: source?.type || "unknown" };
          let field = null;
          if (code === "WG_FORECAST_AMOUNT_REQUIRED") {
            const amountField = forecast.mode === "annual" ? "expectedAnnualAmount" : "expectedMonthlyAmount";
            const amount = source?.[amountField];
            if (amount === "" || amount == null || !Number.isFinite(Number(amount)) || Number(amount) < 0) field = amountField;
          }
          if (code === "WG_FORECAST_MONTHS_REQUIRED" && (asArray(source.monthlyValues).length !== 12 || asArray(source.monthlyValues).some((value) => value === "" || value == null || !Number.isFinite(Number(value)) || Number(value) < 0))) field = "monthlyValues.0";
          if (code === "WG_SELF_EMPLOYED_PROFIT_REQUIRED" && source.type === "self-employed") field = "confirmedExpectedAnnualTaxProfit";
          if (code === "WG_POSITIVE_TAX_INCOME_REQUIRED" && ["rental", "capital", "other-tax"].includes(source.type)) field = "confirmedExpectedAnnualPositiveTaxIncome";
          if (code === "WG_MINIJOB_EXPENSES_REQUIRED" && source.type === "minijob") field = "confirmedAnnualWorkExpenses";
          if (code === "WG_PARENTAL_ALLOWANCE_EXEMPTION_OPEN" && source.type === "parental-allowance") field = "confirmedParentalAllowanceExemptionAnnual";
          if (code === "WG_INCOME_SOURCE_OPEN") {
            const supportedTypes = new Set(["employment", "minijob", "sick-pay", "unemployment-1", "maintenance", "adult-maintenance", "advance-maintenance", "parental-allowance", "self-employed", "rental", "capital", "other-tax", "kindergeld", "kinderzuschlag", "kiz"]);
            if (supportedTypes.has(source.type)) return;
            const issue = issueFromCode(code, sourceBase, state);
            if (!source.type || source.type === "unknown") {
              issue.classification = "MISSING_INPUT";
              issue.title = "Einkommensart fehlt";
              issue.description = "Bitte wähle die Einkommensart der Wohngeld-Prognosequelle aus.";
              issue.field = "type";
              issue.targetKey = makeTargetKey({ ...sourceBase, field: "type" });
              issue.actionLabel = "Angabe ergänzen";
              issue.priority = 1;
            }
            expanded.push(issue);
          } else if (field) expanded.push(issueFromCode(code, { ...sourceBase, field }, state));
        });
      });
      if (expanded.length) return expanded;
    }
    return [issueFromCode(code, { household: householdId, entityType: "household", entityId: householdId }, state)];
  }

  function issueKey(issue) {
    return [issue.code, issue.household || "", issue.entityType || "", issue.entityId || "", issue.field || ""].join("|");
  }

  function deduplicateIssues(issues) {
    const byKey = new Map();
    issues.forEach((issue) => {
      const key = issueKey(issue);
      const current = byKey.get(key);
      if (!current) byKey.set(key, { ...issue, sourceCodes: unique(issue.sourceCodes || [issue.code]) });
      else {
        current.sourceCodes = unique([...current.sourceCodes, ...(issue.sourceCodes || [issue.code])]);
        current.technicalCodes = unique([...(current.technicalCodes || [current.technicalCode]), ...(issue.technicalCodes || [issue.technicalCode])]);
        current.technicalCode ||= issue.technicalCode;
        current.technicalSource ||= issue.technicalSource;
        if (issue.severity === "blocking") current.severity = "blocking";
      }
    });
    return [...byKey.values()];
  }

  function sortIssues(issues) {
    const severityOrder = { blocking: 0, warning: 1, informational: 2 };
    const entityOrder = { calculator: 0, household: 1, adult: 2, child: 3, wohngeldPerson: 4 };
    return [...issues].sort((left, right) =>
      (severityOrder[left.severity] ?? 9) - (severityOrder[right.severity] ?? 9)
      || (left.priority ?? 5) - (right.priority ?? 5)
      || String(left.household || "").localeCompare(String(right.household || ""))
      || (entityOrder[left.entityType] ?? 9) - (entityOrder[right.entityType] ?? 9)
      || String(left.entityId || "").localeCompare(String(right.entityId || ""))
    );
  }

  function selectUserFacingCalculationCodes(codes) {
    const uniqueCodes = unique(asArray(codes));
    const suppressed = new Set();
    const wgWrappers = new Set(["WG_FOUNDATION_UNRESOLVED", "WG_AUTOMATIC_AMOUNT_UNRESOLVED", "WG_CONSIDERED_MEMBER_COUNT_REQUIRED", "WG_MEMBER_COUNTS_REQUIRED_FOR_AMOUNT", "WG_MONTHLY_TOTAL_INCOME_REQUIRED", "WG_RAW_HOUSING_AMOUNT_REQUIRED"]);
    const hasConcreteWgCause = uniqueCodes.some((code) => String(code).startsWith("WG_") && !wgWrappers.has(code));
    if (hasConcreteWgCause) uniqueCodes.filter((code) => wgWrappers.has(code)).forEach((code) => suppressed.add(code));

    uniqueCodes.forEach((code) => {
      const roots = DEFINITIONS[code]?.suppressedWhenAny || [];
      if (roots.some((rootCode) => uniqueCodes.includes(rootCode))) suppressed.add(code);
    });

    const hasHousingRoot = uniqueCodes.some((code) => /^(OWNER_|RENT_|PARKING_|SUBLETTING_|HOUSING_TYPE_|OTHER_RESIDENTS_|HOUSEHOLD_ADULTS_)/.test(String(code)));
    if (hasHousingRoot) {
      ["PARENT_HOUSING_CHILD_COUNT_UNRESOLVED", "RECOGNIZED_HOUSING_COSTS_REQUIRED", "MINOR_CHILD_OUTSIDE_BG_STATUS_REQUIRED", "CHILD_BENEFIT_SURPLUS_INPUT_REQUIRED", "PARENT_NEED_FINAL_REQUIRED", "ADULT_INCOME_FINAL_REQUIRED"].forEach((code) => {
        if (uniqueCodes.includes(code)) suppressed.add(code);
      });
    }

    const hasAdultIncomeRoot = uniqueCodes.some((code) => /^(PAID_MAINTENANCE_|GROSS_AMOUNT_REQUIRED$|PAYMENT_OR_NOTICE_AMOUNT_REQUIRED$|UNSUPPORTED_AMOUNT_TYPE:)/.test(String(code)));
    if (hasAdultIncomeRoot && uniqueCodes.includes("ADULT_INCOME_FINAL_REQUIRED")) suppressed.add("ADULT_INCOME_FINAL_REQUIRED");
    if (uniqueCodes.length > 1) {
      if (uniqueCodes.includes("PARENT_NEED_FINAL_REQUIRED")) suppressed.add("PARENT_NEED_FINAL_REQUIRED");
      if (uniqueCodes.includes("ADULT_INCOME_FINAL_REQUIRED")) suppressed.add("ADULT_INCOME_FINAL_REQUIRED");
    }
    return { visible: uniqueCodes.filter((code) => !suppressed.has(code)), suppressed: uniqueCodes.filter((code) => suppressed.has(code)) };
  }

  function createUiIssues(validationResult = {}, calculationResult = {}, state = {}) {
    const issues = [];
    const blockingCodes = new Set(Object.values(calculationResult?.households || {}).flatMap((result) => asArray(result?.blockingOpenChecks)));
    [...asArray(validationResult?.errors), ...asArray(validationResult?.warnings)].forEach((item) => {
      const context = inferContext(item);
      context.technicalSource = item?.technicalSource || null;
      const severity = item?.severity === "error" || blockingCodes.has(item?.code) ? "blocking" : "warning";
      const issue = issueFromCode(item?.code || "VALIDATION_ISSUE", context, state, severity);
      if (item?.message) issue.description = item.message;
      if (!DEFINITIONS[item?.code] && item?.message) {
        issue.title = String(item.message).replace(/[.!?]+$/, "");
        issue.description = item.message;
        issue.classification = issue.field ? "MISSING_INPUT" : "UNSUPPORTED_CASE";
        issue.targetKey = issue.field ? makeTargetKey({ ...context, field: issue.field }) : null;
        issue.actionLabel = issue.targetKey ? "Angabe ergänzen" : null;
      }
      issues.push(issue);
    });
    Object.entries(calculationResult?.households || {}).forEach(([householdId, result]) => {
      if (result?.status !== "UNRESOLVED" && result?.status !== "INVALID_INPUT") return;
      const codes = asArray(result?.blockingOpenChecks);
      const selection = selectUserFacingCalculationCodes(codes);
      const expanded = selection.visible.flatMap((code) => expandHouseholdOpenCheck(code, householdId, state));
      if (expanded.length && selection.suppressed.length) expanded[0].technicalCodes = unique([...(expanded[0].technicalCodes || [expanded[0].technicalCode]), ...selection.suppressed]);
      issues.push(...expanded);
    });
    return sortIssues(deduplicateIssues(issues));
  }

  function prioritizeIssues(issues, limit = 5) {
    const sorted = sortIssues(issues);
    const safeLimit = Math.max(0, Math.min(5, Number.isInteger(limit) ? limit : 5));
    return { primary: sorted.slice(0, safeLimit), remaining: sorted.slice(safeLimit) };
  }

  function groupIssues(issues) {
    return sortIssues(issues).reduce((groups, issue) => {
      const household = issue.household || "global";
      const entity = `${issue.entityType}:${issue.entityId || ""}`;
      groups[household] ||= {};
      groups[household][entity] ||= [];
      groups[household][entity].push(issue);
      return groups;
    }, {});
  }

  function summarizeIssueCounts(issues) {
    return asArray(issues).filter((issue) => issue?.severity === "blocking").reduce((summary, issue) => {
      if (issue.classification === "MISSING_INPUT") summary.missingInput += 1;
      if (issue.classification === "UNSUPPORTED_CASE") summary.unsupportedCase += 1;
      return summary;
    }, { missingInput: 0, unsupportedCase: 0 });
  }

  function targetSelectors(issue) {
    const selectors = [];
    const quoted = (value) => String(value ?? "").replaceAll('"', '\\"');
    if (issue?.targetKey) selectors.push(`[data-issue-target="${String(issue.targetKey).replaceAll('"', '\\"')}"]`);
    if (issue?.entityId && issue?.field) selectors.push(`[data-entity-id="${quoted(issue.entityId)}"] [data-field-key="${quoted(issue.field)}"]`);
    const entityScoped = issue?.entityId && !["calculator", "household"].includes(issue?.entityType);
    if (!entityScoped && issue?.household && issue?.field) selectors.push(`[data-household="${quoted(issue.household)}"] [data-field-key="${quoted(issue.field)}"]`);
    if (!entityScoped && issue?.field) selectors.push(`[data-field-key="${quoted(issue.field)}"]`);
    return selectors;
  }

  function resolveIssueTarget(issue, root) {
    if (!issue || issue.classification !== "MISSING_INPUT" || !root?.querySelector) return null;
    for (const selector of targetSelectors(issue)) {
      const target = root.querySelector(selector);
      if (target) return target;
    }
    if (issue.targetKey && root.querySelectorAll) {
      const alias = Array.from(root.querySelectorAll("[data-issue-aliases]")).find((element) =>
        String(element.dataset?.issueAliases || "").split("|").includes(issue.targetKey)
      );
      if (alias) return alias;
    }
    return null;
  }

  return {
    QUESTION_INVENTORY,
    FIELD_FAMILY_INVENTORY,
    EMPLOYMENT_RELATED_INCOME_TYPES,
    ADULT_EMPLOYMENT_TYPES,
    analyzedFieldCount,
    getQuestionInventory,
    getFieldFamilyInventory,
    getUiPresentationSelectors,
    createEffectiveUiState,
    evaluateUiRelevance,
    getRelevanceMatrix,
    getRelevanceEntry,
    isUiFieldVisible,
    countActiveDecisions,
    measureActiveDecisions,
    getRelevantChildrenForHousehold,
    getRelevantChildrenForWohngeld,
    getRelevantPeopleForHotWater,
    effectiveHotWaterStatus,
    applyHotWaterInheritance,
    makeTargetKey,
    createUiIssues,
    deduplicateIssues,
    sortIssues,
    prioritizeIssues,
    groupIssues,
    summarizeIssueCounts,
    selectUserFacingCalculationCodes,
    targetSelectors,
    resolveIssueTarget,
  };
});
