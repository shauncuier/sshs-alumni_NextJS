import type { FinanceAccountType, FinanceKind, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { fieldReader } from "@/lib/content-fields";
import { PAYMENT_METHOD_NAMES } from "@/lib/payment-settings";
import { parseAmount } from "./money";
import { dateToYmd, ymdToDate } from "./dates";

/**
 * The accounts' building blocks: where money is kept (FinanceAccount) and what it is
 * for (FinanceCategory). ensureFinanceDefaults creates one account per site payment
 * method and the usual categories the first time the accounts are opened; the
 * treasurer renames, adds or switches them off in /admin/accounts/settings.
 */

type Db = Prisma.TransactionClient | typeof prisma;

export const SYSTEM_CATEGORIES = {
  registration_fees: { name: "Event registration fees", kind: "INCOME" },
  membership_fees: { name: "Membership fees", kind: "INCOME" },
  donations: { name: "Donations", kind: "INCOME" },
} as const satisfies Record<string, { name: string; kind: FinanceKind }>;
export type SystemCategoryKey = keyof typeof SYSTEM_CATEGORIES;

const DEFAULT_ACCOUNTS: { method: (typeof PAYMENT_METHOD_NAMES)[number]; name: string; type: FinanceAccountType }[] = [
  { method: "Cash", name: "Cash in hand", type: "CASH" },
  { method: "bKash", name: "bKash", type: "BKASH" },
  { method: "Nagad", name: "Nagad", type: "NAGAD" },
  { method: "Bank", name: "Bank account", type: "BANK" },
  { method: "Bangla QR", name: "Bangla QR (bank)", type: "BANGLA_QR" },
];

const DEFAULT_INCOME = ["Sponsorship", "Bank interest", "Other income"];
const DEFAULT_EXPENSES = [
  "Food & catering",
  "Decoration",
  "Venue",
  "Printing",
  "Sound & stage",
  "Transport",
  "Gifts & souvenirs",
  "Office & stationery",
  "Bank & MFS charges",
  "Scholarships",
  "Welfare",
  "Other expenses",
];

/** Books are counted from here unless the treasurer sets each account's own opening date. */
const DEFAULT_OPENING = "2015-01-01";

/** Creates the default accounts and categories that are missing. Safe to call on every request. */
export async function ensureFinanceDefaults(db: Db = prisma): Promise<void> {
  const [accounts, categories] = await Promise.all([db.financeAccount.count(), db.financeCategory.count()]);
  if (accounts > 0 && categories > 0) return;
  if (db === prisma) return prisma.$transaction((tx) => createDefaults(tx));
  return createDefaults(db);
}

/**
 * The first pages of the accounts load together, so several requests can find the
 * books empty at once. Each takes the same Setting row lock first: the others wait,
 * then count again and find the defaults already made.
 */
async function createDefaults(db: Prisma.TransactionClient): Promise<void> {
  await db.$executeRaw`INSERT INTO \`Setting\` (\`key\`, \`value\`, \`updatedAt\`) VALUES ('finance-defaults', '1', NOW(3))
    ON DUPLICATE KEY UPDATE \`updatedAt\` = NOW(3)`;
  const [accounts, categories] = await Promise.all([db.financeAccount.count(), db.financeCategory.count()]);
  if (accounts > 0 && categories > 0) return;
  if (accounts === 0) {
    for (const [i, a] of DEFAULT_ACCOUNTS.entries()) {
      await db.financeAccount.upsert({
        where: { paymentMethod: a.method },
        create: { name: a.name, type: a.type, paymentMethod: a.method, openingDate: ymdToDate(DEFAULT_OPENING), sortOrder: i + 1 },
        update: {},
      });
    }
  }
  if (categories === 0) {
    let order = 0;
    for (const [key, c] of Object.entries(SYSTEM_CATEGORIES)) {
      await db.financeCategory.upsert({ where: { systemKey: key }, create: { name: c.name, kind: c.kind, systemKey: key, sortOrder: ++order }, update: {} });
    }
    const defaults = [...DEFAULT_INCOME.map((name) => ({ name, kind: "INCOME" as const })), ...DEFAULT_EXPENSES.map((name) => ({ name, kind: "EXPENSE" as const }))];
    for (const c of defaults) {
      order++;
      if (!(await db.financeCategory.findFirst({ where: { name: c.name, kind: c.kind }, select: { id: true } }))) {
        await db.financeCategory.create({ data: { ...c, sortOrder: order } });
      }
    }
  }
}

/** The category the site posts to for `key`, created if a treasurer's set-up lacks it. */
export async function systemCategoryId(db: Db, key: SystemCategoryKey): Promise<string> {
  const c = SYSTEM_CATEGORIES[key];
  const row = await db.financeCategory.upsert({ where: { systemKey: key }, create: { name: c.name, kind: c.kind, systemKey: key }, update: {} });
  return row.id;
}

/** The account a site payment method lands in; unknown or empty methods go to cash in hand. */
export async function accountIdForMethod(db: Db, method: string | null | undefined): Promise<string> {
  const known = (PAYMENT_METHOD_NAMES as readonly string[]).includes(method ?? "") ? method! : "Cash";
  const linked = await db.financeAccount.findUnique({ where: { paymentMethod: known }, select: { id: true } });
  if (linked) return linked.id;
  const d = DEFAULT_ACCOUNTS.find((a) => a.method === known)!;
  const created = await db.financeAccount.upsert({
    where: { paymentMethod: known },
    create: { name: d.name, type: d.type, paymentMethod: known, openingDate: ymdToDate(DEFAULT_OPENING) },
    update: {},
  });
  return created.id;
}

// ---- Settings: accounts and categories

export const ACCOUNT_TYPES: FinanceAccountType[] = ["CASH", "BKASH", "NAGAD", "BANK", "BANGLA_QR", "OTHER"];

export interface AccountView {
  id: string;
  name: string;
  type: FinanceAccountType;
  paymentMethod: string | null;
  openingBalance: number;
  openingDate: string;
  isActive: boolean;
  sortOrder: number;
  note: string | null;
}

export interface CategoryView {
  id: string;
  name: string;
  kind: FinanceKind;
  systemKey: string | null;
  isActive: boolean;
  sortOrder: number;
}

const toAccount = (a: Prisma.FinanceAccountGetPayload<object>): AccountView => ({
  id: a.id,
  name: a.name,
  type: a.type,
  paymentMethod: a.paymentMethod,
  openingBalance: a.openingBalance,
  openingDate: dateToYmd(a.openingDate),
  isActive: a.isActive,
  sortOrder: a.sortOrder,
  note: a.note,
});

const toCategory = (c: Prisma.FinanceCategoryGetPayload<object>): CategoryView => ({
  id: c.id,
  name: c.name,
  kind: c.kind,
  systemKey: c.systemKey,
  isActive: c.isActive,
  sortOrder: c.sortOrder,
});

export async function listAccounts(): Promise<AccountView[]> {
  await ensureFinanceDefaults();
  return (await prisma.financeAccount.findMany({ orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }] })).map(toAccount);
}

