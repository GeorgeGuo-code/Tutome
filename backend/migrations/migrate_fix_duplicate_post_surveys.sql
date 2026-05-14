-- 修复重复的 post_surveys 数据
-- 只保留每对 pair 最新的一份问卷，删除其他的

-- 1. 删除重复数据，只保留每 pair 最新的一份
DELETE FROM post_surveys
WHERE id NOT IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY pair_id ORDER BY created_at DESC) as rn
    FROM post_surveys
  ) sub WHERE rn = 1
);

-- 2. 添加唯一约束防止后续重复（PostgreSQL会自动创建唯一索引）
ALTER TABLE post_surveys ADD CONSTRAINT post_surveys_pair_id_key UNIQUE (pair_id);