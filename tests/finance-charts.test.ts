import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMember, resetDatabase } from "./helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { compactPoisha } from "@/lib/finance/money";
import { approveEntry, createEntry, type FinanceActor } from "@/lib/finance/entries";
import { balanceTrend, cashBook, chartsReport, monthlyTotals, type ChartsData } from "@/lib/finance/reports";
import { ensureFinanceDefaults, listAccounts, listCategories, updateAccount } from "@/lib/finance/setup";
import { ChartsReport } from "@/components/admin/finance-charts";
import { GET as reportsRoute } from "@/app/api/admin/accounts/reports/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

const treasurer: FinanceActor = { email: "treasurer@example.test", role: "TREASURER" };
const admin: FinanceActor = { email: "admin@example.test", role: "ADMIN" };

async function setup() {
  await ensureFinanceDefaults();
  const accounts = await listAccounts();
  const categories = await listCategories();
  const acc = (method: string) => accounts.find((a) => a.paymentMethod === method)!.id;
  const cat = (name: string) => categories.find((c) => c.name === name)!.id;
  return { cash: acc("Cash"), bkash: acc("bKash"), bank: acc("Bank"), food: cat("Food & catering"), sponsorship: cat("Sponsorship") };
}

describe("compactPoisha", () => {
  it("shortens taka in Bangladeshi units, keeping the sign", () => {
    expect(compactPoisha(95000)).toBe("৳950");
    expect(compactPoisha(1_200_000)).toBe("৳12K");
    expect(compactPoisha(12_000_000)).toBe("৳1.2L");
    expect(compactPoisha(150_000_000)).toBe("৳15L");
    expect(compactPoisha(1_500_000_000)).toBe("৳1.5Cr");
    expect(compactPoisha(-250_000)).toBe("−৳2.5K");
    expect(compactPoisha(0)).toBe("৳0");
  });
});

