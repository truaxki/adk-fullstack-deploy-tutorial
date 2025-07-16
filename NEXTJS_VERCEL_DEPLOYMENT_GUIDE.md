# Next.js Frontend Deployment Guide - Vercel

## Overview
This guide explains how to deploy your Next.js frontend to Vercel and configure it to connect to your deployed ADK agent backend. The frontend automatically detects the deployment environment and configures endpoints accordingly.

## Prerequisites

### 1. Vercel Account Setup
1. Go to [vercel.com](https://vercel.com) and sign up/sign in
2. Connect your GitHub/GitLab/Bitbucket account
3. Install the Vercel CLI (optional but recommended):
   ```bash
   npm i -g vercel
   ```

### 2. Backend Deployment
Your Next.js frontend needs a backend to connect to. Choose one:
- **Agent Engine** (Recommended) - Follow the [ADK Deployment Guide](./ADK_DEPLOYMENT_GUIDE.md)
- **Cloud Run** - For custom backend deployments
- **Local Development** - For testing with local backend

## Environment Variables by Deployment Type

The frontend automatically detects which backend type to use based on available environment variables. Here's what you need for each deployment scenario:

### 🚀 Agent Engine Backend (Recommended)

**Required Variables:**
```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your-project-id
REASONING_ENGINE_ID=your-reasoning-engine-id

# Optional (has defaults)
GOOGLE_CLOUD_LOCATION=us-central1
```

**Optional Override:**
```bash
# Override the auto-constructed Agent Engine endpoint
AGENT_ENGINE_ENDPOINT=https://custom-agent-engine-endpoint
```

**How to get these values:**
1. **GOOGLE_CLOUD_PROJECT**: Your Google Cloud project ID
2. **REASONING_ENGINE_ID**: From your ADK deployment output (e.g., `projects/123/locations/us-central1/reasoningEngines/abc123` → use `abc123`)
3. **GOOGLE_CLOUD_LOCATION**: Region where you deployed your agent (default: `us-central1`)

### 🌐 Cloud Run Backend

**Required Variables:**
```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your-project-id
CLOUD_RUN_SERVICE_URL=https://your-service-abcdef-uc.a.run.app

# Optional (has defaults)
GOOGLE_CLOUD_LOCATION=us-central1
```

**How to get these values:**
1. **CLOUD_RUN_SERVICE_URL**: Your Cloud Run service URL from deployment
2. **GOOGLE_CLOUD_PROJECT**: Your Google Cloud project ID

### 🏠 Local Development

**Required Variables:**
```bash
# Local backend URL
BACKEND_URL=http://127.0.0.1:8000

# Optional (for development logging)
NODE_ENV=development
```

## Deployment Methods

### Method 1: Deploy via Vercel Dashboard (Recommended)

1. **Import Your Repository:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your Git repository
   - Select the `nextjs` folder as the root directory

2. **Configure Build Settings:**
   - **Framework Preset**: Next.js
   - **Root Directory**: `nextjs`
   - **Build Command**: `npm run build`
   - **Output Directory**: Leave empty (uses default)

3. **Set Environment Variables:**
   - In project settings, go to "Environment Variables"
   - Add your variables based on your backend type (see sections above)
   - Set for "Production", "Preview", and "Development" as needed

4. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy your app

### Method 2: Deploy via Vercel CLI

1. **Login to Vercel:**
   ```bash
   vercel login
   ```

2. **Navigate to Next.js directory:**
   ```bash
   cd nextjs
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Set environment variables:**
   ```bash
   # For Agent Engine backend
   vercel env add GOOGLE_CLOUD_PROJECT
   vercel env add REASONING_ENGINE_ID
   vercel env add GOOGLE_CLOUD_LOCATION
   
   # Follow prompts to enter values
   ```

### Method 3: Deploy via Git Integration

1. **Connect Repository:**
   - Push your code to GitHub/GitLab/Bitbucket
   - Import the repository in Vercel Dashboard
   - Select the `nextjs` folder as root

2. **Configure Environment Variables:**
   - In Vercel Dashboard → Project Settings → Environment Variables
   - Add your backend configuration variables

3. **Auto-Deploy:**
   - Every push to your main branch will trigger a new deployment
   - Preview deployments for pull requests

## Environment Variable Configuration Examples

### Example 1: Agent Engine Backend
```bash
# Vercel Environment Variables
GOOGLE_CLOUD_PROJECT=my-ai-project-123456
REASONING_ENGINE_ID=abc123def456
GOOGLE_CLOUD_LOCATION=us-central1
```

**Result:** Frontend connects to:
```
https://us-central1-aiplatform.googleapis.com/v1/projects/my-ai-project-123456/locations/us-central1/reasoningEngines/abc123def456:query
```

### Example 2: Cloud Run Backend
```bash
# Vercel Environment Variables
GOOGLE_CLOUD_PROJECT=my-ai-project-123456
CLOUD_RUN_SERVICE_URL=https://my-agent-service-xyz789-uc.a.run.app
GOOGLE_CLOUD_LOCATION=us-central1
```

**Result:** Frontend connects to:
```
https://my-agent-service-xyz789-uc.a.run.app
```

### Example 3: Custom Agent Engine Endpoint
```bash
# Vercel Environment Variables
GOOGLE_CLOUD_PROJECT=my-ai-project-123456
REASONING_ENGINE_ID=abc123def456
AGENT_ENGINE_ENDPOINT=https://custom-ai-gateway.example.com/agent
```

**Result:** Frontend connects to:
```
https://custom-ai-gateway.example.com/agent:query
```

## Complete Deployment Example

### Step 1: Prepare Your Backend
First, deploy your ADK agent following the [ADK Deployment Guide](./ADK_DEPLOYMENT_GUIDE.md):

```bash
# Deploy your agent to Agent Engine
cd app
adk deploy agent_engine app

# Save the output - you'll need the reasoning engine ID
# Example output: projects/my-project/locations/us-central1/reasoningEngines/abc123
```

### Step 2: Configure Frontend Environment
Create a `.env.local` file in your `nextjs` directory for local testing:

```bash
# nextjs/.env.local
GOOGLE_CLOUD_PROJECT=my-ai-project-123456
REASONING_ENGINE_ID=abc123def456
GOOGLE_CLOUD_LOCATION=us-central1
NODE_ENV=development
```

### Step 3: Test Locally
```bash
cd nextjs
npm run dev
```

Visit `http://localhost:3000` and verify the frontend connects to your deployed agent.

### Step 4: Deploy to Vercel
```bash
# Option A: Using Vercel CLI
cd nextjs
vercel --prod

# Option B: Using Vercel Dashboard
# 1. Import repository
# 2. Set root directory to "nextjs"
# 3. Add environment variables
# 4. Deploy
```

### Step 5: Configure Production Environment Variables
In Vercel Dashboard → Project Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `GOOGLE_CLOUD_PROJECT` | `my-ai-project-123456` | Production, Preview |
| `REASONING_ENGINE_ID` | `abc123def456` | Production, Preview |
| `GOOGLE_CLOUD_LOCATION` | `us-central1` | Production, Preview |

## Frontend Configuration Details

### How Environment Detection Works
Your frontend automatically detects the backend type using this logic:

1. **Agent Engine**: If `REASONING_ENGINE_ID` is present
2. **Cloud Run**: If `CLOUD_RUN_SERVICE_URL` is present
3. **Local**: Falls back to `BACKEND_URL` or default local endpoint

### Endpoint Construction
The frontend constructs API endpoints based on detected backend:

```typescript
// Agent Engine
https://{location}-aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/reasoningEngines/{id}:query

// Cloud Run
{CLOUD_RUN_SERVICE_URL}/api/endpoint

// Local
{BACKEND_URL}/api/endpoint
```

### Authentication Headers
The frontend handles authentication automatically:
- **Cloud environments**: Uses service account authentication
- **Local development**: Uses application default credentials

## Testing Your Deployment

### 1. Local Testing
```bash
cd nextjs
npm run dev
```

Check the console for configuration output:
```
🔧 Endpoint Configuration:
  environment: cloud
  deploymentType: agent_engine
  backendUrl: https://us-central1-aiplatform.googleapis.com/v1/...
  agentEngineUrl: https://us-central1-aiplatform.googleapis.com/v1/...
```

### 2. Production Testing
After Vercel deployment:
1. Visit your Vercel deployment URL
2. Open browser developer tools → Console
3. Verify the endpoint configuration
4. Test agent interactions

### 3. Preview Deployments
Vercel creates preview deployments for pull requests:
- Each PR gets a unique preview URL
- Environment variables are inherited from project settings
- Test new features before merging

## Troubleshooting

### Common Issues

#### 1. Backend Connection Errors
**Error:** "Failed to connect to backend"
**Solutions:**
- Verify environment variables are set correctly in Vercel
- Check that backend service is running and accessible
- Ensure CORS is configured on your backend

#### 2. Agent Engine Authentication
**Error:** "Unauthorized" or "403 Forbidden"
**Solutions:**
- Verify `GOOGLE_CLOUD_PROJECT` is correct
- Check that `REASONING_ENGINE_ID` matches your deployed agent
- Ensure proper IAM permissions for the service account

#### 3. Environment Variable Issues
**Error:** "Environment variable not found"
**Solutions:**
- Check environment variables are set for correct environment (Production/Preview)
- Verify variable names match exactly (case-sensitive)
- Redeploy after adding new environment variables

#### 4. Build Failures
**Error:** Build fails during Vercel deployment
**Solutions:**
- Check build logs in Vercel Dashboard
- Verify all dependencies are in `package.json`
- Ensure TypeScript compilation succeeds locally

### Debugging Steps

1. **Check Environment Variables:**
   ```bash
   # In Vercel Dashboard
   Project Settings → Environment Variables
   ```

2. **Review Build Logs:**
   ```bash
   # In Vercel Dashboard
   Deployments → Select deployment → View logs
   ```

3. **Test Configuration Locally:**
   ```bash
   cd nextjs
   npm run build
   npm run start
   ```

4. **Verify Backend Connectivity:**
   ```bash
   # Test your backend endpoint directly
   curl -X POST "YOUR_BACKEND_URL/api/test" \
     -H "Content-Type: application/json" \
     -d '{"message": "test"}'
   ```

## Environment Variables Reference

### Required for All Deployments
| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_CLOUD_PROJECT` | Google Cloud project ID | `my-ai-project-123456` |

### Agent Engine Specific
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REASONING_ENGINE_ID` | Yes | - | Agent Engine reasoning engine ID |
| `GOOGLE_CLOUD_LOCATION` | No | `us-central1` | Google Cloud region |
| `AGENT_ENGINE_ENDPOINT` | No | Auto-constructed | Custom Agent Engine endpoint |

### Cloud Run Specific
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLOUD_RUN_SERVICE_URL` | Yes | - | Cloud Run service URL |
| `GOOGLE_CLOUD_LOCATION` | No | `us-central1` | Google Cloud region |

### Development Only
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BACKEND_URL` | No | `http://127.0.0.1:8000` | Local backend URL |
| `NODE_ENV` | No | - | Environment mode (enables debug logs) |

## Advanced Configuration

### Custom Domain
1. Add your domain in Vercel Dashboard → Project Settings → Domains
2. Configure DNS records as instructed
3. SSL certificates are automatically provisioned

### Preview Deployments
```bash
# Deploy to preview environment
vercel

# Deploy specific branch to preview
vercel --prod --confirm
```

### Multiple Environments
Configure different environment variables for different deployment environments:

- **Production**: Live environment variables
- **Preview**: Testing environment variables
- **Development**: Local development variables

## Security Considerations

### Environment Variables
- Never commit `.env.local` to version control
- Use Vercel's environment variable encryption
- Rotate sensitive values regularly

### Authentication
- The frontend handles Google Cloud authentication automatically
- For production, ensure proper service account permissions
- Use IAM roles with least privilege principle

### CORS Configuration
Ensure your backend allows requests from your Vercel domain:
```javascript
// Example backend CORS config
const allowedOrigins = [
  'https://your-app.vercel.app',
  'https://your-app-git-main.vercel.app',
  'https://your-app-preview.vercel.app'
];
```

## Next Steps

1. **Deploy your ADK agent** following the [ADK Deployment Guide](./ADK_DEPLOYMENT_GUIDE.md)
2. **Configure your frontend** with the appropriate environment variables
3. **Test locally** to ensure connectivity
4. **Deploy to Vercel** using your preferred method
5. **Set up monitoring** and error tracking for production
6. **Configure custom domains** and SSL certificates
7. **Set up CI/CD** for automated deployments

## Cost Optimization

### Vercel Pricing
- **Hobby Plan**: Free for personal projects
- **Pro Plan**: $20/month for commercial use
- **Enterprise**: Custom pricing for large teams

### Usage Monitoring
- Monitor function execution time
- Optimize build performance
- Use Vercel Analytics for insights

### Cost-Saving Tips
- Use preview deployments for testing
- Optimize bundle size with code splitting
- Configure proper caching headers
- Use Vercel's built-in optimization features

## Documentation References

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [ADK Deployment Guide](./ADK_DEPLOYMENT_GUIDE.md)
- [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview)

---

**Need help?** Check the troubleshooting section or reach out with specific error messages for targeted assistance. 
