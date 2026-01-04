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
