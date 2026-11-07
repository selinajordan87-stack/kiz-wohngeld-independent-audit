const assert = require("assert");
const wg = require("../wohngeld.js");

const tests = [];
const test = (name, run) => tests.push({ name, run });
const fp = wg.fixedPoint;

test("39. Festkommaskala hat exakt zehn Nachkommastellen", () => {
  assert.equal(fp.SCALE, 10000000000n);
  assert.equal(fp.scaledToDecimalString(fp.decimalToScaledInteger("1.2")), "1.2000000000");
});

test("40. negative Koeffizienten funktionieren", () => {
  const result = fp.scaledMultiply(fp.decimalToScaledInteger("-0.12"), fp.decimalToScaledInteger("100"));
  assert.equal(fp.scaledToDecimalString(result), "-12.0000000000");
});

test("41. Multiplikation erzeugt keine IEEE-754-Artefakte", () => {
  const result = fp.scaledMultiply(fp.decimalToScaledInteger("0.1"), fp.decimalToScaledInteger("0.2"));
  assert.equal(fp.scaledToDecimalString(result), "0.0200000000");
});

test("42. z1 bis z4 sind mit denselben Eingaben reproduzierbar", () => {
  const a = fp.decimalToScaledInteger("0.04");
  const b = fp.decimalToScaledInteger("0.0004797");
  const c = fp.decimalToScaledInteger("0.0000408");
  const M = fp.decimalToScaledInteger("580.40");
  const Y = fp.decimalToScaledInteger("1350");
  const calculate = () => {
    const z1 = fp.scaledAdd(a, fp.scaledMultiply(b, M), fp.scaledMultiply(c, Y));
    const z2 = fp.scaledMultiply(z1, Y);
    const z3 = fp.scaledSubtract(M, z2);
    return fp.scaledMultiply(fp.decimalToScaledInteger("1.15"), z3);
  };
  assert.equal(calculate(), calculate());
  assert.equal(fp.scaledToDecimalString(calculate()), "87.6045413000");
});

test("43. zwischen z1 bis z4 findet keine Cent-Rundung statt", () => {
  const value = fp.scaledMultiply(fp.decimalToScaledInteger("1.2345678901"), fp.decimalToScaledInteger("1.0000000001"));
  assert.equal(fp.scaledToDecimalString(value), "1.2345678902");
});

test("44. zwischen z1 bis z4 findet keine Voll-Euro-Rundung statt", () => {
  const value = fp.decimalToScaledInteger("87.6045413000");
  assert.equal(fp.scaledToDecimalString(value), "87.6045413000");
  assert.equal(fp.roundScaledEuroToWholeEuro(value), 88);
});

let failed = 0;
tests.forEach(({ name, run }) => {
  try { run(); console.log(`OK ${name}`); }
  catch (error) { failed += 1; console.error(`FEHLER ${name}`); console.error(error.stack || error); }
});
console.log(`\n${tests.length - failed}/${tests.length} Wohngeld-Festkommatests erfolgreich.`);
if (failed) process.exitCode = 1;
