/**
 * Approximate South African income tax on freelance platform income.
 *
 * Figures follow the SARS individual rates and primary rebate for the 2027
 * year of assessment, 1 March 2026 to 28 February 2027 (SARS, 2026). Tax is
 * worked out progressively: each slice of income is taxed at that bracket's
 * rate, then the primary rebate is subtracted. The result cannot be negative.
 *
 * This is an estimate of normal tax on income recorded in HustleHub+ only.
 * It does not apply deductions, medical credits, VAT or provisional payments,
 * and it uses the primary rebate for a person under 65.
 */

const TAX_YEAR = '2027';
const TAX_PERIOD = '1 March 2026 to 28 February 2027';
const PRIMARY_REBATE_RANDS = 17820;
const PRIMARY_REBATE_CENTS = PRIMARY_REBATE_RANDS * 100;

// Upper bounds are inclusive and stored in cents so the sum does not drift.
const BRACKETS = [
  { upToCents: 245100 * 100, rate: 0.18 },
  { upToCents: 383100 * 100, rate: 0.26 },
  { upToCents: 530200 * 100, rate: 0.31 },
  { upToCents: 695800 * 100, rate: 0.36 },
  { upToCents: 887000 * 100, rate: 0.39 },
  { upToCents: 1878600 * 100, rate: 0.41 },
  { upToCents: Infinity, rate: 0.45 },
];

function toCents(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.round(value * 100);
}

function fromCents(cents) {
  return Math.round(cents) / 100;
}

/**
 * Estimates normal tax for a rand amount of annual platform income.
 *
 * @param {number} annualIncome completed freelance income in ZAR
 * @returns {object} tax breakdown safe to return from the API
 */
function estimateIncomeTax(annualIncome) {
  const incomeCents = toCents(annualIncome);
  let lowerCents = 0;
  let grossCents = 0;
  const brackets = [];

  for (const bracket of BRACKETS) {
    const upperCents = bracket.upToCents;
    const sliceCents = Math.min(incomeCents, upperCents) - lowerCents;

    if (sliceCents > 0) {
      const sliceTaxCents = Math.round(sliceCents * bracket.rate);
      grossCents += sliceTaxCents;
      brackets.push({
        from: fromCents(lowerCents),
        to: upperCents === Infinity ? null : fromCents(upperCents),
        ratePercent: Math.round(bracket.rate * 100),
        taxableAmount: fromCents(sliceCents),
        tax: fromCents(sliceTaxCents),
      });
    }

    if (incomeCents <= upperCents) {
      break;
    }

    lowerCents = upperCents;
  }

  const rebateAppliedCents = Math.min(PRIMARY_REBATE_CENTS, grossCents);
  const estimatedCents = grossCents - rebateAppliedCents;

  return {
    taxYear: TAX_YEAR,
    period: TAX_PERIOD,
    currency: 'ZAR',
    taxableIncome: fromCents(incomeCents),
    grossTax: fromCents(grossCents),
    primaryRebate: PRIMARY_REBATE_RANDS,
    rebateApplied: fromCents(rebateAppliedCents),
    estimatedTax: fromCents(estimatedCents),
    effectiveRate: incomeCents === 0
      ? 0
      : Math.round((estimatedCents / incomeCents) * 10000) / 100,
    incomeAfterTax: fromCents(incomeCents - estimatedCents),
    brackets,
  };
}

module.exports = {
  estimateIncomeTax,
  PRIMARY_REBATE_RANDS,
  TAX_PERIOD,
  TAX_YEAR,
};
