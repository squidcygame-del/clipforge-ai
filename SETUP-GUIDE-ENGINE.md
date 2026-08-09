# ClipForge AI — Setup Guide (Real Processing Engine)

Sab kuch browser se hota hai. Terminal ki zaroorat nahi.

---

## STEP 0 — Sab se zaroori qadam (isko skip mat karna)

GitHub ka web uploader **bracket wale folder chup-chaap gira deta hai**. Is
project mein aisa ek hi folder hai:

```
app/api/auth/[...nextauth]/
```

Isi wajah se ZIP mein woh folder jaan-boojh kar shamil nahi kiya gaya — warna
aap upload karte, GitHub usko nigal jata, aur aap ko pata bhi na chalta.

**Agar yeh file repo mein nahi hai to login poori tarah band ho jata hai** aur
`/api/auth/error` par 404 aata hai. (Pichli baar exactly yehi hua tha.)

### Yeh file haath se banao

1. GitHub par apna repo kholo
2. **Add file → Create new file**
3. Naam wale khane mein **poora path ek hi line mein** likho — slash khud
   folder bana dega:

   ```
   app/api/auth/[...nextauth]/route.ts
   ```

4. Neeche yeh code paste karo:

   ```ts
   import NextAuth from 'next-auth'
   import { authOptions } from '@/lib/auth'

   const handler = NextAuth(authOptions)

   export { handler as GET, handler as POST }

   export const dynamic = 'force-dynamic'
   ```

5. **Commit changes**

### Check karo ke waqai ban gayi

Repo mein `app/api/auth/` kholo. Andar `[...nextauth]` folder dikhna chahiye
aur usmein `route.ts`. **Agar nahi dikh raha to aage mat barho** — pehle yeh
theek karo, warna login kabhi kaam nahi karega.

---

## STEP 1 — Code upload karo

1. `clipforge-ai-engine.zip` apne computer par extract karo
2. GitHub repo mein **Add file → Upload files**
3. Extract ki hui saari files/folders drag karo
4. **Commit changes**

Purani files ke upar likh jayengi — yehi maqsad hai.

---

## STEP 2 — Environment variables (Vercel)

Vercel → apna project → **Settings → Environment Variables**

| Name | Kahan se milega |
|---|---|
| `DATABASE_URL` | Neon dashboard → Connection string (pehle se lagi hui hai) |
| `NEXTAUTH_URL` | Aap ki live site ka URL, jaise `https://clipforge-ai.vercel.app` |
| `NEXTAUTH_SECRET` | Koi bhi lamba random text (pehle se lagi hui hai) |
| `OPENAI_API_KEY` | platform.openai.com → API keys → Create new secret key |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard → **Cloud name** (sirf naam, URL nahi) |
| `CLOUDINARY_API_KEY` | Cloudinary dashboard → API Key |
| `CLOUDINARY_API_SECRET` | Cloudinary dashboard → API Secret (Reveal dabao) |

Har variable ke liye **Production, Preview, Development** teeno tick karo.

**Khayal rakhne wali baatein:**

- `CLOUDINARY_URL=cloudinary://...` wali mili-juli line **use mat karna**. Code
  ko teen alag values chahiye.
- API Secret kisi ko mat dena aur GitHub par kabhi commit mat karna. Aap ka repo
  **public** hai — jo bhi wahan likha ho woh sab log parh sakte hain.
- `NEXTAUTH_URL` mein aakhir mein slash mat lagana.

---

## STEP 3 — OpenAI mein balance daalo

**Yeh lazmi hai.** Balance 0 ho to Whisper aur GPT dono kaam nahi karenge.

1. platform.openai.com → **Settings → Billing**
2. Payment method lagao
3. **$5 se $10** add karo (shuru ke liye kaafi hai)
4. Usi safhe par **Limits** mein monthly cap `$10` set kar do

Ek 10-minute video ka kharcha lagbhag **$0.11** hai. Yaani $10 mein takreeban 90
videos.

---

## STEP 4 — Redeploy

Vercel → **Deployments** → sab se upar wali deployment ke `...` → **Redeploy**

Database ki nayi columns build ke doran khud ban jati hain — aap ko kuch nahi
karna.

---

## STEP 5 — Test

1. Site kholo → login karo
2. **Upload** par jao
3. Ek chhoti video se shuru karo (**2 se 3 minute**, 100 MB se kam)
4. Progress bar chalta rahega: upload → "Listening to your video" → "Finding
   your best moments" → clips

Pehli baar thora sabar chahiye: Cloudinary pehli dafa audio track banata hai,
usmein 30-60 second lag sakte hain. Us dauran "Hit a snag, retrying" likha aa
sakta hai — yeh normal hai, ghabrana nahi.

**Pehli koshish 45-minute wali video se mat karna.** Pehle chhoti video se
confirm karo ke poora pipeline chal raha hai.

---

## Kuch galat ho to — Vercel ke logs kaise parhein

Yehi asli jawab dete hain. Screenshot se pata nahi chalta ke andar kya toota.

1. Vercel → apna project → upar **Logs** tab
2. Upar right mein time range **Last 1 hour** kar do
3. Site par woh kaam dobara karo jo fail ho raha hai
4. Logs khud aate rahenge. Laal (error) line par click karke faila kar dekho

Aap ko `Process video error:` se shuru hone wali line dhoondhni hai — uske baad
asli wajah likhi hoti hai.

**Woh poori line copy karke mujhe bhej dena.** Us se main seedha bata sakunga ke
masla kya hai.

---

## Aam masail aur unka matlab

| Screen par kya likha aata hai | Asli wajah | Hal |
|---|---|---|
| `/api/auth/error` par 404, login nahi hota | `[...nextauth]/route.ts` repo mein hai hi nahi | STEP 0 dobara karo |
| "Your OpenAI account has no credit left" | Balance khatam | STEP 3 |
| "OpenAI rejected the API key" | `OPENAI_API_KEY` ghalat ya purani | Nayi key banao, Vercel mein daalo, redeploy |
| "Cloudinary is not configured" | Teen mein se koi env var missing | STEP 2 |
| "Cloudinary refused the audio request (HTTP 400)" | Delivery URL mein koi parameter ghalat | Code khud saada URL se dobara koshish karta hai; agar phir bhi aaye to log ki poori line bhejo |
| "Hit a snag, retrying" | Aarzi rukawat, khud theek ho jati hai | Kuch mat karo, 12 baar tak khud koshish karega |
| "No speech was found in this video" | Video mein awaz nahi, ya sirf music hai | Aisi video do jismein koi baat kar raha ho |
| "The server took too long on that step" | Woh step 60 second mein khatam nahi hua | Chhoti video se test karo, phir logs dekho |

---

## Free plan ki hadd

- Mahine mein **3 videos**
- Har video **30 minute** tak
- File **500 MB** tak

Yeh hadd `app/api/videos/route.ts` ki sab se upar wali do lines mein hai
(`FREE_VIDEOS_PER_MONTH` aur `FREE_MAX_DURATION`) — jab chaho badal lena.

---

## Ek baat saaf saaf

Is sandbox mein `npm install` band hai, is liye main asli `next build` chala kar
test nahi kar saka. Jo main ne check kiya woh yeh hai: saare imports sahi jagah
point karte hain, har `route.ts` sirf jaiz cheezein export karta hai, saare
braces balanced hain, JSON files parse hoti hain, aur Prisma ki 43 field
references schema se match karti hain.

Yeh sab pass hai — lekin **main "build 100% pass hogi" ki guarantee nahi de
sakta**. Agar build fail ho to Vercel ki error line copy karke bhej dena, main
theek kar dunga.
