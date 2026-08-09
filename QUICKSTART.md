# Quick Start

Poori tafseel [SETUP-GUIDE-ENGINE.md](./SETUP-GUIDE-ENGINE.md) mein hai. Yeh
sirf chhoti si fehrist hai.

1. **`app/api/auth/[...nextauth]/route.ts` haath se banao.** GitHub ka uploader
   bracket wale folder gira deta hai, is liye woh ZIP mein nahi hai. Yeh file na
   ho to login bilkul kaam nahi karta. Tareeqa SETUP-GUIDE ke STEP 0 mein hai.
2. ZIP ki baqi saari files GitHub par upload karo.
3. Vercel mein saat environment variables lagao (teen Cloudinary wale nae hain).
4. OpenAI mein $5-$10 balance daalo. Balance 0 ho to kuch nahi chalega.
5. Redeploy karo.
6. Ek chhoti video (2-3 minute) se test karo.

Kuch toote to Vercel ke **Logs** tab mein `Process video error:` wali line
dhoondh kar mujhe bhej dena — us se seedha pata chal jata hai ke masla kya hai.
