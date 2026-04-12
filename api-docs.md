# API Documentation

> **Version:** v0  
> **Authentication:** Bearer JWT — tất cả các endpoint (trừ auth) yêu cầu header `Authorization: Bearer <token>`

---

## Mục lục

- [User Service](#user-service)
  - [Authentication](#authentication)
  - [Accounts](#accounts)
  - [User Profiles](#user-profiles)
- [Social Service](#social-service)
  - [Friend Requests (User)](#friend-requests-user)
  - [Friendships (User)](#friendships-user)
  - [Blocks (User)](#blocks-user)
  - [Admin — Friend Requests](#admin--friend-requests)
  - [Admin — Friendships](#admin--friendships)
  - [Admin — Blocks](#admin--blocks)
- [Chat Service](#chat-service)
  - [Chats (User)](#chats-user)
  - [Members (User)](#members-user)
  - [Messages (User)](#messages-user)
  - [Admin — Chats](#admin--chats)
  - [Admin — Members](#admin--members)
  - [Admin — Messages](#admin--messages)

---

## User Service

**Base URL:** `http://localhost:8080/user-service`

---

### Authentication

Các endpoint xác thực **không yêu cầu JWT**.

---

#### `POST /auth/signup`

Đăng ký tài khoản mới.

**Request Body**
```json
{
  "username": "string",
  "password": "string",
  "email": "string"
}
```

**Response:** `200 OK`

---

#### `POST /auth/login`

Đăng nhập và nhận access token + refresh token.

**Request Body**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:** `200 OK`

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

### Accounts

🔒 Yêu cầu JWT

---

#### `GET /account`

Lấy danh sách tài khoản.

**Query Parameters**

| Tên | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-----|------|----------|----------|-------|
| `keywords` | string | Không | `""` | Tìm kiếm theo từ khoá |
| `page` | integer | Không | `0` | Số trang |
| `size` | integer | Không | `10` | Kích thước trang |
| `status` | integer | Không | `0` | Trạng thái tài khoản |
| `ascSort` | boolean | Không | `true` | Sắp xếp tăng dần |

**Response:** `200 OK`

---

#### `POST /account`

Tạo tài khoản mới.

**Request Body**
```json
{
  "role": "string",
  "username": "string",
  "password": "string"
}
```

**Response:** `200 OK`

---

#### `GET /account/{id}`

Lấy tài khoản theo ID.

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `id` | string | Có | ID tài khoản |

**Response:** `200 OK`

---

#### `PUT /account/{id}`

Cập nhật tài khoản.

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `id` | string | Có | ID tài khoản |

**Request Body**
```json
{
  "role": "string",
  "username": "string",
  "password": "string"
}
```

**Response:** `200 OK`

---

#### `DELETE /account/{id}`

Xoá tài khoản.

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `id` | string | Có | ID tài khoản |

**Response:** `200 OK`

---

#### `PATCH /account/{id}/status/{status}`

Cập nhật trạng thái tài khoản (kích hoạt / vô hiệu hoá).

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `id` | string | Có | ID tài khoản |
| `status` | boolean | Có | `true` = kích hoạt, `false` = vô hiệu hoá |

**Response:** `200 OK`

---

### User Profiles

🔒 Yêu cầu JWT

---

#### `GET /user/me`

Lấy thông tin profile của người dùng hiện tại.

**Headers**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `X-Account-Id` | string | Không | ID tài khoản |

**Response:** `200 OK`

---

#### `GET /user`

Lấy danh sách profile người dùng.

**Query Parameters**

| Tên | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-----|------|----------|----------|-------|
| `keywords` | string | Không | `""` | Tìm kiếm theo từ khoá |
| `page` | integer | Không | `0` | Số trang |
| `size` | integer | Không | `10` | Kích thước trang |
| `gender` | integer | Không | `0` | Giới tính |
| `dateOfBirthStart` | date | Không | — | Ngày sinh từ |
| `dateOfBirthEnd` | date | Không | — | Ngày sinh đến |
| `ascSort` | boolean | Không | `true` | Sắp xếp tăng dần |

**Response:** `200 OK`

---

#### `POST /user`

Tạo profile người dùng mới kèm tài khoản.

**Request Body**
```json
{
  "account": {
    "role": "string",
    "username": "string",
    "password": "string"
  },
  "userProfile": {
    "name": "string",
    "gender": true,
    "dateOfBirth": "2025-01-01",
    "email": "string",
    "phoneNumber": "string"
  }
}
```

**Response:** `200 OK`

---

#### `GET /user/{id}`

Lấy profile theo ID.

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `id` | string | Có | ID người dùng |

**Response:** `200 OK`

---

#### `PUT /user/{id}`

Cập nhật profile người dùng.

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `id` | string | Có | ID người dùng |

**Request Body**
```json
{
  "name": "string",
  "gender": true,
  "dateOfBirth": "2025-01-01",
  "email": "string",
  "phoneNumber": "string"
}
```

**Response:** `200 OK`

---

#### `DELETE /user/{id}`

Xoá profile người dùng.

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `id` | string | Có | ID người dùng |

**Response:** `200 OK`

---

#### `POST /user/account/{id}`

Thêm profile mới vào tài khoản có sẵn.

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `id` | string | Có | ID tài khoản |

**Request Body**
```json
{
  "name": "string",
  "gender": true,
  "dateOfBirth": "2025-01-01",
  "email": "string",
  "phoneNumber": "string"
}
```

**Response:** `200 OK`

---

#### `POST /user/{id}/avatar/upload`

Upload avatar người dùng.

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `id` | string | Có | ID người dùng |

**Request Body:** `multipart/form-data` — trường `file` (binary)

**Response:** `200 OK`

---

#### `GET /user/{id}/avatar`

Lấy avatar người dùng.

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `id` | string | Có | ID người dùng |

**Response:** `200 OK`

---

## Social Service

**Base URL:** `http://localhost:8080/social-service`

> Tất cả endpoint yêu cầu JWT. Header `X-Account-Id` và query `requesterId` được sử dụng để xác định người dùng thực hiện thao tác.

---

### Friend Requests (User)

---

#### `GET /friend-request`

Lấy danh sách lời mời kết bạn của người dùng hiện tại.

**Query Parameters**

| Tên | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-----|------|----------|----------|-------|
| `requesterId` | string | Không | — | ID người yêu cầu |
| `status` | string | Không | — | Trạng thái (`PENDING`, `ACCEPTED`, `REJECTED`) |
| `keywords` | string | Không | — | Từ khoá tìm kiếm |
| `page` | integer | Không | `0` | Số trang |
| `size` | integer | Không | `10` | Kích thước trang |
| `ascSort` | boolean | Không | `true` | Sắp xếp tăng dần |
| `createdDateStart` | date-time | Không | — | Lọc từ ngày tạo |
| `createdDateEnd` | date-time | Không | — | Lọc đến ngày tạo |
| `updatedDateStart` | date-time | Không | — | Lọc từ ngày cập nhật |
| `updatedDateEnd` | date-time | Không | — | Lọc đến ngày cập nhật |

**Response:** `200 OK`

---

#### `POST /friend-request`

Gửi lời mời kết bạn.

**Request Body**
```json
{
  "receiverId": "string"
}
```

**Response:** `200 OK`

---

#### `GET /friend-request/{id}`

Lấy lời mời kết bạn theo ID.

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `id` | string | Có | ID lời mời |

**Response:** `200 OK`

---

#### `DELETE /friend-request/{id}`

Huỷ lời mời kết bạn đã gửi.

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `id` | string | Có | ID lời mời |

**Response:** `200 OK`

---

#### `PATCH /friend-request/{id}/response`

Chấp nhận hoặc từ chối lời mời kết bạn.

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `id` | string | Có | ID lời mời |

**Request Body**
```json
{
  "response": "ACCEPTED | REJECTED"
}
```

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

Lấy danh sách lời mời giữa người dùng hiện tại và một người dùng cụ thể.

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `userId` | string | Có | ID người dùng kia |

**Response:** `200 OK`

---

#### `GET /friend-request/sender/{senderId}`

Lấy lời mời từ người dùng cụ thể gửi đến người dùng hiện tại.

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `senderId` | string | Có | ID người gửi |

**Response:** `200 OK`

---

#### `GET /friend-request/receiver/{receiverId}`

Lấy lời mời từ người dùng hiện tại gửi đến người dùng cụ thể.

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `receiverId` | string | Có | ID người nhận |

**Response:** `200 OK`

---

### Friendships (User)

---

#### `GET /friendship`

Lấy danh sách bạn bè.

**Query Parameters**

| Tên | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-----|------|----------|----------|-------|
| `page` | integer | Không | `0` | Số trang |
| `size` | integer | Không | `10` | Kích thước trang |
| `ascSort` | boolean | Không | `true` | Sắp xếp tăng dần |
| `createdDateStart` | date-time | Không | — | Lọc từ ngày tạo |
| `createdDateEnd` | date-time | Không | — | Lọc đến ngày tạo |

**Response:** `200 OK`

---

#### `GET /friendship/{id}`

Lấy quan hệ bạn bè theo ID.

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `id` | string | Có | ID quan hệ |

**Response:** `200 OK`

---

#### `DELETE /friendship/{id}`

Xoá quan hệ bạn bè (unfriend).

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `id` | string | Có | ID quan hệ |

**Response:** `200 OK`

---

#### `GET /friendship/user/{userId}`

Lấy quan hệ bạn bè với một người dùng cụ thể.

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `userId` | string | Có | ID người dùng kia |

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

**Response:** `200 OK`

---

#### `GET /block/{id}`

Lấy thông tin block theo ID.

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `id` | string | Có | ID block |

**Response:** `200 OK`

---

#### `DELETE /block/{id}`

Bỏ chặn người dùng.

**Path Parameters**

| Tên | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `id` | string | Có | ID block |

**Response:** `200 OK`

---

#### `GET /block/blocked`

Lấy danh sách người dùng đã bị chặn bởi người dùng hiện tại.

**Query Parameters**

| Tên | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-----|------|----------|----------|-------|
| `page` | integer | Không | `0` | Số trang |
| `size` | integer | Không | `10` | Kích thước trang |
| `ascSort` | boolean | Không | `true` | Sắp xếp tăng dần |
| `createdDateStart` | date-time | Không | — | Lọc từ ngày tạo |
| `createdDateEnd` | date-time | Không | — | Lọc đến ngày tạo |

**Response:** `200 OK`

---

### Admin — Friend Requests

> Prefix: `/admin/friend-request` — Không yêu cầu `X-Account-Id`.

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

**Response:** `200 OK`

---

#### `GET /admin/friend-request/{id}`

Lấy lời mời theo ID (admin).

**Path Parameters:** `id` (string, bắt buộc)

**Response:** `200 OK`

---

#### `DELETE /admin/friend-request/{id}`

Xoá lời mời theo ID (admin).

**Path Parameters:** `id` (string, bắt buộc)

**Response:** `200 OK`

---

#### `PATCH /admin/friend-request/{id}/response`

Phản hồi lời mời kết bạn (admin).

**Path Parameters:** `id` (string, bắt buộc)

**Request Body**
```json
{
  "response": "ACCEPTED | REJECTED"
}
```

**Response:** `200 OK`

---

#### `GET /admin/friend-request/user/{userId}`

Lấy các lời mời liên quan đến một người dùng (admin).

**Path Parameters:** `userId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `GET /admin/friend-request/sender/{senderId}`

Lấy lời mời theo người gửi (admin).

**Path Parameters:** `senderId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `GET /admin/friend-request/receiver/{receiverId}`

Lấy lời mời theo người nhận (admin).

**Path Parameters:** `receiverId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `GET /admin/friend-request/sender/{senderId}/receiver/{receiverId}`

Lấy lời mời giữa hai người dùng cụ thể theo chiều cụ thể (admin).

**Path Parameters:** `senderId`, `receiverId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `GET /admin/friend-request/first-user/{firstUserId}/second-user/{secondUserId}`

Lấy tất cả lời mời giữa hai người dùng (cả hai chiều) (admin).

**Path Parameters:** `firstUserId`, `secondUserId` (string, bắt buộc)

**Response:** `200 OK`

---

### Admin — Friendships

---

#### `GET /admin/friendship`

Lấy toàn bộ quan hệ bạn bè (admin).

**Response:** `200 OK`

---

#### `POST /admin/friendship`

Tạo quan hệ bạn bè (admin).

**Request Body**
```json
{
  "firstUserId": "string",
  "secondUserId": "string"
}
```

**Response:** `200 OK`

---

#### `GET /admin/friendship/{id}`

Lấy quan hệ theo ID (admin).

**Path Parameters:** `id` (string, bắt buộc)

**Response:** `200 OK`

---

#### `DELETE /admin/friendship/{id}`

Xoá quan hệ bạn bè (admin).

**Path Parameters:** `id` (string, bắt buộc)

**Response:** `200 OK`

---

#### `GET /admin/friendship/user/{userId}`

Lấy danh sách bạn bè của một người dùng (admin).

**Path Parameters:** `userId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `GET /admin/friendship/first-user/{firstUserId}/second-user/{secondUserId}`

Kiểm tra quan hệ bạn bè giữa hai người dùng (admin).

**Path Parameters:** `firstUserId`, `secondUserId` (string, bắt buộc)

**Response:** `200 OK`

---

### Admin — Blocks

---

#### `GET /admin/block`

Lấy toàn bộ danh sách block (admin).

**Query Parameters**

| Tên | Kiểu | Mặc định |
|-----|------|----------|
| `page` | integer | `0` |
| `size` | integer | `10` |
| `ascSort` | boolean | `true` |
| `createdDateStart` | date-time | — |
| `createdDateEnd` | date-time | — |

**Response:** `200 OK`

---

#### `POST /admin/block`

Tạo block (admin).

**Request Body**
```json
{
  "blockerId": "string",
  "blockedId": "string"
}
```

**Response:** `200 OK`

---

#### `GET /admin/block/{id}`

Lấy block theo ID (admin).

**Path Parameters:** `id` (string, bắt buộc)

**Response:** `200 OK`

---

#### `DELETE /admin/block/{id}`

Xoá block (admin).

**Path Parameters:** `id` (string, bắt buộc)

**Response:** `200 OK`

---

#### `GET /admin/block/user/{userId}/blocker`

Lấy danh sách người đã chặn user (admin).

**Path Parameters:** `userId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `GET /admin/block/user/{userId}/blocked`

Lấy danh sách người bị user chặn (admin).

**Path Parameters:** `userId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `GET /admin/block/blocker/{blockerId}/blocked/{blockedId}`

Kiểm tra xem blocker có chặn blocked không (admin).

**Path Parameters:** `blockerId`, `blockedId` (string, bắt buộc)

**Response:** `200 OK`

---

## Chat Service

**Base URL:** `http://localhost:8080/chat-service`

> Tất cả endpoint yêu cầu JWT. Header `X-Account-Id` và query `requesterId` xác định người dùng thực hiện thao tác.

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

**Response:** `200 OK`

---

#### `GET /chat/{chatId}`

Lấy thông tin chat theo ID.

**Path Parameters:** `chatId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `DELETE /chat/{chatId}/deactivate`

Vô hiệu hoá chat.

**Path Parameters:** `chatId` (string, bắt buộc)

**Response:** `200 OK`

---

#### `PATCH /chat/{chatId}/name`

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
