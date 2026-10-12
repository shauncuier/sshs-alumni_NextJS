"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, Check, Image as ImageIcon, ImagePlus, Loader2, Plus, RefreshCw, Star, Trash2, X } from "lucide-react";

interface Photo {
  id: string;
  imageUrl: string;
  thumbUrl: string;
  caption: string | null;
  sortOrder: number;
}

interface Album {
  id: string;
  title: string;
  category: string;
  description: string | null;
  year: number | null;
  coverUrl: string | null;
  isPublished: boolean;
  photosCount: number;
  updatedAt: string;
  updatedBy: string | null;
  photos: Photo[];
}

const input = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600";
const label = "block text-xs font-semibold text-slate-700 mb-1.5";
const primary = "px-4 py-2.5 min-h-[44px] bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";
const ghost = "px-3 py-2 min-h-[40px] border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";
const thumb = (url: string | null) => (url ? url.replace("/large.webp", "/thumb.webp") : null);

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

function AlbumForm({ album, categories, onClose, onSaved }: { album: Partial<Album> | null; categories: string[]; onClose: () => void; onSaved: (a: Album) => void }) {
  const [form, setForm] = useState({
    title: album?.title ?? "",
    category: album?.category ?? categories[2] ?? "Reunions",
    year: album?.year ? String(album.year) : "",
    description: album?.description ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = { ...form, year: form.year ? Number(form.year) : null };
      const data = album?.id ? await api(`/api/admin/gallery/${album.id}`, "PATCH", body) : await api("/api/admin/gallery", "POST", body);
      onSaved(data.album);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={album?.id ? "Edit album" : "New album"}
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900">{album?.id ? "Edit album" : "New album"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 -m-2 text-slate-400 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div>
          <label htmlFor="al-title" className={label}>Album name *</label>
          <input id="al-title" required maxLength={150} className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Golden Jubilee Reunion 2026" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="al-cat" className={label}>Category *</label>
            <select id="al-cat" className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="al-year" className={label}>Year</label>
            <input id="al-year" inputMode="numeric" className={input} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="2026" />
          </div>
        </div>
        <div>
          <label htmlFor="al-desc" className={label}>Description</label>
          <textarea id="al-desc" rows={3} maxLength={2000} className={input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
        <button type="submit" disabled={saving} className={`${primary} w-full`}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} {album?.id ? "Save" : "Create album"}
        </button>
      </form>
    </div>
  );
}

function AlbumWorkspace({ album, categories, onBack, onChanged, onDeleted }: { album: Album; categories: string[]; onBack: () => void; onChanged: (a: Album) => void; onDeleted: (title: string) => void }) {
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingInfo, setEditingInfo] = useState(false);

  const refresh = async () => {
    const data = await api("/api/admin/gallery", "GET");
    const fresh = (data.albums as Album[]).find((a) => a.id === album.id);
    if (fresh) onChanged(fresh);
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const list = Array.from(files);
    const failures: string[] = [];
    setUploading({ done: 0, total: list.length });
    // One at a time: keeps the server and a phone's connection from being swamped.
    for (const [i, file] of list.entries()) {
      try {
        const body = new FormData();
        body.append("image", file);
        const res = await fetch("/api/admin/media", { method: "POST", body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Upload failed.");
        await api(`/api/admin/gallery/${album.id}/photos`, "POST", { imageUrl: data.url });
      } catch (err) {
        failures.push(`${file.name}: ${(err as Error).message}`);
      }
      setUploading({ done: i + 1, total: list.length });
    }
    setUploading(null);
    if (failures.length) setError(`${failures.length} photo(s) not added — ${failures.join("; ")}`);
    await refresh();
  };

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveCaption = (p: Photo, caption: string) => {
    if ((p.caption ?? "") === caption.trim()) return;
    void run(() => api(`/api/admin/gallery/photos/${p.id}`, "PATCH", { caption }));
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> All albums
      </button>

      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${album.isPublished ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{album.isPublished ? "PUBLISHED" : "NOT PUBLISHED"}</span>
            <span className="text-[11px] text-slate-500">{album.category}{album.year ? ` · ${album.year}` : ""} · {album.photos.length} photos</span>
          </div>
          <h2 className="text-lg font-black text-slate-900 break-words">{album.title}</h2>
          {album.description && <p className="text-xs text-slate-600 whitespace-pre-line">{album.description}</p>}
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2 shrink-0">
          <button type="button" className={ghost} onClick={() => setEditingInfo(true)}>Edit details</button>
          <button
            type="button"
            disabled={busy || (!album.isPublished && album.photos.length === 0)}
            className={album.isPublished ? ghost : primary}
            title={!album.isPublished && album.photos.length === 0 ? "Add photos first" : undefined}
            onClick={() => void run(() => api(`/api/admin/gallery/${album.id}`, "PATCH", { isPublished: !album.isPublished }))}
          >
            {album.isPublished ? "Unpublish" : "Publish"}
          </button>
          <button
            type="button"
            disabled={busy}
            className={`${ghost} text-rose-700 border-rose-200 hover:bg-rose-50 col-span-2 sm:col-span-1`}
            onClick={async () => {
              if (!window.confirm(`Delete "${album.title}" and all ${album.photos.length} photos? This cannot be undone.`)) return;
              setBusy(true);
              try {
                await api(`/api/admin/gallery/${album.id}`, "DELETE");
                onDeleted(album.title);
              } catch (err) {
                setError((err as Error).message);
                setBusy(false);
              }
            }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete album
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <label className={`${primary} w-full sm:w-fit ${uploading ? "pointer-events-none opacity-70" : ""}`}>
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
        {uploading ? `Uploading ${uploading.done} / ${uploading.total}…` : "Add photos"}
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={uploading !== null} onChange={(e) => { void uploadFiles(e.target.files); e.target.value = ""; }} />
      </label>
      <p className="text-[11px] text-slate-500 -mt-2">Choose several photos at once. JPEG, PNG or WebP, up to 8 MB each; location and camera data are removed.</p>

      {album.photos.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
          <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No photos yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {album.photos.map((p) => {
            const isCover = (album.coverUrl ?? album.photos[0]?.imageUrl) === p.imageUrl;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="relative aspect-[4/3] bg-slate-100">
                  <img src={p.thumbUrl} alt={p.caption ?? ""} className="w-full h-full object-cover" loading="lazy" />
                  {isCover && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black flex items-center gap-1"><Star className="w-3 h-3" /> COVER</span>
                  )}
                </div>
                <div className="p-2 space-y-1.5">
                  <input
                    defaultValue={p.caption ?? ""}
                    maxLength={500}
                    placeholder="Caption"
                    aria-label="Photo caption"
                    className="w-full px-2 py-1.5 text-base sm:text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    onBlur={(e) => saveCaption(p, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                  />
                  <div className="flex gap-1.5">
                    {!isCover && (
                      <button type="button" disabled={busy} className="flex-1 text-[10px] font-bold text-slate-700 border border-slate-200 rounded-lg py-1.5 flex items-center justify-center gap-1 cursor-pointer" onClick={() => void run(() => api(`/api/admin/gallery/${album.id}`, "PATCH", { coverUrl: p.imageUrl }))}>
                        <Check className="w-3 h-3" /> Cover
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      aria-label="Delete photo"
                      className="flex-1 text-[10px] font-bold text-rose-700 border border-rose-200 rounded-lg py-1.5 flex items-center justify-center gap-1 cursor-pointer"
                      onClick={() => {
                        if (window.confirm("Delete this photo?")) void run(() => api(`/api/admin/gallery/photos/${p.id}`, "DELETE"));
                      }}
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingInfo && (
        <AlbumForm
          album={album}
          categories={categories}
          onClose={() => setEditingInfo(false)}
          onSaved={(a) => {
            setEditingInfo(false);
            onChanged(a);
          }}
        />
      )}
    </div>
  );
}

export default function AdminGalleryPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api("/api/admin/gallery", "GET");
      setAlbums(data.albums);
      setCategories(data.categories);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const open = albums.find((a) => a.id === openId);

  return (
    <div className="p-4 sm:p-8 space-y-5 max-w-6xl w-full mx-auto">
      {open ? (
        <AlbumWorkspace
          album={open}
          categories={categories}
          onBack={() => setOpenId(null)}
          onChanged={(a) => setAlbums((list) => list.map((x) => (x.id === a.id ? a : x)))}
          onDeleted={(title) => {
            setOpenId(null);
            setNotice(`"${title}" deleted.`);
            void load();
          }}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Gallery</h1>
              <p className="text-xs text-slate-500 mt-0.5">Create albums, add photos and publish them to /gallery.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => void load()} disabled={loading} className={ghost} title="Refresh">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button onClick={() => setCreating(true)} className={`${primary} flex-1 sm:flex-none`}>
                <Plus className="w-4 h-4" /> New album
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {notice && (
            <div role="status" className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between gap-2">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
          )}

          {!loading && albums.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-3xl border border-slate-200">
              <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No albums yet. Create the first one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {albums.map((a) => (
                <button key={a.id} type="button" onClick={() => setOpenId(a.id)} className="text-left bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                  <div className="aspect-[16/10] bg-slate-100 flex items-center justify-center">
                    {thumb(a.coverUrl) ? <img loading="lazy" decoding="async" src={thumb(a.coverUrl)!} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-10 h-10 text-slate-300" />}
                  </div>
                  <div className="p-4 space-y-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.isPublished ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{a.isPublished ? "PUBLISHED" : "NOT PUBLISHED"}</span>
                    <p className="text-sm font-bold text-slate-900 break-words">{a.title}</p>
                    <p className="text-[11px] text-slate-500">{a.category}{a.year ? ` · ${a.year}` : ""} · {a.photos.length} photos</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {creating && (
        <AlbumForm
          album={null}
          categories={categories}
          onClose={() => setCreating(false)}
          onSaved={(a) => {
            setCreating(false);
            setAlbums((list) => [a, ...list]);
            setOpenId(a.id);
          }}
        />
      )}
    </div>
  );
}
