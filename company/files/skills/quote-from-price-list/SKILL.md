---
name: quote-from-price-list
description: Draft a customer quote from the company price list and discount policy, in the same format as past quotes. Use for any request to price, quote or estimate an order.
---

# Inputs

Ask the person for the customer name, each product and quantity, and whether the customer wants rush production. If something is missing, ask once, briefly.

Read, as the asking person:

1. `shared/pricing/price-list-2026.md` (prices, tiers, minimums, fees)
2. `shared/pricing/discount-policy.md` (discount, shipping, validity, approval, quote numbers)
3. `shared/quotes/` : list the folder. Read the highest-numbered quote (for the next number and the format) and any earlier quote for the same customer (for context).

If a file is not available to you, say which one and stop. Do not guess prices from memory or from other files. Use only the files listed above; never look for or state internal costs, margins or supplier prices.

# Procedure

1. For each product, take the **total quantity** on the order, find its tier in the price list, and apply that tier's unit price to **every unit**. Respect minimum quantities.
2. Add fees (for example tote screen setup). The **order subtotal** is line items plus fees.
3. Apply the volume discount from the policy to the subtotal. Round to the cent. Apply rush (+20%) only if the customer asked.
4. Shipping: $15.00 if the subtotal after discount is under $300.00, otherwise free.
5. Total = subtotal - discount + shipping. Prices exclude sales tax.
6. Quote number: one more than the highest number in `shared/quotes/` (same year prefix). Quote date: today. Valid for 30 days.
7. If the customer wants a discount above 10%, or a product or size that is not in the price list: do not include it. Add a note that the **Sales lead (Sam Reyes) must approve** it.

# Output

A draft quote in exactly the format of the past quotes: header (number, customer, date, valid-until, prepared-by, status `draft`), a line-items table with SKU, quantity, unit price and amount, then subtotal, discount, shipping and total. Show the tier you used for each line. After the quote, add up to three short notes (for example: the customer's previous order and the tier change, anything that needs approval).

Cite the files you used. Mark the quote as a **draft for the sales team to review** before it goes to a customer. Do not send, publish or promise anything. Save the quote only if the person asks, and then only to their own folder, unless they say to save it into `shared/quotes/` themselves.
