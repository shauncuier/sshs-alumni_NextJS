import type { GalleryAlbum, GalleryPhoto } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import type { GalleryPhotoItem } from "@/lib/data";
import { contentImageId, removeContentImage, thumbUrlFor } from "@/lib/media/content-images";

/**
 * Photo albums: created and published by admins in /admin/gallery, shown on
 * /gallery and the homepage. Photos must be images uploaded through
 * /api/admin/media; deleting a photo or album removes its files from disk.
 */

export const GALLERY_CATEGORIES = ["School Memories", "Old Campus", "Reunions", "Sports", "Teachers", "Cultural Events"] as const;
export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];
export const MAX_PHOTOS_PER_ALBUM = 300;

export interface AdminGalleryPhoto {
  id: string;
  imageUrl: string;
  thumbUrl: string;
  caption: string | null;
  sortOrder: number;
}

export interface AdminGalleryAlbum {
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
  photos: AdminGalleryPhoto[];
}

type AlbumWithPhotos = GalleryAlbum & { photos: GalleryPhoto[] };

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const bad = (message: string) => new AppError("INVALID_ALBUM", 400, message);

function toAdminPhoto(p: GalleryPhoto): AdminGalleryPhoto {
  return { id: p.id, imageUrl: p.imageUrl, thumbUrl: thumbUrlFor(p.imageUrl) ?? p.imageUrl, caption: p.caption, sortOrder: p.sortOrder };
}

function toAdminAlbum(a: AlbumWithPhotos): AdminGalleryAlbum {
  return {
    id: a.id,
    title: a.title,
    category: a.category,
    description: a.description,
    year: a.year,
    coverUrl: a.coverUrl ?? a.photos[0]?.imageUrl ?? null,
    isPublished: a.isPublished,
    photosCount: a.photos.length,
    updatedAt: a.updatedAt.toISOString(),
    updatedBy: a.updatedBy,
    photos: a.photos.map(toAdminPhoto),
  };
}

function toPublicPhoto(p: GalleryPhoto, album: GalleryAlbum): GalleryPhotoItem {
  return {
    id: p.id,
    albumCategory: (GALLERY_CATEGORIES as readonly string[]).includes(album.category) ? (album.category as GalleryCategory) : "Reunions",
    title: album.title,
    imageUrl: p.imageUrl,
    thumbUrl: thumbUrlFor(p.imageUrl) ?? p.imageUrl,
    year: p.batchYear ?? album.year ?? undefined,
    caption: p.caption ?? "",
    submittedBy: p.uploadedBy ?? "SSGHS Alumni Association",
  };
}

const photoOrder = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

/** Every photo in published albums, newest album first. */
export async function listPublishedPhotos(limit = 500): Promise<GalleryPhotoItem[]> {
  const albums = await prisma.galleryAlbum.findMany({
    where: { isPublished: true },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    include: { photos: { orderBy: photoOrder } },
  });
  return albums.flatMap((a) => a.photos.map((p) => toPublicPhoto(p, a))).slice(0, limit);
}

/** The newest photos from published albums, for the homepage. */
export async function latestPublishedPhotos(count: number): Promise<GalleryPhotoItem[]> {
  const rows = await prisma.galleryPhoto.findMany({
    where: { album: { isPublished: true } },
    orderBy: { createdAt: "desc" },
    take: count,
    include: { album: true },
  });
  return rows.map((p) => toPublicPhoto(p, p.album));
}

export async function listAlbumsForAdmin(): Promise<AdminGalleryAlbum[]> {
  const rows = await prisma.galleryAlbum.findMany({
    orderBy: [{ isPublished: "asc" }, { updatedAt: "desc" }],
    include: { photos: { orderBy: photoOrder } },
  });
  return rows.map(toAdminAlbum);
}

async function albumOrThrow(id: string): Promise<AlbumWithPhotos> {
  const album = await prisma.galleryAlbum.findUnique({ where: { id }, include: { photos: { orderBy: photoOrder } } });
  if (!album) throw new AppError("ALBUM_NOT_FOUND", 404, "Album not found.");
  return album;
}

export interface AlbumInput {
  title?: unknown;
  category?: unknown;
  description?: unknown;
  year?: unknown;
  coverUrl?: unknown;
  isPublished?: unknown;
}

function validateAlbum(input: AlbumInput, partial: boolean) {
  const data: Partial<Pick<GalleryAlbum, "title" | "category" | "description" | "year" | "coverUrl" | "isPublished">> = {};
  if (!partial || input.title !== undefined) {
    const title = str(input.title);
    if (title.length < 3 || title.length > 150) throw bad("The album name must be 3 to 150 characters.");
    data.title = title;
  }
  if (!partial || input.category !== undefined) {
    if (!(GALLERY_CATEGORIES as readonly string[]).includes(input.category as string)) throw bad("Please choose a category.");
    data.category = input.category as string;
  }
  if (input.description !== undefined) {
    const description = str(input.description);
    if (description.length > 2000) throw bad("Keep the description to 2000 characters or fewer.");
    data.description = description || null;
  }
  if (input.year !== undefined) {
    if (input.year === null || input.year === "") data.year = null;
    else {
      const year = Number(input.year);
      if (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear()) throw bad("Please enter a valid year.");
      data.year = year;
    }
  }
  if (input.isPublished !== undefined) data.isPublished = input.isPublished === true;
  return data;
}

