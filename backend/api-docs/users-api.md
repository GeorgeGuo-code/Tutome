# Users API 文档

## 概述
用户管理相关接口，包括用户注册、登录和令牌验证。

## 认证方式
部分接口需要 JWT 认证。在请求头中添加：
```
Authorization: Bearer <token>
```

---

## 1. 用户注册

### POST /api/register

注册新用户账号。

**请求头：**
```
Content-Type: application/json
```

**请求体：**
```json
{
  "username": "string",
  "password": "string"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

**成功响应 (200 OK):**
```json
{
  "success": true,
  "message": "用户注册成功"
}
```

**失败响应 (400 Bad Request):**
```json
{
  "success": false,
  "message": "用户名已存在"
}
```
或
```json
{
  "success": false,
  "message": "用户名和密码是必填项"
}
```

**错误响应 (500 Internal Server Error):**
```json
{
  "success": false,
  "message": "服务器错误",
  "error": "详细错误信息"
}
```

---

## 2. 用户登录

### POST /api/login

用户登录，获取访问令牌。

**请求头：**
```
Content-Type: application/json
```

**请求体：**
```json
{
  "username": "string",
  "password": "string"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

**成功响应 (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| token | string | JWT 访问令牌，有效期为 1 小时 |

**失败响应 (400 Bad Request):**
```json
"用户名或密码错误"
```

**错误响应 (500 Internal Server Error):**
```json
"密码验证时发生错误"
```

---

## 3. 验证令牌

### POST /api/verify-token

验证 JWT 令牌是否有效。

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**成功响应 (200 OK):**
```json
{
  "message": "Token is valid",
  "user": {
    "userId": 123
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| message | string | 验证结果消息 |
| user.userId | number | 用户ID |

**失败响应 (401 Unauthorized):**
```json
{
  "message": "No token provided"
}
```
或
```json
{
  "message": "Invalid or expired token"
}
```

---

## 4. 修改密码

### PATCH /api/:userId/password

修改用户密码，需要 JWT 认证。

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**路径参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | number | 是 | 用户ID |

**请求体：**
```json
{
  "currentPassword": "string",
  "newPassword": "string",
  "confirmPassword": "string"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| currentPassword | string | 是 | 当前密码 |
| newPassword | string | 是 | 新密码 |
| confirmPassword | string | 是 | 确认新密码 |

**成功响应 (200 OK):**
```json
{
  "success": true,
  "message": "密码更新成功"
}
```

**失败响应 (400 Bad Request):**
```json
{
  "success": false,
  "message": "新密码和确认密码不一致"
}
```
或
```json
{
  "success": false,
  "message": "用户不存在"
}
```
或
```json
{
  "success": false,
  "message": "当前密码错误"
}
```
或
```json
{
  "success": false,
  "message": "新密码不能与当前密码相同"
}
```

**错误响应 (401 Unauthorized):**
```json
{
  "message": "No token provided"
}
```
或
```json
{
  "message": "Invalid or expired token"
}
```

**错误响应 (500 Internal Server Error):**
```json
{
  "success": false,
  "message": "服务器错误",
  "error": "详细错误信息"
}
```

---

## 数据模型

### User (用户)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 用户ID |
| username | string | 用户名 |
| password | string | 加密后的密码 |

---

## 错误码说明

| HTTP 状态码 | 说明 |
|-------------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权或令牌无效 |
| 500 | 服务器内部错误 |

---

## 注意事项

1. 密码会使用 bcrypt 进行加密存储
2. JWT 令牌有效期为 1 小时
3. 登录成功后，需要在后续需要认证的接口请求头中携带令牌