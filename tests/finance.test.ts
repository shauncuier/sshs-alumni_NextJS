import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeEvent, makeMember, resetDatabase } from "./helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { formatPoisha, parseAmount, toPoisha } from "@/lib/finance/money";
import { toCsv } from "@/lib/finance/csv";
import { approveEntry, createEntry, updatePendingEntry, voidEntry, type FinanceActor } from "@/lib/finance/entries";
import { accountBalances, cashBook, eventProfitLoss, incomeExpenditure, monthlySummary, saveBudget } from "@/lib/finance/reports";
import { ensureFinanceDefaults, listAccounts, listCategories, updateAccount } from "@/lib/finance/setup";
import { POST as createRoute } from "@/app/api/admin/accounts/entries/route";
import { POST as approveRoute } from "@/app/api/admin/accounts/entries/[id]/approve/route";
import { POST as syncRoute } from "@/app/api/admin/accounts/sync/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

const treasurer: FinanceActor = { email: "treasurer@example.test", role: "TREASURER" };
const admin: FinanceActor = { email: "admin@example.test", role: "ADMIN" };
const president: FinanceActor = { email: "president@example.test", role: "ADMIN" };

async function setup() {
  await ensureFinanceDefaults();
  const accounts = await listAccounts();
  const categories = await listCategories();
  const acc = (method: string) => accounts.find((a) => a.paymentMethod === method)!.id;
  const cat = (name: string) => categories.find((c) => c.name === name)!.id;
  return { cash: acc("Cash"), bkash: acc("bKash"), bank: acc("Bank"), food: cat("Food & catering"), printing: cat("Printing"), sponsorship: cat("Sponsorship"), fees: cat("Event registration fees") };
}

