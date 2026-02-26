# API Documentation

Base URL: `http://localhost:8080/api`

## Health Check

### GET /api/health
Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

## Users

### GET /api/users
Get all users.

**Response:**
```json
[
  {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
]
```

### GET /api/users/{id}
Get a specific user by ID.

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe"
}
```

### POST /api/users
Create a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe"
}
```

### PUT /api/users/{id}
Update a user.

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "name": "Jane Doe"
}
```

**Response:**
```json
{
  "message": "User updated successfully"
}
```

### DELETE /api/users/{id}
Delete a user.

**Response:**
```json
{
  "message": "User deleted successfully"
}
```

## Documents

### GET /api/documents
Get all documents.

**Response:**
```json
[
  {
    "id": 1,
    "title": "My Document",
    "content": "Document content here",
    "metadata": "{\"tags\": [\"important\"]}"
  }
]
```

### GET /api/documents/{id}
Get a specific document by ID.

**Response:**
```json
{
  "id": 1,
  "title": "My Document",
  "content": "Document content here",
  "metadata": "{\"tags\": [\"important\"]}"
}
```

### POST /api/documents
Create a new document.

**Request Body:**
```json
{
  "title": "My Document",
  "content": "Document content here",
  "metadata": {
    "tags": ["important"],
    "category": "notes"
  }
}
```

**Response:**
```json
{
  "id": 1,
  "title": "My Document",
  "content": "Document content here",
  "metadata": "{\"tags\":[\"important\"],\"category\":\"notes\"}"
}
```

### PUT /api/documents/{id}
Update a document.

**Request Body:**
```json
{
  "title": "Updated Title",
  "content": "Updated content",
  "metadata": {
    "tags": ["updated"]
  }
}
```

**Response:**
```json
{
  "message": "Document updated successfully"
}
```

### DELETE /api/documents/{id}
Delete a document.

**Response:**
```json
{
  "message": "Document deleted successfully"
}
```

## Testing with curl

```bash
# Health check
curl http://localhost:8080/api/health

# Create a user
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

# Get all users
curl http://localhost:8080/api/users

# Create a document
curl -X POST http://localhost:8080/api/documents \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Doc","content":"Hello World","metadata":{"tags":["test"]}}'

# Get all documents
curl http://localhost:8080/api/documents
```
