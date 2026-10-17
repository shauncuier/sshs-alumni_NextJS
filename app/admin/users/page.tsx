"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Ban,
  ChevronLeft,
  ChevronRight,
  Key,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { FIRST_SSC_BATCH } from "@/lib/data";

type Role = "SUPER_ADMIN" | "ADMIN" | "MODERATOR" | "ALUMNI";

interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  disabled: boolean;
  batch: number | null;
  phone: string | null;
  createdAt: string;
  isEnvSuperAdmin: boolean;
}

interface AdminUserStats {
  totalUsers: number;
  superAdmins: number;
  admins: number;
  moderators: number;
  alumni: number;
  disabled: number;
}

interface Viewer {
  id: string;
  role: string;
}

const ROLE_LABELS: Record<Role, string> = { SUPER_ADMIN: "Super Admin", ADMIN: "Admin", MODERATOR: "Moderator", ALUMNI: "Alumni" };
const BATCH_YEARS = Array.from({ length: new Date().getFullYear() - FIRST_SSC_BATCH + 1 }, (_, i) => new Date().getFullYear() - i);
const input = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-600";
const label = "block text-xs font-semibold text-slate-700 mb-1.5";
const primaryButton = "px-4 py-2.5 min-h-[44px] bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";
const ghostButton = "px-3 py-2 min-h-[40px] border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";

const roleBadge = (role: Role) =>
  role === "SUPER_ADMIN"
    ? "bg-amber-100 text-amber-900 border border-amber-300"
    : role === "ADMIN"
      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
      : role === "MODERATOR"
        ? "bg-blue-100 text-blue-900 border border-blue-300"
        : "bg-slate-100 text-slate-700";

/** Mirrors manageBlock in lib/admin/users.ts; the server re-checks every change. */
function canManage(viewer: Viewer | null, u: AdminUserRecord): boolean {
  if (!viewer || (viewer.role !== "ADMIN" && viewer.role !== "SUPER_ADMIN")) return false;
  if (viewer.id === u.id || u.isEnvSuperAdmin) return false;
  if ((u.role === "ADMIN" || u.role === "SUPER_ADMIN") && viewer.role !== "SUPER_ADMIN") return false;
  return true;
}

function assignableRoles(viewer: Viewer | null): Role[] {
  return viewer?.role === "SUPER_ADMIN" ? ["ALUMNI", "MODERATOR", "ADMIN"] : ["ALUMNI", "MODERATOR"];
}

function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function send(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-black text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 -m-2 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PasswordInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      <input id={id} required minLength={8} autoComplete="new-password" className={`${input} font-mono`} value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" className={ghostButton} onClick={() => onChange(generatePassword())}>
        Generate
      </button>
    </div>
  );
}

