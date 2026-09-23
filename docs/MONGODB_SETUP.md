# MongoDB & MongoDB Compass Guide

**SSGHS Alumni Association**
(Sabuj Shikshayatan Government High School, Chattogram)

This guide explains how to configure, connect, seed, and inspect the **SSGHS Alumni Association** database using **MongoDB Compass**.

---

## 🍃 1. Overview

The platform uses **MongoDB** as its primary document database via **Prisma ORM** (`provider = "mongodb"`). 

When you run the seed script or interact with the platform, all documents are structured into native BSON/JSON collections under the **`sshs_alumni`** database, fully visible and queryable in **MongoDB Compass**.

---

## 🛠️ 2. Prerequisites

1. **MongoDB Server**:
   - **Local**: [MongoDB Community Server](https://www.mongodb.com/try/download/community) installed and running locally on port `27017`.
   - **OR Cloud**: A free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. **MongoDB Compass**:
   - Download the official GUI from [https://www.mongodb.com/products/tools/compass](https://www.mongodb.com/products/tools/compass).

---

## 🔌 3. Connection Strings

Create or update your `.env` file in the project root:

### For Local MongoDB:
```env
DATABASE_URL="mongodb://localhost:27017/sshs_alumni"
```

### For MongoDB Atlas (Cloud Cluster):
```env
DATABASE_URL="mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/sshs_alumni?retryWrites=true&w=majority"
```

---

## 🌱 4. Seeding Data into MongoDB

To populate the database with realistic Bangladeshi alumni profiles, batches from 1985 to 2025, events, donation campaigns, news, and gallery records:

```bash
# Push Prisma schema to MongoDB (creates collection indexes)
npx prisma db push

# Run the MongoDB seeder
npm run db:seed
```

---

## 🧭 5. Connecting with MongoDB Compass

1. Launch **MongoDB Compass**.
2. In the connection window, enter your connection string:
   - For local: `mongodb://localhost:27017`
   - For Atlas: paste your SRV connection string.
3. Click **Connect**.
4. In the left-hand navigation pane, select the **`sshs_alumni`** database.

---

## 📂 6. Collections in MongoDB Compass

You will see the following collections under `sshs_alumni`:

| Collection Name | Description | Key Fields to Inspect |
| :--- | :--- | :--- |
| **`User`** | System user accounts and authentication credentials. | `email`, `role` (`SUPER_ADMIN`, `ADMIN`, `ALUMNI`), `status` |
| **`AlumniProfile`** | Detailed biographical and school data for each alumnus. | `fullName`, `sscBatch`, `rollNumber`, `profession`, `company`, `locationCity`, `verificationStatus` (`VERIFIED`, `PENDING`) |
| **`Batch`** | SSC graduation batches from 1985 to 2025. | `year`, `name`, `totalAlumni`, `classRepresentative` |
| **`Event`** | School reunions, tournaments, and webinars. | `title`, `category`, `date`, `venue`, `attendeeCount` |
| **`EventRegistration`** | RSVP records of alumni attending events. | `eventId`, `userId`, `registeredAt`, `status` |
| **`Post`** | Community social feed posts. | `authorId`, `content`, `images`, `likesCount`, `batchTag` |
| **`Comment`** | Comments on community posts. | `postId`, `authorId`, `content`, `createdAt` |
| **`DonationCampaign`** | Giving Back fundraising projects. | `title`, `goalAmount`, `raisedAmount`, `donorCount`, `category` |
| **`DonationTransaction`** | Transparent donation ledger entries. | `campaignId`, `donorName`, `amount`, `paymentMethod` (bKash, Nagad, Card) |
| **`AlumniStory`** | Inspiring editorial stories of successful alumni. | `title`, `author`, `batch`, `profession`, `content` |
| **`Achievement`** | Hall of fame entries across professional categories. | `recipientName`, `category`, `awardTitle`, `year` |
| **`GalleryAlbum`** & **`GalleryPhoto`** | School memory albums and nostalgic photographs. | `albumName`, `category` (Reunions, Old Days, Sports), `imageUrl`, `caption` |
| **`VerificationRequest`** | Admin queue for verifying alumni graduation records. | `userId`, `sscBatch`, `proofDocumentUrl`, `status`, `reviewedBy` |