describe("chart data", () => {
  it("totals each month of a range across a year end, and refuses more than five years", async () => {
    const s = await setup();
    await createEntry({ kind: "INCOME", date: "2025-12-20", amount: 1000, accountId: s.cash, categoryId: s.sponsorship, description: "December" }, treasurer);
    const bill = await createEntry({ kind: "EXPENSE", date: "2026-01-05", amount: 400, accountId: s.cash, categoryId: s.food, description: "January" }, treasurer);
    await approveEntry(bill.id, admin);
    await createEntry({ kind: "EXPENSE", date: "2026-01-06", amount: 999, accountId: s.cash, categoryId: s.food, description: "Pending, not counted" }, treasurer);

    const months = await monthlyTotals("2025-11-15", "2026-02-10");
    expect(months.map((m) => m.month)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(months[1]).toMatchObject({ income: 100000, expense: 0, surplus: 100000 });
    expect(months[2]).toMatchObject({ income: 0, expense: 40000, surplus: -40000 });
    await expect(monthlyTotals("2020-01-01", "2026-12-31")).rejects.toMatchObject({ code: "RANGE_TOO_LONG", status: 400 });
    await expect(chartsReport("2026-02-01", "2026-01-01")).rejects.toMatchObject({ code: "INVALID_DATE" });
  });

  it("draws total money held: ends at the cash book's closing, transfers do not move it, late accounts add their opening", async () => {
    const s = await setup();
    await updateAccount(s.cash, { openingBalance: "2000", openingDate: "2026-01-01" });
    await updateAccount(s.bank, { openingBalance: "5000", openingDate: "2026-01-20" });
    await createEntry({ kind: "INCOME", date: "2026-01-10", amount: 1000, accountId: s.cash, categoryId: s.sponsorship, description: "Sponsor" }, treasurer);
    const move = await createEntry({ kind: "TRANSFER", date: "2026-01-15", amount: 500, accountId: s.cash, toAccountId: s.bkash, description: "To bKash" }, treasurer);
    await approveEntry(move.id, admin);
    const bill = await createEntry({ kind: "EXPENSE", date: "2026-01-25", amount: 300, accountId: s.bkash, categoryId: s.food, description: "Tea" }, treasurer);
    await approveEntry(bill.id, admin);

    // Short range: a point per day.
    const daily = await balanceTrend("2026-01-05", "2026-01-31");
    expect(daily).toHaveLength(27);
    const on = (d: string) => daily.find((p) => p.date === d)!.balance;
    expect(on("2026-01-05")).toBe(200000);
    expect(on("2026-01-10")).toBe(300000);
    expect(on("2026-01-15")).toBe(300000); // transfer: no change in the total
    expect(on("2026-01-20")).toBe(800000); // bank opened with ৳5,000
    expect(on("2026-01-25")).toBe(770000);
    expect(daily[daily.length - 1].balance).toBe((await cashBook(null, "2026-01-05", "2026-01-31")).closing);

    // Long range: month ends, and always the last day.
    const monthly = await balanceTrend("2026-01-01", "2026-04-15");
    expect(monthly.map((p) => p.date)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-15"]);
    expect(monthly[monthly.length - 1].balance).toBe((await cashBook(null, "2026-01-01", "2026-04-15")).closing);
  });

  it("puts everything for the Charts tab in one answer", async () => {
    const s = await setup();
    await createEntry({ kind: "INCOME", date: "2026-03-01", amount: 2500, accountId: s.bank, categoryId: s.sponsorship, description: "Sponsor" }, treasurer);
    const data = await chartsReport("2026-01-01", "2026-03-31");
    expect(data.months).toHaveLength(3);
    expect(data.summary.totalIncome).toBe(250000);
    expect(data.balances.find((b) => b.id === s.bank)!.balance).toBe(250000);
    expect(data.trend[data.trend.length - 1]).toEqual({ date: "2026-03-31", balance: 250000 });
  });
});

describe("charts route", () => {
  it("answers the treasurer and refuses a moderator", async () => {
    await setup();
    const t = await makeMember({ role: "TREASURER", email: "t@example.test" });
    session.user = { id: t.id, email: t.email, role: "TREASURER" };
    const res = await reportsRoute(new Request("http://x/api/admin/accounts/reports?report=charts&from=2026-01-01&to=2026-06-30"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.months).toHaveLength(6);

    const m = await makeMember({ role: "MODERATOR", email: "m@example.test" });
    session.user = { id: m.id, email: m.email, role: "MODERATOR" };
    expect((await reportsRoute(new Request("http://x/api/admin/accounts/reports?report=charts"))).status).toBe(403);
  });
});

describe("charts rendering", () => {
  const base: ChartsData = {
    from: "2026-01-01",
    to: "2026-03-31",
    months: [
      { month: "2026-01", income: 500000, expense: 120000, surplus: 380000 },
      { month: "2026-02", income: 0, expense: 300000, surplus: -300000 },
      { month: "2026-03", income: 250000, expense: 0, surplus: 250000 },
    ],
    summary: {
      from: "2026-01-01",
      to: "2026-03-31",
      income: [{ categoryId: "a", name: "Sponsorship", amount: 750000 }],
      expense: [{ categoryId: "b", name: "Food & catering", amount: 420000 }],
      totalIncome: 750000,
      totalExpense: 420000,
      surplus: 330000,
    },
    balances: [
      { id: "c", name: "Cash", type: "CASH", isActive: true, opening: 0, income: 750000, expense: 420000, transferIn: 0, transferOut: 0, balance: 330000 },
      { id: "d", name: "bKash", type: "BKASH", isActive: true, opening: 0, income: 0, expense: 10000, transferIn: 0, transferOut: 0, balance: -10000 },
    ],
    trend: [
      { date: "2026-01-31", balance: 380000 },
      { date: "2026-02-28", balance: 80000 },
      { date: "2026-03-31", balance: 330000 },
    ],
  };

  it("renders every chart with labels and hover text, and no broken numbers", () => {
    const html = renderToStaticMarkup(createElement(ChartsReport, { data: base }));
    for (const label of ["Income and expense for each month", "Where the money came from", "Account balances on", "Total money held went from"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("<title>");
    expect(html).toContain("৳7,500");
    expect(html).not.toMatch(/NaN|Infinity/);
    expect(html).not.toContain("No approved vouchers in these dates.");
  });

  it("shows an empty state when there is nothing to draw", () => {
    const empty: ChartsData = {
      ...base,
      months: base.months.map((m) => ({ ...m, income: 0, expense: 0, surplus: 0 })),
      summary: { ...base.summary, income: [], expense: [], totalIncome: 0, totalExpense: 0, surplus: 0 },
      balances: [],
      trend: base.trend.map((p) => ({ ...p, balance: 0 })),
    };
    const html = renderToStaticMarkup(createElement(ChartsReport, { data: empty }));
    expect(html.match(/No approved vouchers in these dates\./g)).toHaveLength(5);
    expect(html).not.toMatch(/NaN|Infinity/);
  });
});