const json = (body: unknown) => new Request("http://x/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("money", () => {
  it("keeps poisha exact and formats with Bangladeshi grouping", () => {
    expect(toPoisha(1500)).toBe(150000);
    expect(toPoisha(0.1 + 0.2)).toBe(30);
    expect(parseAmount("1,25,000.5")).toBe(12500050);
    expect(parseAmount(750)).toBe(75000);
    for (const bad of ["0", "-5", "12.345", "abc", ""]) expect(() => parseAmount(bad)).toThrow();
    expect(formatPoisha(12500000)).toBe("৳1,25,000");
    expect(formatPoisha(1250)).toBe("৳12.50");
    expect(formatPoisha(-50000)).toBe("−৳500");
  });

  it("writes CSV that Excel reads, with formulas defused", () => {
    const csv = toCsv([["Name", "Amount"], ["=SUM(A1)", 5], ['He said "hi"', null]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain(`"'=SUM(A1)","5"`);
    expect(csv).toContain(`"He said ""hi""",""`);
  });
});

describe("set-up", () => {
  it("creates each default account and category once, even when the first pages load together", async () => {
    await Promise.all(Array.from({ length: 6 }, () => ensureFinanceDefaults()));
    const categories = await prisma.financeCategory.findMany({ select: { name: true, kind: true } });
    const keys = categories.map((c) => `${c.kind}:${c.name}`);
    expect(keys.length).toBe(new Set(keys).size);
    expect(keys).toContain("EXPENSE:Scholarships");
    expect(await prisma.financeAccount.count()).toBe(5);
  });
});

describe("vouchers", () => {
  it("numbers each kind per year, with no duplicates when saved together", async () => {
    const s = await setup();
    const made = await Promise.all(
      Array.from({ length: 6 }, (_, i) => createEntry({ kind: "EXPENSE", date: "2026-03-0" + (i + 1), amount: 100 + i, accountId: s.cash, categoryId: s.food, description: `Bill ${i}` }, treasurer))
    );
    expect(new Set(made.map((e) => e.voucherNo)).size).toBe(6);
    expect(made.map((e) => e.voucherNo).sort()[0]).toBe("P-2026-0001");
    const income = await createEntry({ kind: "INCOME", date: "2026-03-01", amount: 5000, accountId: s.bank, categoryId: s.sponsorship, description: "Sponsor" }, treasurer);
    expect(income.voucherNo).toBe("R-2026-0001");
  });

  it("counts an expense only once another administrator approves it", async () => {
    const s = await setup();
    await createEntry({ kind: "INCOME", date: "2026-01-10", amount: 10000, accountId: s.cash, categoryId: s.sponsorship, description: "Sponsorship" }, treasurer);
    const bill = await createEntry({ kind: "EXPENSE", date: "2026-01-12", amount: "2,500", accountId: s.cash, categoryId: s.food, description: "Tea for the meeting", party: "Rahman Store" }, treasurer);
    expect(bill.status).toBe("PENDING");
    const cash = async () => (await accountBalances("2026-12-31")).find((a) => a.id === s.cash)!.balance;
    expect(await cash()).toBe(1000000);

    await expect(approveEntry(bill.id, treasurer)).rejects.toMatchObject({ status: 403 });
    const own = await createEntry({ kind: "EXPENSE", date: "2026-01-12", amount: 100, accountId: s.cash, categoryId: s.printing, description: "Paper" }, admin);
    await expect(approveEntry(own.id, admin)).rejects.toMatchObject({ code: "SELF_APPROVAL" });

    await approveEntry(bill.id, president);
    expect(await cash()).toBe(1000000 - 250000);
    await expect(updatePendingEntry(bill.id, { date: "2026-01-12", amount: 1, accountId: s.cash, categoryId: s.food, description: "Changed" }, treasurer)).rejects.toMatchObject({ code: "ENTRY_LOCKED" });
  });

  it("voids instead of deleting, and only an administrator voids approved money", async () => {
    const s = await setup();
    const sale = await createEntry({ kind: "INCOME", date: "2026-02-01", amount: 3000, accountId: s.cash, categoryId: s.sponsorship, description: "Typo" }, treasurer);
    await expect(voidEntry(sale.id, "Entered twice", treasurer)).rejects.toMatchObject({ status: 403 });
    const voided = await voidEntry(sale.id, "Entered twice", admin);
    expect(voided).toMatchObject({ status: "VOID", voidReason: "Entered twice", voidedBy: admin.email });
    expect(await prisma.financeEntry.count()).toBe(1);
    expect((await accountBalances("2026-12-31")).find((a) => a.id === s.cash)!.balance).toBe(0);
    // The person who entered a pending voucher may withdraw it.
    const draft = await createEntry({ kind: "EXPENSE", date: "2026-02-02", amount: 10, accountId: s.cash, categoryId: s.food, description: "Draft" }, treasurer);
    expect((await voidEntry(draft.id, "Not needed", treasurer)).status).toBe("VOID");
  });

  it("checks transfers, categories, dates and attachments", async () => {
    const s = await setup();
    const base = { date: "2026-04-01", amount: 500, description: "Deposit" };
    await expect(createEntry({ ...base, kind: "TRANSFER", accountId: s.cash, toAccountId: s.cash }, treasurer)).rejects.toMatchObject({ status: 400 });
    await expect(createEntry({ ...base, kind: "EXPENSE", accountId: s.cash, categoryId: s.sponsorship }, treasurer)).rejects.toMatchObject({ status: 400 });
    await expect(createEntry({ ...base, kind: "EXPENSE", accountId: s.cash, categoryId: s.food, date: "2099-01-01" }, treasurer)).rejects.toMatchObject({ status: 400 });
    await expect(createEntry({ ...base, kind: "EXPENSE", accountId: s.cash, categoryId: s.food, date: "2014-12-31" }, treasurer)).rejects.toMatchObject({ status: 400 });
    await expect(createEntry({ ...base, kind: "EXPENSE", accountId: s.cash, categoryId: s.food, attachmentUrl: "https://evil.example/x.pdf" }, treasurer)).rejects.toMatchObject({ status: 400 });

    await createEntry({ kind: "INCOME", date: "2026-04-01", amount: 1000, accountId: s.cash, categoryId: s.sponsorship, description: "In" }, treasurer);
    const move = await createEntry({ ...base, kind: "TRANSFER", accountId: s.cash, toAccountId: s.bank }, treasurer);
    expect(move.voucherNo).toBe("T-2026-0001");
    await approveEntry(move.id, admin);
    const bal = await accountBalances("2026-12-31");
    expect(bal.find((a) => a.id === s.cash)!.balance).toBe(50000);
    expect(bal.find((a) => a.id === s.bank)!.balance).toBe(50000);
    // A transfer is neither income nor expense.
    expect((await incomeExpenditure("2026-01-01", "2026-12-31")).totalIncome).toBe(100000);
  });
});

describe("reports", () => {
  it("cash book with opening balance and running balance; monthly totals; event budget against actual", async () => {
    const s = await setup();
    await updateAccount(s.cash, { openingBalance: "2000", openingDate: "2026-01-01" });
    const event = await makeEvent({ slug: "picnic", title: "Picnic" });
    await createEntry({ kind: "INCOME", date: "2026-01-05", amount: 1000, accountId: s.cash, categoryId: s.sponsorship, description: "Before" }, treasurer);
    await createEntry({ kind: "INCOME", date: "2026-02-10", amount: 3000, accountId: s.cash, categoryId: s.sponsorship, description: "Sponsor", eventId: event.id }, treasurer);
    const bill = await createEntry({ kind: "EXPENSE", date: "2026-02-11", amount: 1200, accountId: s.cash, categoryId: s.food, description: "Lunch", eventId: event.id }, treasurer);
    await approveEntry(bill.id, admin);
    await createEntry({ kind: "EXPENSE", date: "2026-02-12", amount: 999, accountId: s.cash, categoryId: s.food, description: "Pending", eventId: event.id }, treasurer);

    const book = await cashBook(s.cash, "2026-02-01", "2026-02-28");
    expect(book.opening).toBe(300000);
    expect(book.rows.map((r) => r.balance)).toEqual([600000, 480000]);
    expect(book.closing).toBe(480000);

    const months = await monthlySummary(2026);
    expect(months[1]).toMatchObject({ income: 300000, expense: 120000, surplus: 180000 });

    await saveBudget(event.id, [
      { categoryId: s.food, plannedAmount: "1,000" },
      { categoryId: s.sponsorship, plannedAmount: 5000 },
    ]);
    const pl = await eventProfitLoss(event.id);
    expect(pl.lines.find((l) => l.categoryId === s.food)).toMatchObject({ planned: 100000, actual: 120000, variance: -20000 });
    expect(pl.lines.find((l) => l.categoryId === s.sponsorship)).toMatchObject({ planned: 500000, actual: 300000, variance: -200000 });
    expect(pl).toMatchObject({ totalIncome: 300000, totalExpense: 120000, surplus: 180000, pendingVouchers: 1 });
  });
});

describe("routes", () => {
  it("let the treasurer enter vouchers but not approve them; members get nothing", async () => {
    const s = await setup();
    const t = await makeMember({ role: "TREASURER", email: "t@example.test" });
    session.user = { id: t.id, email: t.email, role: "TREASURER" };
    const res = await createRoute(json({ kind: "EXPENSE", date: "2026-05-01", amount: 300, accountId: s.cash, categoryId: s.food, description: "Snacks" }));
    expect(res.status).toBe(201);
    const { entry } = await res.json();
    expect((await approveRoute(json({}), { params: Promise.resolve({ id: entry.id }) })).status).toBe(403);
    expect((await syncRoute(json({}))).status).toBe(403);

    const m = await makeMember({ email: "m@example.test" });
    session.user = { id: m.id, email: m.email, role: "ALUMNI" };
    expect((await createRoute(json({ kind: "EXPENSE" }))).status).toBe(403);

    const a = await makeMember({ role: "ADMIN", email: "a@example.test" });
    session.user = { id: a.id, email: a.email, role: "ADMIN" };
    expect((await approveRoute(json({}), { params: Promise.resolve({ id: entry.id }) })).status).toBe(200);
    expect(await prisma.activityLog.count({ where: { action: { startsWith: "finance." } } })).toBe(2);
  });
});
