# TODO

## High priority — wire up stubs to real data

- [x] **Annual Overview** — pull actual transaction and budget data from `AppData` monthly records; compute income, expenses, savings, and savings rate per month
- [ ] **Net Worth** — make asset/liability rows editable (currency inputs), persist values in AppData, compute totals live
- [ ] **Account Mode** - add account mode `AccountStorageAdapter` with Supabase datastore for Google auth login. Persists data across multiple devices, allows families to share data between users

## Medium priority — features that complete existing pages

- [ ] **Net Worth snapshots** — save a dated snapshot each time values change so a historical chart can show net worth over time
- [x] **Overview year picker** — let the user switch between years (currently only shows current year's data)
- [ ] **Calculators** - make each calculator have their own subtab on the calculators page - should include relevant charts for visualisation
- [ ] **CSV Import** - allow importing data from a csv. Headers must include: "Time,Payee,Category,Tags,Total (AUD)"
- [ ] **Up Bank Import** - once authenticated allow importing data through Up API
- [ ] **Auto Categorise** - for authenticated users allow import to app transformation rules

## Lower priority — data and app quality

- [ ] **Export / Import** — download AppData as JSON and re-import it (useful as a backup before account mode exists)
- [ ] **Welcome page onboarding flow** — guide the user to set up budget categories and their first monthly budget before landing on an empty dashboard
- [ ] **Debt Snowball** — make debt rows addable/removable/editable (balance, min payment, rate); implement real snowball and avalanche payoff calculations; show per-debt estimated payoff date
- [ ] **Debt Snowball payoff timeline chart** — bar or line chart showing remaining balance per debt over time under the selected strategy
