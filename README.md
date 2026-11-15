# Statio Open Website

A simple, fast website for a small business: one page in the Minimalist look (Snow), with your
name, photos, about text, team, opening hours, questions and how to reach you.

It's yours. If you use Statio, you can take your website with you at any time and put it on any
hosting. No database, no server, no JavaScript on the page.

What it doesn't do: services, prices, online booking, client lists or messages. Those are part of
Statio.

## Use it

You need [Node.js](https://nodejs.org) 20 or newer. Nothing else to install.

1. **Export from Statio**: Settings › Website › Export my website. You get `website-yourname.zip`.
2. **Import it**: `npm run import -- website-yourname.zip`
3. **Build it**: `npm run build`. Your website is in the `out` folder.
4. **Check it**: `npm run preview`, then open http://localhost:4173
5. **Publish it**: upload the `out` folder to any hosting (Netlify, Cloudflare Pages, GitHub
   Pages, Vercel, or your own web space).

With your own domain, build with `SITE_URL=https://yourdomain.com npm run build` to get a sitemap
for Google.

## Writing site.json

No Statio? Write `site/site.json` yourself and put photos in `site/photos/`.

| Field | What it is |
|---|---|
| `format` | Always `"statio-open-website/1"` |
| `locale` | The website's language, e.g. `"en"`, `"es"` |
| `name` | Your business's name (needed) |
| `tagline` | One line under the name |
| `about` | About you; leave an empty line between paragraphs |
| `solo` | `true` if you work alone ("About me", "My work") |
| `logo`, `photo` | `"photos/logo.png"`, `"photos/hero.jpg"`, or `null` |
| `gallery` | `[{ "src": "photos/1.jpg", "caption": "…" }]` |
| `team` | `[{ "name": "…", "title": "…", "photo": "photos/…" or null }]` |
| `hours` | `[{ "days": "Mon–Fri", "hours": "10:00–19:00" }]` |
| `address`, `mapsUrl` | Where you are, and a map link |
| `serviceArea` | Instead of an address, if you go to your clients |
| `phone`, `phoneDisplay` | `"+34600000000"` and how people read it |
| `whatsapp` | `true` to show a WhatsApp button on that phone |
| `email` | Your email address |
| `links` | `[{ "label": "Instagram", "url": "https://…" }]` |
| `faq` | `[{ "q": "…", "a": "…" }]` |
| `legalName`, `taxId` | Shown in the footer when filled |
| `words` | The website's words in its language, e.g. `{ "about": "Sobre nosotros" }` (English when missing) |

## Licence

Apache 2.0. The Manrope font is under the SIL Open Font License (assets/LICENSE-manrope.txt).
Statio is a trademark of its owner; this licence doesn't cover the name.