function AddUserDialog({ viewer, onClose, onCreated }: { viewer: Viewer | null; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", sscBatch: String(new Date().getFullYear() - 20), role: "ALUMNI", password: generatePassword() });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await send("/api/admin/users", "POST", { ...form, sscBatch: Number(form.sscBatch) });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title="Add user" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="nu-name" className={label}>Full name *</label>
          <input id="nu-name" required className={input} value={form.fullName} onChange={set("fullName")} />
        </div>
        <div>
          <label htmlFor="nu-email" className={label}>Email *</label>
          <input id="nu-email" type="email" required className={input} value={form.email} onChange={set("email")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="nu-batch" className={label}>SSC batch *</label>
            <select id="nu-batch" className={input} value={form.sscBatch} onChange={set("sscBatch")}>
              {BATCH_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="nu-role" className={label}>Role *</label>
            <select id="nu-role" className={input} value={form.role} onChange={set("role")}>
              {assignableRoles(viewer).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="nu-phone" className={label}>Phone</label>
          <input id="nu-phone" type="tel" className={input} value={form.phone} onChange={set("phone")} placeholder="01XXXXXXXXX" />
        </div>
        <div>
          <label htmlFor="nu-password" className={label}>Password (8+ characters) *</label>
          <PasswordInput id="nu-password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
          <p className="text-[11px] text-slate-500 mt-1">Share it with the person privately; they can change it in Settings.</p>
        </div>
        {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
        <button type="submit" disabled={saving} className={`${primaryButton} w-full`}>
          {saving ? "Adding…" : "Add user"}
        </button>
      </form>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose, onDone }: { user: AdminUserRecord; onClose: () => void; onDone: () => void }) {
  const [password, setPassword] = useState(generatePassword);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await send(`/api/admin/users/${user.id}`, "PATCH", { action: "password", password });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={`Reset password — ${user.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="rp-password" className={label}>New password *</label>
          <PasswordInput id="rp-password" value={password} onChange={setPassword} />
          <p className="text-[11px] text-slate-500 mt-1">They are signed out everywhere and must use this password next time.</p>
        </div>
        {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
        <button type="submit" disabled={saving} className={`${primaryButton} w-full`}>
          {saving ? "Saving…" : "Set new password"}
        </button>
      </form>
    </Dialog>
  );
}

function DeleteUserDialog({ user, onClose, onDone }: { user: AdminUserRecord; onClose: () => void; onDone: (message: string) => void }) {
  const [typed, setTyped] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim().toLowerCase() === user.email.toLowerCase();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matches) return;
    setError(null);
    setSaving(true);
    try {
      const { deleted } = await send(`/api/admin/users/${user.id}`, "DELETE", { confirmEmail: typed });
      const extra = [
        deleted.registrations ? `${deleted.registrations} unconfirmed registration${deleted.registrations === 1 ? "" : "s"} removed` : "",
        deleted.donationsKept ? `${deleted.donationsKept} donation${deleted.donationsKept === 1 ? "" : "s"} kept without the account` : "",
      ].filter(Boolean);
      onDone(`${user.name}'s account was deleted.${extra.length ? ` ${extra.join("; ")}.` : ""}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={`Delete ${user.name}?`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3 text-xs">
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
          <p className="font-bold">This cannot be undone.</p>
          <p>
            Deletes the account, profile, photo and proof document, posts, comments, messages, unconfirmed registrations, mentor and job posts.
            Donations are kept as money records. A member with a confirmed paid registration cannot be deleted: disable them instead.
          </p>
        </div>
        <div>
          <label htmlFor="del-email" className={label}>
            Type <strong className="font-mono">{user.email}</strong> to confirm
          </label>
          <input id="del-email" className={input} value={typed} autoComplete="off" onChange={(e) => setTyped(e.target.value)} />
        </div>
        {error && <p role="alert" className="font-bold text-rose-700">{error}</p>}
        <button
          type="submit"
          disabled={saving || !matches}
          className="w-full px-4 py-2.5 min-h-[44px] bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" /> {saving ? "Deleting…" : "Delete account permanently"}
        </button>
      </form>
    </Dialog>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<AdminUserRecord | null>(null);
  const [deleting, setDeleting] = useState<AdminUserRecord | null>(null);

  // Search on the server once typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (query) params.set("q", query);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed to load users (${res.status})`);
      setUsers(data.users);
      setStats(data.stats);
      setViewer(data.viewer);
      setTotal(data.total);
      setPageSize(data.pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, query, roleFilter, statusFilter]);

  useEffect(() => {
    void loadUsers(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadUsers]);

  const update = async (u: AdminUserRecord, change: Record<string, unknown>, done: string) => {
    setBusyId(u.id);
    setError(null);
    setNotice(null);
    try {
      const { user } = await send(`/api/admin/users/${u.id}`, "PATCH", change);
      setUsers((list) => list.map((x) => (x.id === user.id ? user : x)));
      setNotice(done);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleDisabled = (u: AdminUserRecord) => {
    if (u.disabled) return update(u, { action: "enable" }, `${u.name} can sign in again.`);
    if (!window.confirm(`Disable ${u.name}? They are signed out at once and cannot sign in until re-enabled.`)) return;
    return update(u, { action: "disable" }, `${u.name} is disabled.`);
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const statCards = [
    { label: "Total accounts", value: stats?.totalUsers, icon: Users, tone: "text-slate-900" },
    { label: "Admins", value: stats ? stats.superAdmins + stats.admins : undefined, icon: ShieldCheck, tone: "text-emerald-800" },
    { label: "Moderators", value: stats?.moderators, icon: UserCheck, tone: "text-blue-800" },
    { label: "Disabled", value: stats?.disabled, icon: Ban, tone: "text-rose-700" },
  ];

  return (
    <div className="p-4 sm:p-8 space-y-5 max-w-7xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">User Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Add accounts, assign roles, reset passwords and disable access.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadUsers()} disabled={loading} className={ghostButton} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => setAdding(true)} className={`${primaryButton} flex-1 sm:flex-none`}>
            <Plus className="w-4 h-4" /> Add user
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div role="status" className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between gap-2">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label: l, value, icon: Icon, tone }) => (
          <div key={l} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {l}</span>
            <div className={`text-2xl font-black mt-1 ${tone}`}>{value ?? "…"}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white px-3 rounded-2xl border border-slate-200 shadow-xs min-h-[44px]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone or batch year"
            aria-label="Search users"
            className="w-full text-base sm:text-xs bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <select aria-label="Filter by role" className={`${input} bg-white sm:w-40`} value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="">All roles</option>
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <select aria-label="Filter by status" className={`${input} bg-white sm:w-40`} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {!loading && users.length === 0 && <p className="py-10 text-center text-slate-400 text-xs">No users match.</p>}
        {users.map((u) => {
          const manageable = canManage(viewer, u);
          const busy = busyId === u.id;
          return (
            <div key={u.id} className={`p-4 flex flex-col lg:flex-row lg:items-center gap-3 ${u.disabled ? "bg-slate-50/80" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`font-bold text-sm ${u.disabled ? "text-slate-400 line-through" : "text-slate-900"}`}>{u.name}</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${roleBadge(u.role)}`}>{ROLE_LABELS[u.role]}</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${u.status === "VERIFIED" ? "bg-emerald-50 text-emerald-800" : u.status === "PENDING" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"}`}>
                    {u.status}
                  </span>
                  {u.disabled && <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-rose-600 text-white">DISABLED</span>}
                  {u.isEnvSuperAdmin && (
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-800 text-white flex items-center gap-1" title="Set by SUPER_ADMIN_EMAIL in the server environment">
                      <Lock className="w-3 h-3" /> ENV
                    </span>
                  )}
                  {viewer?.id === u.id && <span className="text-[10px] font-bold text-slate-400">(you)</span>}
                </div>
                <div className="text-[11px] text-slate-500 font-mono break-all mt-0.5">{u.email}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {u.batch ? `SSC ${u.batch}` : "No profile"}
                  {u.phone ? ` · ${u.phone}` : ""} · Joined {new Date(u.createdAt).toLocaleDateString()}
                </div>
              </div>

              {manageable ? (
                <div className="grid grid-cols-3 lg:flex gap-2 lg:shrink-0">
                  <select
                    aria-label={`Role for ${u.name}`}
                    disabled={busy}
                    className={`${input} bg-white lg:w-36 min-h-[40px] py-2`}
                    value={u.role}
                    onChange={(e) => {
                      const role = e.target.value as Role;
                      // A role change grants or removes access (and signs the user out): confirm it.
                      if (!window.confirm(`Change ${u.name} from ${ROLE_LABELS[u.role as Role]} to ${ROLE_LABELS[role]}? They will be signed out.`)) {
                        e.target.value = u.role;
                        return;
                      }
                      void update(u, { action: "role", role }, `${u.name} is now ${ROLE_LABELS[role]}.`);
                    }}
                  >
                    {assignableRoles(viewer).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                  <button type="button" disabled={busy} onClick={() => setResetting(u)} className={ghostButton}>
                    <Key className="w-3.5 h-3.5" /> <span>Password</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleDisabled(u)}
                    className={u.disabled ? ghostButton : `${ghostButton} text-rose-700 border-rose-200 hover:bg-rose-50`}
                  >
                    {u.disabled ? "Enable" : <><Ban className="w-3.5 h-3.5" /> Disable</>}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setDeleting(u)}
                    aria-label={`Delete ${u.name}`}
                    className={`${ghostButton} text-rose-700 border-rose-200 hover:bg-rose-50`}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> <span>Delete</span>
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 lg:w-48 lg:text-right">
                  {viewer?.id === u.id ? "Your own account" : u.isEnvSuperAdmin ? "Managed in server environment" : "Only the super admin can change admins"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{total === 0 ? "0 users" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}</span>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} className={ghostButton}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold">{page} / {pages}</span>
          <button type="button" aria-label="Next page" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)} className={ghostButton}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {adding && (
        <AddUserDialog
          viewer={viewer}
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            setNotice("User added. Share the password with them privately.");
            void loadUsers();
          }}
        />
      )}
      {deleting && (
        <DeleteUserDialog
          user={deleting}
          onClose={() => setDeleting(null)}
          onDone={(message) => {
            setDeleting(null);
            setNotice(message);
            void loadUsers();
          }}
        />
      )}
      {resetting && (
        <ResetPasswordDialog
          user={resetting}
          onClose={() => setResetting(null)}
          onDone={() => {
            setNotice(`New password set for ${resetting.name}. They have been signed out.`);
            setResetting(null);
          }}
        />
      )}
    </div>
  );
}