export async function listCategories(): Promise<CategoryView[]> {
  await ensureFinanceDefaults();
  return (await prisma.financeCategory.findMany({ orderBy: [{ kind: "asc" }, { isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }] })).map(toCategory);
}

const accountFields = fieldReader("INVALID_ACCOUNT");

export interface AccountInput {
  name?: unknown;
  type?: unknown;
  paymentMethod?: unknown;
  openingBalance?: unknown;
  openingDate?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
  note?: unknown;
}

function readAccount(input: AccountInput, partial: boolean) {
  const f = accountFields;
  const data: Prisma.FinanceAccountUncheckedUpdateInput = {};
  if (!partial || input.name !== undefined) data.name = f.text(input.name, "account name", 2, 120);
  if (!partial || input.type !== undefined) {
    if (!ACCOUNT_TYPES.includes(input.type as FinanceAccountType)) throw f.bad("Please choose the account type.");
    data.type = input.type as FinanceAccountType;
  }
  if (input.paymentMethod !== undefined) {
    const m = typeof input.paymentMethod === "string" ? input.paymentMethod : "";
    if (m && !(PAYMENT_METHOD_NAMES as readonly string[]).includes(m)) throw f.bad("Unknown payment method.");
    data.paymentMethod = m || null;
  }
  if (input.openingBalance !== undefined) {
    const raw = input.openingBalance;
    data.openingBalance = raw === "" || raw === null || raw === 0 || raw === "0" ? 0 : parseAmount(raw, "opening balance");
  }
  if (!partial || input.openingDate !== undefined) data.openingDate = ymdToDate(typeof input.openingDate === "string" ? input.openingDate : "");
  if (input.isActive !== undefined) data.isActive = input.isActive === true;
  if (input.sortOrder !== undefined) data.sortOrder = f.optInt(input.sortOrder, "order", -1000, 1000) ?? 0;
  if (input.note !== undefined) data.note = f.optText(input.note, "note", 300);
  return data;
}

