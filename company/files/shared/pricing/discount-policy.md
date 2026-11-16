# Discount, shipping and quote rules

Owner: Sam Reyes (Sales lead). Applies to every quote from 2026-01-01.

## Order subtotal

The **order subtotal** is the sum of all line items **and** fees (for example tote screen setup), before any discount, shipping or tax.

## Volume discount

| Order subtotal | Discount on the subtotal |
|---|---|
| under $500.00 | none |
| $500.00 to $1,499.99 | 5% |
| $1,500.00 and above | 8% |

Round discounts to the cent.

## Approval

- Any discount **above 10%** (for example a customer asking for "15% off") needs approval from Sam Reyes. Do not put it in the quote. Write the standard quote and say that the extra discount needs Sam's approval.
- Anything not in the price list (custom sizes, other paper, other products) needs a price from Sam. Say so; do not guess a price.

## Shipping

- Flat **$15.00** when the subtotal **after discount** is under $300.00.
- **Free** shipping when the subtotal after discount is $300.00 or more.

## Quote rules

- Quotes are valid for **30 days** from the quote date.
- Prices exclude sales tax. Tax is added on the invoice.
- Quote numbers run in sequence: `Q-<year>-<four digits>`. The next number is one more than the highest quote in `shared/quotes/`. Save each quote there once the customer asks for it in writing.
- Status values: `draft`, `sent`, `accepted`, `declined`, `expired`.
- A quote is prepared by the person who wrote it. The customer never sees internal notes.
