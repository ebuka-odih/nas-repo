# Senate Votes & Proceedings

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the `web` directory (copy from `env.template`):
   ```bash
   cp env.template .env
   ```

3. Configure the backend API URL in `.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```
   
   - For local development: Use `http://localhost:8000/api/v1` (or your local backend URL)
   - For production: Set this to your deployed backend URL in your deployment platform's environment variables (e.g., Vercel)

4. Run the app:
   ```bash
   npm run dev
   ```

## Environment Variables

- `VITE_API_BASE_URL`: The base URL for the backend API (default: `http://localhost:8000/api/v1`)
  - **IMPORTANT**: Must end with `/api/v1`
  - Example for production: `https://nas.namelesss.store/backend/api/v1`
  - The code will automatically add `/v1` if you only provide `/api`, but it's best to include it explicitly

## Debugging API Issues

If you're getting 404 errors:

1. **Check the browser console** - You'll see logs showing:
   - The `VITE_API_BASE_URL` from environment
   - The resolved `API_BASE_URL` being used
   - Each API request URL being called

2. **Verify your environment variable**:
   - In Vercel: Go to Project Settings → Environment Variables
   - Make sure `VITE_API_BASE_URL` is set to: `https://nas.namelesss.store/backend/api/v1`
   - **Note**: Must include `/api/v1` at the end

3. **Test the backend directly**:
   - `https://nas.namelesss.store/backend/api` - Should return API info JSON
   - `https://nas.namelesss.store/backend/api/v1/login` - Should be the login endpoint

4. **Common issues**:
   - ❌ `VITE_API_BASE_URL=https://nas.namelesss.store/backend/api` (missing `/v1`)
   - ✅ `VITE_API_BASE_URL=https://nas.namelesss.store/backend/api/v1` (correct)
