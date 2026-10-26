import type { FinanceKind, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { fieldReader, str } from "@/lib/content-fields";
import { parseAmount, toPoisha } from "./money";
import { dateToYmd, todayYmd, ymdToDate } from "./dates";
import { ENTRY_INCLUDE, toEntryView, type EntryView } from "./entries";
import { ensureFinanceDefaults } from "./setup";

/**
 * Reports from the vouchers. Only APPROVED vouchers count; pending ones are shown
 * apart and voided ones never count. All amounts are poisha.
 */

const approved = { status: "APPROVED" as const };

export interface AccountBalance {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  opening: number;
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
  balance: number;
}

/** Each account's balance at the end of `asOf` (default today). */
export async function accountBalances(asOf = todayYmd()): Promise<AccountBalance[]> {
  await ensureFinanceDefaults();
  const until = { lte: ymdToDate(asOf) };
  const [accounts, byAccount, transfersIn] = await Promise.all([
    prisma.financeAccount.findMany({ orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }] }),
    prisma.financeEntry.groupBy({ by: ["accountId", "kind"], where: { ...approved, date: until }, _sum: { amount: true } }),
    prisma.financeEntry.groupBy({ by: ["toAccountId"], where: { ...approved, kind: "TRANSFER", date: until }, _sum: { amount: true } }),
  ]);
  return accounts.map((a) => {
    const sum = (kind: FinanceKind) => byAccount.find((r) => r.accountId === a.id && r.kind === kind)?._sum.amount ?? 0;
    const income = sum("INCOME");
    const expense = sum("EXPENSE");
    const transferOut = sum("TRANSFER");
    const transferIn = transfersIn.find((r) => r.toAccountId === a.id)?._sum.amount ?? 0;
    const opening = dateToYmd(a.openingDate) <= asOf ? a.openingBalance : 0;
    return { id: a.id, name: a.name, type: a.type, isActive: a.isActive, opening, income, expense, transferIn, transferOut, balance: opening + income - expense + transferIn - transferOut };
  });
}

export interface CashBookRow {
  entry: EntryView;
  moneyIn: number;
  moneyOut: number;
  balance: number;
}

export interface CashBook {
  accountId: string | null;
  accountName: string;
  from: string;
  to: string;
  opening: number;
  rows: CashBookRow[];
  totalIn: number;
  totalOut: number;
  closing: number;
}

/** In and out of one account (or of all accounts together) between two dates, with a running balance. */
export async function cashBook(accountId: string | null, from: string, to: string): Promise<CashBook> {
  if (from > to) throw new AppError("INVALID_DATE", 400, "The start date is after the end date.");
  const accounts = await accountBalances(dateToYmd(new Date(ymdToDate(from).getTime() - 86_400_000)));
  let account: AccountBalance | undefined;
  if (accountId) {
    account = accounts.find((a) => a.id === accountId);
    if (!account) throw new AppError("ACCOUNT_NOT_FOUND", 404, "Account not found.");
  }
  // Opening: balances at the end of the day before `from`, plus opening balances that start inside the period.
  const openingRows = await prisma.financeAccount.findMany({ where: { ...(accountId ? { id: accountId } : {}), openingDate: { gte: ymdToDate(from), lte: ymdToDate(to) } } });
  const lateOpening = openingRows.reduce((n, a) => n + a.openingBalance, 0);
  const opening = (account ? account.balance : accounts.reduce((n, a) => n + a.balance, 0)) + lateOpening;

  const rows = await prisma.financeEntry.findMany({
    where: {
      ...approved,
      date: { gte: ymdToDate(from), lte: ymdToDate(to) },
      ...(accountId ? { OR: [{ accountId }, { toAccountId: accountId }] } : { kind: { in: ["INCOME", "EXPENSE"] } }),
    },
    include: ENTRY_INCLUDE,
    orderBy: [{ date: "asc" }, { voucherNo: "asc" }],
  });
  let balance = opening;
  let totalIn = 0;
  let totalOut = 0;
  const book = rows.map((e) => {
    const into = e.kind === "INCOME" || (e.kind === "TRANSFER" && e.toAccountId === accountId);
    const moneyIn = into ? e.amount : 0;
    const moneyOut = into ? 0 : e.amount;
    balance += moneyIn - moneyOut;
    totalIn += moneyIn;
    totalOut += moneyOut;
    return { entry: toEntryView(e), moneyIn, moneyOut, balance };
  });
  return { accountId, accountName: account?.name ?? "All accounts", from, to, opening, rows: book, totalIn, totalOut, closing: balance };
}

export interface CategoryTotal {
  categoryId: string;
  name: string;
  amount: number;
}

