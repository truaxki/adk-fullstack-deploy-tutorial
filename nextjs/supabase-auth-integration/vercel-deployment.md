# Vercel Deployment Guide for Supabase Auth Integration

## Server Action Configuration for Vercel

### Option 1: Vercel Skew Protection (Recommended)

**What is Skew Protection?**
Vercel's Skew Protection automatically handles server action consistency across deployments by maintaining multiple versions of your application assets. This eliminates the need for manual encryption key management.

**Setup Steps:**

1. **Enable in Vercel Dashboard:**
   - Go to your project in Vercel Dashboard
   - Navigate to Settings → Functions
   - Find "Skew Protection" section
   - Enable "Skew Protection" for your project

2. **Benefits:**
   - ✅ No manual encryption key management
   - ✅ Automatic rollback capabilities  
   - ✅ Zero-downtime deployments
   - ✅ Handles multiple deployment versions seamlessly
   - ✅ Works out-of-the-box with Next.js Server Actions

3. **How it works:**
   - Vercel maintains assets from previous deployments
   - Client requests automatically route to correct version
   - Server actions remain consistent during deployment transitions
   - No configuration needed - works automatically

### Option 2: Manual Encryption Key (Advanced)

If you need explicit control over server action encryption:

**Setup via Vercel Dashboard:**

1. **Add Environment Variable:**
   - Go to Project Settings → Environment Variables
   - Add new variable: `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`
   - Value: Your 64-character hex key (same as local development)
   - Apply to: Production, Preview, Development

2. **Environment Considerations:**
   ```bash
   # Development (local)
   NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=b5d121cc12fde0836b39b23b628b49fc6b3c83c5e72987e071b97c6fa5f9d678
   
   # Preview (Vercel)
   NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=b5d121cc12fde0836b39b23b628b49fc6b3c83c5e72987e071b97c6fa5f9d678
   
   # Production (Vercel)
   NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=b5d121cc12fde0836b39b23b628b49fc6b3c83c5e72987e071b97c6fa5f9d678
   ```

**Setup via Vercel CLI:**

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Set environment variable for production
vercel env add NEXT_SERVER_ACTIONS_ENCRYPTION_KEY production

# Set for preview environments
vercel env add NEXT_SERVER_ACTIONS_ENCRYPTION_KEY preview

# Pull environment variables to local
vercel env pull .env.local
```

## Complete Vercel Deployment Checklist

### 1. Prepare Environment Variables

**Required Variables:**
```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Site URL (required for OAuth)
NEXT_PUBLIC_SITE_URL=https://your-vercel-app.vercel.app

# Server Actions (choose one option)
# Option A: Use Skew Protection (recommended) - no variable needed
# Option B: Manual key - NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=your_key

# ADK Backend (if using)
ADK_APP_NAME=app
# ... other ADK variables
```

### 2. Configure Supabase for Vercel

**Update OAuth Redirect URLs in Supabase:**

1. Go to Supabase Dashboard → Authentication → Settings
2. Update redirect URLs:
   ```
   # Development
   http://localhost:3000/auth/callback
   
   # Preview deployments
   https://your-app-git-branch-username.vercel.app/auth/callback
   
   # Production
   https://your-vercel-app.vercel.app/auth/callback
   ```

3. Update Site URL:
   ```
   Production: https://your-vercel-app.vercel.app
   ```

### 3. Deploy to Vercel

**Option A: GitHub Integration (Recommended)**

1. **Connect Repository:**
   - Go to Vercel Dashboard
   - Click "New Project"
   - Import from GitHub
   - Select your repository

2. **Configure Build Settings:**
   ```
   Framework Preset: Next.js
   Root Directory: nextjs/
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

3. **Add Environment Variables:**
   - Add all required environment variables
   - Choose Skew Protection OR encryption key approach

**Option B: Vercel CLI**

```bash
# Navigate to your Next.js directory
cd nextjs/

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 4. Verify Deployment

**Test These Features:**

- [ ] OAuth login works (Google/GitHub)
- [ ] Email/password authentication works
- [ ] Chat functionality works without server action errors
- [ ] Session management persists across page refreshes
- [ ] Logout properly clears authentication
- [ ] Route protection works (redirect to /auth when not authenticated)

### 5. Domain Configuration (Optional)

If using a custom domain:

1. **Add Domain in Vercel:**
   - Go to Project Settings → Domains
   - Add your custom domain

2. **Update Supabase:**
   - Update redirect URLs to use custom domain
   - Update site URL in Supabase settings

3. **Update Environment Variables:**
   ```env
   NEXT_PUBLIC_SITE_URL=https://yourdomain.com
   ```

## Troubleshooting Vercel Deployment

### Common Issues

**1. Server Action Errors After Deployment**
```
Error: Server Action "xxx" was not found
```

**Solutions:**
- Enable Skew Protection in Vercel dashboard
- OR ensure encryption key is set in all environments
- Verify environment variables are applied correctly

**2. OAuth Redirect Issues**
```
Error: redirect_uri_mismatch
```

**Solutions:**
- Add Vercel preview/production URLs to Supabase redirect URLs
- Ensure NEXT_PUBLIC_SITE_URL matches deployed URL
- Check Supabase Authentication settings

**3. Environment Variable Issues**
```
Error: Missing required environment variables
```

**Solutions:**
- Verify all required variables are set in Vercel
- Check variable names match exactly (case-sensitive)
- Ensure variables are applied to correct environments

**4. Build Failures**
```
Error: Module not found
```

**Solutions:**
- Ensure all dependencies are in package.json
- Check import paths are correct
- Verify root directory is set to 'nextjs/' in Vercel

### Deployment Best Practices

**Security:**
- Use Vercel's environment variable encryption
- Never commit sensitive keys to repository
- Use preview deployments for testing

**Performance:**
- Enable Vercel's Edge Functions for better performance
- Use ISR (Incremental Static Regeneration) where appropriate
- Monitor deployment metrics in Vercel dashboard

**Monitoring:**
- Set up Vercel Analytics
- Monitor function execution logs
- Set up error tracking (Sentry, etc.)

## Migration from Other Platforms

If migrating from other platforms to Vercel:

1. **Export Environment Variables**
2. **Update OAuth Redirect URLs**
3. **Test with Preview Deployment First**
4. **Update DNS Records Last**

The Skew Protection approach makes Vercel deployments much more reliable for Next.js applications using Server Actions! 🚀