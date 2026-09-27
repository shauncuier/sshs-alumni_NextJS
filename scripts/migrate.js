// scripts/migrate.js — Direct MySQL migration (no Prisma CLI needed)
const mysql = require("mysql2/promise");
require("dotenv").config({ path: ".env" });

const DB_URL = process.env.DATABASE_URL;

const SQL = `
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS \`User\` (
  \`id\`          VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  \`email\`       VARCHAR(191) NOT NULL,
  \`passwordHash\` TEXT        NOT NULL,
  \`role\`        ENUM('SUPER_ADMIN','ADMIN','MODERATOR','ALUMNI') NOT NULL DEFAULT 'ALUMNI',
  \`status\`      ENUM('PENDING','VERIFIED','REJECTED')           NOT NULL DEFAULT 'PENDING',
  \`createdAt\`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`User_email_key\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`AlumniProfile\` (
  \`id\`                 VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  \`userId\`             VARCHAR(36)  NOT NULL,
  \`fullName\`           VARCHAR(191) NOT NULL,
  \`sscBatch\`           INT          NOT NULL,
  \`graduationYear\`     INT          NOT NULL,
  \`rollNumber\`         VARCHAR(191),
  \`section\`            VARCHAR(191),
  \`gender\`             VARCHAR(191),
  \`profession\`         VARCHAR(191) NOT NULL,
  \`company\`            VARCHAR(191),
  \`industry\`           VARCHAR(191),
  \`locationCity\`       VARCHAR(191) NOT NULL,
  \`locationCountry\`    VARCHAR(191) NOT NULL,
  \`bio\`                TEXT,
  \`avatarUrl\`          VARCHAR(500),
  \`coverUrl\`           VARCHAR(500),
  \`phone\`              VARCHAR(191),
  \`isPhonePublic\`      TINYINT(1)   NOT NULL DEFAULT 0,
  \`isEmailPublic\`      TINYINT(1)   NOT NULL DEFAULT 0,
  \`skills\`             JSON         NOT NULL DEFAULT (JSON_ARRAY()),
  \`linkedin\`           VARCHAR(500),
  \`facebook\`           VARCHAR(500),
  \`github\`             VARCHAR(500),
  \`website\`            VARCHAR(500),
  \`schoolMemories\`     TEXT,
  \`contributions\`      TEXT,
  \`verificationStatus\` ENUM('PENDING','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING',
  \`createdAt\`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`AlumniProfile_userId_key\` (\`userId\`),
  CONSTRAINT \`AlumniProfile_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`Batch\` (
  \`id\`                  VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  \`year\`                INT          NOT NULL,
  \`name\`                VARCHAR(191) NOT NULL,
  \`tagline\`             VARCHAR(500),
  \`totalMembers\`        INT          NOT NULL DEFAULT 0,
  \`classRepresentative\` VARCHAR(191),
  \`representativePhone\` VARCHAR(191),
  \`reunionDate\`         DATETIME(3),
  \`reunionCount\`        INT          NOT NULL DEFAULT 0,
  \`coverImage\`          VARCHAR(500),
  \`description\`         TEXT,
  \`createdAt\`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`Batch_year_key\` (\`year\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`Post\` (
  \`id\`            VARCHAR(36) NOT NULL DEFAULT (UUID()),
  \`authorId\`      VARCHAR(36) NOT NULL,
  \`batchTag\`      INT,
  \`content\`       TEXT        NOT NULL,
  \`images\`        JSON        NOT NULL DEFAULT (JSON_ARRAY()),
  \`likesCount\`    INT         NOT NULL DEFAULT 0,
  \`commentsCount\` INT         NOT NULL DEFAULT 0,
  \`isPinned\`      TINYINT(1)  NOT NULL DEFAULT 0,
  \`createdAt\`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`Post_authorId_fkey\` FOREIGN KEY (\`authorId\`) REFERENCES \`User\` (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`Comment\` (
  \`id\`        VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  \`postId\`    VARCHAR(36)  NOT NULL,
  \`authorId\`  VARCHAR(36)  NOT NULL,
  \`content\`   TEXT         NOT NULL,
  \`createdAt\` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`Comment_postId_fkey\`   FOREIGN KEY (\`postId\`)   REFERENCES \`Post\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`Comment_authorId_fkey\` FOREIGN KEY (\`authorId\`) REFERENCES \`User\` (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`Event\` (
  \`id\`                 VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  \`slug\`               VARCHAR(191) NOT NULL,
  \`title\`              VARCHAR(191) NOT NULL,
  \`category\`           ENUM('REUNION','SPORTS','WEBINAR','CULTURAL','COMMUNITY') NOT NULL DEFAULT 'REUNION',
  \`description\`        TEXT         NOT NULL,
  \`date\`               DATETIME(3)  NOT NULL,
  \`time\`               VARCHAR(191),
  \`venue\`              VARCHAR(500) NOT NULL,
  \`locationCity\`       VARCHAR(191) NOT NULL DEFAULT 'Dhaka',
  \`organizer\`          VARCHAR(191),
  \`bannerImage\`        VARCHAR(500),
  \`bannerUrl\`          VARCHAR(500),
  \`maxAttendees\`       INT          NOT NULL DEFAULT 500,
  \`totalSeats\`         INT          NOT NULL DEFAULT 500,
  \`confirmedSeats\`     INT          NOT NULL DEFAULT 0,
  \`attendeesCount\`     INT          NOT NULL DEFAULT 0,
  \`registrationFee\`    DOUBLE       NOT NULL DEFAULT 0,
  \`isRegistrationOpen\` TINYINT(1)   NOT NULL DEFAULT 1,
  \`createdAt\`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`Event_slug_key\` (\`slug\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`EventRegistration\` (
  \`id\`             VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  \`eventId\`        VARCHAR(36)  NOT NULL,
  \`userId\`         VARCHAR(36)  NOT NULL,
  \`guestCount\`     INT          NOT NULL DEFAULT 1,
  \`mealPreference\` VARCHAR(191),
  \`notes\`          TEXT,
  \`createdAt\`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`EventRegistration_eventId_fkey\` FOREIGN KEY (\`eventId\`) REFERENCES \`Event\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`EventRegistration_userId_fkey\`  FOREIGN KEY (\`userId\`)  REFERENCES \`User\`  (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`DonationCampaign\` (
  \`id\`           VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  \`slug\`         VARCHAR(191) NOT NULL,
  \`title\`        VARCHAR(191) NOT NULL,
  \`category\`     ENUM('SCHOLARSHIP','STEM_LAB','LIBRARY','EMERGENCY_AID','CAMPUS_DEV') NOT NULL DEFAULT 'SCHOLARSHIP',
  \`description\`  TEXT         NOT NULL,
  \`goalAmount\`   DOUBLE       NOT NULL DEFAULT 0,
  \`targetAmount\` DOUBLE       NOT NULL DEFAULT 0,
  \`raisedAmount\` DOUBLE       NOT NULL DEFAULT 0,
  \`donorCount\`   INT          NOT NULL DEFAULT 0,
  \`bannerImage\`  VARCHAR(500),
  \`imageUrl\`     VARCHAR(500),
  \`isActive\`     TINYINT(1)   NOT NULL DEFAULT 1,
  \`startDate\`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`endDate\`      DATETIME(3),
  \`createdAt\`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`DonationCampaign_slug_key\` (\`slug\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`Donation\` (
  \`id\`             VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  \`campaignId\`     VARCHAR(36)  NOT NULL,
  \`userId\`         VARCHAR(36),
  \`donorName\`      VARCHAR(191) NOT NULL,
  \`donorEmail\`     VARCHAR(191),
  \`donorPhone\`     VARCHAR(191),
  \`donorBatch\`     INT,
  \`amount\`         DOUBLE       NOT NULL,
  \`paymentMethod\`  VARCHAR(191) NOT NULL,
  \`paymentGateway\` ENUM('BKASH','NAGAD','SSLCOMMERZ','BANK_TRANSFER','MANUAL') NOT NULL DEFAULT 'BKASH',
  \`paymentStatus\`  ENUM('INITIATED','PENDING','COMPLETED','FAILED','CANCELLED','REFUNDED') NOT NULL DEFAULT 'INITIATED',
  \`isAnonymous\`    TINYINT(1)   NOT NULL DEFAULT 0,
  \`transactionRef\` VARCHAR(191),
  \`gatewayTrxId\`   VARCHAR(191),
  \`receiptId\`      VARCHAR(191),
  \`receiptUrl\`     VARCHAR(500),
  \`paidAt\`         DATETIME(3),
  \`failureReason\`  TEXT,
  \`ipnPayload\`     TEXT,
  \`createdAt\`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`Donation_campaignId_fkey\` FOREIGN KEY (\`campaignId\`) REFERENCES \`DonationCampaign\` (\`id\`),
  CONSTRAINT \`Donation_userId_fkey\`     FOREIGN KEY (\`userId\`)     REFERENCES \`User\`             (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`PaymentTransaction\` (
  \`id\`                VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  \`donationId\`        VARCHAR(36)  NOT NULL,
  \`gateway\`           ENUM('BKASH','NAGAD','SSLCOMMERZ','BANK_TRANSFER','MANUAL') NOT NULL,
  \`gatewaySessionKey\` VARCHAR(500),
  \`gatewayTrxId\`      VARCHAR(191),
  \`amount\`            DOUBLE       NOT NULL,
  \`currency\`          VARCHAR(10)  NOT NULL DEFAULT 'BDT',
  \`status\`            ENUM('INITIATED','PENDING','COMPLETED','FAILED','CANCELLED','REFUNDED') NOT NULL DEFAULT 'INITIATED',
  \`initiatedAt\`       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`completedAt\`       DATETIME(3),
  \`gatewayResponse\`   TEXT,
  \`callbackPayload\`   TEXT,
  \`errorCode\`         VARCHAR(191),
  \`errorMessage\`      TEXT,
  \`customerMsisdn\`    VARCHAR(191),
  \`merchantInvoice\`   VARCHAR(191),
  \`createdAt\`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`PaymentTransaction_donationId_key\` (\`donationId\`),
  CONSTRAINT \`PaymentTransaction_donationId_fkey\` FOREIGN KEY (\`donationId\`) REFERENCES \`Donation\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`NewsArticle\` (
  \`id\`            VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  \`title\`         VARCHAR(191) NOT NULL,
  \`category\`      VARCHAR(191) NOT NULL,
  \`excerpt\`       TEXT         NOT NULL,
  \`content\`       LONGTEXT     NOT NULL,
  \`featuredImage\` VARCHAR(500),
  \`author\`        VARCHAR(191) NOT NULL,
  \`publishedAt\`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`isFeatured\`    TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`AlumniStory\` (
  \`id\`          VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  \`title\`       VARCHAR(191) NOT NULL,
  \`authorName\`  VARCHAR(191) NOT NULL,
  \`batchYear\`   INT          NOT NULL,
  \`profession\`  VARCHAR(191) NOT NULL,
  \`coverImage\`  VARCHAR(500),
  \`summary\`     TEXT         NOT NULL,
  \`fullStory\`   LONGTEXT     NOT NULL,
  \`quote\`       TEXT,
  \`publishedAt\` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`Achievement\` (
  \`id\`            VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  \`recipientName\` VARCHAR(191) NOT NULL,
  \`batchYear\`     INT          NOT NULL,
  \`category\`      VARCHAR(191) NOT NULL,
  \`title\`         VARCHAR(191) NOT NULL,
  \`organization\`  VARCHAR(191) NOT NULL,
  \`description\`   TEXT         NOT NULL,
  \`photoUrl\`      VARCHAR(500),
  \`yearAwarded\`   INT          NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`GalleryAlbum\` (
  \`id\`          VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  \`title\`       VARCHAR(191) NOT NULL,
  \`category\`    VARCHAR(191) NOT NULL,
  \`description\` TEXT,
  \`coverUrl\`    VARCHAR(500) NOT NULL,
  \`photosCount\` INT          NOT NULL DEFAULT 0,
  \`createdAt\`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`GalleryPhoto\` (
  \`id\`         VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  \`albumId\`    VARCHAR(36)  NOT NULL,
  \`imageUrl\`   VARCHAR(500) NOT NULL,
  \`caption\`    VARCHAR(500),
  \`uploadedBy\` VARCHAR(191),
  \`batchYear\`  INT,
  \`createdAt\`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`GalleryPhoto_albumId_fkey\` FOREIGN KEY (\`albumId\`) REFERENCES \`GalleryAlbum\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`Message\` (
  \`id\`         VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  \`senderId\`   VARCHAR(36)  NOT NULL,
  \`receiverId\` VARCHAR(36)  NOT NULL,
  \`content\`    TEXT         NOT NULL,
  \`isRead\`     TINYINT(1)   NOT NULL DEFAULT 0,
  \`createdAt\`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`Message_senderId_fkey\`   FOREIGN KEY (\`senderId\`)   REFERENCES \`User\` (\`id\`),
  CONSTRAINT \`Message_receiverId_fkey\` FOREIGN KEY (\`receiverId\`) REFERENCES \`User\` (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`Notification\` (
  \`id\`        VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  \`userId\`    VARCHAR(36)  NOT NULL,
  \`title\`     VARCHAR(191) NOT NULL,
  \`message\`   TEXT         NOT NULL,
  \`link\`      VARCHAR(500),
  \`isRead\`    TINYINT(1)   NOT NULL DEFAULT 0,
  \`type\`      VARCHAR(191) NOT NULL,
  \`createdAt\` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`Notification_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`Announcement\` (
  \`id\`        VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  \`title\`     VARCHAR(191) NOT NULL,
  \`content\`   TEXT         NOT NULL,
  \`priority\`  VARCHAR(50)  NOT NULL DEFAULT 'NORMAL',
  \`author\`    VARCHAR(191) NOT NULL DEFAULT 'Alumni Executive Committee',
  \`isActive\`  TINYINT(1)   NOT NULL DEFAULT 1,
  \`createdAt\` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`VerificationRequest\` (
  \`id\`               VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  \`userId\`           VARCHAR(36)  NOT NULL,
  \`sscBatch\`         INT          NOT NULL,
  \`rollNumber\`       VARCHAR(191),
  \`proofDocumentUrl\` VARCHAR(500),
  \`status\`           ENUM('PENDING','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING',
  \`reviewedBy\`       VARCHAR(191),
  \`reviewNotes\`      TEXT,
  \`createdAt\`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`VerificationRequest_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1
`;

async function migrate() {
  console.log("Connecting to MySQL...");
  const conn = await mysql.createConnection(DB_URL);
  const statements = SQL.split(";").map(s => s.trim()).filter(s => s.length > 0);
  let created = 0;
  for (const stmt of statements) {
    try {
      await conn.execute(stmt);
      const match = stmt.match(/CREATE TABLE IF NOT EXISTS `(\w+)`/);
      if (match) { console.log("  OK Table:", match[1]); created++; }
    } catch (err) {
      console.error("  ERR:", err.message, "->", stmt.slice(0, 60));
    }
  }
  await conn.end();
  console.log("Done —", created, "tables created/verified.");
}

migrate().catch(e => { console.error("Migration failed:", e.message); process.exit(1); });
