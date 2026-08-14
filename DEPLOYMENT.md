# Space Blog Deployment Guide

This guide covers deploying the Node.js/Express blog to **Google Cloud Run** and mapping a custom domain via **Firebase Hosting**.

## Prerequisites
1. **Google Cloud CLI (`gcloud`)** installed and authenticated (`gcloud auth login`).
2. **Firebase CLI (`firebase-tools`)** installed (`npm install -g firebase-tools`) and authenticated (`firebase login`).
3. An active Google Cloud Project with billing enabled.
4. Cloud Run Admin API and Artifact Registry API enabled on your Google Cloud Project.

## 1. Deploying to Cloud Run

Cloud Run requires your application to listen on the port specified by the `PORT` environment variable (defaults to 8080). The application is already configured to use `process.env.PORT || 3000`.

1. **Set your current project:**
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Deploy directly from source:**
   You can deploy directly using Cloud Run's source deployment (which uses Buildpacks under the hood) or provide the included Dockerfile. Run this from the root of your project:
   ```bash
   gcloud run deploy spaceblog \
     --source . \
     --region us-central1 \
     --allow-unauthenticated
   ```
   *Note: Choose your preferred region.*

3. **Configure Environment Variables:**
   During deployment, or afterward in the Cloud Console, you must provide your environment variables (MongoDB URI, R2 credentials, Apps Script URL/Key, Google Client ID/Secret, Session Secret, etc.).
   
   To deploy with env vars from your `.env` file (if you have one locally):
   ```bash
   gcloud run deploy spaceblog \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars="APPS_SCRIPT_URL=...,..." \
     --set-secrets="MONGO_URI=mongodb+srv://..."
   ```
   *(It's recommended to use Google Cloud Secret Manager for sensitive keys).*

4. **Verify Deployment:**
   After successful deployment, `gcloud` will provide a Service URL (e.g., `https://spaceblog-xyz-uc.a.run.app`). Visit it to ensure the blog works.

## 2. Setting up Firebase Hosting (Custom Domain)

Firebase Hosting allows you to map a custom domain and route traffic to your Cloud Run service.

1. **Initialize Firebase in your project root:**
   ```bash
   firebase init hosting
   ```
   - Select your existing Google Cloud Project.
   - For public directory, you can just use `public` (this folder is just for static files if you had them, but we will route all traffic to Cloud Run).
   - Configure as a single-page app? **No**.
   - Set up automatic builds and deploys with GitHub? **No** (unless you want to).

2. **Configure `firebase.json` for Cloud Run:**
   Modify the generated `firebase.json` to rewrite all requests to your Cloud Run service instead of serving static files:
   ```json
   {
     "hosting": {
       "public": "public",
       "ignore": [
         "firebase.json",
         "**/.*",
         "**/node_modules/**"
       ],
       "rewrites": [
         {
           "source": "**",
           "run": {
             "serviceId": "spaceblog",
             "region": "us-central1"
           }
         }
       ]
     }
   }
   ```
   *(Ensure `serviceId` and `region` match your Cloud Run deployment).*

3. **Deploy Firebase Hosting:**
   ```bash
   firebase deploy --only hosting
   ```
   Firebase will give you a default Hosting URL (e.g., `https://your-project.web.app`). Visit this URL to ensure traffic is correctly proxying to Cloud Run.

4. **Connect your Custom Domain:**
   - Go to the [Firebase Console](https://console.firebase.google.com/).
   - Open your project, click **Build > Hosting**.
   - Click **Add custom domain**.
   - Follow the wizard to verify domain ownership and update your DNS records (A/TXT records).
   - Firebase will automatically provision an SSL certificate for your custom domain.
