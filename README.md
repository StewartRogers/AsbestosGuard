<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1rhmD28GfetTDptSh0RcLfZDdCQeu-MB5

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Configure the Gemini API key (two options):

   - Preferred (secure): run a small server-side proxy or server function that holds your API key and forwards requests from the frontend. This keeps the key secret and is recommended for production.

   - For local development only (insecure): create a `.env.local` file at the project root and add the following line (this exposes the key to client-side code and should never be used in production):

     `VITE_API_KEY=your_gemini_api_key_here`

3. Run the app:
   `npm run dev`
