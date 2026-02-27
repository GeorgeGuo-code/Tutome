# Questions API 文档

## 概述
问题管理相关接口，包括问题的创建、查询、搜索和删除，支持标签分类和筛选。

## 认证方式
部分接口需要 JWT 认证。在请求头中添加：
```
Authorization: Bearer <token>
```

---

## 1. 获取问题列表

### GET /api/questions

获取问题列表，支持分页和按标签筛选。

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 20 | 每页数量 |
| tagId | number | 否 | - | 按标签ID筛选 |

**示例请求：**
```
GET /api/questions?page=1&limit=20
GET /api/questions?tagId=5
```

**成功响应 (200 OK):**
```json
{
  "questions": [
    {
      "id": 1,
      "title": "问题标题",
      "content": "问题内容",
      "user_id": 123,
      "username": "用户名",
      "created_at": "2026-02-27T10:00:00.000Z",
      "tags": [
        {
          "id": 1,
          "name": "标签名",
          "category": "subject"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 2. 获取所有标签

### GET /api/tags

获取所有可用的标签列表。

**成功响应 (200 OK):**
```json
{
  "tags": [
    {
      "id": 1,
      "name": "数学",
      "category": "subject"
    },
    {
      "id": 2,
      "name": "简单",
      "category": "difficulty"
    }
  ]
}
```

---

## 3. 获取按分类分组的标签

### GET /api/tags/grouped

按分类获取标签，更适合前端分类展示。

**成功响应 (200 OK):**
```json
{
  "categories": {
    "subject": [
      { "id": 1, "name": "数学" },
      { "id": 2, "name": "英语" }
    ],
    "difficulty": [
      { "id": 3, "name": "简单" },
      { "id": 4, "name": "困难" }
    ],
    "progress": [
      { "id": 5, "name": "入门" }
    ]
  }
}
```

---

## 4. 根据标签获取问题

### GET /api/tags/:tagId/questions

获取指定标签下的所有问题。

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tagId | number | 是 | 标签ID |

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 20 | 每页数量 |

**示例请求：**
```
GET /api/tags/5/questions?page=1&limit=10
```

**成功响应 (200 OK):**
```json
{
  "questions": [
    {
      "id": 1,
      "title": "问题标题",
      "content": "问题内容",
      "user_id": 123,
      "username": "用户名",
      "created_at": "2026-02-27T10:00:00.000Z",
      "tags": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

**失败响应 (400 Bad Request):**
```json
{
  "success": false,
  "message": "标签ID必须是一个正整数"
}
```

---

## 5. 创建问题

### POST /api/questions

创建新问题，需要登录认证。

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体：**
```json
{
  "title": "问题标题",
  "content": "问题详细内容",
  "tagIds": [1, 2, 3]
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 问题标题 |
| content | string | 是 | 问题内容 |
| tagIds | array | 否 | 标签ID数组 |

**标签分类规则：**
- **subject（学科）**: 至少选择 1 个，最多选择 2 个
- **difficulty（难度）**: 至少选择 1 个，最多选择 1 个
- **progress（进度）**: 至少选择 1 个，最多选择 1 个

**成功响应 (201 Created):**
```json
{
  "success": true,
  "message": "问题创建成功",
  "question": {
    "id": 1,
    "title": "问题标题",
    "content": "问题内容",
    "user_id": 123,
    "created_at": "2026-02-27T10:00:00.000Z"
  }
}
```

**失败响应 (400 Bad Request):**
```json
{
  "success": false,
  "message": "标题和内容是必填项"
}
```
或
```json
{
  "success": false,
  "message": "至少选择 1 个学科标签"
}
```

---

## 6. 获取用户的问题（公开）

### GET /api/questions/user/:userId

获取指定用户的问题列表，无需认证。

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | number | 是 | 用户ID |

**成功响应 (200 OK):**
```json
{
  "questions": [
    {
      "id": 1,
      "title": "问题标题",
      "content": "问题内容",
      "user_id": 123,
      "username": "用户名",
      "created_at": "2026-02-27T10:00:00.000Z",
      "tags": [...]
    }
  ]
}
```

---

## 7. 获取当前用户的问题

### GET /api/questions/my-questions

获取当前登录用户的问题列表，需要认证。

**请求头：**
```
Authorization: Bearer <token>
```

**成功响应 (200 OK):**
```json
{
  "questions": [
    {
      "id": 1,
      "title": "问题标题",
      "content": "问题内容",
      "user_id": 123,
      "username": "用户名",
      "created_at": "2026-02-27T10:00:00.000Z",
      "tags": [...]
    }
  ]
}
```

---

## 8. 多标签搜索

### GET /api/questions/search

### POST /api/questions/search

根据多个标签组合搜索问题，支持 GET 和 POST 两种请求方式。

**GET 请求示例：**
```
GET /api/questions/search?tags=1,2,3&page=1&limit=20
```

**POST 请求示例：**

**请求头：**
```
Content-Type: application/json
```

**请求体：**
```json
{
  "tagIds": [1, 2, 3]
}
```

**查询参数（两种方式都支持）：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 20 | 每页数量 |

**搜索标签分类规则：**
- **subject（学科）**: 至少选择 1 个，最多选择 3 个
- **difficulty（难度）**: 最多选择 2 个
- **progress（进度）**: 最多选择 1 个

**成功响应 (200 OK):**
```json
{
  "success": true,
  "questions": [
    {
      "id": 1,
      "title": "问题标题",
      "content": "问题内容",
      "user_id": 123,
      "username": "用户名",
      "created_at": "2026-02-27T10:00:00.000Z",
      "tags": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

**失败响应 (400 Bad Request):**
```json
{
  "success": false,
  "message": "至少选择 1 个学科标签"
}
```

---

## 9. 删除问题

### DELETE /api/questions/:questionId

删除指定问题，只有问题创建者才能删除，需要认证。

**请求头：**
```
Authorization: Bearer <token>
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| questionId | number | 是 | 问题ID |

**成功响应 (200 OK):**
```json
{
  "success": true,
  "message": "问题已成功删除"
}
```

**失败响应 (404 Not Found):**
```json
{
  "success": false,
  "message": "问题不存在"
}
```

**失败响应 (403 Forbidden):**
```json
{
  "success": false,
  "message": "您无权删除此问题"
}
```

---

## 数据模型

### Question (问题)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 问题ID |
| title | string | 问题标题 |
| content | string | 问题内容 |
| user_id | number | 创建者用户ID |
| username | string | 创建者用户名 |
| created_at | string | 创建时间（ISO 8601） |
| tags | array | 关联的标签列表 |

### Tag (标签)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 标签ID |
| name | string | 标签名称 |
| category | string | 标签分类（subject/difficulty/progress） |

### Pagination (分页)
| 字段 | 类型 | 说明 |
|------|------|------|
| page | number | 当前页码 |
| limit | number | 每页数量 |
| total | number | 总记录数 |
| totalPages | number | 总页数 |

---

## 错误码说明

| HTTP 状态码 | 说明 |
|-------------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权或令牌无效 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 注意事项

1. 创建问题时，标签选择必须符合分类规则
2. 删除问题只能由问题创建者操作
3. 搜索功能支持组合多个分类的标签进行筛选
4. 分页参数均为可选参数