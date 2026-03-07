# Chats API 文档

## 概述
教学结对与实时聊天接口

**认证方式**: 所有接口都需要 JWT Token，在请求头中携带：
```
Authorization: Bearer <your-jwt-token>
```

---

## 1. 结对管理

### 1.1 申请结对

向目标用户发起教学结对申请。

**接口**: `POST /api/pairs/apply`

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "targetUserId": 123,
  "topicId": 1,
  "role": "teacher"
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| targetUserId | number | 是 | 目标用户ID |
| topicId | number | 是 | 教学主题ID |
| role | string | 是 | 当前用户角色：`teacher`(老师) 或 `student`(学生) |

**成功响应** (201):
```json
{
  "id": 1,
  "teacher_id": 456,
  "student_id": 123,
  "topic_id": 1,
  "status": "pending",
  "created_at": "2026-02-27T10:00:00.000Z",
  "started_at": null,
  "ended_at": null,
  "your_role": "teacher",
  "partner_role": "student"
}
```

**错误响应**:
- `400 Bad Request`: 角色参数错误或已有结对存在
```json
{
  "error": "请指定角色",
  "message": "role 必须是 'teacher' 或 'student'"
}
```

- `500 Internal Server Error`: 服务器内部错误

---

### 1.2 接受结对申请

学生接受老师的结对申请，激活教学关系。

**接口**: `POST /api/pairs/accept`

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "pairId": 1
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pairId | number | 是 | 结对ID |

**成功响应** (200):
```json
{
  "success": true,
  "message": "结对成功"
}
```

**错误响应**:
- `403 Forbidden`: 无权操作或状态错误（非学生或结对状态非pending）
- `404 Not Found`: 结对不存在
- `500 Internal Server Error`: 服务器内部错误

---

### 1.3 获取我的结对列表

查询当前用户参与的所有结对（无论是老师还是学生）。

**接口**: `GET /api/pairs`

**请求头**:
```
Authorization: Bearer <token>
```

**成功响应** (200):
```json
[
  {
    "id": 1,
    "teacher_id": 456,
    "student_id": 123,
    "topic_id": 1,
    "status": "active",
    "created_at": "2026-02-27T10:00:00.000Z",
    "started_at": "2026-02-27T10:05:00.000Z",
    "ended_at": null,
    "partner_nickname": "张三",
    "topic_name": "JavaScript基础"
  }
]
```

**状态说明**:
| 状态 | 说明 |
|------|------|
| pending | 待接受 |
| active | 教学进行中 |
| completed | 已结束 |

---

## 2. 聊天消息

### 2.1 获取聊天记录

读取指定结对的所有历史消息。

**接口**: `GET /api/chats/:pairId`

