# 用户信息系统 API（资料与偏好）

## 概述
用户资料（昵称、简介、头像）与**细化偏好**接口：
- **感兴趣学科**：用户感兴趣的学科（来自 `topics` 表）
- **擅长学科**：用户擅长的学科（来自 `topics` 表）
- **难度偏好**：用户偏好的题目难度（来自 `tags` 表，`category='difficulty'`，如：简单、中等、偏难、极难）

## 认证
除「获取指定用户资料」「获取学科列表」「获取难度标签」外，其余接口需在请求头中携带：
```
Authorization: Bearer <token>
```

---

## 1. 获取当前用户资料

### GET /api/users/me/profile

需要登录。返回当前用户的公开信息（含感兴趣学科、擅长学科、难度偏好）。

**成功响应 (200 OK):**
```json
{
  "success": true,
  "profile": {
    "id": 1,
    "username": "alice",
    "nickname": "小明",
    "bio": "喜欢数学与编程",
    "avatar_url": "https://...",
    "interested_topics": [
      { "id": 1, "name": "数学" },
      { "id": 3, "name": "编程" }
    ],
    "proficient_topics": [
      { "id": 3, "name": "编程" }
    ],
    "difficulty_preferences": [
      { "id": 12, "name": "简单" },
      { "id": 13, "name": "中等" }
    ]
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| interested_topics | array | 感兴趣学科，元素为 `{ id, name }` |
| proficient_topics | array | 擅长学科，元素为 `{ id, name }` |
| difficulty_preferences | array | 难度偏好，元素为 `{ id, name }`（对应 tags 中 difficulty 分类） |

---

## 2. 更新当前用户资料

### PATCH /api/users/me/profile

需要登录。仅更新请求体中提供的字段（部分更新）。

**请求体示例：**
```json
{
  "nickname": "新昵称",
  "bio": "个人简介",
  "avatar_url": "https://example.com/avatar.png",
  "interested_topic_ids": [1, 3, 5],
  "proficient_topic_ids": [3, 5],
  "difficulty_tag_ids": [12, 13]
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | 否 | 昵称，空字符串会清空 |
| bio | string | 否 | 简介，空字符串会清空 |
| avatar_url | string | 否 | 头像 URL，空字符串会清空 |
| interested_topic_ids | number[] | 否 | 感兴趣学科（topic id 数组），整体替换 |
| proficient_topic_ids | number[] | 否 | 擅长学科（topic id 数组），整体替换 |
| difficulty_tag_ids | number[] | 否 | 难度偏好（tags 中 difficulty 的 id 数组），整体替换 |

**成功响应 (200 OK):**
```json
{
  "success": true,
  "message": "资料已更新",
  "profile": { ... }
}
```

---

## 3. 获取指定用户公开资料

### GET /api/users/:userId/profile

无需登录。返回某用户的公开资料（含感兴趣学科、擅长学科、难度偏好）。

**路径参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| userId | number | 用户 ID |

**成功响应 (200 OK):**
```json
{
  "success": true,
  "profile": {
    "id": 1,
    "username": "alice",
    "nickname": "小明",
    "bio": "喜欢数学与编程",
    "avatar_url": null,
    "interested_topics": [{ "id": 1, "name": "数学" }],
    "proficient_topics": [{ "id": 3, "name": "编程" }],
    "difficulty_preferences": [{ "id": 12, "name": "简单" }]
  }
}
```

---

## 4. 获取学科列表

### GET /api/topics

无需登录。返回所有学科（与结对使用的 `topics` 一致），用于**感兴趣学科 / 擅长学科**选择、结对选择学科等。

**成功响应 (200 OK):**
```json
{
  "success": true,
  "topics": [
    { "id": 1, "name": "数学" },
    { "id": 2, "name": "英语" },
    { "id": 3, "name": "编程" }
  ]
}
```

---

## 5. 获取难度标签列表

### GET /api/tags/difficulty

无需登录。返回所有难度标签（`tags` 中 `category='difficulty'`），用于**难度偏好**选择。

**成功响应 (200 OK):**
```json
{
  "success": true,
  "tags": [
    { "id": 12, "name": "简单" },
    { "id": 13, "name": "中等" },
    { "id": 14, "name": "偏难" },
    { "id": 15, "name": "极难" }
  ]
}
```

---

## 数据说明

- **感兴趣学科 / 擅长学科**：来自 `topics` 表，与结对申请时的学科一致；可多选，更新时传对应 id 数组会整体替换。
- **难度偏好**：来自 `tags` 表中 `category='difficulty'` 的标签（如简单、中等、偏难、极难）；更新时传 `difficulty_tag_ids` 会整体替换。
- **获取可用用户列表**（`GET /api/users/available`）的返回中已包含 `nickname` 字段（有则返回，无则为 `null`）。
