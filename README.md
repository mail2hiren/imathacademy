# iMathAcademy Portal
> Interactive Vedic Maths & Abacus Learning Portal
> Built by Claude for mail2hiren

## Live URL (after deployment)
https://mail2hiren.github.io/imathacademy

---

## Setup Instructions

### Step 1 — Add your Supabase key
Open `js/supabase-client.js` and replace:
```
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';
```
with your actual Supabase anon key (the regenerated one saved on your phone).

### Step 2 — Push to GitHub
```bash
git init
git add .
git commit -m "Session 2: CSS foundation and Supabase client"
git branch -M main
git remote add origin https://github.com/mail2hiren/imathacademy.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages
1. Go to your GitHub repo → Settings → Pages
2. Source: Deploy from branch
3. Branch: main / root
4. Save — your site goes live at https://mail2hiren.github.io/imathacademy

---

## File Structure
```
imathacademy/
├── index.html                    ← Public homepage (Session S3)
├── login.html                    ← Login page (Session S4)
├── css/
│   ├── main.css                  ← ✅ Global styles (Session 2)
│   ├── abacus.css                ← ✅ Abacus & kids UI (Session 2)
│   └── portal.css                ← ✅ Dashboard styles (Session 2)
├── js/
│   ├── supabase-client.js        ← ✅ Database + helpers (Session 2)
│   ├── auth.js                   ← Login/session (Session S4)
│   ├── abacus-engine.js          ← Soroban logic (Session S6)
│   ├── vedic-engine.js           ← Step forms (Session S8)
│   ├── practice-engine.js        ← Adaptive practice (Session S7)
│   ├── homework.js               ← Homework system (Session S9)
│   ├── gamification.js           ← XP/badges (Session S22)
│   ├── notifications.js          ← Email via Brevo (Session S17)
│   └── razorpay.js               ← Payments (Session S18)
├── portal/
│   ├── student/
│   │   ├── dashboard.html        ← Session S5
│   │   ├── lessons.html          ← Session S10
│   │   ├── practice.html         ← Session S7
│   │   ├── homework.html         ← Session S9
│   │   └── progress.html         ← Session S16
│   ├── teacher/
│   │   ├── dashboard.html        ← Session S11
│   │   ├── classes.html          ← Session S13
│   │   ├── homework.html         ← Session S12
│   │   └── students.html         ← Session S14
│   ├── parent/
│   │   └── dashboard.html        ← Session S15
│   └── admin/
│       └── dashboard.html        ← Session S19
└── assets/
    └── (images, icons)
```

## Sessions completed
- ✅ Session 1 — Supabase database (17 tables, RLS, seed data)
- ✅ Session 2 — GitHub repo + CSS foundation + Supabase client

## Next session
Session 3 — Public marketing homepage (index.html)
