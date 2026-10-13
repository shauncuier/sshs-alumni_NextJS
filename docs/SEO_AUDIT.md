# SEO audit — SSGHS Alumni Association website

*13 October 2026. Audited: the site on the local development server (no public domain yet), all 19 public pages in the sitemap plus /login, /register, /contact, /volunteer, /donate. Search landscape: web search (English and Bangla). No SEO tool (Ahrefs / Semrush) is connected, so search volumes are relative estimates, not numbers; connect one for exact volume and difficulty.*

---

## Executive summary

The technical foundation is good: every public page has a unique title and a description, exactly one H1 (except two pages), share images, a sitemap, a robots file and fast server rendering. **The biggest strength is the niche itself:** nobody owns "Sabuj Shikshayatan alumni" or "সবুজ শিক্ষায়তন সুবর্ণ জয়ন্তী ২০২৬" in search today: the results are Facebook posts, directory listings and an unrelated Kolkata school. The school's own Facebook page is already promoting the জুবিলি to ex-students with strong engagement, so demand is coming.

**Top 3 priorities:**
1. **The Golden Jubilee page is invisible to search engines and link previews' crawlers that do not run JavaScript**: its HTML contains 18 words and no heading ("Loading event…"). It is the page people will search for and share.
2. **Almost no Bangla text** on a site whose audience searches in Bangla (সবুজ শিক্ষায়তন, সুবর্ণ জয়ন্তী, প্রাক্তন ছাত্র-ছাত্রী পরিষদ), and the older school name people actually search ("Sabuj Shikshayatan **High School**", Hafiz Jute Mills, EIIN 105070) is barely present.
3. **No structured data and no canonical URLs**: an `Event` schema for the Jubilee and an `Organization` schema for the association are the cheapest way to get rich results (date, place, price) in Google.

**Overall: strong foundation, needs work** — mostly content and a few quick technical fixes, all before launch. Nothing is indexed yet (no domain), which is the best time to fix these.

---

## Keyword opportunity table

Volumes are relative (local, niche queries: low absolute volume, but very low competition and high intent). Current ranking: none of these can rank yet; the site is not public.

