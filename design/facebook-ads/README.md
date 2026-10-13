# Golden Jubilee — Facebook / Instagram ads

## The registration link

Use **`https://<your-domain>/jubilee`** in every ad and post. It opens a page for the Golden Jubilee only:
the date, place and fees, three steps, and the registration form on the same page (no menu to wander off to).
It is built light for phones on mobile data.

Add tags to the link so the committee can see where members came from:

| Where | Link |
|---|---|
| Facebook ad | `/jubilee?utm_source=facebook&utm_campaign=jubilee2026` |
| Instagram ad | `/jubilee?utm_source=instagram&utm_campaign=jubilee2026` |
| Facebook page post | `/jubilee?utm_source=fb-page` |
| WhatsApp / Messenger groups | `/jubilee?utm_source=whatsapp` |
| A second ad (to compare) | `/jubilee?utm_source=facebook&utm_campaign=jubilee-video` |

Every registration made through the page is saved with its tag (for example `facebook/jubilee2026`;
without a tag: `jubilee-link`). Admins see it as **"via facebook/jubilee2026"** in Admin → Events →
Golden Jubilee → registrations, and in the **Source** column of the CSV export.

## Ad images

| File | Use |
|---|---|
| `jubilee-feed-1080x1080.jpg` | Facebook and Instagram feed (square) |
| `jubilee-story-1080x1920.jpg` | Stories and Reels (the top and bottom 250 px are kept clear for the app's buttons) |

To change the text or the fee, edit `make_ads.py` and run `python design/facebook-ads/make_ads.py`
(Windows, uses Microsoft Edge for the Bangla text).

## Suggested ad text

**Primary text:**
সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়ের ৫০ বছর পূর্তি — সুবর্ণ জয়ন্তী ২০২৬। শনিবার, ২৬ ডিসেম্বর, বিদ্যালয় প্রাঙ্গণে সকল প্রাক্তন শিক্ষার্থীকে সপরিবারে আমন্ত্রণ। অনলাইনে রেজিস্ট্রেশন করুন, বিকাশ বা নগদে ফি দিন।

**Headline:** সুবর্ণ জয়ন্তী ২০২৬ — রেজিস্ট্রেশন চলছে
**Button:** Sign up (রেজিস্ট্রেশন)

Check the fee and the deadline in the text against Admin → Events before publishing.
