# Dashboard KPI Formulas

This document explains how each KPI (Key Performance Indicator) on the Dashboard is calculated.

## 1. Total Revenue
**What it shows:** Total value of all WON deals in the selected period

**Formula:**
```
Total Revenue = SUM(deal.value) WHERE status = 'WON' AND created_at IN [date_from, date_to]
```

**Growth Calculation:**
```
Revenue Growth % = ((Current Period Revenue - Previous Period Revenue) / Previous Period Revenue) × 100
```

**Example:**
- Current Period: $50,000
- Previous Period: $40,000
- Growth: ((50,000 - 40,000) / 40,000) × 100 = +25%

---

## 2. Deals Won
**What it shows:** Number of deals with status = 'WON' in the selected period

**Formula:**
```
Deals Won = COUNT(deals) WHERE status = 'WON' AND created_at IN [date_from, date_to]
```

**Growth Calculation:**
```
Deals Won Growth % = ((Current Period Won - Previous Period Won) / Previous Period Won) × 100
```

**Example:**
- Current Period: 15 deals won
- Previous Period: 12 deals won
- Growth: ((15 - 12) / 12) × 100 = +25%

---

## 3. Win Rate
**What it shows:** Percentage of closed deals that were won (not lost)

**Formula:**
```
Win Rate % = (Deals Won / Total Closed Deals) × 100

Where:
- Total Closed Deals = COUNT(deals) WHERE status IN ('WON', 'LOST')
```

**Change Calculation:**
```
Win Rate Change = Current Win Rate % - Previous Win Rate %
```

**Example:**
- Current Period: 15 won out of 20 closed = 75%
- Previous Period: 12 won out of 18 closed = 66.7%
- Change: 75% - 66.7% = +8.3%

---

## 4. Average Deal Size
**What it shows:** Average value of won deals

**Formula:**
```
Average Deal Size = Total Revenue / Deals Won
```

**Growth Calculation:**
```
Avg Deal Growth % = ((Current Avg - Previous Avg) / Previous Avg) × 100
```

**Example:**
- Current Period: $50,000 / 15 deals = $3,333
- Previous Period: $40,000 / 12 deals = $3,333
- Growth: ((3,333 - 3,333) / 3,333) × 100 = 0%

---

## 5. Total Pipeline
**What it shows:** Total value of all OPEN deals (not won or lost)

**Formula:**
```
Total Pipeline = SUM(deal.value) WHERE status = 'OPEN' AND is_deleted = FALSE
```

**Growth Calculation:**
```
Pipeline Growth % = ((Current Pipeline - Previous Pipeline) / Previous Pipeline) × 100

Where:
- Current Pipeline = All deals with status = 'OPEN' now
- Previous Pipeline = All deals that were 'OPEN' at end of previous period
  (created on or before previous period end date and still open)
```

**Example:**
- Current: 25 open deals worth $120,000
- Previous Period End: 20 open deals worth $100,000
- Growth: ((120,000 - 100,000) / 100,000) × 100 = +20%

---

## 6. Active Deals
**What it shows:** Number of deals with status = 'OPEN'

**Formula:**
```
Active Deals = COUNT(deals) WHERE status = 'OPEN' AND is_deleted = FALSE
```

**Growth Calculation:**
```
Deal Growth % = ((Current Active - Previous Active) / Previous Active) × 100

Where:
- Current Active = Count of deals with status = 'OPEN' now
- Previous Active = Count of deals that were 'OPEN' at end of previous period
  (created on or before previous period end date and still open)
```

**Example:**
- Current: 25 active deals
- Previous Period End: 20 active deals
- Growth: ((25 - 20) / 20) × 100 = +25%

---

## 7. Activities Today
**What it shows:** Number of activities scheduled for today

**Formula:**
```
Activities Today = COUNT(activities) WHERE DATE(due_date) = TODAY AND is_deleted = FALSE
```

**No growth calculation** - This is a snapshot of today's activities only.

---

## Time Periods

### Current Period
- Default: Last 30 days from today
- Can be customized with `date_from` and `date_to` parameters

### Previous Period
- Same duration as current period, but shifted back
- Example: If current is last 30 days, previous is 30 days before that

**Formula:**
```
period_length = date_to - date_from
prev_period_start = date_from - period_length
prev_period_end = date_from - 1 day
```

---

## Filters

All KPIs respect these filters:
1. **User Filter:** Show only deals/activities owned by specific user
2. **Pipeline Filter:** Show only deals from specific pipeline
3. **Date Range:** Custom date range for analysis
4. **Superuser:** Superusers see all data, regular users see only their own

---

## Pipeline Overview

**What it shows:** Distribution of deals across pipeline stages

**Formula for each stage:**
```
Stage Total Value = SUM(deal.value) WHERE stage_id = [stage] AND status = 'OPEN'
Stage Deal Count = COUNT(deals) WHERE stage_id = [stage] AND status = 'OPEN'
Stage Percentage = (Stage Total Value / Total Pipeline Value) × 100
```

**Bar Width:**
```
Bar Width % = (Stage Total Value / MAX(all stage values)) × 100
```

**Example:**
- Qualification: $30,000 (3 deals) → 25% of total, 60% bar width
- Proposal: $50,000 (5 deals) → 42% of total, 100% bar width (max)
- Negotiation: $40,000 (4 deals) → 33% of total, 80% bar width

---

## Notes

1. **Growth Indicators:**
   - Green arrow (↑) = Positive growth
   - Red arrow (↓) = Negative growth

2. **Zero Division:**
   - If previous period has 0 value, growth shows as 0%

3. **Rounding:**
   - Currency values: 2 decimal places
   - Percentages: 1 decimal place

4. **Real-time:**
   - All KPIs are calculated in real-time from database
   - No caching or pre-calculation