export async function createAlbum(input: AlbumInput, adminEmail: string): Promise<AdminGalleryAlbum> {
  const data = validateAlbum(input, false);
  const album = await prisma.galleryAlbum.create({
    data: {
      title: data.title!,
      category: data.category!,
      description: data.description ?? null,
      year: data.year ?? null,
      isPublished: false,
      createdBy: adminEmail,
      updatedBy: adminEmail,
    },
    include: { photos: true },
  });
  return toAdminAlbum(album);
}

export async function updateAlbum(id: string, input: AlbumInput, adminEmail: string): Promise<{ album: AdminGalleryAlbum; published: boolean }> {
  const current = await albumOrThrow(id);
  const data = validateAlbum(input, true);
  if (input.coverUrl !== undefined) {
    const cover = str(input.coverUrl);
    if (cover && !current.photos.some((p) => p.imageUrl === cover)) throw bad("The cover must be one of this album's photos.");
    data.coverUrl = cover || null;
  }
  if (data.isPublished && current.photos.length === 0) throw bad("Add at least one photo before publishing the album.");
  await prisma.galleryAlbum.update({ where: { id }, data: { ...data, updatedBy: adminEmail } });
  return { album: toAdminAlbum(await albumOrThrow(id)), published: data.isPublished === true && !current.isPublished };
}

export async function deleteAlbum(id: string): Promise<AdminGalleryAlbum> {
  const current = await albumOrThrow(id);
  await prisma.galleryAlbum.delete({ where: { id } });
  await Promise.all(current.photos.map((p) => removeContentImage(p.imageUrl)));
  return toAdminAlbum(current);
}

export async function addPhoto(albumId: string, input: { imageUrl?: unknown; caption?: unknown }, adminEmail: string): Promise<AdminGalleryPhoto> {
  const album = await albumOrThrow(albumId);
  const imageUrl = str(input.imageUrl);
  if (!contentImageId(imageUrl)) throw bad("Upload the photo first.");
  if (album.photos.length >= MAX_PHOTOS_PER_ALBUM) throw bad(`An album holds at most ${MAX_PHOTOS_PER_ALBUM} photos; start a new album.`);
  const caption = str(input.caption).slice(0, 500) || null;
  const last = album.photos[album.photos.length - 1];
  const [photo] = await prisma.$transaction([
    prisma.galleryPhoto.create({
      data: { albumId, imageUrl, caption, uploadedBy: adminEmail, batchYear: album.year, sortOrder: (last?.sortOrder ?? 0) + 1 },
    }),
    prisma.galleryAlbum.update({ where: { id: albumId }, data: { photosCount: { increment: 1 }, updatedBy: adminEmail } }),
  ]);
  return toAdminPhoto(photo);
}

export async function updatePhoto(photoId: string, input: { caption?: unknown; sortOrder?: unknown }): Promise<AdminGalleryPhoto> {
  const photo = await prisma.galleryPhoto.findUnique({ where: { id: photoId } });
  if (!photo) throw new AppError("PHOTO_NOT_FOUND", 404, "Photo not found.");
  const data: { caption?: string | null; sortOrder?: number } = {};
  if (input.caption !== undefined) data.caption = str(input.caption).slice(0, 500) || null;
  if (input.sortOrder !== undefined) {
    const order = Number(input.sortOrder);
    if (!Number.isInteger(order)) throw bad("Invalid position.");
    data.sortOrder = order;
  }
  return toAdminPhoto(await prisma.galleryPhoto.update({ where: { id: photoId }, data }));
}

export async function deletePhoto(photoId: string, adminEmail: string): Promise<{ albumId: string; albumTitle: string }> {
  const photo = await prisma.galleryPhoto.findUnique({ where: { id: photoId }, include: { album: { include: { photos: true } } } });
  if (!photo) throw new AppError("PHOTO_NOT_FOUND", 404, "Photo not found.");
  const remaining = photo.album.photos.length - 1;
  await prisma.$transaction([
    prisma.galleryPhoto.delete({ where: { id: photoId } }),
    prisma.galleryAlbum.update({
      where: { id: photo.albumId },
      data: {
        photosCount: { decrement: 1 },
        updatedBy: adminEmail,
        // A cover that was this photo falls back to the first remaining photo; an empty album is unpublished.
        ...(photo.album.coverUrl === photo.imageUrl ? { coverUrl: null } : {}),
        ...(remaining === 0 ? { isPublished: false } : {}),
      },
    }),
  ]);
  await removeContentImage(photo.imageUrl);
  return { albumId: photo.albumId, albumTitle: photo.album.title };
}