export interface IncomeExpenditure {
  from: string;
  to: string;
  income: CategoryTotal[];
  expense: CategoryTotal[];
  totalIncome: number;
  totalExpense: number;
  surplus: number;
}

async function categoryTotals(where: Prisma.FinanceEntryWhereInput): Promise<{ income: CategoryTotal[]; expense: CategoryTotal[] }> {
  const [sums, categories] = await Promise.all([
    prisma.financeEntry.groupBy({ by: ["categoryId", "kind"], where: { ...approved, kind: { in: ["INCOME", "EXPENSE"] }, ...where }, _sum: { amount: true } }),
    prisma.financeCategory.findMany({ select: { id: true, name: true, sortOrder: true } }),
  ]);
  const named = (kind: FinanceKind) =>
    sums
      .filter((s) => s.kind === kind && s.categoryId)
      .map((s) => {
        const c = categories.find((x) => x.id === s.categoryId);
        return { categoryId: s.categoryId!, name: c?.name ?? "Unknown", amount: s._sum.amount ?? 0, order: c?.sortOrder ?? 0 };
      })
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .map(({ categoryId, name, amount }) => ({ categoryId, name, amount }));
  return { income: named("INCOME"), expense: named("EXPENSE") };
}

/** Income and expenditure by category for a period, and the surplus (or deficit). */
export async function incomeExpenditure(from: string, to: string): Promise<IncomeExpenditure> {
  if (from > to) throw new AppError("INVALID_DATE", 400, "The start date is after the end date.");
  const { income, expense } = await categoryTotals({ date: { gte: ymdToDate(from), lte: ymdToDate(to) } });
  const totalIncome = income.reduce((n, c) => n + c.amount, 0);
  const totalExpense = expense.reduce((n, c) => n + c.amount, 0);
  return { from, to, income, expense, totalIncome, totalExpense, surplus: totalIncome - totalExpense };
}

export interface MonthTotal {
  month: number;
  income: number;
  expense: number;
  surplus: number;
}

/** Income, expense and surplus for each month of a year. */
export async function monthlySummary(year: number): Promise<MonthTotal[]> {
  const rows = await prisma.financeEntry.findMany({
    where: { ...approved, kind: { in: ["INCOME", "EXPENSE"] }, date: { gte: ymdToDate(`${year}-01-01`), lte: ymdToDate(`${year}-12-31`) } },
    select: { date: true, kind: true, amount: true },
  });
  const months: MonthTotal[] = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, income: 0, expense: 0, surplus: 0 }));
  for (const r of rows) {
    const m = months[r.date.getUTCMonth()];
    if (r.kind === "INCOME") m.income += r.amount;
    else m.expense += r.amount;
  }
  for (const m of months) m.surplus = m.income - m.expense;
  return months;
}

export interface Overview {
  balances: AccountBalance[];
  totalBalance: number;
  month: { income: number; expense: number };
  year: { income: number; expense: number };
  pending: EntryView[];
  recent: EntryView[];
}

/** The accounts' front page: balances, this month and year, vouchers waiting and the latest ones. */
export async function financeOverview(): Promise<Overview> {
  const today = todayYmd();
  const monthStart = `${today.slice(0, 7)}-01`;
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const [balances, month, year, pending, recent] = await Promise.all([
    accountBalances(today),
    incomeExpenditure(monthStart, today),
    incomeExpenditure(yearStart, today),
    prisma.financeEntry.findMany({ where: { status: "PENDING" }, include: ENTRY_INCLUDE, orderBy: [{ date: "asc" }, { voucherNo: "asc" }], take: 100 }),
    prisma.financeEntry.findMany({ include: ENTRY_INCLUDE, orderBy: [{ createdAt: "desc" }], take: 10 }),
  ]);
  return {
    balances,
    totalBalance: balances.reduce((n, a) => n + a.balance, 0),
    month: { income: month.totalIncome, expense: month.totalExpense },
    year: { income: year.totalIncome, expense: year.totalExpense },
    pending: pending.map(toEntryView),
    recent: recent.map(toEntryView),
  };
}

// ---- Event budgets and profit & loss

export interface BudgetLineView {
  id: string;
  categoryId: string;
  categoryName: string;
  kind: FinanceKind;
  label: string | null;
  plannedAmount: number;
}

export interface EventProfitLoss {
  eventId: string;
  eventTitle: string;
  budget: BudgetLineView[];
  /** Planned against actual, by category (every category in the budget or with actual money). */
  lines: { categoryId: string; name: string; kind: FinanceKind; planned: number; actual: number; variance: number }[];
  totalIncome: number;
  totalExpense: number;
  plannedIncome: number;
  plannedExpense: number;
  surplus: number;
  /** Registrations still waiting for payment confirmation: not income yet. */
  pendingRegistrations: { count: number; amount: number };
  pendingVouchers: number;
}

