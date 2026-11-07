"use strict";
// Ausschließlich neu erfundene Prüfdaten. Keine Ableitung aus privaten Presets.
const amount = value => ({enabled:true,entryMethod:"average",monthlyAverage:String(value),monthlyValues:Array(6).fill(""),mandatoryStatus:"yes"});
function source(value, extra={}) {
  return {id:"wage-a",personRole:"applicant",incomeType:"employment",employmentType:"social-insurance",amountType:"gross",entryMethod:"average",monthlyAverage:String(value),monthlyValues:Array(6).fill(""),u25SpecialAllowanceStatus:"unknown",parentalAllowanceType:"unknown",confirmedExemptionMonthly:"",deductions:{},...extra};
}
function child(id,age,extra={}) {
  return {id,name:`Testkind ${id}`,age:String(age),careSituation:"dauerhaft-a",maritalPartnershipStatus:"no",affectedHouseholds:["A"],hasExternalHousehold:false,stayDays:"",childBenefitAt:"A",childBenefitPerson:"applicant-a",externalChildBenefitPerson:"",halfForwarded:false,hasOwnIncome:"no",incomeSources:[],eligiblePrivateInsuranceStatus:"no",u25RuleStageStatus:"unknown",decentralHotWaterStatus:{A:"no",B:"no"},additionalNeedStatus:"no",additionalNeedMonthlyAmount:"",...extra};
}
function person(value=0,type="employment") {
  return {wohngeldExclusionStatus:"not-excluded",wohngeldExclusionReason:"",careDaysInReferenceMonth:"",incomeForecast:{incomeStatus:value ? "present":"none",mode:"annual",taxExpected:value && type==="employment" ? "yes":"no",healthCareContributionExpected:value && type==="employment" ? "yes":"no",pensionContributionExpected:value && type==="employment" ? "yes":"no",sources:value ? [{id:"annual-a",type,expectedAnnualAmount:String(value*12),expectedMonthlyAmount:"",monthlyValues:Array(12).fill(""),details:{}}] : []},disabilityAllowanceStatus:"not-applicable",nsPersecutionStatus:"no",wohngeldGrundrentenTimesStatus:"no"};
}
function household(children, extra={}) {
  return {label:"Synthetischer Haushalt A",adults:"couple",person1:"Person A",partner:"Person P",applicantIncomeStatus:"present",partnerIncomeStatus:"none",applicantIncomeSources:[source(3300,{deductions:{tax:amount(300),healthInsurance:amount(250),careInsurance:amount(50),pensionInsurance:amount(330),unemploymentInsurance:amount(70)}})],partnerIncomeSources:[],applicantExpenses:[],partnerExpenses:[],otherResidents:"0",housingBenefitStatus:"not-received",housingBenefit:"",assetsStatus:"no",assetPersons:{applicant:{assets:[]},partner:{assets:[]},children:Object.fromEntries(children.map(c=>[c.id,{assets:[]}]))},coverageAssetStatus:"confirmed-none",extendedAccessSgbBenefitStatus:"none",additionalNeedOverride:"",hotWaterType:"central",decentralHotWaterAdults:{applicant:"no",partner:"no"},specialSituations:[],housingType:"rent",housingCosts:{rent:{coldRent:"800",coldUtilities:"100",heating:"100",costMonth:"2026-08",sublettingStatus:"no",sublettingAmount:"",parkingAmount:"",parkingInseparableStatus:"unknown"},owner:{}},wohngeldData:{calculationMode:"automatic",section20Status:"not-excluded",significantAssetsStatus:"not-excluded",mietstufe:"IV",nonHouseholdAdjustmentStatus:"none",complexUseStatus:"no",singleParentAllowanceStatus:"no",persons:{applicant:person(3300),partner:person(),children:Object.fromEntries(children.map(c=>[c.id,person()]))},ownerCosts:{livingAreaSqm:"",annualInterest:"",annualPrincipalRepayment:"",annualLoanAncillaryCosts:"",annualGuaranteeCosts:"",annualLeaseholdPayment:"",annualTotalLoanPayments:"",annualPropertyTax:"",annualThirdPartyAdministrationCosts:""},maintenanceDeductions:[]},...extra};
}
function fixture(caseId="synthetic-baseline", extra={}) {
  const children=[child("c1",7),child("c2",12),child("c3",16)];
  return {caseId,evidenceKind:"SYNTHETIC",assumptions:["Keine Echtdaten", "Abzüge sind synthetische Eingabewerte, keine Lohnabrechnung", "Rechtsprüfung unabhängig von Engine-Ausgabe erforderlich"],state:{dataVersion:14,applicationMonth:8,applicationYear:2026,mode:"single",centralChildren:children,households:{A:household(children)}},...extra};
}
function setWage(f, gross) {
  f.state.households.A.applicantIncomeSources[0].monthlyAverage=String(gross);
  f.state.households.A.wohngeldData.persons.applicant=person(gross);
  return f;
}
module.exports={amount,source,child,person,household,fixture,setWage};
