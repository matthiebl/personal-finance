# TODO

## High priority — wire up stubs to real data

- [ ] **CSV Import** - allow importing data from a csv. Headers must include: "Time,Payee,Category,Tags,Total (AUD)"
- [ ] **Up Bank Import** - once authenticated allow importing data through Up API
- [ ] **Auto Categorise** - for authenticated users allow import to app transformation rules

## Medium priority — features that complete existing pages

## Lower priority — data and app quality

## Completed

- [x] **Annual Overview** — pull actual transaction and budget data from `AppData` monthly records; compute income, expenses, savings, and savings rate per month
- [x] **Net Worth** — make asset/liability rows editable (currency inputs), persist values in AppData, compute totals live
- [x] **Account Mode** - add account mode `AccountStorageAdapter` with Supabase datastore for Google auth login. Persists data across multiple devices, allows families to share data between users
- [x] **Overview year picker** — let the user switch between years (currently only shows current year's data)
- [x] **Calculators** - make each calculator have their own subtab on the calculators page - should include relevant charts for visualisation
- [x] **Export / Import** — download AppData as JSON and re-import it (useful as a backup before account mode exists)
- [x] **Debt Snowball** — make debt rows addable/removable/editable (balance, min payment, rate); implement real snowball and avalanche payoff calculations; show per-debt estimated payoff date
- [x] **Debt Snowball payoff timeline chart** — bar or line chart showing remaining balance per debt over time under the selected strategy
- [x] **Welcome page onboarding flow** — guide the user to set up budget categories and their first monthly budget before landing on an empty dashboard
