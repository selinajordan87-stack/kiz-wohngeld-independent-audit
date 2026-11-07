(function initializeParentNeedData(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.KizParentNeedData = api;
})(typeof window !== "undefined" ? window : globalThis, function createParentNeedDataApi() {
  "use strict";

  const DATA_VERSION = 16;

  function defaultWohngeldIncomeForecast() {
    return {
      basis: "unknown",
      incomeStatus: "unknown",
      mode: "unknown",
      taxExpected: "unknown",
      healthCareContributionExpected: "unknown",
      pensionContributionExpected: "unknown",
      sources: [],
    };
  }

  function defaultWohngeldPerson() {
    return {
      wohngeldExclusionStatus: "unknown",
      wohngeldExclusionReason: "",
      careDaysInReferenceMonth: "",
      incomeForecast: defaultWohngeldIncomeForecast(),
      disabilityAllowanceStatus: "unknown",
      nsPersecutionStatus: "unknown",
      wohngeldGrundrentenTimesStatus: "unknown",
    };
  }

  function defaultWohngeldOwnerCosts() {
    return {
      livingAreaSqm: "",
      annualInterest: "",
      annualPrincipalRepayment: "",
      annualLoanAncillaryCosts: "",
      annualGuaranteeCosts: "",
      annualLeaseholdPayment: "",
      annualTotalLoanPayments: "",
      annualPropertyTax: "",
      annualThirdPartyAdministrationCosts: "",
    };
  }

  function defaultWohngeldData() {
    return {
      calculationMode: "not-requested",
      section20Status: "unknown",
      significantAssetsStatus: "unknown",
      mietstufe: "unknown",
      nonHouseholdAdjustmentStatus: "unknown",
      complexUseStatus: "unknown",
      singleParentAllowanceStatus: "unknown",
      persons: {
        applicant: defaultWohngeldPerson(),
        partner: defaultWohngeldPerson(),
        children: {},
      },
      ownerCosts: defaultWohngeldOwnerCosts(),
      maintenanceDeductions: [],
    };
  }

  function migrateWohngeldIncomeSource(source = {}) {
    return {
      id: "",
      type: "unknown",
      expectedMonthlyAmount: "",
      expectedAnnualAmount: "",
      amountType: "unknown",
      origin: "manual",
      originSourceId: "",
      monthlyValues: Array(12).fill(""),
      confirmedHigherAnnualWorkExpenses: "",
      confirmedAnnualWorkExpenses: "",
      confirmedExpectedAnnualTaxProfit: "",
      confirmedExpectedAnnualPositiveTaxIncome: "",
      confirmedParentalAllowanceExemptionAnnual: "",
      actualAnnualTaxAmount: "",
      details: {},
      ...source,
      monthlyValues: Array.isArray(source?.monthlyValues)
        ? [...source.monthlyValues, ...Array(12).fill("")].slice(0, 12)
        : Array(12).fill(""),
      details: source?.details && typeof source.details === "object" ? { ...source.details } : {},
    };
  }

  function migrateWohngeldPerson(person = {}) {
    const defaults = defaultWohngeldPerson();
    const forecast = person?.incomeForecast && typeof person.incomeForecast === "object" ? person.incomeForecast : {};
    return {
      ...defaults,
      ...person,
      incomeForecast: {
        ...defaults.incomeForecast,
        ...forecast,
        basis: ["unknown", "confirmed-from-current-income", "custom"].includes(forecast.basis)
          ? forecast.basis
          : (["present", "none"].includes(forecast.incomeStatus) ? "custom" : "unknown"),
        sources: Array.isArray(forecast.sources) ? forecast.sources.map(migrateWohngeldIncomeSource) : [],
      },
    };
  }

  function migrateWohngeldData(data = {}) {
    const defaults = defaultWohngeldData();
    const persons = data?.persons && typeof data.persons === "object" ? data.persons : {};
    const children = persons?.children && typeof persons.children === "object"
      ? Object.fromEntries(Object.entries(persons.children).map(([childId, person]) => [childId, migrateWohngeldPerson(person)]))
      : {};
    return {
      ...defaults,
      ...data,
      calculationMode: ["not-requested", "foundation", "automatic"].includes(data?.calculationMode) ? data.calculationMode : defaults.calculationMode,
      section20Status: ["not-excluded", "excluded", "unknown"].includes(data?.section20Status) ? data.section20Status : "unknown",
      significantAssetsStatus: ["not-excluded", "excluded", "unknown"].includes(data?.significantAssetsStatus) ? data.significantAssetsStatus : "unknown",
      persons: {
        applicant: migrateWohngeldPerson(persons.applicant),
        partner: migrateWohngeldPerson(persons.partner),
        children,
      },
      ownerCosts: { ...defaults.ownerCosts, ...(data?.ownerCosts || {}) },
      maintenanceDeductions: Array.isArray(data?.maintenanceDeductions)
        ? data.maintenanceDeductions.map((entry) => ({
            id: "",
            type: "other-person",
            annualPaidAmount: "",
            legalObligationStatus: "unknown",
            titleStatus: "unknown",
            titleAnnualMaximum: "",
            ...entry,
          }))
        : [],
    };
  }

  function defaultAssetPersons() {
    return { applicant: { assets: [] }, partner: { assets: [] }, children: {} };
  }

  function migrateAssetPersons(assetPersons = {}) {
    const normalizeAssets = (person, ownerRole) => ({
      assets: Array.isArray(person?.assets)
        ? person.assets.map((asset) => ({
            id: "",
            type: "cash",
            value: "",
            ownerRole,
            protectedStatus: "unknown",
            details: {},
            ...asset,
            details: asset?.details && typeof asset.details === "object" ? { ...asset.details } : {},
          }))
        : [],
    });
    const children = assetPersons?.children && typeof assetPersons.children === "object"
      ? Object.fromEntries(Object.entries(assetPersons.children).map(([childId, person]) => [childId, normalizeAssets(person, "child")]))
      : {};
    return {
      applicant: normalizeAssets(assetPersons?.applicant, "applicant"),
      partner: normalizeAssets(assetPersons?.partner, "partner"),
      children,
    };
  }

  function defaultAdultIncomeD5Fields() {
    return {
      u25SpecialAllowanceStatus: "unknown",
      parentalAllowanceType: "unknown",
      confirmedExemptionMonthly: "",
    };
  }

  function migrateAdultIncomeD5Data(source = {}) {
    const migrated = { ...defaultAdultIncomeD5Fields(), ...source };
    const deductions = source?.deductions && typeof source.deductions === "object" ? source.deductions : {};
    migrated.deductions = Object.fromEntries(Object.entries(deductions).map(([key, value]) => [
      key,
      value && typeof value === "object" && ["healthInsurance", "careInsurance", "pensionInsurance", "unemploymentInsurance"].includes(key)
        ? { mandatoryStatus: "unknown", ...value }
        : value,
    ]));
    return migrated;
  }

  function defaultAdultExpenseD5Fields() {
    return {
      reasonablePublicTransport: "unknown",
      monthlyPublicTransportAlternativeCost: "",
      legalDeductibleAmountConfirmed: "unknown",
      liabilityOnlyConfirmed: "unknown",
      proofStatus: "unknown",
      pureCareCostsConfirmed: "unknown",
      incomeConnectionConfirmed: "unknown",
      legalObligationConfirmed: "unknown",
      titleOrNotarialMonthlyMaximum: "",
    };
  }

  function migrateAdultExpenseD5Data(expense = {}) {
    return { ...defaultAdultExpenseD5Fields(), ...expense };
  }

  function defaultHousingCosts() {
    return {
      rent: {
        coldRent: "",
        coldUtilities: "",
        heating: "",
        costMonth: "",
        sublettingStatus: "unknown",
        sublettingAmount: "",
        parkingAmount: "",
        parkingInseparableStatus: "unknown",
      },
      owner: {
        financingStatus: "unknown",
        costPeriodStatus: "unknown",
        costYear: "",
        debtInterest: "",
        debtInterestFrequency: "monthly",
        propertyTax: "",
        propertyTaxFrequency: "yearly",
        buildingInsurance: "",
        buildingInsuranceFrequency: "yearly",
        heating: "",
        heatingFrequency: "monthly",
        otherCostsDescription: "",
        otherCostsAmount: "",
        otherCostsFrequency: "yearly",
        recentMonthlyValues: Array(12).fill(""),
      },
    };
  }

  function migrateParentNeedHousehold(draft = {}) {
    const defaults = defaultHousingCosts();
    const oldCosts = draft?.housingCosts && typeof draft.housingCosts === "object" ? draft.housingCosts : {};
    const recentMonthlyValues = Array.isArray(oldCosts?.owner?.recentMonthlyValues)
      ? [...oldCosts.owner.recentMonthlyValues, ...Array(12).fill("")].slice(0, 12)
      : Array(12).fill("");
    const housingCosts = {
      rent: { ...defaults.rent, ...(oldCosts.rent || {}) },
      owner: { ...defaults.owner, ...(oldCosts.owner || {}), recentMonthlyValues },
    };
    if (typeof draft?.housingCosts === "string" || typeof draft?.housingCosts === "number") {
      housingCosts.rent.coldRent = draft.housingCosts;
    }
    const oldOtherResidents = draft?.otherResidents;
    const otherResidentsStatus = ["yes", "no", "unknown"].includes(draft?.otherResidentsStatus)
      ? draft.otherResidentsStatus
      : (oldOtherResidents === "" || oldOtherResidents == null
        ? "unknown"
        : Number(oldOtherResidents) === 0
          ? "no"
          : Number.isInteger(Number(oldOtherResidents)) && Number(oldOtherResidents) > 0 ? "yes" : "unknown");
    const incomeStatus = (role, sources) => {
      const key = `${role}IncomeStatus`;
      if (["unknown", "present", "none"].includes(draft?.[key])) return draft[key];
      return Array.isArray(sources) && sources.length > 0 ? "present" : "unknown";
    };
    return {
      housingCosts,
      otherResidentsStatus,
      applicantIncomeStatus: incomeStatus("applicant", draft?.applicantIncomeSources),
      partnerIncomeStatus: incomeStatus("partner", draft?.partnerIncomeSources),
      wohngeldData: migrateWohngeldData(draft?.wohngeldData),
      assetPersons: migrateAssetPersons(draft?.assetPersons),
      coverageAssetStatus: ["confirmed-none", "present", "unknown"].includes(draft?.coverageAssetStatus) ? draft.coverageAssetStatus : "unknown",
      extendedAccessSgbBenefitStatus: ["none", "received-or-applied", "unknown"].includes(draft?.extendedAccessSgbBenefitStatus) ? draft.extendedAccessSgbBenefitStatus : "unknown",
      decentralHotWaterAdults: {
        applicant: "unknown",
        partner: "unknown",
        ...(draft?.decentralHotWaterAdults || {}),
      },
      specialSituations: Array.isArray(draft?.specialSituations)
        ? draft.specialSituations.map((situation) => ({
            personRole: "applicant",
            confirmationStatus: "unknown",
            recurringStatus: "unknown",
            ...situation,
          }))
        : [],
    };
  }

  function defaultChildFamilyNeedFields() {
    return {
      u25RuleStageStatus: "unknown",
      decentralHotWaterStatus: { A: "unknown", B: "unknown" },
      additionalNeedStatus: "unknown",
      additionalNeedMonthlyAmount: "",
    };
  }

  function migrateChildFamilyNeedData(child = {}) {
    const defaults = defaultChildFamilyNeedFields();
    const legacyStatus = typeof child.decentralHotWaterStatus === "string" ? child.decentralHotWaterStatus : null;
    return {
      ...defaults,
      ...child,
      decentralHotWaterStatus: {
        ...defaults.decentralHotWaterStatus,
        ...(legacyStatus ? { A: legacyStatus, B: legacyStatus } : child.decentralHotWaterStatus || {}),
      },
    };
  }

  return {
    DATA_VERSION,
    defaultAssetPersons,
    migrateAssetPersons,
    defaultHousingCosts,
    migrateParentNeedHousehold,
    defaultChildFamilyNeedFields,
    migrateChildFamilyNeedData,
    defaultAdultIncomeD5Fields,
    migrateAdultIncomeD5Data,
    defaultAdultExpenseD5Fields,
    migrateAdultExpenseD5Data,
    defaultWohngeldIncomeForecast,
    defaultWohngeldPerson,
    defaultWohngeldOwnerCosts,
    defaultWohngeldData,
    migrateWohngeldIncomeSource,
    migrateWohngeldPerson,
    migrateWohngeldData,
  };
});
