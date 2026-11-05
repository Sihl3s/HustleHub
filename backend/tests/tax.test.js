/**
 * Unit tests for the SARS progressive estimate (SARS, 2026).
 * These do not need a database or a running API.
 */

const { estimateIncomeTax } = require('../src/utils/tax');

describe('estimateIncomeTax', () => {
  test('zero income has no tax and no bracket slices', () => {
    const tax = estimateIncomeTax(0);
    expect(tax.estimatedTax).toBe(0);
    expect(tax.grossTax).toBe(0);
    expect(tax.incomeAfterTax).toBe(0);
    expect(tax.effectiveRate).toBe(0);
    expect(tax.brackets).toEqual([]);
  });

  test('income under the primary rebate estimate is zero', () => {
    const tax = estimateIncomeTax(50000);
    expect(tax.grossTax).toBe(9000);
    expect(tax.rebateApplied).toBe(9000);
    expect(tax.estimatedTax).toBe(0);
    expect(tax.incomeAfterTax).toBe(50000);
    expect(tax.brackets).toHaveLength(1);
    expect(tax.brackets[0].ratePercent).toBe(18);
  });

  test('a mid-bracket amount uses the 18% and 26% slices, then the rebate', () => {
    const tax = estimateIncomeTax(300000);
    expect(tax.taxYear).toBe('2027');
    expect(tax.grossTax).toBe(58392);
    expect(tax.rebateApplied).toBe(17820);
    expect(tax.estimatedTax).toBe(40572);
    expect(tax.incomeAfterTax).toBe(259428);
    expect(tax.effectiveRate).toBe(13.52);
    expect(tax.brackets.map((bracket) => bracket.ratePercent)).toEqual([18, 26]);
  });

  test('negative and non-numeric income are treated as zero', () => {
    expect(estimateIncomeTax(-10).estimatedTax).toBe(0);
    expect(estimateIncomeTax('not-a-number').estimatedTax).toBe(0);
  });
});
