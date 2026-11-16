#!/usr/bin/env node
// Checks the sample company without a server: every number in the quotes and the Finance report follows from the
// price list and the policy; no cost figure appears outside Finance; skills have valid headers.
//   node scripts/lint-fixtures.mjs
import fs from 'node:fs'
import path from 'node:path'
import { FILES_DIR, COMPANY_FILE } from './lib/config.mjs'
import { listFiles } from './lib/seed.mjs'

const errors = []
const err = (m) => errors.push(m)
const read = (rel) => fs.readFileSync(path.join(FILES_DIR, rel), 'utf8')
const money = (s) => Math.round(parseFloat(s.replace(/[$,]/g, '')) * 100)
const cents = (n) => `$${(n / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const rows = (text) =>
  text.split('\n').filter((l) => l.startsWith('|') && !/^\|[-| ]+\|$/.test(l)).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))

// ---- price list: SKU -> tiers [{min, unit}]
const tiers = new Map()
for (const [, sku, min, , unit] of rows(read('shared/pricing/price-list-2026.md')).filter((r) => r.length === 5 && r[4].startsWith('$'))) {
  if (!tiers.has(sku)) tiers.set(sku, [])
  tiers.get(sku).push({ min: Number(min), unit: money(unit) })
}
const SETUP = 4500
const unitFor = (sku, qty) => {
  const t = (tiers.get(sku) ?? []).filter((x) => qty >= x.min).at(-1)
  return t ? t.unit : null
}
const discountRate = (sub) => (sub >= 150000 ? 0.08 : sub >= 50000 ? 0.05 : 0)

// ---- quotes
const quotes = []
for (const f of listFiles(path.join(FILES_DIR, 'shared/quotes'))) {
  const text = read(`shared/quotes/${f.rel}`)
  const id = /^# Quote (Q-\d{4}-\d{4})/m.exec(text)?.[1]
  if (!id) { err(`${f.rel}: no "# Quote Q-YYYY-NNNN" heading`); continue }
  if (!f.rel.startsWith(id)) err(`${f.rel}: file name does not start with ${id}`)
  const lines = rows(text).filter((r) => r.length === 5 && r[1] !== 'SKU')
  const qtyBySku = new Map()
  for (const l of lines) if (l[1] !== 'FEE-TB-SETUP') qtyBySku.set(l[1], (qtyBySku.get(l[1]) ?? 0) + Number(l[2]))
  let sub = 0
  const goods = []
  for (const [, sku, qty, unit, amount] of lines) {
    const expectUnit = sku === 'FEE-TB-SETUP' ? SETUP : unitFor(sku, qtyBySku.get(sku))
    if (money(unit) !== expectUnit) err(`${id}: ${sku} unit price ${unit} should be ${cents(expectUnit)}`)
    if (money(amount) !== Number(qty) * money(unit)) err(`${id}: ${sku} amount ${amount} is not ${qty} x ${unit}`)
    sub += money(amount)
    goods.push({ sku, qty: Number(qty) })
  }
  const field = (label) => new RegExp(`^- ${label}: \\$?([\\d,.]+)`, 'm').exec(text)?.[1]
  const disc = Math.round(sub * discountRate(sub))
  const after = sub - disc
  const ship = after < 30000 ? 1500 : 0
  const total = after + ship
  if (money(field('Subtotal')) !== sub) err(`${id}: subtotal should be ${cents(sub)}`)
  if (disc) {
    const d = /Discount: .*\(-\$([\d,.]+)\)/.exec(text)?.[1]
    if (!d || money(d) !== disc) err(`${id}: discount should be ${cents(disc)}`)
  } else if (!/^- Discount: none/m.test(text)) err(`${id}: discount should be "none"`)
  const shipText = /^- Shipping: (\S+)/m.exec(text)?.[1]
  if (ship ? money(shipText) !== ship : shipText !== 'free') err(`${id}: shipping should be ${ship ? cents(ship) : 'free'}`)
  const tot = /\*\*Total: \$([\d,.]+)\*\*/.exec(text)?.[1]
  if (!tot || money(tot) !== total) err(`${id}: total should be ${cents(total)}`)
  quotes.push({ id, goods, revenue: after - 0, setup: lines.some((l) => l[1] === 'FEE-TB-SETUP') })
}

// ---- finance: costs and the margin report
const costRows = rows(read('groups/Finance/supplier-costs-2026.md')).filter((r) => r.length === 3 && r[2].startsWith('$'))
const costTiers = new Map()
for (const [sku, min, cost] of costRows) {
  if (!costTiers.has(sku)) costTiers.set(sku, [])
  costTiers.get(sku).push({ min: Number(min), cost: money(cost) })
}
const costFor = (sku, qty) => (costTiers.get(sku) ?? []).filter((x) => qty >= x.min).at(-1)?.cost
const pct = (m, r) => `${((m / r) * 100).toFixed(1)}%`
const report = read('groups/Finance/margin-report-2026-q3q4.md')
for (const r of rows(report).filter((x) => x.length === 6 && x[0] !== 'SKU' && x[1] !== 'Cost')) {
  const [sku, min, price, cost, per, p] = r
  const unit = unitFor(sku, Number(min))
  const c = costFor(sku, Number(min))
  if (money(price) !== unit) err(`margin report ${sku}@${min}: price ${price} should be ${cents(unit)}`)
  if (money(cost) !== c) err(`margin report ${sku}@${min}: cost ${cost} should be ${cents(c)}`)
  if (money(per) !== unit - c) err(`margin report ${sku}@${min}: margin per unit should be ${cents(unit - c)}`)
  if (p !== pct(unit - c, unit)) err(`margin report ${sku}@${min}: margin % should be ${pct(unit - c, unit)}`)
}
const qSet = new Map(quotes.map((q) => [q.id, q]))
for (const r of rows(report).filter((x) => x.length === 5 && /^Q-\d{4}-\d{4}$/.test(x[0]))) {
  const q = qSet.get(r[0])
  if (!q) { err(`margin report names unknown quote ${r[0]}`); continue }
  const qtyBySku = new Map()
  for (const g of q.goods) if (g.sku !== 'FEE-TB-SETUP') qtyBySku.set(g.sku, (qtyBySku.get(g.sku) ?? 0) + g.qty)
  let cost = 0
  for (const g of q.goods) cost += g.sku === 'FEE-TB-SETUP' ? g.qty * costFor('FEE-TB-SETUP', 1) : g.qty * costFor(g.sku, qtyBySku.get(g.sku))
  if (money(r[1]) !== q.revenue) err(`margin report ${q.id}: revenue should be ${cents(q.revenue)}`)
  if (money(r[2]) !== cost) err(`margin report ${q.id}: cost should be ${cents(cost)}`)
  if (money(r[3]) !== q.revenue - cost) err(`margin report ${q.id}: margin should be ${cents(q.revenue - cost)}`)
  if (r[4] !== pct(q.revenue - cost, q.revenue)) err(`margin report ${q.id}: margin % should be ${pct(q.revenue - cost, q.revenue)}`)
}

// ---- the golden example of the PRD / README (500 cards + 2 banners)
{
  const sub = 500 * unitFor('BC-350-DS', 500) + 2 * unitFor('RU-85200', 2)
  const total = sub - Math.round(sub * discountRate(sub)) + (sub < 30000 ? 1500 : 0)
  if (sub !== 28800 || total !== 30300) err(`golden example drifted: subtotal ${cents(sub)}, total ${cents(total)} (expected $288.00 / $303.00)`)
  const next = Math.max(...quotes.map((q) => Number(q.id.slice(-4)))) + 1
  if (next !== 48) err(`next quote number should be 0048, is ${String(next).padStart(4, '0')}`)
}

// ---- no cost figure and no Finance path outside Finance
const financeOnly = (rel) => rel.startsWith('groups/Finance/') || rel.startsWith('skills/finance/')
const outside = listFiles(FILES_DIR).filter((f) => !financeOnly(f.rel))
const costAmounts = [...new Set(read('groups/Finance/supplier-costs-2026.md').match(/\$[\d,]+\.\d{2}/g) ?? [])]
for (const f of outside) {
  const text = fs.readFileSync(f.abs, 'utf8')
  for (const a of costAmounts) if (new RegExp(`(?<![\\d.,])${a.replace(/[$.]/g, '\\$&')}(?![\\d])`).test(text)) err(`${f.rel}: contains cost figure ${a}`)
  if (/groups\/Finance|supplier-costs/i.test(text)) err(`${f.rel}: names a Finance path`)
}

// ---- skills
const skillFiles = listFiles(FILES_DIR).filter((f) => f.rel.startsWith('skills/') && f.rel.endsWith('/SKILL.md'))
for (const f of skillFiles) {
  const text = fs.readFileSync(f.abs, 'utf8')
  const head = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? ''
  const name = /^name:\s*(.+)$/m.exec(head)?.[1]?.trim()
  const desc = /^description:\s*(.+)$/m.exec(head)?.[1]?.trim()
  const folder = path.posix.basename(path.posix.dirname(f.rel))
  if (!name || !desc) err(`${f.rel}: header needs name and description`)
  if (name && name !== folder) err(`${f.rel}: name "${name}" must equal the folder name "${folder}"`)
  if (name && !/^[a-z0-9-]{1,64}$/.test(name)) err(`${f.rel}: name must be a-z, 0-9, hyphens (<= 64)`)
  if (desc && desc.length > 1024) err(`${f.rel}: description is longer than 1024 characters`)
  if (Buffer.byteLength(text) > 128 * 1024) err(`${f.rel}: larger than 128 KiB`)
}

// ---- company.json points at real things
const company = JSON.parse(fs.readFileSync(COMPANY_FILE, 'utf8'))
const groups = new Set(company.groups.map((g) => g.name))
const people = new Set(company.people.map((p) => p.username))
for (const p of company.people) if (!groups.has(p.group)) err(`company.json: ${p.username} is in unknown group ${p.group}`)
for (const r of company.rules) for (const x of r.rules) {
  if (x.group && !groups.has(x.group)) err(`company.json: rule on ${r.path} names unknown group ${x.group}`)
  if (x.user && !people.has(x.user)) err(`company.json: rule on ${r.path} names unknown person ${x.user}`)
}
const known = new Set(listFiles(FILES_DIR).map((f) => f.rel))
for (const c of company.checks) {
  if (!people.has(c.username)) err(`company.json: check for unknown person ${c.username}`)
  for (const p of c.opens ?? []) if (!known.has(p)) err(`company.json: ${c.username} should open ${p}, which is not in company/files`)
  for (const p of c.closed ?? []) if (!known.has(p)) err(`company.json: ${c.username} closed path ${p} is not in company/files (a typo would make the check pass for the wrong reason)`)
}

if (errors.length) {
  console.error(`lint-fixtures: ${errors.length} problem(s)`)
  for (const e of errors) console.error('  - ' + e)
  process.exit(1)
}
console.log(`lint-fixtures: ok (${quotes.length} quotes, ${skillFiles.length} skills, ${known.size} files)`)
