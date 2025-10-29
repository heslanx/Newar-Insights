# Newar Insights - API Reference

Complete API documentation for all endpoints.

**Base URLs:**
- Admin API: `http://localhost:8081`
- Public API: `http://localhost:8080`

---

## 📋 Table of Contents

- [Admin API](#admin-api)
  - [Users](#users)
  - [API Tokens](#api-tokens)
- [Public API](#public-api)
  - [Recordings](#recordings)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Admin API

**Base URL:** `http://localhost:8081`

**Authentication:** All endpoints require `X-Admin-API-Key` header.

---

### Users

#### Create User

Create a new user account.

```http
POST /admin/users
```

**Headers:**
```
Content-Type: application/json
X-Admin-API-Key: <admin_key>
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "max_concurrent_bots": 10
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "max_concurrent_bots": 10,
  "created_at": "2025-10-28T10:00:00Z",
  "updated_at": "2025-10-28T10:00:00Z"
}
```

---

#### List Users

Get paginated list of users.

```http
GET /admin/users?limit=50&offset=0
```

**Headers:**
```
X-Admin-API-Key: <admin_key>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Results per page (1-100) |
| `offset` | integer | 0 | Pagination offset |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "max_concurrent_bots": 10,
      "created_at": "2025-10-28T10:00:00Z",
      "updated_at": "2025-10-28T10:00:00Z"
    }
  ],
  "total": 45,
  "limit": 50,
  "offset": 0
}
```

---

#### Get User

Retrieve a specific user by ID.

```http
GET /admin/users/{id}
```

**Headers:**
```
X-Admin-API-Key: <admin_key>
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "max_concurrent_bots": 10,
  "created_at": "2025-10-28T10:00:00Z",
  "updated_at": "2025-10-28T10:00:00Z"
}
```

---

#### Delete User

Delete a user and all associated data (tokens, recordings).

```http
DELETE /admin/users/{id}
```

**Headers:**
```
X-Admin-API-Key: <admin_key>
```

**Response:** `200 OK`
```json
{
  "message": "User deleted successfully"
}
```

---

### API Tokens

#### Generate Token

Generate a new API token for a user.

```http
POST /admin/users/{id}/tokens
```

**Headers:**
```
X-Admin-API-Key: <admin_key>
```

**Response:** `201 Created`
```json
{
  "token": "vxa_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "created_at": "2025-10-28T10:00:00Z"
}
```

⚠️ **IMPORTANT:** Token is only shown once! Save it securely.

---

## Public API

**Base URL:** `http://localhost:8080`

**Authentication:** All endpoints require `X-API-Key` header with user token.

---

### Recordings

#### Create Recording

Request a new meeting recording.

```http
POST /recordings
```

**Headers:**
```
Content-Type: application/json
X-API-Key: vxa_live_<your_token>
```

**Request Body:**
```json
{
  "platform": "google_meet",
  "meeting_id": "abc-defg-hij",
  "bot_name": "Newar Recorder"
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `platform` | string | ✅ | `google_meet` or `teams` |
| `meeting_id` | string | ✅ | Google Meet code or Teams URL |
| `bot_name` | string | ❌ | Display name in meeting (default: "Newar Recorder") |

**Response:** `201 Created`
```json
{
  "id": 123,
  "user_id": 1,
  "platform": "google_meet",
  "meeting_id": "abc-defg-hij",
  "status": "requested",
  "meeting_url": "https://meet.google.com/abc-defg-hij",
  "created_at": "2025-10-28T10:00:00Z",
  "updated_at": "2025-10-28T10:00:00Z"
}
```

**Status Flow:**
```
requested → joining → active → recording → finalizing → completed
                                                      ↓
                                                   failed
```

---

#### Get Recording Status

Get status of a specific recording.

```http
GET /recordings/{platform}/{meeting_id}
```

**Headers:**
```
X-API-Key: vxa_live_<your_token>
```

**Response:** `200 OK`
```json
{
  "id": 123,
  "user_id": 1,
  "platform": "google_meet",
  "meeting_id": "abc-defg-hij",
  "status": "recording",
  "meeting_url": "https://meet.google.com/abc-defg-hij",
  "started_at": "2025-10-28T10:05:00Z",
  "created_at": "2025-10-28T10:00:00Z",
  "updated_at": "2025-10-28T10:05:30Z"
}
```

**When completed:**
```json
{
  "id": 123,
  "status": "completed",
  "recording_url": "/recordings/google_meet/abc-defg-hij/download",
  "recording_path": "final/meeting_123_20251028_100530.webm",
  "started_at": "2025-10-28T10:05:00Z",
  "completed_at": "2025-10-28T10:35:00Z"
}
```

---

#### List Recordings

Get paginated list of user's recordings.

```http
GET /recordings?limit=20&offset=0
```

**Headers:**
```
X-API-Key: vxa_live_<your_token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | Results per page (1-100) |
| `offset` | integer | 0 | Pagination offset |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 123,
      "platform": "google_meet",
      "meeting_id": "abc-defg-hij",
      "status": "completed",
      "recording_url": "/recordings/google_meet/abc-defg-hij/download",
      "created_at": "2025-10-28T10:00:00Z"
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

---

#### Stop Recording

Stop an active recording.

```http
DELETE /recordings/{platform}/{meeting_id}
```

**Headers:**
```
X-API-Key: vxa_live_<your_token>
```

**Response:** `200 OK`
```json
{
  "message": "Recording stop requested",
  "status": "finalizing"
}
```

---

#### Download Recording

Download the final recording file.

```http
GET /recordings/{platform}/{meeting_id}/download
```

**Headers:**
```
X-API-Key: vxa_live_<your_token>
```

**Response:** `200 OK`
- **Content-Type:** `audio/webm`
- **Content-Disposition:** `attachment; filename="google_meet_abc-defg-hij.webm"`
- **Body:** Binary WebM audio file

**Example:**
```bash
curl http://localhost:8080/recordings/google_meet/abc-defg-hij/download \
  -H "X-API-Key: vxa_live_..." \
  -o recording.webm
```

---

## Error Handling

### Error Response Format

All errors follow this structure:

```json
{
  "error": "Error message here",
  "details": {
    "field": "Additional context"
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request (invalid input) |
| `401` | Unauthorized (missing/invalid API key) |
| `404` | Not Found |
| `429` | Too Many Requests (rate limit exceeded) |
| `500` | Internal Server Error |
| `503` | Service Unavailable |

### Common Errors

**Invalid API Key:**
```json
{
  "error": "Invalid API key"
}
```

**Rate Limit Exceeded:**
```json
{
  "error": "Rate limit exceeded",
  "details": {
    "limit": 10,
    "window": "1 minute"
  }
}
```

**Max Concurrent Bots:**
```json
{
  "error": "Maximum concurrent bots limit reached",
  "details": {
    "active": 10,
    "max": 10
  }
}
```

**Recording Not Found:**
```json
{
  "error": "Recording not found"
}
```

---

## Rate Limiting

**Limits:**
- **User API:** 10 requests/minute per user
- **Admin API:** 100 requests/minute

**Headers:**
```
X-RateLimit-Limit: 10
```

When exceeded, returns `429 Too Many Requests`.

---

## Authentication

### Admin API

Use `X-Admin-API-Key` header with admin secret:

```bash
curl http://localhost:8081/admin/users \
  -H "X-Admin-API-Key: admin_secret_change_me"
```

### Public API

Use `X-API-Key` header with user token:

```bash
curl http://localhost:8080/recordings \
  -H "X-API-Key: vxa_live_a1b2c3d4..."
```

---

## Health Checks

All services expose health endpoints (no auth required):

```http
GET /health
```

**Response:** `200 OK` or `503 Service Unavailable`
```json
{
  "status": "healthy",
  "timestamp": "2025-10-28T10:00:00Z",
  "dependencies": {
    "database": "ok",
    "redis": "ok"
  }
}
```

**Status Values:**
- `healthy` - All dependencies OK
- `degraded` - Some dependencies failing (service still operational)
- `unhealthy` - Critical dependencies failing

---

## Examples

### Complete Workflow

```bash
# 1. Create user (Admin)
curl -X POST http://localhost:8081/admin/users \
  -H "Content-Type: application/json" \
  -H "X-Admin-API-Key: admin_secret" \
  -d '{"email": "user@example.com", "name": "John", "max_concurrent_bots": 10}'

# 2. Generate token (Admin)
curl -X POST http://localhost:8081/admin/users/1/tokens \
  -H "X-Admin-API-Key: admin_secret"

# Save the token: vxa_live_a1b2c3d4...

# 3. Create recording (User)
curl -X POST http://localhost:8080/recordings \
  -H "Content-Type: application/json" \
  -H "X-API-Key: vxa_live_a1b2c3d4..." \
  -d '{"platform": "google_meet", "meeting_id": "abc-defg-hij"}'

# 4. Check status
curl http://localhost:8080/recordings/google_meet/abc-defg-hij \
  -H "X-API-Key: vxa_live_a1b2c3d4..."

# 5. Download when completed
curl http://localhost:8080/recordings/google_meet/abc-defg-hij/download \
  -H "X-API-Key: vxa_live_a1b2c3d4..." \
  -o recording.webm
```

---

**Questions?** Open an issue on [GitHub](https://github.com/newar/insights/issues)
