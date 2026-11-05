// Freelancer income and estimated tax (SARS, 2026).
// The API returns the figures. This component only displays them.
// Bars are drawn with CSS so the Content Security Policy can stay strict.

import { TAX_NOTE } from './taxCopy.js'

function formatRand(amount) {
  const value = Number(amount)
  if (!Number.isFinite(value)) {
    return 'R0'
  }

  const negative = value < 0
  const [whole, fraction = '00'] = Math.abs(value).toFixed(2).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const text = fraction === '00' ? grouped : `${grouped}.${fraction}`
  return `${negative ? '-' : ''}R${text}`
}

function bracketLabel(bracket) {
  const upper = bracket.to == null ? 'and above' : `to ${formatRand(bracket.to)}`
  return `${bracket.ratePercent}% on ${formatRand(bracket.from)} ${upper}`
}

export default function FinancialInsights({ income }) {
  const monthly = Array.isArray(income.monthly) ? income.monthly : []
  const tax = income.tax || {
    estimatedTax: 0,
    effectiveRate: 0,
    incomeAfterTax: income.totalIncome || 0,
    primaryRebate: 17820,
    brackets: [],
    period: '1 March 2026 to 28 February 2027',
  }
  const brackets = Array.isArray(tax.brackets) ? tax.brackets : []
  const highest = Math.max(...monthly.map((month) => Number(month.income) || 0), 1)

  return (
    <section className="financial-insights" aria-label="Financial insights">
      <h2>Financial insights</h2>
      <p className="tax-note">{TAX_NOTE}</p>

      <div className="tax-cards">
        <article className="tax-card">
          <h3>Income</h3>
          <p>{formatRand(income.totalIncome)}</p>
          <span>{income.transactionCount || 0} completed bookings</span>
        </article>
        <article className="tax-card">
          <h3>Estimated tax</h3>
          <p>{formatRand(tax.estimatedTax)}</p>
          <span>Primary rebate {formatRand(tax.primaryRebate || 0)}</span>
        </article>
        <article className="tax-card">
          <h3>After estimated tax</h3>
          <p>{formatRand(tax.incomeAfterTax)}</p>
          <span>Effective rate {tax.effectiveRate || 0}%</span>
        </article>
      </div>

      <h3>Monthly income</h3>
      {monthly.length === 0 ? (
        <p>No completed income yet.</p>
      ) : (
        <div className="income-chart" role="img" aria-label="Monthly income chart">
          {monthly.map((month) => {
            const height = Math.max(8, Math.round(((Number(month.income) || 0) / highest) * 100))
            return (
              <div className="income-bar" key={month.month}>
                <div className="income-bar-fill" style={{ height: `${height}%` }} />
                <span className="income-bar-label">
                  {month.month}: {formatRand(month.income)} ({month.transactionCount} bookings)
                </span>
              </div>
            )
          })}
        </div>
      )}

      {brackets.length > 0 && (
        <>
          <h3>Bracket breakdown</h3>
          <ul className="tax-brackets">
            {brackets.map((bracket) => (
              <li key={`${bracket.ratePercent}-${bracket.from}`}>
                {bracketLabel(bracket)}: {formatRand(bracket.tax)} on {formatRand(bracket.taxableAmount)}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