**请求头**:
```
Authorization: Bearer <token>
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| pairId | number | 结对ID |

**成功响应** (200):
```json
[
  {
    "id": 1,
    "pair_id": 1,
    "sender_id": 456,
    "content": "你好，我们来开始学习吧",
    "created_at": "2026-02-27T10:06:00.000Z",
    "sender_nickname": "李老师"
  },
  {
    "id": 2,
    "pair_id": 1,
    "sender_id": 123,
    "content": "好的老师，请指教",
    "created_at": "2026-02-27T10:06:30.000Z",
    "sender_nickname": "小明"
  }
]
```

**错误响应**:
- `403 Forbidden`: 无权查看此聊天（非结对成员）
- `404 Not Found`: 结对不存在
- `500 Internal Server Error`: 服务器内部错误

---

### 2.2 发送消息

在激活的结对中发送新消息。

**接口**: `POST /api/chats/:pairId`

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| pairId | number | 结对ID |

**请求体**:
```json
{
  "content": "这个问题我明白了"
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | 是 | 消息内容 |

**成功响应** (201):
```json
{
  "id": 3,
  "pair_id": 1,
  "sender_id": 123,
  "content": "这个问题我明白了",
  "created_at": "2026-02-27T10:07:00.000Z"
}
```

**错误响应**:
- `400 Bad Request`: 结对未激活或已结束
- `403 Forbidden`: 无权发送消息（非结对成员）
- `404 Not Found`: 结对不存在
- `500 Internal Server Error`: 服务器内部错误

---

### 2.3 结束教学

学生主动结束教学会话。

**接口**: `POST /api/chats/:pairId/end`

**请求头**:
```
Authorization: Bearer <token>
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| pairId | number | 结对ID |

**成功响应** (200):
```json
{
  "id": 1,
  "teacher_id": 456,
  "student_id": 123,
  "topic_id": 1,
  "status": "completed",
  "created_at": "2026-02-27T10:00:00.000Z",
  "started_at": "2026-02-27T10:05:00.000Z",
  "ended_at": "2026-02-27T11:30:00.000Z"
}
```

**错误响应**:
- `400 Bad Request`: 结对未激活或已结束
- `403 Forbidden`: 只有学生可以结束教学
- `404 Not Found`: 结对不存在
- `500 Internal Server Error`: 服务器内部错误

---

### 2.4 获取教学用时

计算教学的持续时长。

**接口**: `GET /api/chats/:pairId/time`

**请求头**:
```
Authorization: Bearer <token>
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| pairId | number | 结对ID |

**成功响应** (200):
```json
{
  "pairId": 1,
  "timeInSeconds": 5100,
  "started_at": "2026-02-27T10:05:00.000Z",
  "ended_at": "2026-02-27T11:30:00.000Z"
}
```

**说明**:
- `timeInSeconds`: 教学总时长（秒）
- 如果教学未结束，`ended_at` 为 `null`，`timeInSeconds` 为 0

**错误响应**:
- `404 Not Found`: 结对不存在
- `500 Internal Server Error`: 服务器内部错误

---

## 错误码说明

| HTTP 状态码 | 说明 |
|-------------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 403 | 无权限操作 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 数据模型

### Pair (结对)
```typescript
{
  id: number;           // 结对ID
  teacher_id: number;   // 老师用户ID
  student_id: number;   // 学生用户ID
  topic_id: number;     // 教学主题ID
  status: string;       // 状态: pending | active | completed
  created_at: string;   // 创建时间
  started_at: string;   // 开始时间
  ended_at: string;     // 结束时间
  partner_nickname?: string;  // 对方昵称（仅在列表中返回）
  topic_name?: string;  // 主题名称（仅在列表中返回）
}
```

### Message (消息)
```typescript
{
  id: number;           // 消息ID
  pair_id: number;      // 结对ID
  sender_id: number;    // 发送者用户ID
  content: string;      // 消息内容
  created_at: string;   // 创建时间
  sender_nickname?: string;  // 发送者昵称（仅在获取记录时返回）
}
```

---

## 权限说明

| 操作 | 可执行角色 |
|------|-----------|
| 申请结对 | 任意登录用户 |
| 接受结对 | 仅结对中的学生 |
| 结束教学 | 仅结对中的学生 |
| 查看聊天 | 结对中的老师和 student |
| 发送消息 | 结对中的老师和 student |
| 查看时长 | 任意登录用户 |

---

## 使用示例

### cURL 示例

```bash
# 1. 申请结对（当前用户当老师）
curl -X POST http://localhost:3000/api/chats/pairs/apply \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetUserId": 123,
    "topicId": 1,
    "role": "teacher"
  }'

# 2. 接受结对（学生接受）
curl -X POST http://localhost:3000/api/chats/pairs/accept \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pairId": 1}'

# 3. 获取聊天记录
curl -X GET http://localhost:3000/api/chats/chats/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 4. 发送消息
curl -X POST http://localhost:3000/api/chats/chats/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "你好老师"}'

# 5. 结束教学
curl -X POST http://localhost:3000/api/chats/chats/1/end \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 注意事项

1. 所有接口必须在请求头中携带有效的 JWT Token
2. 获取聊天记录返回的消息按时间升序排列（最早的在前面）
3. 只有状态为 `active` 的结对才能发送消息
4. 只有学生可以接受结对和结束教学
5. 教学时长在结对结束后才会计算准确值