| Keyword | Est. difficulty | Opportunity | Current ranking | Intent | Recommended content |
|---|---|---|---|---|---|
| সবুজ শিক্ষায়তন সুবর্ণ জয়ন্তী ২০২৬ | Easy (only Facebook) | **High** | Not live | Transactional | Event page with Bangla title, description and body |
| Sabuj Shikshayatan golden jubilee 2026 | Easy | **High** | Not live | Transactional | Event page (English) |
| Sabuj Shikshayatan alumni association | Very easy (no real result) | **High** | Not live | Navigational | Home page title / H1 |
| সবুজ শিক্ষায়তন প্রাক্তন ছাত্র-ছাত্রী পরিষদ | Very easy | **High** | Not live | Navigational | Home / About in Bangla (the association's Bangla name on its crest) |
| সুবর্ণ জয়ন্তী রেজিস্ট্রেশন সবুজ শিক্ষায়তন | Easy | **High** | Not live | Transactional | Registration guide (how to pay, TrxID, what's included) |
| Sabuj Shikshayatan High School (older name) | Moderate (FB, directories, school site) | **High** | Not live | Navigational | School page: both names, history |
| সবুজ শিক্ষায়তন উচ্চ বিদ্যালয় / সরকারি উচ্চ বিদ্যালয় | Moderate | **High** | Not live | Navigational | Bangla school page |
| Sabuj Shikshayatan Government High School alumni | Easy | High | Not live | Navigational | Home / About |
| Sabuj Shikshayatan SSC batch 1998 (any year) | Very easy | Medium | Not live | Navigational | Batch pages with own titles |
| হাফিজ জুট মিলস সবুজ শিক্ষায়তন | Easy | Medium | Not live | Navigational | School page: location text |
| EIIN 105070 | Moderate (directories) | Medium | Not live | Navigational | School page facts |
| সবুজ শিক্ষায়তন সরকারি হলো (2025 nationalisation) | Easy (news sites) | Medium | Not live | Informational | News article |
| Sabuj Shikshayatan school history / ইতিহাস | Easy | Medium | Not live | Informational | School history page (pillar) |
| how to pay golden jubilee registration bKash | Easy | Medium | Not live | Question | FAQ on the event page |
| সুবর্ণ জয়ন্তী স্মারকগ্রন্থ লেখা আহবান | Easy | Medium | Not live | Informational | Notice / news post |
| Sitakunda school alumni / সীতাকুণ্ড প্রাক্তন শিক্ষার্থী | Moderate | Medium | Not live | Informational | About page |
| Sabuj Shikshayatan photos / gallery | Easy (images) | Medium | Not live | Navigational | Gallery with descriptive captions and alt text |
| Sabuj Shikshayatan teachers honoured | Easy | Low | Not live | Informational | Story / news after the event |
| Sitakunda alumni jobs / mentorship | Moderate | Low | Not live | Commercial | Careers & mentorship pages |
| Sabuj Shikshayatan donate / scholarship | Easy | Low | Not live | Transactional | Donate page with a real campaign |

---

## On-page issues

| Page | Issue | Severity | Recommended fix |
|---|---|---|---|
| /events/golden-jubilee-… | Body is rendered only in the browser: server HTML has 18 words, no H1, no links ("Loading event…") | **Critical** | Render the event on the server (data fetched in the page, interactive parts as client components) |
| /events/golden-jubilee-… | Title 90 characters (cut off in results); description is only the subtitle (65 chars) | High | Title ≈ "Golden Jubilee 2026 · সুবর্ণ জয়ন্তী — Sabuj Shikshayatan" (≤ 60); description with date, place, price, "register online" |
| /batches/[year] | Every batch page has the **site default title and description** (duplicates) | High | `generateMetadata`: "SSC Batch 2014 — Sabuj Shikshayatan alumni", with member count |
| /batches, /about | Description is the old site-wide boilerplate ("Official digital ecosystem…") | High | Own descriptions |
| All pages | Title template "\| SSGHS Alumni Association" — nobody searches "SSGHS" | High | Template "\| Sabuj Shikshayatan Alumni" (keep SSGHS in body text) |
| / | Title 68 characters | Medium | "Sabuj Shikshayatan Alumni Association · Sitakunda" (≈ 50) |
| /achievements, /contact, /volunteer, /login | Descriptions 29–48 characters | Medium | 120–155 characters with a call to action |
| /school | Does not mention the older name "Sabuj Shikshayatan High School", Hafiz Jute Mills, South Sonaichhari in body text people search for | Medium | Add a short facts block (names, EIIN, founded 1 Jan 1976, government since July 2025, address) |
| /login | No H1; indexable | Medium | `robots: noindex`; drop it from the sitemap |
| All pages | `lang="en"` only; Bangla names appear only in a few headings | Medium | Bangla copy on key pages (see strategic plan) |
| / | 4 images with empty alt (decorative: fine); member avatars use names (good) | Low | Keep empty alt only for decoration |
| /news, /stories, /gallery, /achievements | ~290 words: no published content yet (empty database) | Low (now) | Publish real content before launch |

---

## Content gap recommendations

| Topic / keyword | Why it matters | Format | Priority | Effort |
|---|---|---|---|---|
| Golden Jubilee registration guide (Bangla + English): who can join, fees (৳1,500 / spouse ৳700 / child ৳500), how to pay by bKash/Nagad/Bangla QR, entering the TrxID, what's included, deadline | The highest-intent query this season; competitor sites (nphs-alumni.com) have a dedicated "Registration Guide" page | Guide page + FAQ schema | **High** | Moderate (half day) |
| School history & facts: both names, founded 1976, government school since 2025, EIIN, location, headmasters over the years | Owns the navigational queries for the school name; the pillar every other page links to | Pillar page (Bangla + English) | **High** | Substantial (needs the committee's facts) |
| সুবর্ণ জয়ন্তী news & notices: programme announcement, souvenir writing call, deadline reminders | Fresh, shareable, linkable from Facebook | News posts (Bangla) | **High** | Quick win each (1–2 h) |
| Batch pages with real content: representative, photo, member count, reunion notes | 50 long-tail entry points ("SSC 1998 Sabuj Shikshayatan") | Batch page template | Medium | Moderate |
| "School nationalised in 2025" article | News sites rank for it; the association can own the alumni angle | News post | Medium | Quick win |
| Teachers' tribute (after the event) | Emotional, highly shared content; earns links | Story series | Medium | Moderate |
| Event photo gallery with captions | Image search, social sharing | Gallery albums | Medium | Moderate (after the event) |
| Member success stories | Builds depth and returning visitors | Stories | Low | Ongoing |

Funnel: **awareness** (school history, news) and **decision** (registration guide, FAQ) are the gaps; the consideration step (event page) exists but is not crawlable.

---

## Technical SEO checklist

| Check | Status | Details |
|---|---|---|
| Server-rendered HTML | Warning | Most pages render on the server; the **event page, events list and directory** render their main content only in the browser |
| Page speed | Pass (likely) | Production build: pages answered in 0.02–1.7 s locally; images served as WebP via next/image; run Lighthouse on the live domain |
| Mobile-friendliness | Pass | Responsive layout, viewport set, 16 px form fields, phone bottom bar |
| robots.txt | Pass | Allows the site; blocks /admin, /api, /settings, /dashboard; points to the sitemap |
| XML sitemap | Warning | Present and refreshes hourly; **missing** /careers, /mentorship, /volunteer; **includes** /login (should be noindex) |
| Canonical tags | Fail | None on any page; add `alternates.canonical` per page |
| Structured data | Fail | No JSON-LD anywhere; add `Organization` (association), `Event` (Jubilee: date, location, offers, organizer), `BreadcrumbList`, `FAQPage` on the guide |
| Open Graph / Twitter | Pass | Title, description, image (the new 2752×1536 banner), summary_large_image |
| HTTPS | Pending | Enforced in production (HSTS header ready); domain not bought yet |
| Indexation controls | Warning | Admin-only /presentation is noindex (good); /login and /register (thin) should be considered |
| Duplicate content | Fail | All batch pages share one title and description |
| Language / hreflang | Warning | `lang="en"` only; Bangla content would need `lang="bn"` sections or a Bangla version with hreflang |
| Broken links | Pass | Crawl found no 404s among internal links; unknown routes return 404 |
| Core Web Vitals | Unknown | Measure on the live domain (CrUX needs real traffic); the hero image loads eagerly with high priority (good for LCP) |

---

## Competitor comparison

Benchmarked against two Bangladeshi school alumni sites built for a jubilee: **nphs-alumni.com** (Natuarpara K.B. ML High School, Golden Jubilee 2026) and **shsalumniassociation.com** (Shatakhali High School, Silver Jubilee). Backlink and keyword counts need an SEO tool; observations below are from their public pages.

| Dimension | SSGHS (yours) | nphs-alumni.com | shsalumniassociation.com | Winner |
|---|---|---|---|---|
| Keyword targeting in titles | Brand "SSGHS" (not searched) | School name in title and keywords | School name + "Silver Jubilee 25 Years" in title | Shatakhali |
| Bangla support | Very little | Little | **Bangla / English switch** (`bn_BD` alternate) | Shatakhali |
| Event / registration content | Rich (packages, guests, tickets, gate scanner) but not crawlable | Registration, guide, status check, registered list | Event page, notices, registration manual | Yours (features), theirs (crawlable) |
| Content depth | Many sections, little content yet | Purpose, members, batch representatives, gallery | About, notices, members, gallery | Even |
| Publishing frequency | None yet | Event-driven | Notices + gallery (Sept 2026) | Shatakhali |
| Technical score | Strong (modern stack, security headers, PWA) minus SSR gaps | Basic PHP site | Robots meta, OG, locale alternates | Yours (after fixes) |
| Structured data / SERP features | None | None seen | None seen | Nobody: an open door |
| Backlink signals | None (not live) | Facebook group, YouTube | Facebook page | Them (for now) |

**Takeaway:** competitors win on being live and crawlable with notices and a registration guide, not on quality. Your site is ahead on features; fix crawlability and Bangla content and it should outrank them for its own school name quickly.

---

## Prioritized action plan

### Quick wins (this week, before launch)

| What to do | Impact | Effort | Depends on |
|---|---|---|---|
| Title template "\| Sabuj Shikshayatan Alumni"; home title ≤ 60 chars | High | 15 min | — |
| `generateMetadata` for batch pages (own title + description) | High | 30 min | — |
| Own descriptions for /about, /batches, and 120–155 chars for short ones | Medium | 30 min | — |
| `Event` JSON-LD on the Jubilee page (name in both languages, date, place, offers ৳1,500, organizer) | High | 1 h | — |
| `Organization` JSON-LD in the root layout (association, logo, email, sameAs: school site + Facebook page) | Medium | 30 min | Facebook page URL from the committee |
| Canonical URLs on every page (`alternates.canonical`) | Medium | 30 min | — |
| Sitemap: add /careers, /mentorship, /volunteer; drop /login; `noindex` on /login | Medium | 20 min | — |
| School facts block: both names, founded 1 Jan 1976, government since 2025, EIIN 105070, Hafiz Jute Mills, South Sonaichhari | High | 1 h | Committee confirms facts |

### Strategic investments (this quarter)

| What to do | Impact | Effort | Depends on |
|---|---|---|---|
| Render the event page (and events list, directory list) on the server | **High** | 1 day | — |
| Bangla content on home, school, event and registration guide (Bangla headings, descriptions, body; `lang="bn"` on Bangla blocks) | **High** | 2–3 days | Bangla copy from the committee |
| Jubilee registration guide + FAQ (`FAQPage` schema) | High | Half day | Final payment numbers |
| Get links from the school's official site (sabujsghs.edu.bd) and its Facebook page (the jubilee post already reaches thousands) | **High** | Outreach | Domain live |
| Search Console + Bing Webmaster: verify the domain, submit the sitemap, watch indexing | High | 1 h | Domain live |
| Weekly Bangla news/notices until the event (programme, souvenir call, deadline) | Medium | 1–2 h each | — |
| School history pillar page linking to batches, events, stories | Medium | Multi-day | Committee's history |
| After the event: gallery albums, teachers' tribute story, results | Medium | Ongoing | Event held |
