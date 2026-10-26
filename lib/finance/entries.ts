import type { FinanceEntryStatus, FinanceKind, FinanceSource, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { fieldReader, str } from "@/lib/content-fields";
import { isVoucherFileUrl } from "@/lib/media/vouchers";
import { parseAmount } from "./money";
import { dateToYmd, optionalYmd, todayYmd, ymdToDate } from "./dates";
import { ensureFinanceDefaults } from "./setup";

/**
 * Vouchers in the accounts. Income is counted at once; expenses and transfers wait for
 * an administrator other than the person who entered them. Nothing is ever deleted:
 * a mistake is voided with a reason and stays on record, struck through.
 */

type Tx = Prisma.TransactionClient;

export const FINANCE_KINDS: FinanceKind[] = ["INCOME", "EXPENSE", "TRANSFER"];
const PREFIX: Record<FinanceKind, string> = { INCOME: "R", EXPENSE: "P", TRANSFER: "T" };

export interface FinanceActor {
  email: string;
  role: string;
}

/** Administrators approve vouchers; the treasurer prepares them. */
export function canApproveFinance(role: string | null | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export interface EntryView {
  id: string;
  voucherNo: string;
  kind: FinanceKind;
  date: string;
  amount: number;
  accountId: string;
  accountName: string;
  toAccountId: string | null;
  toAccountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  eventId: string | null;
  eventTitle: string | null;
  party: string | null;
  description: string;
  reference: string | null;
  attachmentUrl: string | null;
  status: FinanceEntryStatus;
  source: FinanceSource;
  sourceId: string | null;
  createdBy: string;
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  voidedBy: string | null;
  voidedAt: string | null;
  voidReason: string | null;
}

export const ENTRY_INCLUDE = {
  account: { select: { name: true } },
  toAccount: { select: { name: true } },
  category: { select: { name: true } },
  event: { select: { title: true } },
} satisfies Prisma.FinanceEntryInclude;

export type EntryRow = Prisma.FinanceEntryGetPayload<{ include: typeof ENTRY_INCLUDE }>;

export function toEntryView(e: EntryRow): EntryView {
  return {
    id: e.id,
    voucherNo: e.voucherNo,
    kind: e.kind,
    date: dateToYmd(e.date),
    amount: e.amount,
    accountId: e.accountId,
    accountName: e.account.name,
    toAccountId: e.toAccountId,
    toAccountName: e.toAccount?.name ?? null,
    categoryId: e.categoryId,
    categoryName: e.category?.name ?? null,
    eventId: e.eventId,
    eventTitle: e.event?.title ?? null,
    party: e.party,
    description: e.description,
    reference: e.reference,
    attachmentUrl: e.attachmentUrl,
    status: e.status,
    source: e.source,
    sourceId: e.sourceId,
    createdBy: e.createdBy,
    createdAt: e.createdAt.toISOString(),
    approvedBy: e.approvedBy,
    approvedAt: e.approvedAt?.toISOString() ?? null,
    voidedBy: e.voidedBy,
    voidedAt: e.voidedAt?.toISOString() ?? null,
    voidReason: e.voidReason,
  };
}

/**
 * The next voucher number for a kind and year, e.g. P-2026-0007. The counter lives in a
 * Setting row that this transaction locks until it commits, so two vouchers saved at the
 * same moment can never get the same number.
 */
export async function nextVoucherNo(tx: Tx, kind: FinanceKind, year: number): Promise<string> {
  const key = `voucher-seq:${PREFIX[kind]}-${year}`;
  await tx.$executeRaw`INSERT INTO \`Setting\` (\`key\`, \`value\`, \`updatedAt\`) VALUES (${key}, '1', NOW(3))
    ON DUPLICATE KEY UPDATE \`value\` = CAST(\`value\` AS UNSIGNED) + 1, \`updatedAt\` = NOW(3)`;
  const row = await tx.setting.findUniqueOrThrow({ where: { key } });
  return `${PREFIX[kind]}-${year}-${String(Number(row.value)).padStart(4, "0")}`;
}

export interface EntryInput {
  kind?: unknown;
  date?: unknown;
  amount?: unknown;
  accountId?: unknown;
  toAccountId?: unknown;
  categoryId?: unknown;
  eventId?: unknown;
  party?: unknown;
  description?: unknown;
  reference?: unknown;
  attachmentUrl?: unknown;
}

const fields = fieldReader("INVALID_ENTRY");

/** Checks a whole voucher (create, or edit of a pending one) against the books as they are. */
async function readEntry(db: Tx | typeof prisma, input: EntryInput, kind: FinanceKind) {
  const f = fields;
  const date = optionalYmd(input.date);
  if (!date) throw f.bad("Please give the date of the voucher.");
  if (date > todayYmd()) throw f.bad("The date cannot be in the future.");
  const amount = parseAmount(input.amount);

  const accountId = str(input.accountId);
  const account = accountId ? await db.financeAccount.findUnique({ where: { id: accountId } }) : null;
  if (!account || !account.isActive) throw f.bad(kind === "TRANSFER" ? "Please choose the account the money leaves." : "Please choose the account.");
  if (date < dateToYmd(account.openingDate)) throw f.bad(`${account.name} starts on ${dateToYmd(account.openingDate)}; the voucher cannot be earlier.`);

  let toAccountId: string | null = null;
  let categoryId: string | null = null;
  if (kind === "TRANSFER") {
    toAccountId = str(input.toAccountId);
    const to = toAccountId ? await db.financeAccount.findUnique({ where: { id: toAccountId } }) : null;
    if (!to || !to.isActive) throw f.bad("Please choose the account the money goes to.");
    if (to.id === account.id) throw f.bad("A transfer needs two different accounts.");
    if (date < dateToYmd(to.openingDate)) throw f.bad(`${to.name} starts on ${dateToYmd(to.openingDate)}; the voucher cannot be earlier.`);
  } else {
    categoryId = str(input.categoryId);
    const category = categoryId ? await db.financeCategory.findUnique({ where: { id: categoryId } }) : null;
    if (!category || !category.isActive) throw f.bad("Please choose a category.");
    if (category.kind !== kind) throw f.bad(kind === "INCOME" ? "Choose an income category." : "Choose an expense category.");
  }

  const eventId = str(input.eventId) || null;
  if (eventId && !(await db.event.findUnique({ where: { id: eventId }, select: { id: true } }))) throw f.bad("Event not found.");

  const attachmentUrl = str(input.attachmentUrl) || null;
  if (attachmentUrl && !isVoucherFileUrl(attachmentUrl)) throw f.bad("Please upload the bill or receipt instead of linking to it.");

  return {
    date: ymdToDate(date),
    amount,
    accountId: account.id,
    toAccountId,
    categoryId,
    eventId,
    party: f.optText(input.party, kind === "INCOME" ? "payer" : "payee", 160),
    description: f.text(input.description, "description", 2, 500),
    reference: f.optText(input.reference, "reference", 80),
    attachmentUrl,
  };
}

async function entryView(db: Tx | typeof prisma, id: string): Promise<EntryView> {
  return toEntryView(await db.financeEntry.findUniqueOrThrow({ where: { id }, include: ENTRY_INCLUDE }));
}

/** A new voucher. Income is approved at once; expenses and transfers wait for approval. */
export async function createEntry(input: EntryInput, actor: FinanceActor): Promise<EntryView> {
  const kind = input.kind as FinanceKind;
  if (!FINANCE_KINDS.includes(kind)) throw fields.bad("Choose income, expense or transfer.");
  await ensureFinanceDefaults();
  return prisma.$transaction(async (tx) => {
    const data = await readEntry(tx, input, kind);
    const approved = kind === "INCOME";
    const row = await tx.financeEntry.create({
      data: {
        ...data,
        kind,
        voucherNo: await nextVoucherNo(tx, kind, data.date.getUTCFullYear()),
        status: approved ? "APPROVED" : "PENDING",
        createdBy: actor.email,
        ...(approved ? { approvedBy: actor.email, approvedAt: new Date() } : {}),
      },
    });
    return entryView(tx, row.id);
  });
}

async function loadForChange(tx: Tx, id: string) {
  const entry = await tx.financeEntry.findUnique({ where: { id } });
  if (!entry) throw new AppError("ENTRY_NOT_FOUND", 404, "Voucher not found.");
  return entry;
}

/** Corrects a voucher that is still waiting for approval (the kind stays the same). */
export async function updatePendingEntry(id: string, input: EntryInput, actor: FinanceActor): Promise<EntryView> {
  return prisma.$transaction(async (tx) => {
    const entry = await loadForChange(tx, id);
    if (entry.status !== "PENDING") throw new AppError("ENTRY_LOCKED", 409, "Approved or voided vouchers cannot be edited; void it and enter a new one.");
    if (entry.createdBy !== actor.email && !canApproveFinance(actor.role)) throw new AppError("FORBIDDEN", 403, "Only the person who entered this voucher or an administrator can edit it.");
    const data = await readEntry(tx, input, entry.kind);
    const written = await tx.financeEntry.updateMany({ where: { id, status: "PENDING" }, data });
    if (written.count === 0) throw new AppError("ENTRY_LOCKED", 409, "This voucher was just approved or voided. Refresh and try again.");
    return entryView(tx, id);
  });
}

/** Approves a pending voucher: an administrator, and never the person who entered it. */
export async function approveEntry(id: string, actor: FinanceActor): Promise<EntryView> {
  if (!canApproveFinance(actor.role)) throw new AppError("FORBIDDEN", 403, "Only an administrator can approve vouchers.");
  return prisma.$transaction(async (tx) => {
    const entry = await loadForChange(tx, id);
    if (entry.status !== "PENDING") throw new AppError("ENTRY_LOCKED", 409, `This voucher is already ${entry.status.toLowerCase()}.`);
    if (entry.createdBy.toLowerCase() === actor.email.toLowerCase()) {
      throw new AppError("SELF_APPROVAL", 403, "You entered this voucher; another administrator must approve it.");
    }
    const written = await tx.financeEntry.updateMany({ where: { id, status: "PENDING" }, data: { status: "APPROVED", approvedBy: actor.email, approvedAt: new Date() } });
    if (written.count === 0) throw new AppError("ENTRY_LOCKED", 409, "This voucher was just changed. Refresh and try again.");
    return entryView(tx, id);
  });
}

/**
 * Voids a voucher with a reason; it stays on record but no longer counts. The person who
 * entered a pending voucher may withdraw it; anything approved needs an administrator.
 */
export async function voidEntry(id: string, reasonInput: unknown, actor: FinanceActor): Promise<EntryView> {
  const reason = fields.text(reasonInput, "reason", 3, 300);
  return prisma.$transaction(async (tx) => {
    const entry = await loadForChange(tx, id);
    if (entry.status === "VOID") throw new AppError("ENTRY_LOCKED", 409, "This voucher is already void.");
    const own = entry.status === "PENDING" && entry.createdBy === actor.email;
    if (!own && !canApproveFinance(actor.role)) throw new AppError("FORBIDDEN", 403, "Only an administrator can void an approved voucher.");
    const written = await tx.financeEntry.updateMany({
      where: { id, status: entry.status },
      data: { status: "VOID", voidedBy: actor.email, voidedAt: new Date(), voidReason: reason },
    });
    if (written.count === 0) throw new AppError("ENTRY_LOCKED", 409, "This voucher was just changed. Refresh and try again.");
    return entryView(tx, id);
  });
}

export interface EntryFilters {
  from?: unknown;
  to?: unknown;
  accountId?: unknown;
  categoryId?: unknown;
  eventId?: unknown;
  kind?: unknown;
  status?: unknown;
  q?: unknown;
}

/** Filters from a query string into a Prisma where clause. */
export function entryWhere(filters: EntryFilters): Prisma.FinanceEntryWhereInput {
  const from = optionalYmd(filters.from);
  const to = optionalYmd(filters.to);
  const where: Prisma.FinanceEntryWhereInput = {};
  if (from || to) where.date = { ...(from ? { gte: ymdToDate(from) } : {}), ...(to ? { lte: ymdToDate(to) } : {}) };
  const accountId = str(filters.accountId);
  if (accountId) where.OR = [{ accountId }, { toAccountId: accountId }];
  const categoryId = str(filters.categoryId);
  if (categoryId) where.categoryId = categoryId;
  const eventId = str(filters.eventId);
  if (eventId) where.eventId = eventId;
  if (FINANCE_KINDS.includes(filters.kind as FinanceKind)) where.kind = filters.kind as FinanceKind;
  if (["PENDING", "APPROVED", "VOID"].includes(str(filters.status))) where.status = str(filters.status) as FinanceEntryStatus;
  const q = str(filters.q).slice(0, 80);
  if (q) {
    const text = [{ voucherNo: { contains: q } }, { description: { contains: q } }, { party: { contains: q } }, { reference: { contains: q } }];
    where.AND = [{ OR: text }];
  }
  return where;
}

export async function listEntries(filters: EntryFilters, limit = 500): Promise<EntryView[]> {
  const rows = await prisma.financeEntry.findMany({
    where: entryWhere(filters),
    include: ENTRY_INCLUDE,
    orderBy: [{ date: "desc" }, { voucherNo: "desc" }],
    take: limit,
  });
  return rows.map(toEntryView);
}

export async function getEntry(id: string): Promise<EntryView | null> {
  const row = await prisma.financeEntry.findUnique({ where: { id }, include: ENTRY_INCLUDE });
  return row ? toEntryView(row) : null;
}
