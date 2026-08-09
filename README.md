# ClipForge AI

Lambi video daalo, AI khud us mein se sab se acche short clips nikal deta hai —
TikTok, Instagram Reels aur YouTube Shorts ke liye, seedha 9:16 mein.

**Setup ke liye [SETUP-GUIDE-ENGINE.md](./SETUP-GUIDE-ENGINE.md) parho.** Woh
qadam-ba-qadam hai aur usmein terminal ki zaroorat nahi. Yeh file sirf batati
hai ke andar kaam kaise hota hai.

---

## Kaam kaise hota hai

1. **Upload** — video browser se seedha Cloudinary jati hai, hamare server se
   guzarti hi nahi. Isi liye Vercel ki 4.5 MB request limit rasta nahi rokti.
2. **Sunna** — Cloudinary video se sirf awaz nikaal kar chhote mp3 tukron mein
   deta hai (2-2 minute). Har tukra OpenAI Whisper ko jata hai. Whisper khud
   zaban pehchan leta hai, is liye Urdu, English aur mili-juli — teeno chalti
   hain.
3. **Sochna** — poora transcript ek hi dafa GPT-4o ko jata hai, jo behtareen 5
   lamhe chunta hai aur sath mein caption aur hashtags bhi likh deta hai.
4. **Kaatna** — clip Cloudinary ke URL se banti hai. Koi FFmpeg nahi, koi
   encoding nahi, koi server job nahi. Clip pehli baar dekhne par khud ban jati
   hai.

## Design ki sab se ahem baat

Serverless function chand minute nahi chal sakta, aur transcription mein waqt
lagta hai. Is liye ek lamba kaam karne ke bajaye **browser baar baar
`/api/videos/process` ko bulata hai, aur har call sirf ek chhota qadam karta
hai.** Progress database mein mehfooz rehti hai, to connection toot bhi jaye to
kaam wahin se dobara chal parta hai.

## Kharcha

Ek 10-minute video ka lagbhag **$0.11** (Whisper + GPT-4o milakar). $10 ke
balance mein takreeban 90 videos.

OpenAI par monthly limit `$10` zaroor laga lena — Settings, phir Limits.

## Tech

Next.js 14 (App Router), Prisma + Neon Postgres, NextAuth, Cloudinary,
OpenAI Whisper + GPT-4o, Tailwind, Vercel.

## Environment variables

Saat, aur saaton lazmi hain:

```
DATABASE_URL
NEXTAUTH_URL
NEXTAUTH_SECRET
OPENAI_API_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Har ek kahan se milta hai, yeh SETUP-GUIDE-ENGINE.md ke STEP 2 mein likha hai.

**`CLOUDINARY_URL=cloudinary://...` wali mili-juli line kaam nahi karegi** —
code ko teen alag values chahiye.

## Database

Koi migration command haath se chalane ki zaroorat nahi. `prisma db push` build
script ka hissa hai, is liye har deploy par database khud update ho jata hai.

## Free plan ki hadd

Mahine mein 3 videos, har ek 30 minute tak, file 500 MB tak. Yeh hadd
`app/api/videos/route.ts` ki sab se upar wali do lines mein hai.

## Abhi kya baqi hai

- **Stripe** — code maujood hai lekin price IDs nahi lage, is liye billing band
  hai. Free tier isi liye rakha gaya ta ke product abhi bhi chal sake.
- **`typescript.ignoreBuildErrors`** abhi `true` hai (`next.config.js` mein).
  Jab sab thehr jaye to `false` kar dena — tab TypeScript asli ghaltiyan
  pakarna shuru kar dega.
- **Google sign-in** ke liye `GOOGLE_CLIENT_ID` aur `GOOGLE_CLIENT_SECRET`
  chahiye. Na hon to email/password wala login phir bhi chalta hai.