const methodTaken = (err: unknown) => (err as { code?: string }).code === "P2002";

export async function createAccount(input: AccountInput): Promise<AccountView> {
  const data = readAccount(input, false) as Prisma.FinanceAccountUncheckedCreateInput;
  try {
    return toAccount(await prisma.financeAccount.create({ data }));
  } catch (err) {
    if (methodTaken(err)) throw new AppError("METHOD_TAKEN", 409, "Another account already receives that payment method.");
    throw err;
  }
}

export async function updateAccount(id: string, input: AccountInput): Promise<AccountView> {
  if (!(await prisma.financeAccount.findUnique({ where: { id }, select: { id: true } }))) throw new AppError("ACCOUNT_NOT_FOUND", 404, "Account not found.");
  try {
    return toAccount(await prisma.financeAccount.update({ where: { id }, data: readAccount(input, true) }));
  } catch (err) {
    if (methodTaken(err)) throw new AppError("METHOD_TAKEN", 409, "Another account already receives that payment method.");
    throw err;
  }
}

const categoryFields = fieldReader("INVALID_CATEGORY");

export async function createCategory(input: { name?: unknown; kind?: unknown }): Promise<CategoryView> {
  const name = categoryFields.text(input.name, "category name", 2, 120);
  if (input.kind !== "INCOME" && input.kind !== "EXPENSE") throw categoryFields.bad("A category is for income or for expenses.");
  return toCategory(await prisma.financeCategory.create({ data: { name, kind: input.kind, sortOrder: 500 } }));
}

/** Rename, reorder or switch off a category. Site categories can be renamed but never switched off. */
export async function updateCategory(id: string, input: { name?: unknown; isActive?: unknown; sortOrder?: unknown }): Promise<CategoryView> {
  const current = await prisma.financeCategory.findUnique({ where: { id } });
  if (!current) throw new AppError("CATEGORY_NOT_FOUND", 404, "Category not found.");
  const data: Prisma.FinanceCategoryUpdateInput = {};
  if (input.name !== undefined) data.name = categoryFields.text(input.name, "category name", 2, 120);
  if (input.isActive !== undefined) {
    if (current.systemKey && input.isActive !== true) throw categoryFields.bad("The site posts to this category; it cannot be switched off.");
    data.isActive = input.isActive === true;
  }
  if (input.sortOrder !== undefined) data.sortOrder = categoryFields.optInt(input.sortOrder, "order", -1000, 1000) ?? 0;
  return toCategory(await prisma.financeCategory.update({ where: { id }, data }));
}
