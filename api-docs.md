# OWL CHAT API Documentation

> **Version:** v1  
> **Last Updated:** April 2026  
> **Authentication:** Bearer JWT — tất cả các endpoint (trừ auth) yêu cầu header `Authorization: Bearer <token>`

---

## Mục lục

- [Giới thiệu](#giới-thiệu)
- [Xác thực](#xác-thực)
- [User Service](#user-service)
  - [Authentication](#authentication)
  - [Account Management](#account-management)
  - [User Profiles](#user-profiles)
- [Social Service](#social-service)
  - [Friend Requests (User)](#friend-requests-user)
  - [Friendships (User)](#friendships-user)
  - [Blocks (User)](#blocks-user)
  - [Notifications (User)](#notifications-user)
  - [Admin — Friend Requests](#admin--friend-requests)
  - [Admin — Friendships](#admin--friendships)
  - [Admin — Blocks](#admin--blocks)
- [Chat Service](#chat-service)
  - [Chats (User)](#chats-user)
  - [Chat Members (User)](#chat-members-user)
  - [Messages (User)](#messages-user)
  - [Message Reports (User)](#message-reports-user)
  - [Admin — Chats](#admin--chats)
  - [Admin — Chat Members](#admin--chat-members)
  - [Admin — Messages](#admin--messages)
  - [Admin — Message Reports](#admin--message-reports)
  - [WebSocket (Real-time)](#websocket-real-time)

---

## Giới thiệu

### Kiến trúc Microservices

OWL Chat sử dụng kiến trúc microservices gồm 4 dịch vụ độc lập:

| Dịch vụ | Port | Database | Mục đích |
|---------|------|----------|---------|
| **API Gateway** | 8080 | N/A | Route requests, JWT validation, CORS |
| **User Service** | 8081 | PostgreSQL/H2 | Xác thực, hồ sơ người dùng, quản lý tài khoản |
| **Chat Service** | 8082 | MongoDB | Nhắn tin, cuộc trò chuyện, thành viên chat |
| **Social Service** | 8083 | MongoDB | Bạn bè, lời mời kết bạn, chặn, thông báo |

### Base URLs

```
User Service:    http://localhost:8080/user-service
Chat Service:    http://localhost:8080/chat-service
Social Service:  http://localhost:8080/social-service
WebSocket:       ws://localhost:8080/ws-chat-notification
```

---

## Xác thực

### JWT Token Structure

**Access Token** (15 phút):
```json
{
  "sub": "accountId",
  "username": "username",
  "role": "ADMIN|USER",
  "iat": 1234567890,
  "exp": 1234568890
}
```

**Refresh Token** (7 ngày):
```json
{
  "sub": "accountId",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Response Format

**Success Response:**
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": { /* actual data */ }
}
```

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Error description"
}
```

### Public Endpoints

Các endpoint sau **không yêu cầu JWT**:
- `POST /user-service/auth/login`
- `POST /user-service/auth/signup`
- `POST /user-service/auth/refresh`
- `POST /user-service/auth/logout`

### Pagination

Tất cả endpoint danh sách hỗ trợ phân trang:

**Query Parameters:**
- `page`: Số trang (0-indexed, mặc định: 0)
- `size`: Số mục mỗi trang (mặc định: 10)
- `ascSort`: Sắp xếp tăng dần (true/false, mặc định: false)

**Response Format:**
```json
{
  "content": [ /* items */ ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 10,
    "totalElements": 100,
    "totalPages": 10
  }
}
```

---

## User Service

**Base URL:** `http://localhost:8080/user-service`

### Entities

#### Account
```
- id: String (PK)
- username: String (unique)
- password: String (encrypted)
- role: Enum (ADMIN, USER)
- status: Boolean
- createdDate: LocalDateTime
- updatedDate: LocalDateTime
```

#### User Profile
```
- id: String (PK, FK to Account)
- name: String
- email: String
- phoneNumber: String
- gender: Boolean
- dateOfBirth: LocalDate
- avatar: String
- createdDate: LocalDateTime
- updatedDate: LocalDateTime
```

---

### Authentication

🔓 **Không yêu cầu JWT**

---

#### `POST /auth/login`

Đăng nhập với username/password.

**Request Body**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:** `200 OK`
```json
{
  "statusCode": 200,
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "role": "ADMIN|USER",
    "status": true
  }
}
```

---

#### `POST /auth/signup`

Đăng ký tài khoản và profile mới.

**Request Body**
```json
{
  "username": "string",
  "password": "string",
  "email": "string"
}
```

**Response:** `200 OK`
```json
{
  "statusCode": 200,
  "data": {
    "id": "string",
    "name": "string",
    "email": "string",
    "phoneNumber": "string",
    "gender": true,
    "dateOfBirth": "2025-01-01",
    "avatar": "string",
    "createdDate": "2025-01-01T10:00:00"
  }
}
```

---

#### `POST /auth/refresh`

Làm mới access token bằng refresh token.

**Request Body**
```json
{
  "refreshToken": "string"
}
```

**Response:** `200 OK`
```json
{
  "statusCode": 200,
  "data": {
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

---

#### `POST /auth/logout`

Vô hiệu hoá refresh token.

**Request Body**
```json
{
  "refreshToken": "string"
}
```

**Response:** `200 OK`

---

#### `POST /auth/authenticate/{accountId}`

Xác minh mã signup (email verification).

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `accountId` | string | ✓ |

**Request Body**
```json
{
  "code": "string"
}
```

**Response:** `200 OK`

---

#### `GET /auth/authenticate/renew/{accountId}`

Gửi lại mã xác minh signup.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `accountId` | string | ✓ |

**Response:** `200 OK`

---

### Account Management

🔒 **Yêu cầu JWT**

---

#### `GET /account`

Lấy danh sách tài khoản (có phân trang).

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `keywords` | string | Tìm kiếm theo username |
| `page` | integer | Số trang (mặc định: 0) |
| `size` | integer | Kích thước trang (mặc định: 10) |
| `status` | boolean | Lọc theo trạng thái |
| `ascSort` | boolean | Sắp xếp tăng dần (mặc định: false) |

**Response:** `200 OK`
```json
{
  "content": [
    {
      "id": "string",
      "username": "string",
      "role": "ADMIN|USER",
      "status": true,
      "createdDate": "2025-01-01T10:00:00",
      "updatedDate": "2025-01-01T10:00:00"
    }
  ],
  "pageable": { /* ... */ }
}
```

---

#### `GET /account/{id}`

Lấy tài khoản theo ID.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`

---

#### `POST /account`

Tạo tài khoản mới.

**Request Body**
```json
{
  "username": "string",
  "password": "string",
  "role": "ADMIN|USER"
}
```

**Response:** `201 Created`

---

#### `PUT /account/{id}`

Cập nhật tài khoản.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Request Body**
```json
{
  "username": "string",
  "password": "string",
  "role": "ADMIN|USER"
}
```

**Response:** `200 OK`

---

#### `PATCH /account/{id}/status/{status}`

Cập nhật trạng thái tài khoản.

**Path Parameters**
| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|---------|-------|
| `id` | string | ✓ | ID tài khoản |
| `status` | boolean | ✓ | true = kích hoạt, false = vô hiệu hoá |

**Response:** `200 OK`

---

#### `PATCH /account/{id}/role/{role}`

Cập nhật role tài khoản.

**Path Parameters**
| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|---------|-------|
| `id` | string | ✓ | ID tài khoản |
| `role` | string | ✓ | ADMIN hoặc USER |

**Response:** `200 OK`

---

#### `DELETE /account/{id}`

Xoá tài khoản (cascade đến profile).

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`

---

### User Profiles

🔒 **Yêu cầu JWT**

---

#### `GET /user/me`

Lấy profile của người dùng hiện tại (từ header JWT).

**Response:** `200 OK`
```json
{
  "statusCode": 200,
  "data": {
    "id": "string",
    "name": "string",
    "email": "string",
    "phoneNumber": "string",
    "gender": true,
    "dateOfBirth": "2025-01-01",
    "avatar": "string",
    "createdDate": "2025-01-01T10:00:00"
  }
}
```

---

#### `GET /user`

Lấy danh sách profile người dùng (có phân trang).

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `keywords` | string | Tìm kiếm theo tên hoặc email |
| `page` | integer | Số trang (mặc định: 0) |
| `size` | integer | Kích thước trang (mặc định: 10) |
| `gender` | boolean | Lọc theo giới tính |
| `dateOfBirthStart` | date | Lọc từ ngày sinh |
| `dateOfBirthEnd` | date | Lọc đến ngày sinh |
| `ascSort` | boolean | Sắp xếp tăng dần (mặc định: false) |

**Response:** `200 OK`

---

#### `GET /user/{id}`

Lấy profile người dùng theo ID.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`

---

#### `POST /user`

Tạo profile người dùng mới (kèm tài khoản mới).

**Request Body**
```json
{
  "accountId": "string",
  "name": "string",
  "email": "string",
  "phoneNumber": "string",
  "gender": true,
  "dateOfBirth": "2025-01-01"
}
```

**Response:** `201 Created`

---

#### `PUT /user/{id}`

Cập nhật profile người dùng.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Request Body**
```json
{
  "name": "string",
  "email": "string",
  "phoneNumber": "string",
  "gender": true,
  "dateOfBirth": "2025-01-01"
}
```

**Response:** `200 OK`

---

#### `POST /user/{id}/avatar/upload`

Upload avatar người dùng.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Request Body:** `multipart/form-data` — trường `file` (binary)

**Response:** `200 OK`
```json
{
  "statusCode": 200,
  "data": {
    "userId": "string",
    "avatarUrl": "string"
  }
}
```

---

#### `GET /user/{id}/avatar`

Tải xuống avatar người dùng.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK` (binary image data)

---

#### `DELETE /user/{id}`

Xoá profile người dùng.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`



---

## Social Service

**Base URL:** `http://localhost:8080/social-service`

🔒 **Tất cả endpoint yêu cầu JWT**

### Entities

#### Friendship
```
- id: String
- firstUserId: String
- secondUserId: String
- createdDate: Instant
```

#### Friend Request
```
- id: String
- senderId: String
- receiverId: String
- status: Enum (PENDING, ACCEPTED, REJECTED)
- createdDate: Instant
- updatedDate: Instant
```

#### Block
```
- id: String
- blockerId: String
- blockedId: String
- createdDate: Instant
```

#### Notification
```
- id: String
- userId: String
- type: String
- action: String
- referenceId: String
- content: String
- data: Map
- isRead: Boolean
- createdDate: Instant
```

---

### Friend Requests (User)

---

#### `GET /friend-request`

Lấy danh sách lời mời kết bạn của người dùng hiện tại.

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu (optional) |
| `status` | string | Lọc (PENDING, ACCEPTED, REJECTED) |
| `keywords` | string | Tìm kiếm |
| `page` | integer | Số trang (mặc định: 0) |
| `size` | integer | Kích thước trang (mặc định: 10) |
| `ascSort` | boolean | Sắp xếp tăng dần (mặc định: false) |
| `createdDateStart` | date-time | Lọc từ ngày tạo |
| `createdDateEnd` | date-time | Lọc đến ngày tạo |

**Response:** `200 OK`

---

#### `POST /friend-request`

Gửi lời mời kết bạn tới người dùng khác.

**Request Body**
```json
{
  "receiverId": "string"
}
```

**Response:** `201 Created`
```json
{
  "statusCode": 201,
  "data": {
    "id": "string",
    "senderId": "string",
    "receiverId": "string",
    "status": "PENDING",
    "createdDate": "2025-01-01T10:00:00Z"
  }
}
```

---

#### `GET /friend-request/{id}`

Lấy lời mời kết bạn theo ID.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`

---

#### `GET /friend-request/send`

Lấy danh sách lời mời đã gửi.

**Query Parameters:** tương tự `GET /friend-request`

**Response:** `200 OK`

---

#### `GET /friend-request/receive`

Lấy danh sách lời mời đã nhận.

**Query Parameters:** tương tự `GET /friend-request`

**Response:** `200 OK`

---

#### `GET /friend-request/user/{userId}`

Lấy lời mời giữa người dùng hiện tại và một người dùng khác.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `userId` | string | ✓ |

**Response:** `200 OK`

---

#### `GET /friend-request/sender/{senderId}`

Lấy lời mời từ một người gửi cụ thể.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `senderId` | string | ✓ |

**Response:** `200 OK`

---

#### `GET /friend-request/receiver/{receiverId}`

Lấy lời mời tới người nhận cụ thể.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `receiverId` | string | ✓ |

**Response:** `200 OK`

---

#### `PATCH /friend-request/{id}/accept`

Chấp nhận lời mời kết bạn.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`
```json
{
  "statusCode": 200,
  "data": {
    "id": "string",
    "firstUserId": "string",
    "secondUserId": "string",
    "createdDate": "2025-01-01T10:00:00Z"
  }
}
```

---

#### `PATCH /friend-request/{id}/reject`

Từ chối lời mời kết bạn.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`

---

#### `DELETE /friend-request/{id}`

Xoá lời mời kết bạn.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`

---

### Friendships (User)

---

#### `GET /friendship`

Lấy danh sách bạn bè.

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |
| `page` | integer | Số trang (mặc định: 0) |
| `size` | integer | Kích thước trang (mặc định: 10) |
| `ascSort` | boolean | Sắp xếp tăng dần (mặc định: false) |
| `createdDateStart` | date-time | Lọc từ ngày tạo |
| `createdDateEnd` | date-time | Lọc đến ngày tạo |

**Response:** `200 OK`

---

#### `GET /friendship/{id}`

Lấy quan hệ bạn bè theo ID.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`

---

#### `GET /friendship/user/{userId}`

Lấy quan hệ bạn bè với một người dùng cụ thể.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `userId` | string | ✓ |

**Response:** `200 OK`

---

#### `DELETE /friendship/{id}`

Xoá quan hệ bạn bè (unfriend).

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`

---

### Blocks (User)

---

#### `POST /block`

Chặn một người dùng.

**Request Body**
```json
{
  "blockedId": "string"
}
```

**Response:** `201 Created`
```json
{
  "statusCode": 201,
  "data": {
    "id": "string",
    "blockerId": "string",
    "blockedId": "string",
    "createdDate": "2025-01-01T10:00:00Z"
  }
}
```

---

#### `GET /block/{id}`

Lấy thông tin block theo ID.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`

---

#### `GET /block/blocked`

Lấy danh sách người dùng đã bị chặn bởi người dùng hiện tại.

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |
| `page` | integer | Số trang (mặc định: 0) |
| `size` | integer | Kích thước trang (mặc định: 10) |
| `ascSort` | boolean | Sắp xếp tăng dần (mặc định: false) |

**Response:** `200 OK`

---

#### `DELETE /block/{id}`

Bỏ chặn người dùng.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`

---

### Notifications (User)

---

#### `GET /notification`

Lấy tất cả thông báo của người dùng.

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |
| `page` | integer | Số trang (mặc định: 0) |
| `size` | integer | Kích thước trang (mặc định: 10) |

**Response:** `200 OK`

---

#### `GET /notification/unread`

Lấy thông báo chưa đọc.

**Query Parameters:** tương tự `GET /notification`

**Response:** `200 OK`

---

#### `GET /notification/unread/count`

Lấy số lượng thông báo chưa đọc.

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |

**Response:** `200 OK`
```json
{
  "statusCode": 200,
  "data": {
    "count": 5
  }
}
```

---

#### `PATCH /notification/{id}/mark-as-read`

Đánh dấu thông báo là đã đọc.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`

---

#### `DELETE /notification/{id}`

Xoá thông báo.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`

---

### Admin — Friend Requests

🔒 **Yêu cầu JWT + ADMIN role**

---

#### `GET /admin/friend-request`

Lấy toàn bộ lời mời kết bạn trong hệ thống.

**Query Parameters:** tương tự `GET /friend-request`

**Response:** `200 OK`

---

#### `POST /admin/friend-request`

Tạo lời mời kết bạn (admin).

**Request Body**
```json
{
  "senderId": "string",
  "receiverId": "string"
}
```

**Response:** `201 Created`

---

#### `GET /admin/friend-request/{id}`

Lấy lời mời theo ID.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`

---

#### `GET /admin/friend-request/sender/{senderId}`

Lấy lời mời theo người gửi.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `senderId` | string | ✓ |

**Response:** `200 OK`

---

#### `GET /admin/friend-request/receiver/{receiverId}`

Lấy lời mời theo người nhận.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `receiverId` | string | ✓ |

**Response:** `200 OK`

---

#### `GET /admin/friend-request/user/{userId}`

Lấy lời mời liên quan đến một người dùng.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `userId` | string | ✓ |

**Response:** `200 OK`

---

#### `DELETE /admin/friend-request/{id}`

Xoá lời mời.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`

---

### Admin — Friendships

🔒 **Yêu cầu JWT + ADMIN role**

---

#### `GET /admin/friendship`

Lấy toàn bộ quan hệ bạn bè.

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `keywords` | string | Tìm kiếm |
| `page` | integer | Số trang (mặc định: 0) |
| `size` | integer | Kích thước trang (mặc định: 10) |
| `ascSort` | boolean | Sắp xếp tăng dần (mặc định: false) |

**Response:** `200 OK`

---

#### `POST /admin/friendship`

Tạo quan hệ bạn bè.

**Request Body**
```json
{
  "firstUserId": "string",
  "secondUserId": "string"
}
```

**Response:** `201 Created`

---

#### `GET /admin/friendship/{id}`

Lấy quan hệ theo ID.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`

---

#### `GET /admin/friendship/user/{userId}`

Lấy danh sách bạn bè của một người dùng.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `userId` | string | ✓ |

**Response:** `200 OK`

---

#### `GET /admin/friendship/user/{userId}/friends`

Lấy danh sách bạn bè (variant).

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `userId` | string | ✓ |

**Response:** `200 OK`

---

#### `DELETE /admin/friendship/{id}`

Xoá quan hệ bạn bè.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`

---

### Admin — Blocks

🔒 **Yêu cầu JWT + ADMIN role**

---

#### `GET /admin/block`

Lấy toàn bộ danh sách block.

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `keywords` | string | Tìm kiếm |
| `page` | integer | Số trang (mặc định: 0) |
| `size` | integer | Kích thước trang (mặc định: 10) |
| `ascSort` | boolean | Sắp xếp tăng dần (mặc định: false) |
| `createdDateStart` | date-time | Lọc từ ngày tạo |
| `createdDateEnd` | date-time | Lọc đến ngày tạo |

**Response:** `200 OK`

---

#### `POST /admin/block`

Tạo block.

**Request Body**
```json
{
  "blockerId": "string",
  "blockedId": "string"
}
```

**Response:** `201 Created`

---

#### `GET /admin/block/{id}`

Lấy block theo ID.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`

---

#### `GET /admin/block/user/{userId}/blocker`

Lấy danh sách người đã chặn một người dùng.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `userId` | string | ✓ |

**Response:** `200 OK`

---

#### `GET /admin/block/user/{userId}/blocked`

Lấy danh sách người bị một người dùng chặn.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `userId` | string | ✓ |

**Response:** `200 OK`

---

#### `GET /admin/block/blocker/{blockerId}/blocked/{blockedId}`

Kiểm tra xem blocker có chặn blocked không.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `blockerId` | string | ✓ |
| `blockedId` | string | ✓ |

**Response:** `200 OK`

---

#### `DELETE /admin/block/{id}`

Xoá block.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`



---

## Chat Service

**Base URL:** `http://localhost:8080/chat-service`

🔒 **Tất cả endpoint yêu cầu JWT**

### Entities

#### Chat
```
- id: String
- status: Boolean
- type: Enum (PRIVATE, GROUP)
- name: String (group name, null for private)
- avatar: String
- initiatorId: String
- newestMessageId: String
- newestMessageDate: Instant
- createdDate: Instant
- updatedDate: Instant
```

#### ChatMember
```
- id: String
- memberId: String
- chatId: String
- role: Enum (OWNER, ADMIN, MEMBER, VIEWER)
- nickname: String
- inviterId: String
- joinDate: Instant
```

#### Message
```
- id: String
- chatId: String
- status: Boolean
- state: Enum (ORIGIN, EDITED, REMOVED)
- type: Enum (TEXT, IMG, VID, GENERIC_FILE, SYSTEM_MESSAGE)
- content: String
- senderId: String
- predecessorId: String
- sentDate: Instant
- removedDate: Instant
- createdDate: Instant
```

#### MessageReport
```
- id: String
- messageId: String
- reporterId: String
- content: String
- createdDate: Instant
```

---

### Chats (User)

---

#### `POST /chat`

Tạo cuộc trò chuyện mới.

**Request Body**
```json
{
  "name": "string",
  "chatMembersId": ["string"]
}
```

**Response:** `201 Created`
```json
{
  "statusCode": 201,
  "data": {
    "id": "string",
    "status": true,
    "type": "PRIVATE|GROUP",
    "name": "string",
    "avatar": "string",
    "initiatorId": "string",
    "newestMessageId": "string",
    "newestMessageDate": "2025-01-01T10:00:00Z",
    "createdDate": "2025-01-01T10:00:00Z",
    "updatedDate": "2025-01-01T10:00:00Z"
  }
}
```

---

#### `GET /chat/member`

Lấy danh sách chat của người dùng hiện tại.

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |
| `keywords` | string | Tìm kiếm |
| `page` | integer | Số trang (mặc định: 0) |
| `size` | integer | Kích thước trang (mặc định: 10) |
| `ascSort` | boolean | Sắp xếp tăng dần (mặc định: false) |
| `type` | string | Lọc loại chat (PRIVATE, GROUP) |
| `joinDateStart` | date-time | Lọc từ ngày tham gia |
| `joinDateEnd` | date-time | Lọc đến ngày tham gia |

**Response:** `200 OK`

---

#### `GET /chat/{chatId}`

Lấy thông tin chat theo ID.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `chatId` | string | ✓ |

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |

**Response:** `200 OK`

---

#### `GET /chat/{chatId}/avatar`

Lấy avatar của chat.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `chatId` | string | ✓ |

**Response:** `200 OK` (binary image data)

---

#### `POST /chat/{chatId}/avatar/upload`

Upload avatar chat.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `chatId` | string | ✓ |

**Request Body:** `multipart/form-data` — trường `file` (binary)

**Response:** `200 OK`

---

#### `DELETE /chat/{chatId}/deactivate`

Vô hiệu hoá chat.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `chatId` | string | ✓ |

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |

**Response:** `200 OK`

---

### Chat Members (User)

---

#### `GET /member`

Lấy danh sách thành viên chat.

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |
| `keywords` | string | Tìm kiếm |
| `page` | integer | Số trang (mặc định: 0) |
| `size` | integer | Kích thước trang (mặc định: 10) |
| `ascSort` | boolean | Sắp xếp tăng dần (mặc định: false) |
| `role` | string | Lọc theo role |
| `joinDateStart` | date-time | Lọc từ ngày tham gia |
| `joinDateEnd` | date-time | Lọc đến ngày tham gia |

**Response:** `200 OK`

---

#### `GET /member/chat/{chatId}`

Lấy thành viên của chat cụ thể.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `chatId` | string | ✓ |

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |
| `keywords` | string | Tìm kiếm |
| `page` | integer | Số trang (mặc định: 0) |
| `size` | integer | Kích thước trang (mặc định: 10) |

**Response:** `200 OK`

---

#### `GET /member/{memberId}/chat/{chatId}`

Lấy thành viên cụ thể trong chat.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `memberId` | string | ✓ |
| `chatId` | string | ✓ |

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |

**Response:** `200 OK`

---

#### `POST /member`

Thêm thành viên vào chat.

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |

**Request Body**
```json
{
  "memberId": "string",
  "chatId": "string",
  "role": "OWNER|ADMIN|MEMBER|VIEWER",
  "inviterId": "string"
}
```

**Response:** `201 Created`

---

#### `PATCH /member/{memberId}/chat/{chatId}`

Cập nhật nickname thành viên.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `memberId` | string | ✓ |
| `chatId` | string | ✓ |

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |

**Request Body**
```json
{
  "nickname": "string"
}
```

**Response:** `200 OK`

---

#### `DELETE /member/{memberId}/chat/{chatId}`

Loại bỏ thành viên khỏi chat.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `memberId` | string | ✓ |
| `chatId` | string | ✓ |

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |

**Response:** `200 OK`

---

### Messages (User)

---

#### `GET /message/chat/{chatId}`

Lấy danh sách tin nhắn trong chat.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `chatId` | string | ✓ |

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |
| `keywords` | string | Tìm kiếm |
| `page` | integer | Số trang (mặc định: 0) |
| `size` | integer | Kích thước trang (mặc định: 10) |
| `ascSort` | boolean | Sắp xếp tăng dần (mặc định: false) |
| `type` | string | Lọc loại tin (TEXT, IMG, VID, GENERIC_FILE) |
| `senderId` | string | Lọc người gửi |
| `sentDateStart` | date-time | Lọc từ ngày gửi |
| `sentDateEnd` | date-time | Lọc đến ngày gửi |

**Response:** `200 OK`

---

#### `GET /message/{messageId}`

Lấy tin nhắn theo ID.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `messageId` | string | ✓ |

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |

**Response:** `200 OK`

---

#### `GET /message/{messageId}/resource`

Tải xuống file đính kèm tin nhắn.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `messageId` | string | ✓ |

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |

**Response:** `200 OK` (binary file data)

---

#### `POST /message`

Gửi tin nhắn văn bản.

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |

**Request Body**
```json
{
  "chatId": "string",
  "content": "string"
}
```

**Response:** `201 Created`
```json
{
  "statusCode": 201,
  "data": {
    "id": "string",
    "chatId": "string",
    "status": true,
    "state": "ORIGIN|EDITED|REMOVED",
    "type": "TEXT|IMG|VID|GENERIC_FILE|SYSTEM_MESSAGE",
    "content": "string",
    "senderId": "string",
    "predecessorId": "string",
    "sentDate": "2025-01-01T10:00:00Z",
    "createdDate": "2025-01-01T10:00:00Z"
  }
}
```

---

#### `POST /message/resource/upload`

Gửi tin nhắn file.

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |

**Request Body:** `multipart/form-data`
```
- chatId: string
- type: string (IMG|VID|GENERIC_FILE)
- file: binary
```

**Response:** `201 Created`

---

#### `PUT /message/{messageId}/edit`

Chỉnh sửa tin nhắn.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `messageId` | string | ✓ |

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |

**Request Body**
```json
{
  "content": "string"
}
```

**Response:** `200 OK`

---

#### `DELETE /message/{messageId}`

Xoá tin nhắn.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `messageId` | string | ✓ |

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `requesterId` | string | ID người yêu cầu |

**Response:** `200 OK`

---

### Message Reports (User)

---

#### `POST /report/message/{messageId}`

Báo cáo tin nhắn vi phạm.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `messageId` | string | ✓ |

**Request Body**
```json
{
  "content": "string"
}
```

**Response:** `201 Created`

---

### Admin — Chats

🔒 **Yêu cầu JWT + ADMIN role**

---

#### `GET /admin/chat`

Lấy toàn bộ chat trong hệ thống.

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `keywords` | string | Tìm kiếm |
| `page` | integer | Số trang (mặc định: 0) |
| `size` | integer | Kích thước trang (mặc định: 10) |
| `ascSort` | boolean | Sắp xếp tăng dần (mặc định: false) |
| `status` | boolean | Lọc trạng thái |
| `type` | string | Lọc loại chat |
| `initiatorId` | string | Lọc người tạo |
| `createdDateStart` | date-time | Lọc từ ngày tạo |
| `createdDateEnd` | date-time | Lọc đến ngày tạo |

**Response:** `200 OK`

---

#### `GET /admin/chat/{chatId}`

Lấy chi tiết chat.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `chatId` | string | ✓ |

**Response:** `200 OK`

---

#### `GET /admin/chat/{chatId}/avatar`

Lấy avatar chat.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `chatId` | string | ✓ |

**Response:** `200 OK` (binary image data)

---

#### `POST /admin/chat`

Tạo chat mới (admin).

**Request Body**
```json
{
  "name": "string",
  "type": "PRIVATE|GROUP",
  "initiatorId": "string",
  "chatMembersId": ["string"]
}
```

**Response:** `201 Created`

---

#### `PUT /admin/chat/{chatId}`

Cập nhật chat (admin).

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `chatId` | string | ✓ |

**Request Body**
```json
{
  "name": "string"
}
```

**Response:** `200 OK`

---

#### `POST /admin/chat/{chatId}/avatar/upload`

Upload avatar chat (admin).

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `chatId` | string | ✓ |

**Request Body:** `multipart/form-data` — trường `file` (binary)

**Response:** `200 OK`

---

#### `DELETE /admin/chat/{chatId}`

Xoá chat (admin).

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `chatId` | string | ✓ |

**Response:** `200 OK`

---

### Admin — Chat Members

🔒 **Yêu cầu JWT + ADMIN role**

---

#### `GET /admin/member`

Lấy toàn bộ thành viên chat.

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `keywords` | string | Tìm kiếm |
| `page` | integer | Số trang (mặc định: 0) |
| `size` | integer | Kích thước trang (mặc định: 10) |
| `ascSort` | boolean | Sắp xếp tăng dần (mặc định: false) |

**Response:** `200 OK`

---

#### `GET /admin/member/chat/{chatId}`

Lấy thành viên của chat.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `chatId` | string | ✓ |

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `keywords` | string | Tìm kiếm |
| `page` | integer | Số trang (mặc định: 0) |
| `size` | integer | Kích thước trang (mặc định: 10) |
| `ascSort` | boolean | Sắp xếp tăng dần (mặc định: false) |

**Response:** `200 OK`

---

#### `GET /admin/member/{memberId}`

Lấy chi tiết thành viên.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `memberId` | string | ✓ |

**Response:** `200 OK`

---

#### `POST /admin/member`

Thêm thành viên vào chat (admin).

**Request Body**
```json
{
  "memberId": "string",
  "chatId": "string",
  "role": "OWNER|ADMIN|MEMBER|VIEWER",
  "inviterId": "string"
}
```

**Response:** `201 Created`

---

#### `PUT /admin/member/{memberId}/chat/{chatId}`

Cập nhật thành viên (admin).

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `memberId` | string | ✓ |
| `chatId` | string | ✓ |

**Request Body**
```json
{
  "role": "OWNER|ADMIN|MEMBER|VIEWER",
  "nickname": "string"
}
```

**Response:** `200 OK`

---

#### `DELETE /admin/member/{memberId}/chat/{chatId}`

Loại bỏ thành viên (admin).

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `memberId` | string | ✓ |
| `chatId` | string | ✓ |

**Response:** `200 OK`

---

### Admin — Messages

🔒 **Yêu cầu JWT + ADMIN role**

---

#### `GET /admin/message`

Lấy toàn bộ tin nhắn.

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `keywords` | string | Tìm kiếm |
| `page` | integer | Số trang (mặc định: 0) |
| `size` | integer | Kích thước trang (mặc định: 10) |
| `ascSort` | boolean | Sắp xếp tăng dần (mặc định: false) |
| `type` | string | Lọc loại tin |
| `chatId` | string | Lọc chat |
| `senderId` | string | Lọc người gửi |
| `sentDateStart` | date-time | Lọc từ ngày gửi |
| `sentDateEnd` | date-time | Lọc đến ngày gửi |

**Response:** `200 OK`

---

#### `GET /admin/message/{messageId}`

Lấy chi tiết tin nhắn.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `messageId` | string | ✓ |

**Response:** `200 OK`

---

#### `POST /admin/message`

Tạo tin nhắn (admin).

**Request Body**
```json
{
  "chatId": "string",
  "type": "TEXT|IMG|VID|GENERIC_FILE|SYSTEM_MESSAGE",
  "content": "string",
  "senderId": "string"
}
```

**Response:** `201 Created`

---

#### `PUT /admin/message/{messageId}`

Cập nhật tin nhắn (admin).

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `messageId` | string | ✓ |

**Request Body**
```json
{
  "content": "string"
}
```

**Response:** `200 OK`

---

#### `DELETE /admin/message/{messageId}`

Xoá tin nhắn (admin).

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `messageId` | string | ✓ |

**Response:** `200 OK`

---

### Admin — Message Reports

🔒 **Yêu cầu JWT + ADMIN role**

---

#### `GET /admin/message-report`

Lấy toàn bộ báo cáo tin nhắn.

**Query Parameters**
| Tên | Kiểu | Mô tả |
|-----|------|-------|
| `keywords` | string | Tìm kiếm |
| `page` | integer | Số trang (mặc định: 0) |
| `size` | integer | Kích thước trang (mặc định: 10) |
| `ascSort` | boolean | Sắp xếp tăng dần (mặc định: false) |
| `messageId` | string | Lọc tin nhắn |
| `reporterId` | string | Lọc người báo cáo |

**Response:** `200 OK`

---

#### `GET /admin/message-report/{id}`

Lấy chi tiết báo cáo.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`

---

#### `DELETE /admin/message-report/{id}`

Xoá báo cáo.

**Path Parameters**
| Tên | Kiểu | Bắt buộc |
|-----|------|---------|
| `id` | string | ✓ |

**Response:** `200 OK`

---

### WebSocket (Real-time)

**Endpoint:** `ws://localhost:8080/ws-chat-notification` (STOMP)

#### Message Destinations

**Send (Client → Server):**
```
/app/chat.send
```

**Subscribe (Client):**
```
/topic/chat.{chatId}          — Nhận tin từ chat cụ thể
/user/{userId}/queue/notifications  — Nhận thông báo cá nhân
```

#### Message Structure

```json
{
  "chatId": "string",
  "userId": "string",
  "content": "string",
  "timestamp": "2025-01-01T10:00:00Z",
  "type": "TEXT|IMG|VID|GENERIC_FILE"
}
```

#### Flow

1. Client kết nối STOMP đến `/ws-chat-notification`
2. Client gửi tin tới `/app/chat.send` với dữ liệu tin nhắn
3. Server phát tức thời đến `/topic/chat.{chatId}` (tối ưu hóa giao diện)
4. Server lưu tin nhắn vào database (bất đồng bộ)
5. Server gửi thông báo đến `/user/{userId}/queue/notifications` cho các thành viên khác

---

## Summary: Tất cả Endpoints

| Service | Endpoint Pattern | Public | Auth | WebSocket |
|---------|-----------------|--------|------|-----------|
| User | `/auth/*` | ✓ | ✗ | ✗ |
| User | `/account/*` | ✗ | ✓ | ✗ |
| User | `/user/*` | ✗ | ✓ | ✗ |
| Social | `/friendship/*` | ✗ | ✓ | ✗ |
| Social | `/friend-request/*` | ✗ | ✓ | ✗ |
| Social | `/block/*` | ✗ | ✓ | ✗ |
| Social | `/notification/*` | ✗ | ✓ | ✗ |
| Social | `/admin/*` | ✗ | ✓ | ✗ |
| Chat | `/chat/*` | ✗ | ✓ | ✗ |
| Chat | `/member/*` | ✗ | ✓ | ✗ |
| Chat | `/message/*` | ✗ | ✓ | ✗ |
| Chat | `/report/*` | ✗ | ✓ | ✗ |
| Chat | `/admin/*` | ✗ | ✓ | ✗ |
| Chat | `/ws-chat-notification` | ✗ | ✓ | ✓ |

---

## Error Codes

| Status Code | Meaning |
|------------|---------|
| `200` | OK — Yêu cầu thành công |
| `201` | Created — Tài nguyên được tạo |
| `400` | Bad Request — Dữ liệu không hợp lệ |
| `401` | Unauthorized — Thiếu JWT hoặc không hợp lệ |
| `403` | Forbidden — Không có quyền |
| `404` | Not Found — Tài nguyên không tìm thấy |
| `409` | Conflict — Vi phạm ràng buộc (trùng lặp, vv) |
| `500` | Internal Server Error — Lỗi server |

---

**Version History**
- v1 (April 2026): Tài liệu hoàn chỉnh với tất cả services

Đổi tên chat.

**Path Parameters:** `chatId` (string, bắt buộc)

**Request Body**
```json
{
  "name": "string"
}
```

**Response:** `200 OK`

---

#### `GET /chat/member`

Lấy danh sách chat mà người dùng hiện tại tham gia.

**Query Parameters**

| Tên | Kiểu | Mặc định | Mô tả |
|-----|------|----------|-------|
| `keywords` | string | `""` | Tìm kiếm |
| `page` | integer | `0` | Số trang |
| `size` | integer | `10` | Kích thước trang |
| `ascSort` | boolean | `false` | Sắp xếp tăng dần |
| `type` | string | — | Loại chat |
| `joinDateStart` | date-time | — | Lọc từ ngày tham gia |
| `joinDateEnd` | date-time | — | Lọc đến ngày tham gia |

**Response:** `200 OK`

---

#### `POST /chat/{chatId}/avatar/upload`

Upload avatar cho chat.

**Path Parameters:** `chatId` (string, bắt buộc)

**Request Body:** `multipart/form-data` — trường `file` (binary)

**Response:** `200 OK`

---

#### `GET /chat/{chatId}/avatar`

Lấy avatar chat.

**Path Parameters:** `chatId` (string, bắt buộc)

**Response:** `200 OK`

---

### Members (User)

---

#### `POST /member`

Thêm thành viên vào chat.

**Request Body**
```json
{
  "memberId": "string",
  "chatId": "string"
}
```

**Response:** `200 OK`

---

#### `GET /member/{memberId}/chat/{chatId}`

Lấy thông tin thành viên trong chat.

**Path Parameters:** `memberId`, `chatId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `DELETE /member/{memberId}/chat/{chatId}`

Xoá thành viên khỏi chat.

**Path Parameters:** `memberId`, `chatId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `PATCH /member/{memberId}/chat/{chatId}/role`

Cập nhật vai trò thành viên.

**Path Parameters:** `memberId`, `chatId` (string, bắt buộc)

**Request Body**
```json
{
  "role": "string"
}
```

**Response:** `200 OK`

---

#### `PATCH /member/{memberId}/chat/{chatId}/nickname`

Cập nhật biệt danh thành viên.

**Path Parameters:** `memberId`, `chatId` (string, bắt buộc)

**Request Body**
```json
{
  "nickname": "string"
}
```

**Response:** `200 OK`

---

#### `GET /member/chat/{chatId}`

Lấy danh sách thành viên trong chat.

**Path Parameters:** `chatId` (string, bắt buộc)

**Query Parameters**

| Tên | Kiểu | Mặc định |
|-----|------|----------|
| `keywords` | string | — |
| `page` | integer | `0` |
| `size` | integer | `10` |
| `ascSort` | boolean | `true` |
| `role` | string | — |
| `joinDateStart` | date-time | — |
| `joinDateEnd` | date-time | — |

**Response:** `200 OK`

---

#### `GET /member/`

Lấy danh sách chat mà người dùng hiện tại tham gia (dạng member).

**Query Parameters:** tương tự `GET /member/chat/{chatId}`

**Response:** `200 OK`

---

### Messages (User)

---

#### `POST /message`

Gửi tin nhắn văn bản.

**Request Body**
```json
{
  "chatId": "string",
  "content": "string"
}
```

**Response:** `200 OK`

---

#### `GET /message/{messageId}`

Lấy tin nhắn theo ID.

**Path Parameters:** `messageId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `DELETE /message/{messageId}`

Xoá mềm tin nhắn (soft delete).

**Path Parameters:** `messageId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `PUT /message/{messageId}/edit`

Chỉnh sửa nội dung tin nhắn.

**Path Parameters:** `messageId` (string, bắt buộc)

**Request Body**
```json
{
  "content": "string"
}
```

**Response:** `200 OK`

---

#### `GET /message/chat/{chatId}`

Lấy danh sách tin nhắn trong chat.

**Path Parameters:** `chatId` (string, bắt buộc)

**Query Parameters**

| Tên | Kiểu | Mặc định | Mô tả |
|-----|------|----------|-------|
| `keywords` | string | `""` | Tìm kiếm nội dung |
| `page` | integer | `0` | Số trang |
| `size` | integer | `10` | Kích thước trang |
| `ascSort` | boolean | `true` | Sắp xếp tăng dần |
| `type` | string | `ALL` | Loại tin nhắn |
| `senderId` | string | `""` | Lọc theo người gửi |
| `sentDateStart` | date-time | — | Lọc từ ngày gửi |
| `sentDateEnd` | date-time | — | Lọc đến ngày gửi |

**Response:** `200 OK`

---

#### `GET /message/{messageId}/resource`

Lấy file đính kèm của tin nhắn.

**Path Parameters:** `messageId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `POST /message/resource/upload`

Gửi tin nhắn kèm file.

**Headers**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `chatId` | string | Có | ID chat |
| `type` | string | Có | Loại file |

**Request Body:** `multipart/form-data` — trường `file` (binary)

**Response:** `200 OK`

---

### Admin — Chats

---

#### `GET /admin/chat`

Lấy toàn bộ danh sách chat (admin).

**Query Parameters**

| Tên | Kiểu | Mặc định |
|-----|------|----------|
| `keywords` | string | — |
| `page` | integer | `0` |
| `size` | integer | `10` |
| `ascSort` | boolean | `true` |
| `status` | boolean | — |
| `type` | string | — |
| `initiatorId` | string | — |
| `createdDateStart` | date-time | — |
| `createdDateEnd` | date-time | — |

**Response:** `200 OK`

---

#### `POST /admin/chat`

Tạo chat (admin).

**Request Body**
```json
{
  "type": "string",
  "name": "string",
  "initiatorId": "string"
}
```

**Response:** `200 OK`

---

#### `GET /admin/chat/{chatId}`

Lấy chat theo ID (admin).

**Path Parameters:** `chatId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `PUT /admin/chat/{chatId}`

Cập nhật chat (admin).

**Path Parameters:** `chatId` (string, bắt buộc)

**Request Body**
```json
{
  "type": "string",
  "name": "string",
  "initiatorId": "string"
}
```

**Response:** `200 OK`

---

#### `DELETE /admin/chat/{chatId}`

Xoá chat (admin).

**Path Parameters:** `chatId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `PATCH /admin/chat/{chatId}/status`

Bật/tắt trạng thái chat (admin).

**Path Parameters:** `chatId` (string, bắt buộc)

**Request Body:** `boolean`

**Response:** `200 OK`

---

### Admin — Members

---

#### `GET /admin/member`

Lấy danh sách thành viên (admin).

**Response:** `200 OK`

---

#### `POST /admin/member`

Thêm thành viên (admin).

**Request Body**
```json
{
  "memberId": "string",
  "chatId": "string",
  "role": "string",
  "nickname": "string",
  "inviterId": "string"
}
```

**Response:** `200 OK`

---

#### `GET /admin/member/{memberId}/chat/{chatId}`

Lấy thành viên theo memberId và chatId (admin).

**Path Parameters:** `memberId`, `chatId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `PUT /admin/member/{memberId}/chat/{chatId}`

Cập nhật thành viên (admin).

**Path Parameters:** `memberId`, `chatId` (string, bắt buộc)

**Request Body**
```json
{
  "memberId": "string",
  "chatId": "string",
  "role": "string",
  "nickname": "string",
  "inviterId": "string"
}
```

**Response:** `200 OK`

---

#### `DELETE /admin/member/{memberId}/chat/{chatId}`

Xoá thành viên (admin).

**Path Parameters:** `memberId`, `chatId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `PATCH /admin/member/{memberId}/chat/{chatId}/role`

Cập nhật vai trò thành viên (admin).

**Path Parameters:** `memberId`, `chatId` (string, bắt buộc)

**Request Body**
```json
{
  "role": "string"
}
```

**Response:** `200 OK`

---

#### `PATCH /admin/member/{memberId}/chat/{chatId}/nickname`

Cập nhật biệt danh thành viên (admin).

**Path Parameters:** `memberId`, `chatId` (string, bắt buộc)

**Request Body**
```json
{
  "nickname": "string"
}
```

**Response:** `200 OK`

---

#### `GET /admin/member/{memberId}`

Lấy danh sách chat của một thành viên (admin).

**Path Parameters:** `memberId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `GET /admin/member/chat/{chatId}`

Lấy danh sách thành viên trong chat (admin).

**Path Parameters:** `chatId` (string, bắt buộc)

**Response:** `200 OK`

---

### Admin — Messages

---

#### `GET /admin/message`

Lấy toàn bộ tin nhắn (admin).

**Query Parameters**

| Tên | Kiểu | Mặc định |
|-----|------|----------|
| `keywords` | string | `""` |
| `page` | integer | `0` |
| `size` | integer | `10` |
| `ascSort` | boolean | `true` |
| `status` | boolean | — |
| `state` | string | — |
| `type` | string | — |
| `sentDateStart` | date-time | — |
| `sentDateEnd` | date-time | — |
| `removedDateStart` | date-time | — |
| `removedDateEnd` | date-time | — |
| `createdDateStart` | date-time | — |
| `createdDateEnd` | date-time | — |

**Response:** `200 OK`

---

#### `POST /admin/message`

Gửi tin nhắn (admin).

**Request Body**
```json
{
  "chatId": "string",
  "content": "string",
  "senderId": "string"
}
```

**Response:** `200 OK`

---

#### `GET /admin/message/{messageId}`

Lấy tin nhắn theo ID (admin).

**Path Parameters:** `messageId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `PUT /admin/message/{messageId}/edit`

Chỉnh sửa tin nhắn (admin).

**Path Parameters:** `messageId` (string, bắt buộc)

**Request Body**
```json
{
  "content": "string"
}
```

**Response:** `200 OK`

---

#### `DELETE /admin/message/{messageId}`

Xoá cứng tin nhắn — hard delete (admin).

**Path Parameters:** `messageId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `DELETE /admin/message/{messageId}/remove`

Xoá mềm tin nhắn — soft delete (admin).

**Path Parameters:** `messageId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `PATCH /admin/message/{messageId}/activate`

Khôi phục tin nhắn đã xoá mềm (admin).

**Path Parameters:** `messageId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `GET /admin/message/chat/{chatId}`

Lấy tin nhắn theo chat (admin).

**Path Parameters:** `chatId` (string, bắt buộc)

**Query Parameters:** tương tự `GET /admin/message`

**Response:** `200 OK`

---

#### `GET /admin/message/sender/{senderId}`

Lấy tin nhắn theo người gửi (admin).

**Path Parameters:** `senderId` (string, bắt buộc)

**Query Parameters:** tương tự `GET /admin/message`

**Response:** `200 OK`

---

#### `POST /admin/message/resource/upload`

Gửi tin nhắn file (admin).

**Headers**

| Tên | Kiểu | Bắt buộc |
|-----|------|----------|
| `senderId` | string | Có |
| `chatId` | string | Có |
| `type` | string | Có |

**Request Body:** `multipart/form-data` — trường `file` (binary)

**Response:** `200 OK`

---

#### `GET /admin/message/{messageId}/resource`

Lấy file đính kèm (admin).

**Path Parameters:** `messageId` (string, bắt buộc)

**Response:** `200 OK`

---

*Tài liệu này được tạo tự động từ OpenAPI spec v0.*