export async function getBudget(eventId: string): Promise<BudgetLineView[]> {
  const lines = await prisma.eventBudgetLine.findMany({ where: { eventId }, include: { category: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return lines.map((l) => ({ id: l.id, categoryId: l.categoryId, categoryName: l.category.name, kind: l.category.kind, label: l.label, plannedAmount: l.plannedAmount }));
}

const budgetFields = fieldReader("INVALID_BUDGET");

/** Replaces an event's budget with these lines ({ categoryId, label, plannedAmount }). */
export async function saveBudget(eventId: string, lines: unknown): Promise<BudgetLineView[]> {
  if (!(await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } }))) throw new AppError("EVENT_NOT_FOUND", 404, "Event not found.");
  if (!Array.isArray(lines) || lines.length > 100) throw budgetFields.bad("Send the budget as a list of up to 100 lines.");
  const categories = await prisma.financeCategory.findMany({ where: { kind: { in: ["INCOME", "EXPENSE"] } }, select: { id: true } });
  const data = lines.map((raw, i) => {
    const l = (raw ?? {}) as Record<string, unknown>;
    const categoryId = str(l.categoryId);
    if (!categories.some((c) => c.id === categoryId)) throw budgetFields.bad(`Line ${i + 1}: choose a category.`);
    return { eventId, categoryId, label: budgetFields.optText(l.label, "label", 160), plannedAmount: parseAmount(l.plannedAmount, `amount on line ${i + 1}`), sortOrder: i + 1 };
  });
  await prisma.$transaction([prisma.eventBudgetLine.deleteMany({ where: { eventId } }), prisma.eventBudgetLine.createMany({ data })]);
  return getBudget(eventId);
}

export async function eventProfitLoss(eventId: string): Promise<EventProfitLoss> {
  await ensureFinanceDefaults();
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, title: true } });
  if (!event) throw new AppError("EVENT_NOT_FOUND", 404, "Event not found.");
  const [budget, actual, pendingRegs, pendingVouchers, categories] = await Promise.all([
    getBudget(eventId),
    categoryTotals({ eventId }),
    prisma.eventRegistration.aggregate({ where: { eventId, status: "PENDING_PAYMENT" }, _count: true, _sum: { totalFee: true, donationAmount: true } }),
    prisma.financeEntry.count({ where: { eventId, status: "PENDING" } }),
    prisma.financeCategory.findMany({ select: { id: true, name: true, kind: true, sortOrder: true } }),
  ]);
  const ids = new Set([...budget.map((b) => b.categoryId), ...actual.income.map((c) => c.categoryId), ...actual.expense.map((c) => c.categoryId)]);
  const lines = [...ids]
    .map((id) => {
      const c = categories.find((x) => x.id === id)!;
      const planned = budget.filter((b) => b.categoryId === id).reduce((n, b) => n + b.plannedAmount, 0);
      const actualAmount = [...actual.income, ...actual.expense].find((a) => a.categoryId === id)?.amount ?? 0;
      // Positive variance is good news: more income, or less spent, than planned.
      const variance = c.kind === "INCOME" ? actualAmount - planned : planned - actualAmount;
      return { categoryId: id, name: c.name, kind: c.kind, planned, actual: actualAmount, variance, order: c.sortOrder };
    })
    .sort((a, b) => (a.kind === b.kind ? a.order - b.order : a.kind === "INCOME" ? -1 : 1))
    .map((l) => ({ categoryId: l.categoryId, name: l.name, kind: l.kind, planned: l.planned, actual: l.actual, variance: l.variance }));
  const totalIncome = actual.income.reduce((n, c) => n + c.amount, 0);
  const totalExpense = actual.expense.reduce((n, c) => n + c.amount, 0);
  return {
    eventId,
    eventTitle: event.title,
    budget,
    lines,
    totalIncome,
    totalExpense,
    plannedIncome: budget.filter((b) => b.kind === "INCOME").reduce((n, b) => n + b.plannedAmount, 0),
    plannedExpense: budget.filter((b) => b.kind === "EXPENSE").reduce((n, b) => n + b.plannedAmount, 0),
    surplus: totalIncome - totalExpense,
    pendingRegistrations: { count: pendingRegs._count, amount: toPoisha(pendingRegs._sum.totalFee) + toPoisha(pendingRegs._sum.donationAmount) },
    pendingVouchers,
  };
}

/** Events for pickers and the budgets list: newest first. */
export async function financeEvents(): Promise<{ id: string; title: string; date: string }[]> {
  const events = await prisma.event.findMany({ select: { id: true, title: true, date: true }, orderBy: { date: "desc" }, take: 200 });
  return events.map((e) => ({ id: e.id, title: e.title, date: e.date.toISOString().slice(0, 10) }));
}
