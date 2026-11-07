(function initializeWohngeld(root, factory) {
  const data = typeof module !== "undefined" && module.exports ? require("./wohngeld-data.js") : root?.WohngeldData;
  const api = factory(data);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.WohngeldCalculator = api;
})(typeof window !== "undefined" ? window : globalThis, function createWohngeldApi(wohngeldData) {
  "use strict";

  const RULE_IDS = Object.freeze({
    household: "WG-HOUSEHOLD-001",
    income: "WG-INCOME-001",
    rent: "WG-RENT-001",
    ownerBurden: "WG-OWNER-BURDEN-001",
    foundation: "WG-FOUNDATION-001",
    amount: "WG-AMOUNT-001",
  });
  const FIXED_SCALE = 10000000000n;
  const HALF_FIXED_SCALE = 5000000000n;
  const MIETSTUFEN = new Set(["I", "II", "III", "IV", "V", "VI", "VII", "unknown"]);
  const STATUS_VALUES = new Set(["yes", "no", "unknown"]);
  const EXCLUSION_VALUES = new Set(["not-excluded", "excluded", "unknown"]);

  function isBlank(value) {
    return value === null || value === undefined || String(value).trim() === "";
  }

  function isNetSickPayForecast(forecast) {
    const sources = Array.isArray(forecast?.sources) ? forecast.sources : [];
    return ["confirmed-from-current-income", "custom"].includes(forecast?.basis)
      && sources.length > 0
      && sources.every((source) => source?.type === "sick-pay"
        && (source?.details?.transferBasis === "net" || ["net", "notice"].includes(source?.amountType)));
  }

  function numberOrNull(value) {
    if (isBlank(value)) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function round(value, digits = 10) {
    if (!Number.isFinite(value)) return value;
    const factor = 10 ** digits;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  function decimalToScaledInteger(value) {
    if (typeof value === "bigint") return value * FIXED_SCALE;
    if (isBlank(value)) throw new TypeError("EMPTY_DECIMAL");
    const text = String(value).trim().replace(",", ".");
    const match = /^([+-]?)(\d+)(?:\.(\d*))?$/.exec(text);
    if (!match) throw new TypeError("INVALID_DECIMAL");
    const negative = match[1] === "-";
    const fraction = match[3] || "";
    if (fraction.length > 10 && /[1-9]/.test(fraction.slice(10))) throw new RangeError("DECIMAL_EXCEEDS_FIXED_SCALE");
    const fractionPadded = fraction.slice(0, 10).padEnd(10, "0");
    const scaled = BigInt(match[2]) * FIXED_SCALE + BigInt(fractionPadded || "0");
    return negative ? -scaled : scaled;
  }

  function scaledAdd(...values) {
    return values.reduce((sum, value) => sum + value, 0n);
  }

  function scaledSubtract(left, right) {
    return left - right;
  }

  function scaledMultiply(left, right) {
    return (left * right) / FIXED_SCALE;
  }

  function scaledByRatio(value, numerator, denominator) {
    if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || numerator < 0 || denominator <= 0) {
      throw new RangeError("INVALID_FIXED_RATIO");
    }
    return (value * BigInt(numerator)) / BigInt(denominator);
  }

  function scaledToDecimalString(value) {
    const negative = value < 0n;
    const absolute = negative ? -value : value;
    const whole = absolute / FIXED_SCALE;
    const fraction = String(absolute % FIXED_SCALE).padStart(10, "0");
    return `${negative ? "-" : ""}${whole}.${fraction}`;
  }

  function scaledToNumber(value) {
    return Number(scaledToDecimalString(value));
  }

  function roundScaledEuroToWholeEuro(value) {
    const negative = value < 0n;
    const absolute = negative ? -value : value;
    let whole = absolute / FIXED_SCALE;
    if (absolute % FIXED_SCALE >= HALF_FIXED_SCALE) whole += 1n;
    return Number(negative ? -whole : whole);
  }

  function unique(values) {
    return [...new Set(values)];
  }

  function warning(code, message, field = null) {
    return { code, message, field };
  }

  function statusFor(openChecks) {
    return openChecks.length ? "UNRESOLVED" : "SUPPORTED";
  }

  function personData(household, role, childId = null) {
    const persons = household?.wohngeldData?.persons || {};
    if (role === "child") return persons.children?.[childId] || {};
    return persons[role] || {};
  }

  function householdSide(context = {}) {
    return context.householdId === "B" ? "B" : "A";
  }

  function careAssessment(child, householdId, entry) {
    const exactDays = numberOrNull(entry?.careDaysInReferenceMonth);
    if (exactDays !== null) {
      if (!Number.isInteger(exactDays) || exactDays < 0 || exactDays > 30) {
        return { relation: true, status: "unknown", days: null, openCheck: "WG_CARE_DAYS_INVALID" };
      }
      if (exactDays === 0) return { relation: true, status: "not-member", days: 0 };
      return { relation: true, status: exactDays >= 10 ? "member" : "below-threshold", days: exactDays };
    }

    const care = child?.careSituation;
    if (care === "wechselmodell-50-50") return { relation: true, status: "member", days: 15 };
    if (care === `wechselmodell-${householdId.toLowerCase()}-external`) return { relation: true, status: "member", days: 15 };
    if (care === `dauerhaft-${householdId.toLowerCase()}` || care === `ueberwiegend-${householdId.toLowerCase()}`) {
      return { relation: true, status: "member", days: care.startsWith("dauerhaft") ? 30 : null };
    }
    if (care === `umgang-${householdId.toLowerCase()}`) {
      const days = numberOrNull(child?.stayDays);
      if (days === null) return { relation: true, status: "unknown", days: null, openCheck: "WG_CARE_RATIO_REQUIRED" };
      if (!Number.isInteger(days) || days < 0 || days > 30) {
        return { relation: true, status: "unknown", days: null, openCheck: "WG_CARE_DAYS_INVALID" };
      }
      return { relation: true, status: days >= 10 ? "member" : days > 0 ? "below-threshold" : "not-member", days };
    }
    return { relation: false, status: "not-member", days: null };
  }

  function memberRecord({ personId, role, name, exclusionStatus, exclusionReason, childId = null, careDays = null, specialBasis = null }) {
    return {
      personId,
      role,
      childId,
      name: name || "",
      careDaysInReferenceMonth: careDays,
      specialMembershipBasis: specialBasis,
      wohngeldExclusionStatus: exclusionStatus,
      wohngeldExclusionReason: exclusionReason || "",
      considered: exclusionStatus === "not-excluded" ? true : exclusionStatus === "excluded" ? false : null,
    };
  }

  function evaluateWohngeldHousehold(household = {}, children = [], context = {}) {
    const householdId = householdSide(context);
    const warnings = [];
    const openChecks = [];
    const members = [];

    function addAdult(role, name) {
      const data = personData(household, role);
      const exclusionStatus = EXCLUSION_VALUES.has(data.wohngeldExclusionStatus) ? data.wohngeldExclusionStatus : "unknown";
      if (exclusionStatus === "unknown") openChecks.push("WG_EXCLUSION_STATUS_REQUIRED");
      members.push(memberRecord({
        personId: role === "applicant" ? `applicant-${householdId.toLowerCase()}` : `partner-${householdId.toLowerCase()}`,
        role,
        name,
        exclusionStatus,
        exclusionReason: data.wohngeldExclusionReason,
      }));
    }

    addAdult("applicant", household.person1);
    if (household.adults === "couple") addAdult("partner", household.partner);

    const regularChildren = [];
    const belowThresholdChildren = [];
    (Array.isArray(children) ? children : []).forEach((child) => {
      const entry = personData(household, "child", child?.id);
      const care = careAssessment(child, householdId, entry);
      if (!care.relation) return;
      if (care.openCheck) openChecks.push(care.openCheck);
      if (care.status === "member") regularChildren.push({ child, entry, care });
      if (care.status === "below-threshold") belowThresholdChildren.push({ child, entry, care });
    });

    if (belowThresholdChildren.length >= 2) {
      const knownAges = belowThresholdChildren.map((item) => ({ item, age: numberOrNull(item.child?.age) }));
      if (knownAges.some(({ age }) => age === null || !Number.isInteger(age) || age < 0)) {
        openChecks.push("WG_YOUNGEST_CHILD_REQUIRED");
      } else {
        const minimumAge = Math.min(...knownAges.map(({ age }) => age));
        const youngest = knownAges.filter(({ age }) => age === minimumAge);
        if (youngest.length !== 1) openChecks.push("WG_YOUNGEST_CHILD_REQUIRED");
        else regularChildren.push({ ...youngest[0].item, specialBasis: "SECTION_5_4_YOUNGEST_BELOW_ONE_THIRD" });
      }
    }

    regularChildren.forEach(({ child, entry, care, specialBasis }) => {
      const exclusionStatus = EXCLUSION_VALUES.has(entry.wohngeldExclusionStatus) ? entry.wohngeldExclusionStatus : "unknown";
      if (exclusionStatus === "unknown") openChecks.push("WG_EXCLUSION_STATUS_REQUIRED");
      members.push(memberRecord({
        personId: child.id,
        childId: child.id,
        role: "child",
        name: child.name,
        careDays: care.days,
        specialBasis,
        exclusionStatus,
        exclusionReason: entry.wohngeldExclusionReason,
      }));
    });

    const exclusionUnknown = members.some((member) => member.considered === null);
    const consideredMembers = exclusionUnknown ? null : members.filter((member) => member.considered).length;
    const excludedMembers = exclusionUnknown ? null : members.filter((member) => !member.considered).length;
    if (belowThresholdChildren.length === 1) {
      warnings.push(warning("WG_SINGLE_CHILD_BELOW_ONE_THIRD_NOT_MEMBER", "Ein einzelnes Kind unter der 1/3-Grenze wird beim geringer betreuenden Elternteil nicht automatisch als Haushaltsmitglied gezählt."));
    }

    return {
      ruleId: RULE_IDS.household,
      householdId,
      totalMembers: members.length,
      consideredMembers,
      excludedMembers,
      members,
      status: statusFor(unique(openChecks)),
      warnings,
      openChecks: unique(openChecks),
    };
  }

  function adjustedHousingAmount(baseAmount, household, householdResult, openChecks) {
    if (!Number.isFinite(baseAmount)) return null;
    const data = household?.wohngeldData || {};
    let adjusted = baseAmount;
    if (data.complexUseStatus === "yes") openChecks.push("WG_HOUSING_COMPLEX_USE_OPEN");
    else if (data.complexUseStatus !== "no") openChecks.push("WG_HOUSING_COMPLEX_USE_STATUS_REQUIRED");

    if (data.nonHouseholdAdjustmentStatus === "simple-resident-share") {
      const otherResidents = numberOrNull(household?.otherResidents);
      if (!Number.isInteger(otherResidents) || otherResidents < 0) {
        openChecks.push("WG_OTHER_RESIDENTS_REQUIRED");
        adjusted = null;
      } else if (householdResult.totalMembers > 0) {
        adjusted *= householdResult.totalMembers / (householdResult.totalMembers + otherResidents);
      }
    } else if (data.nonHouseholdAdjustmentStatus === "complex") {
      openChecks.push("WG_NON_HOUSEHOLD_SHARE_OPEN");
      adjusted = null;
    } else if (data.nonHouseholdAdjustmentStatus !== "none") {
      openChecks.push("WG_NON_HOUSEHOLD_ADJUSTMENT_STATUS_REQUIRED");
      adjusted = null;
    }

    if (householdResult.consideredMembers === null) {
      openChecks.push("WG_CONSIDERED_MEMBER_COUNT_REQUIRED");
      return null;
    }
    if (adjusted !== null && householdResult.totalMembers > 0) {
      adjusted *= householdResult.consideredMembers / householdResult.totalMembers;
    }
    return adjusted === null ? null : round(adjusted);
  }

  function evaluateWohngeldRent(household = {}, householdResult = evaluateWohngeldHousehold(household, [], {})) {
    const rent = household?.housingCosts?.rent || {};
    const warnings = [];
    const openChecks = [];
    const coldRent = numberOrNull(rent.coldRent);
    const coldUtilities = numberOrNull(rent.coldUtilities);
    if (coldRent === null || coldUtilities === null || coldRent < 0 || coldUtilities < 0) openChecks.push("WG_RENT_COMPONENTS_REQUIRED");
    const rawEligibleColdRent = coldRent === null || coldUtilities === null || coldRent < 0 || coldUtilities < 0
      ? null
      : round(coldRent + coldUtilities);
    const excludedHeating = Math.max(0, numberOrNull(rent.heating) || 0);
    const excludedWarmWater = Math.max(0, numberOrNull(rent.warmWater) || 0);
    const excludedHouseholdEnergy = Math.max(0, numberOrNull(rent.householdEnergy) || 0);
    const excludedParking = Math.max(0, numberOrNull(rent.parkingAmount) || 0);
    if (rent.sublettingStatus === "yes") openChecks.push("WG_RENT_NON_MEMBER_SHARE_OPEN");
    else if (rent.sublettingStatus !== "no") openChecks.push("WG_RENT_SUBLETTING_STATUS_REQUIRED");
    const adjustedBaseRent = rent.sublettingStatus === "yes"
      ? null
      : adjustedHousingAmount(rawEligibleColdRent, household, householdResult, openChecks);
    return {
      ruleId: RULE_IDS.rent,
      rawEligibleColdRent,
      excludedHeating,
      excludedWarmWater,
      excludedHouseholdEnergy,
      excludedParking,
      adjustedBaseRent,
      status: statusFor(unique(openChecks)),
      warnings,
      openChecks: unique(openChecks),
    };
  }

  function requiredNonNegative(object, field, code, openChecks) {
    const value = numberOrNull(object?.[field]);
    if (value === null || value < 0) {
      openChecks.push(code);
      return null;
    }
    return value;
  }

  function evaluateWohngeldOwnerBurden(household = {}, householdResult = evaluateWohngeldHousehold(household, [], {})) {
    const owner = household?.wohngeldData?.ownerCosts || {};
    const openChecks = [];
    const warnings = [];
    const fields = {
      annualInterest: requiredNonNegative(owner, "annualInterest", "WG_OWNER_INTEREST_REQUIRED", openChecks),
      annualPrincipalRepayment: requiredNonNegative(owner, "annualPrincipalRepayment", "WG_OWNER_PRINCIPAL_REQUIRED", openChecks),
      annualLoanAncillaryCosts: requiredNonNegative(owner, "annualLoanAncillaryCosts", "WG_OWNER_LOAN_ANCILLARY_REQUIRED", openChecks),
      annualGuaranteeCosts: requiredNonNegative(owner, "annualGuaranteeCosts", "WG_OWNER_GUARANTEE_REQUIRED", openChecks),
      annualLeaseholdPayment: requiredNonNegative(owner, "annualLeaseholdPayment", "WG_OWNER_LEASEHOLD_REQUIRED", openChecks),
      annualPropertyTax: requiredNonNegative(owner, "annualPropertyTax", "WG_OWNER_PROPERTY_TAX_REQUIRED", openChecks),
      annualThirdPartyAdministrationCosts: requiredNonNegative(owner, "annualThirdPartyAdministrationCosts", "WG_OWNER_ADMINISTRATION_REQUIRED", openChecks),
    };
    const livingAreaSqm = numberOrNull(owner.livingAreaSqm);
    if (livingAreaSqm === null || livingAreaSqm <= 0) openChecks.push("WG_OWNER_LIVING_AREA_REQUIRED");
    if (!isBlank(owner.annualTotalLoanPayments) && Object.entries(fields).slice(0, 5).some(([, value]) => value === null)) {
      openChecks.push("WG_OWNER_LOAN_BREAKDOWN_REQUIRED");
    }
    const allKnown = livingAreaSqm !== null && livingAreaSqm > 0 && Object.values(fields).every((value) => value !== null);
    const annualCapitalService = allKnown
      ? round(fields.annualInterest + fields.annualPrincipalRepayment + fields.annualLoanAncillaryCosts + fields.annualGuaranteeCosts + fields.annualLeaseholdPayment)
      : null;
    const annualManagementBurden = allKnown
      ? round(livingAreaSqm * 36 + fields.annualPropertyTax + fields.annualThirdPartyAdministrationCosts)
      : null;
    const annualOwnerBurden = allKnown ? round(annualCapitalService + annualManagementBurden) : null;
    const monthlyOwnerBurdenRaw = allKnown ? round(annualOwnerBurden / 12) : null;
    const adjustedMonthlyOwnerBurden = adjustedHousingAmount(monthlyOwnerBurdenRaw, household, householdResult, openChecks);
    return {
      ruleId: RULE_IDS.ownerBurden,
      livingAreaSqm: livingAreaSqm !== null && livingAreaSqm > 0 ? livingAreaSqm : null,
      annualCapitalService,
      annualManagementBurden,
      annualOwnerBurden,
      monthlyOwnerBurdenRaw,
      adjustedMonthlyOwnerBurden,
      excludedActualBuildingInsurance: Math.max(0, numberOrNull(household?.housingCosts?.owner?.buildingInsurance) || 0),
      excludedActualHeating: Math.max(0, numberOrNull(household?.housingCosts?.owner?.heating) || 0),
      excludedOtherActualCosts: Math.max(0, numberOrNull(household?.housingCosts?.owner?.otherCostsAmount) || 0),
      status: statusFor(unique(openChecks)),
      warnings,
      openChecks: unique(openChecks),
    };
  }

  function annualizedForecastAmount(source, mode, openChecks) {
    if (mode === "same-monthly") {
      const amount = numberOrNull(source?.expectedMonthlyAmount);
      if (amount === null || amount < 0) {
        openChecks.push("WG_FORECAST_AMOUNT_REQUIRED");
        return null;
      }
      return round(amount * 12);
    }
    if (mode === "annual") {
      const amount = numberOrNull(source?.expectedAnnualAmount);
      if (amount === null || amount < 0) {
        openChecks.push("WG_FORECAST_AMOUNT_REQUIRED");
        return null;
      }
      return amount;
    }
    if (mode === "custom-monthly") {
      const values = Array.isArray(source?.monthlyValues) ? source.monthlyValues : [];
      if (values.length !== 12 || values.some((value) => numberOrNull(value) === null || numberOrNull(value) < 0)) {
        openChecks.push("WG_FORECAST_MONTHS_REQUIRED");
        return null;
      }
      return round(values.reduce((sum, value) => sum + Number(value), 0));
    }
    openChecks.push("WG_FORECAST_MODE_REQUIRED");
    return null;
  }

  function evaluateIncomeSource(source, mode) {
    const openChecks = [];
    const warnings = [];
    const type = source?.type;
    let annualIncome = null;
    let annualEarnedIncome = 0;
    let excludedFromIncome = false;
    if (["kindergeld", "kinderzuschlag", "kiz"].includes(type)) {
      annualIncome = 0;
      excludedFromIncome = true;
    } else if (type === "self-employed") {
      annualIncome = requiredNonNegative(source, "confirmedExpectedAnnualTaxProfit", "WG_SELF_EMPLOYED_PROFIT_REQUIRED", openChecks);
    } else if (["rental", "capital", "other-tax"].includes(type)) {
      annualIncome = requiredNonNegative(source, "confirmedExpectedAnnualPositiveTaxIncome", "WG_POSITIVE_TAX_INCOME_REQUIRED", openChecks);
    } else {
      const receipts = annualizedForecastAmount(source, mode, openChecks);
      if (receipts !== null && type === "employment") {
        const higher = numberOrNull(source.confirmedHigherAnnualWorkExpenses);
        if (higher !== null && higher < 0) openChecks.push("WG_WORK_EXPENSES_INVALID");
        const expenses = Math.max(1230, higher === null ? 0 : higher);
        annualIncome = round(Math.max(0, receipts - expenses));
        annualEarnedIncome = annualIncome;
      } else if (receipts !== null && type === "minijob") {
        const expenses = requiredNonNegative(source, "confirmedAnnualWorkExpenses", "WG_MINIJOB_EXPENSES_REQUIRED", openChecks);
        if (expenses !== null) {
          annualIncome = round(Math.max(0, receipts - Math.min(receipts, expenses)));
          annualEarnedIncome = annualIncome;
        }
      } else if (receipts !== null && ["sick-pay", "unemployment-1", "maintenance", "adult-maintenance", "advance-maintenance"].includes(type)) {
        annualIncome = receipts;
      } else if (receipts !== null && type === "parental-allowance") {
        const exemption = requiredNonNegative(source, "confirmedParentalAllowanceExemptionAnnual", "WG_PARENTAL_ALLOWANCE_EXEMPTION_OPEN", openChecks);
        if (exemption !== null) annualIncome = round(Math.max(0, receipts - Math.min(receipts, exemption)));
      } else if (receipts !== null) {
        openChecks.push("WG_INCOME_SOURCE_OPEN");
      }
    }
    if (!isBlank(source?.actualAnnualTaxAmount)) {
      warnings.push(warning("WG_ACTUAL_TAX_AMOUNT_NOT_DEDUCTED", "Ein tatsächlicher Steuerbetrag wird nicht vom Wohngeld-Jahreseinkommen abgezogen.", "actualAnnualTaxAmount"));
    }
    return {
      sourceId: source?.id || "",
      type: type || "",
      annualIncomeBeforeWoGG16: annualIncome,
      annualEarnedIncomeBeforeWoGG16: annualEarnedIncome,
      excludedFromIncome,
      status: statusFor(unique(openChecks)),
      warnings,
      openChecks: unique(openChecks),
    };
  }

  function evaluateWohngeldPersonIncome(member, household, child = null) {
    const data = personData(household, member.role, member.childId);
    const forecast = data.incomeForecast || {};
    const openChecks = [];
    const warnings = [];
    let sourceResults = [];
    let expectedAnnualIncomeBeforeWoGG16 = null;
    let annualEarnedIncomeBeforeWoGG16 = 0;
    if (forecast.incomeStatus === "none") {
      expectedAnnualIncomeBeforeWoGG16 = 0;
    } else if (forecast.incomeStatus === "present") {
      if (!Array.isArray(forecast.sources) || forecast.sources.length === 0) {
        openChecks.push("WG_INCOME_SOURCE_REQUIRED");
      } else {
        sourceResults = forecast.sources.map((source) => evaluateIncomeSource(source, forecast.mode));
        sourceResults.forEach((result) => {
          openChecks.push(...result.openChecks);
          warnings.push(...result.warnings);
        });
        if (sourceResults.every((result) => result.annualIncomeBeforeWoGG16 !== null)) {
          expectedAnnualIncomeBeforeWoGG16 = round(sourceResults.reduce((sum, result) => sum + result.annualIncomeBeforeWoGG16, 0));
          annualEarnedIncomeBeforeWoGG16 = round(sourceResults.reduce((sum, result) => sum + result.annualEarnedIncomeBeforeWoGG16, 0));
        }
      }
    } else {
      openChecks.push("WG_INCOME_STATUS_REQUIRED");
    }

    const transferredNetSickPay = isNetSickPayForecast(forecast);
    const percentageDeductions = { tax: false, healthCare: false, pension: false, totalRate: 0 };
    if (expectedAnnualIncomeBeforeWoGG16 !== null && expectedAnnualIncomeBeforeWoGG16 > 0 && !transferredNetSickPay) {
      [
        ["taxExpected", "tax"],
        ["healthCareContributionExpected", "healthCare"],
        ["pensionContributionExpected", "pension"],
      ].forEach(([field, resultField]) => {
        if (!STATUS_VALUES.has(forecast[field]) || forecast[field] === "unknown") openChecks.push("WG_PERCENTAGE_DEDUCTION_STATUS_REQUIRED");
        else percentageDeductions[resultField] = forecast[field] === "yes";
      });
      percentageDeductions.totalRate = round([percentageDeductions.tax, percentageDeductions.healthCare, percentageDeductions.pension].filter(Boolean).length * 0.1);
    }
    const annualIncomeAfterWoGG16 = expectedAnnualIncomeBeforeWoGG16 === null
      ? null
      : round(expectedAnnualIncomeBeforeWoGG16 * (1 - percentageDeductions.totalRate));

    let annualAllowances = 0;
    if (data.disabilityAllowanceStatus === "confirmed-1800") annualAllowances += 1800;
    else if (!["not-applicable", "insufficient", "unknown"].includes(data.disabilityAllowanceStatus)) openChecks.push("WG_DISABILITY_STATUS_INVALID");
    else if (data.disabilityAllowanceStatus === "unknown") openChecks.push("WG_DISABILITY_ALLOWANCE_STATUS_REQUIRED");
    if (data.nsPersecutionStatus === "yes") annualAllowances += 750;
    else if (data.nsPersecutionStatus === "unknown" || !STATUS_VALUES.has(data.nsPersecutionStatus)) openChecks.push("WG_NS_ALLOWANCE_STATUS_REQUIRED");
    if (data.wohngeldGrundrentenTimesStatus === "yes") openChecks.push("WG_GRUNDRENTE_ALLOWANCE_OPEN");
    else if (data.wohngeldGrundrentenTimesStatus === "unknown" || !STATUS_VALUES.has(data.wohngeldGrundrentenTimesStatus)) openChecks.push("WG_GRUNDRENTE_TIMES_STATUS_REQUIRED");
    if (member.role === "child") {
      const age = numberOrNull(child?.age);
      if (Number.isInteger(age) && age >= 0 && age < 25) annualAllowances += Math.min(1200, annualEarnedIncomeBeforeWoGG16);
    }

    return {
      ruleId: RULE_IDS.income,
      personId: member.personId,
      expectedAnnualIncomeBeforeWoGG16,
      annualEarnedIncomeBeforeWoGG16,
      percentageDeductions,
      annualIncomeAfterWoGG16,
      annualAllowances: round(annualAllowances),
      sourceResults,
      status: statusFor(unique(openChecks)),
      warnings,
      openChecks: unique(openChecks),
    };
  }

  function evaluateMaintenanceDeductions(entries) {
    const openChecks = [];
    let annualAmount = 0;
    const results = [];
    const caps = { "child-other-parent": 3000, "former-partner": 6000, "other-person": 3000, "away-training": 3000 };
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      const paid = numberOrNull(entry?.annualPaidAmount);
      let applied = null;
      if (paid === null || paid < 0) openChecks.push("WG_MAINTENANCE_AMOUNT_REQUIRED");
      else if (entry.legalObligationStatus === "unknown") openChecks.push("WG_MAINTENANCE_LEGAL_STATUS_REQUIRED");
      else if (entry.legalObligationStatus === "yes") {
        if (entry.titleStatus === "yes") {
          const maximum = numberOrNull(entry.titleAnnualMaximum);
          if (maximum === null || maximum < 0) openChecks.push("WG_MAINTENANCE_TITLE_AMOUNT_REQUIRED");
          else applied = Math.min(paid, maximum);
        } else if (entry.titleStatus === "no") {
          if (!Object.hasOwn(caps, entry.type)) openChecks.push("WG_MAINTENANCE_TYPE_OPEN");
          else applied = Math.min(paid, caps[entry.type]);
        } else openChecks.push("WG_MAINTENANCE_TITLE_STATUS_REQUIRED");
      } else if (entry.legalObligationStatus === "no") applied = 0;
      else openChecks.push("WG_MAINTENANCE_LEGAL_STATUS_REQUIRED");
      if (applied !== null) annualAmount += applied;
      results.push({ id: entry?.id || "", type: entry?.type || "", annualPaidAmount: paid, annualAppliedAmount: applied });
    });
    return { annualAmount: round(annualAmount), results, openChecks: unique(openChecks) };
  }

  function evaluateWohngeldIncome(household = {}, children = [], householdResult = evaluateWohngeldHousehold(household, children, {})) {
    const openChecks = [...householdResult.openChecks];
    const warnings = [];
    const childMap = new Map((Array.isArray(children) ? children : []).map((child) => [child.id, child]));
    const consideredMembers = householdResult.members.filter((member) => member.considered === true);
    const personResults = consideredMembers.map((member) => evaluateWohngeldPersonIncome(member, household, childMap.get(member.childId)));
    personResults.forEach((result) => {
      openChecks.push(...result.openChecks);
      warnings.push(...result.warnings);
    });
    let singleParentAllowance = 0;
    const singleStatus = household?.wohngeldData?.singleParentAllowanceStatus;
    if (singleStatus === "yes") {
      const adultCount = consideredMembers.filter((member) => member.role !== "child").length;
      const hasMinorChild = consideredMembers.some((member) => {
        const age = numberOrNull(childMap.get(member.childId)?.age);
        return member.role === "child" && Number.isInteger(age) && age >= 0 && age < 18;
      });
      if (adultCount === 1 && hasMinorChild) singleParentAllowance = 1320;
      else openChecks.push("WG_SINGLE_PARENT_ALLOWANCE_CONDITIONS_REQUIRED");
    } else if (singleStatus === "unknown" || !STATUS_VALUES.has(singleStatus)) openChecks.push("WG_SINGLE_PARENT_ALLOWANCE_STATUS_REQUIRED");

    const maintenance = evaluateMaintenanceDeductions(household?.wohngeldData?.maintenanceDeductions);
    openChecks.push(...maintenance.openChecks);
    const valuesKnown = householdResult.consideredMembers !== null && personResults.every((result) => result.annualIncomeAfterWoGG16 !== null);
    const annualIncomeAfterWoGG16 = valuesKnown ? round(personResults.reduce((sum, result) => sum + result.annualIncomeAfterWoGG16, 0)) : null;
    const annualAllowances = valuesKnown ? round(personResults.reduce((sum, result) => sum + result.annualAllowances, 0) + singleParentAllowance) : null;
    const annualHouseholdIncome = valuesKnown
      ? round(Math.max(0, annualIncomeAfterWoGG16 - annualAllowances - maintenance.annualAmount))
      : null;
    return {
      ruleId: RULE_IDS.income,
      annualIncomeAfterWoGG16,
      annualAllowances,
      singleParentAllowance,
      annualMaintenanceDeductions: maintenance.annualAmount,
      maintenanceResults: maintenance.results,
      annualHouseholdIncome,
      monthlyTotalIncomeY: annualHouseholdIncome === null ? null : round(annualHouseholdIncome / 12),
      personResults,
      status: statusFor(unique(openChecks)),
      warnings,
      openChecks: unique(openChecks),
    };
  }

  function evaluateWohngeldFoundation(household = {}, children = [], context = {}) {
    const householdResult = evaluateWohngeldHousehold(household, children, context);
    const housingType = household?.housingType === "owner" ? "owner" : "rent";
    const housingResult = housingType === "owner"
      ? evaluateWohngeldOwnerBurden(household, householdResult)
      : evaluateWohngeldRent(household, householdResult);
    const incomeResult = evaluateWohngeldIncome(household, children, householdResult);
    const mietstufe = MIETSTUFEN.has(household?.wohngeldData?.mietstufe) ? household.wohngeldData.mietstufe : "unknown";
    const openChecks = unique([...householdResult.openChecks, ...housingResult.openChecks, ...incomeResult.openChecks]);
    const warnings = [...householdResult.warnings, ...housingResult.warnings, ...incomeResult.warnings];
    if (!MIETSTUFEN.has(household?.wohngeldData?.mietstufe)) openChecks.push("WG_MIETSTUFE_INVALID");
    if (mietstufe === "unknown") warnings.push(warning("WG_MIETSTUFE_REQUIRED_FOR_AMOUNT", "Die Mietstufe ist für eine spätere Wohngeldbetragsberechnung erforderlich."));
    const rawMonthlyRentOrBurden = housingType === "owner" ? housingResult.adjustedMonthlyOwnerBurden : housingResult.adjustedBaseRent;
    return {
      ruleId: RULE_IDS.foundation,
      householdId: householdResult.householdId,
      household: householdResult,
      housing: {
        type: housingType,
        rent: housingType === "rent" ? housingResult : null,
        owner: housingType === "owner" ? housingResult : null,
        rawMonthlyRentOrBurden,
      },
      income: incomeResult,
      mietstufe,
      preparedForWohngeldFormula: {
        householdMemberCount: householdResult.consideredMembers,
        rawMonthlyRentOrBurden,
        monthlyTotalIncomeY: incomeResult.monthlyTotalIncomeY,
        mietstufe,
      },
      status: statusFor(unique(openChecks)),
      warnings,
      openChecks: unique(openChecks),
      usedRuleIds: [RULE_IDS.household, RULE_IDS.income, housingType === "owner" ? RULE_IDS.ownerBurden : RULE_IDS.rent, RULE_IDS.foundation],
      finalWohngeldAmount: null,
      remainingSteps: ["WG_AMOUNT_001_NOT_APPLIED", "SECTION_19_FORMULA_NOT_APPLIED", "HEATING_AND_CLIMATE_COMPONENTS_NOT_APPLIED"],
    };
  }

  function amountSkeleton(foundation, benefitType) {
    return {
      ruleId: RULE_IDS.amount,
      householdId: foundation.householdId,
      benefitType,
      ruleVersion: wohngeldData?.RULE_VERSION || "WG_RULESET_DATA_MISSING",
      foundationRuleId: foundation.ruleId,
      memberCounts: {
        totalHouseholdMembers: foundation.household.totalMembers,
        consideredHouseholdMembers: foundation.household.consideredMembers,
        excludedHouseholdMembers: foundation.household.excludedMembers,
        consideredRatio: foundation.household.totalMembers > 0 && foundation.household.consideredMembers !== null
          ? round(foundation.household.consideredMembers / foundation.household.totalMembers)
          : null,
      },
      housing: {
        rawMonthlyRentOrBurden: foundation.housing.rawMonthlyRentOrBurden,
        fullHousingMaximum: null,
        fullClimateComponent: null,
        fullHeatingRelief: null,
        consideredHousingMaximum: null,
        consideredClimateComponent: null,
        consideredHeatingRelief: null,
        coldHousingUpperLimit: null,
        recognizedColdRentOrBurden: null,
        actualFormulaM: null,
      },
      income: { actualMonthlyTotalIncomeY: foundation.income.monthlyTotalIncomeY },
      formula: null,
      unroundedFormulaAmount: null,
      roundedFormulaAmount: null,
      calculatedMonthlyWohngeld: null,
      payableWohngeldAmount: null,
      amountStatus: "UNRESOLVED",
      eligibilityReason: null,
      status: "UNRESOLVED",
      warnings: [...foundation.warnings],
      openChecks: [],
      remainingChecks: ["WG_SECTION_20_CHECK_NOT_FULLY_EVALUATED", "WG_SIGNIFICANT_ASSETS_CHECK_NOT_FULLY_EVALUATED"],
      usedRuleIds: [...foundation.usedRuleIds, RULE_IDS.amount],
    };
  }

  function unresolvedAmount(result, codes) {
    result.openChecks = unique([...(Array.isArray(codes) ? codes : [codes])]);
    return result;
  }

  function evaluateWohngeldAmount(household = {}, children = [], context = {}, preparedFoundation = null) {
    const foundation = preparedFoundation || evaluateWohngeldFoundation(household, children, context);
    const benefitType = foundation.housing.type === "owner" ? "LASTENZUSCHUSS" : "MIETZUSCHUSS";
    const result = amountSkeleton(foundation, benefitType);
    const explicitYear = numberOrNull(context?.applicationYear);
    if (explicitYear !== null && ![2025, 2026].includes(explicitYear)) {
      return unresolvedAmount(result, "WG_RULESET_YEAR_UNSUPPORTED");
    }
    if (!wohngeldData || wohngeldData.RULE_VERSION !== "WG_RULESET_2025_2026") {
      return unresolvedAmount(result, "WG_RULESET_DATA_REQUIRED");
    }

    const totalMembers = foundation.household.totalMembers;
    const consideredMembers = foundation.household.consideredMembers;
    if (Number.isInteger(totalMembers) && totalMembers > 0 && consideredMembers === 0) {
      result.payableWohngeldAmount = 0;
      result.calculatedMonthlyWohngeld = 0;
      result.amountStatus = "NOT_ENTITLED";
      result.eligibilityReason = "ALL_HOUSEHOLD_MEMBERS_EXCLUDED";
      result.status = "SUPPORTED";
      return result;
    }
    if (!Number.isInteger(totalMembers) || totalMembers < 1 || !Number.isInteger(consideredMembers) || consideredMembers < 1) {
      return unresolvedAmount(result, "WG_MEMBER_COUNTS_REQUIRED_FOR_AMOUNT");
    }
    if (consideredMembers > 12) return unresolvedAmount(result, "WG_MORE_THAN_12_MEMBERS_NOT_SUPPORTED");
    if (foundation.mietstufe === "unknown") return unresolvedAmount(result, "WG_MIETSTUFE_REQUIRED_FOR_AMOUNT");
    if (!wohngeldData.MIETSTUFEN.includes(foundation.mietstufe)) return unresolvedAmount(result, "WG_MIETSTUFE_INVALID");
    if (foundation.status !== "SUPPORTED") return unresolvedAmount(result, [...foundation.openChecks, "WG_FOUNDATION_UNRESOLVED"]);

    const rawMonthlyRentOrBurden = numberOrNull(foundation.housing.rawMonthlyRentOrBurden);
    const monthlyTotalIncomeY = numberOrNull(foundation.income.monthlyTotalIncomeY);
    if (rawMonthlyRentOrBurden === null || rawMonthlyRentOrBurden < 0) return unresolvedAmount(result, "WG_RAW_HOUSING_AMOUNT_REQUIRED");
    if (monthlyTotalIncomeY === null || monthlyTotalIncomeY < 0) return unresolvedAmount(result, "WG_MONTHLY_TOTAL_INCOME_REQUIRED");

    const fullHousingMaximum = wohngeldData.getHousingMaximum(totalMembers, foundation.mietstufe);
    const fullClimateText = wohngeldData.getClimateComponent(totalMembers);
    const fullHeatingText = wohngeldData.getHeatingRelief(totalMembers);
    const coefficients = wohngeldData.getFormulaCoefficients(consideredMembers);
    const minimums = wohngeldData.getFormulaMinimums(consideredMembers);
    if (fullHousingMaximum === null || fullClimateText === null || fullHeatingText === null || !coefficients || !minimums) {
      return unresolvedAmount(result, "WG_RULESET_TABLE_VALUE_REQUIRED");
    }

    let rawScaled;
    let actualYScaled;
    try {
      rawScaled = decimalToScaledInteger(rawMonthlyRentOrBurden);
      actualYScaled = decimalToScaledInteger(monthlyTotalIncomeY);
    } catch (error) {
      return unresolvedAmount(result, "WG_FIXED_POINT_INPUT_INVALID");
    }
    const fullMaximumScaled = decimalToScaledInteger(String(fullHousingMaximum));
    const fullClimateScaled = decimalToScaledInteger(fullClimateText);
    const fullHeatingScaled = decimalToScaledInteger(fullHeatingText);
    const consideredMaximumScaled = scaledByRatio(fullMaximumScaled, consideredMembers, totalMembers);
    const consideredClimateScaled = scaledByRatio(fullClimateScaled, consideredMembers, totalMembers);
    const consideredHeatingScaled = scaledByRatio(fullHeatingScaled, consideredMembers, totalMembers);
    const coldUpperScaled = scaledAdd(consideredMaximumScaled, consideredClimateScaled);
    const recognizedColdScaled = rawScaled < coldUpperScaled ? rawScaled : coldUpperScaled;
    const actualMScaled = scaledAdd(recognizedColdScaled, consideredHeatingScaled);

    result.housing = {
      rawMonthlyRentOrBurden,
      fullHousingMaximum,
      fullClimateComponent: Number(fullClimateText),
      fullHeatingRelief: Number(fullHeatingText),
      consideredHousingMaximum: scaledToNumber(consideredMaximumScaled),
      consideredClimateComponent: scaledToNumber(consideredClimateScaled),
      consideredHeatingRelief: scaledToNumber(consideredHeatingScaled),
      coldHousingUpperLimit: scaledToNumber(coldUpperScaled),
      recognizedColdRentOrBurden: scaledToNumber(recognizedColdScaled),
      actualFormulaM: scaledToNumber(actualMScaled),
    };

    const minimumMScaled = decimalToScaledInteger(String(minimums.M));
    const minimumYScaled = decimalToScaledInteger(String(minimums.Y));
    const formulaMScaled = actualMScaled < minimumMScaled ? minimumMScaled : actualMScaled;
    const formulaYScaled = actualYScaled < minimumYScaled ? minimumYScaled : actualYScaled;
    const aScaled = decimalToScaledInteger(coefficients.a);
    const bScaled = decimalToScaledInteger(coefficients.b);
    const cScaled = decimalToScaledInteger(coefficients.c);
    const z1 = scaledAdd(aScaled, scaledMultiply(bScaled, formulaMScaled), scaledMultiply(cScaled, formulaYScaled));
    const z2 = scaledMultiply(z1, formulaYScaled);
    const z3 = scaledSubtract(formulaMScaled, z2);
    const z4 = scaledMultiply(decimalToScaledInteger("1.15"), z3);
    const roundedFormulaAmount = roundScaledEuroToWholeEuro(z4);
    const calculatedMonthlyWohngeld = Math.max(0, roundedFormulaAmount);
    const payableWohngeldAmount = calculatedMonthlyWohngeld >= 10 ? calculatedMonthlyWohngeld : 0;
    let amountStatus = "POSITIVE_AMOUNT";
    let eligibilityReason = null;
    if (roundedFormulaAmount <= 0) {
      amountStatus = "ZERO_OR_NEGATIVE";
      eligibilityReason = "WG_FORMULA_ZERO_OR_NEGATIVE";
    } else if (roundedFormulaAmount < 10) {
      amountStatus = "BELOW_10_EURO";
      eligibilityReason = "WG_AMOUNT_BELOW_10";
    }

    result.formula = {
      coefficientMemberCount: consideredMembers,
      a: scaledToDecimalString(aScaled),
      b: scaledToDecimalString(bScaled),
      c: scaledToDecimalString(cScaled),
      actualM: scaledToDecimalString(actualMScaled),
      minimumM: minimums.M,
      formulaM: scaledToDecimalString(formulaMScaled),
      actualY: scaledToDecimalString(actualYScaled),
      minimumY: minimums.Y,
      formulaY: scaledToDecimalString(formulaYScaled),
      M: scaledToDecimalString(formulaMScaled),
      Y: scaledToDecimalString(formulaYScaled),
      z1: scaledToDecimalString(z1),
      z2: scaledToDecimalString(z2),
      z3: scaledToDecimalString(z3),
      z4: scaledToDecimalString(z4),
    };
    result.unroundedFormulaAmount = scaledToDecimalString(z4);
    result.roundedFormulaAmount = roundedFormulaAmount;
    result.calculatedMonthlyWohngeld = calculatedMonthlyWohngeld;
    result.payableWohngeldAmount = payableWohngeldAmount;
    result.amountStatus = amountStatus;
    result.eligibilityReason = eligibilityReason;
    result.status = "SUPPORTED";
    return result;
  }

  function evaluateWohngeld(household = {}, children = [], context = {}) {
    const foundation = evaluateWohngeldFoundation(household, children, context);
    return { foundation, amount: evaluateWohngeldAmount(household, children, context, foundation) };
  }

  function resolveMietstufe() {
    return { mietstufe: "unknown", status: "NOT_IMPLEMENTED", openChecks: ["WG_LOCATION_RESOLUTION_NOT_IMPLEMENTED"] };
  }

  return {
    RULE_IDS,
    MIETSTUFEN: [...MIETSTUFEN],
    evaluateWohngeldHousehold,
    evaluateWohngeldRent,
    evaluateWohngeldOwnerBurden,
    evaluateWohngeldPersonIncome,
    evaluateWohngeldIncome,
    evaluateWohngeldFoundation,
    evaluateWohngeldAmount,
    evaluateWohngeld,
    isNetSickPayForecast,
    fixedPoint: Object.freeze({
      SCALE: FIXED_SCALE,
      decimalToScaledInteger,
      scaledAdd,
      scaledSubtract,
      scaledMultiply,
      scaledToDecimalString,
      roundScaledEuroToWholeEuro,
    }),
    resolveMietstufe,
  };
});
