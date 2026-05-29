# TODO

## High priority — wire up stubs to real data

- [ ] **Transaction List/Filtering** - provide a new view to look through all transaction, filter, search, update, etc.

## Medium priority — features that complete existing pages

- [ ] **Copy Budget Amounts** Copy budget amounts from each category, or use a budget template

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
- [x] **CSV Import** - allow importing data from a csv
- [x] **Up Bank Import** - once authenticated allow importing data through Up API
- [x] **Auto Categorise** - for authenticated users allow import to app transformation rules
- [x] **Tag Views** - on annual dashboard and monthly dashboards allow filtering transactions to "tags present" and "tags not present"
