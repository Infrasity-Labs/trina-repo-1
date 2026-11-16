---
name: margin-check
description: Compute gross margin for a quote or a product tier from supplier costs and the price list. Finance team only.
---

# Inputs

Ask for a quote number (for example Q-2026-0047) or a product SKU and quantity.

Read, as the asking person:

1. `groups/Finance/supplier-costs-2026.md` (unit costs by tier)
2. `shared/pricing/price-list-2026.md` (unit prices by tier)
3. For a quote: the file in `shared/quotes/` with that number.

If any of these is not available to you, say which one and stop. Do not estimate costs.

# Procedure

1. For each line, pick the cost tier and the price tier by the line's total quantity.
2. Revenue = quote subtotal after discount, excluding shipping and tax. Cost = quantity x unit cost (tote screen setup costs from the cost file).
3. Gross margin = revenue - cost; margin % = margin / revenue.

# Output

A table with line, quantity, revenue, cost, margin and margin %, with the arithmetic shown, then a one-line total. Cite the files used. This is an analysis draft for Finance to check; make no pricing decisions and do not copy cost figures anywhere outside `groups/Finance/`.
