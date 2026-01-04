# API Integration Summary

## Overview

This document summarizes the API integration work completed for the Legislative Records Platform. The frontend is now fully configured to communicate with the Laravel backend API.

## Frontend API Service Layer

### Structure

All API services are located in `/web/services/api/`:

- **`config.ts`** - API configuration and type definitions
- **`client.ts`** - Base HTTP client with authentication handling
- **`auth.ts`** - Authentication API service
- **`assemblies.ts`** - Assemblies API service
- **`sessions.ts`** - Sessions API service
- **`sittings.ts`** - Sittings API service
- **`agendaItems.ts`** - Agenda items API service
- **`bills.ts`** - Bills API service
- **`documents.ts`** - Documents API service
- **`search.ts`** - Search API service
- **`audit.ts`** - Audit log API service
- **`index.ts`** - Central export for all services

### Features

1. **Automatic Token Management**
   - Tokens are stored in localStorage
   - Automatically included in all authenticated requests
   - Token is cleared on logout

2. **Error Handling**
   - Standardized error response format
   - Proper error messages displayed to users

3. **Type Safety**
   - Full TypeScript interfaces for all API responses
   - Type-safe request/response handling

## Authentication Integration

### Login Flow

The login page (`App.tsx`) now:
- Uses email/password authentication
- Calls the `/api/v1/login` endpoint
- Stores the authentication token
- Handles login errors gracefully
- Shows loading states during authentication

### Authentication State Management

- Checks authentication status on app load
- Validates token on mount
- Automatically redirects to login if not authenticated
- Logout functionality clears token and resets state

## Environment Configuration

### Frontend

Create a `.env.local` file in the `web/` directory:

```env
# Gemini API Key for document processing
GEMINI_API_KEY=your_gemini_api_key_here

# Backend API Base URL
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Backend

CORS has been configured to allow requests from:
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- Any URL specified in `FRONTEND_URL` environment variable

## API Endpoints Available

All endpoints are available through the API services:

### Authentication
- `authApi.login()` - POST /api/v1/login
- `authApi.getCurrentUser()` - GET /api/v1/me
- `authApi.logout()` - POST /api/v1/logout

### Assemblies
- `assembliesApi.getAll()` - GET /api/v1/assemblies

### Sessions
- `sessionsApi.getByAssembly(assemblyId)` - GET /api/v1/assemblies/{id}/sessions

### Sittings
- `sittingsApi.list(filters)` - GET /api/v1/sittings
- `sittingsApi.getById(id)` - GET /api/v1/sittings/{id}
- `sittingsApi.getSummary(id)` - GET /api/v1/sittings/{id}/summary
- `sittingsApi.create(data)` - POST /api/v1/sittings
- `sittingsApi.submit(id)` - POST /api/v1/sittings/{id}/submit
- `sittingsApi.officialize(id)` - POST /api/v1/sittings/{id}/officialize

### Agenda Items
- `agendaItemsApi.getBySitting(sittingId)` - GET /api/v1/sittings/{id}/agenda-items
- `agendaItemsApi.create(sittingId, data)` - POST /api/v1/sittings/{id}/agenda-items
- `agendaItemsApi.update(agendaId, data)` - PUT /api/v1/agenda-items/{id}

### Bills
- `billsApi.getBySitting(sittingId)` - GET /api/v1/sittings/{id}/bills
- `billsApi.create(sittingId, data)` - POST /api/v1/sittings/{id}/bills

### Documents
- `documentsApi.upload(sittingId, file, type)` - POST /api/v1/sittings/{id}/documents
- `documentsApi.getHtml(sittingId)` - GET /api/v1/sittings/{id}/document/html
- `documentsApi.getPdf(sittingId)` - GET /api/v1/sittings/{id}/document/pdf

### Search
- `searchApi.search(filters)` - GET /api/v1/search

### Audit Log
- `auditApi.getBySitting(sittingId, perPage)` - GET /api/v1/sittings/{id}/audit-log

## Usage Example

```typescript
import { authApi, sittingsApi } from './services/api';

// Login
try {
  const response = await authApi.login({
    email: 'clerk@example.com',
    password: 'password'
  });
  if (response.success) {
    // User is now authenticated
  }
} catch (error) {
  // Handle error
}

// Fetch sittings
const response = await sittingsApi.list({
  status: 'draft',
  per_page: 20
});
if (response.success && response.data) {
  const sittings = response.data;
}
```

## Next Steps

1. **Update remaining views** to use API services instead of mock data
2. **Implement data fetching** for sittings, assemblies, and sessions
3. **Add loading states** and error handling throughout the app
4. **Implement form submissions** for creating/editing records
5. **Add file upload** functionality for documents

## Testing

To test the integration:

1. Start the backend server:
   ```bash
   cd backend
   php artisan serve
   ```

2. Start the frontend:
   ```bash
   cd web
   npm run dev
   ```

3. Create a test user in the backend:
   ```bash
   php artisan tinker
   ```
   ```php
   \App\Models\User::create([
       'name' => 'Test Clerk',
       'email' => 'clerk@example.com',
       'password' => \Hash::make('password'),
       'role' => 'clerk'
   ]);
   ```

4. Login with the test credentials on the frontend

## Notes

- All API responses follow the standard format: `{ success, message, data }`
- Authentication tokens are automatically managed
- CORS is configured for local development
- All endpoints require authentication except `/api/v1/login`








