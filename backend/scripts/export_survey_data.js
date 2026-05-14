/**
 * 问卷数据导出脚本
 *
 * 用法: node export_survey_data.js [pairId]
 *
 * 不带参数时导出所有结对的热身问卷和结束测试信息
 * 带pairId参数时只导出该结对的问卷数据
 *
 * 输出格式: 方便AI处理且具有可读性的Markdown格式
 */

const pool = require('../models/pool');
require('dotenv').config({ path: '../config/.env' });

// 格式化日期
function formatDate(date) {
  if (!date) return '未知时间';
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 格式化用户角色
function formatRole(role) {
  return role === 'teacher' ? '教师' : '学生';
}

// 导出热身问卷数据
async function exportPreSurveyData(pairId = null) {
  let query = `
    SELECT
      p.id as pair_id,
      p.teacher_id,
      p.student_id,
      pq.id as question_id,
      pq.question,
      pq.correct_index,
      pq.position,
      pr.user_id,
      pr.selected_index,
      pr.is_correct,
      pr.answered_at
    FROM pairs p
    JOIN pre_questions pq ON pq.pair_id = p.id
    LEFT JOIN pre_responses pr ON pr.question_id = pq.id
    WHERE 1=1
  `;

  const params = [];
  if (pairId) {
    query += ` AND p.id = $1`;
    params.push(pairId);
  }

  query += ` ORDER BY p.id, pq.position, pr.user_id`;

  const result = await pool.query(query, params);
  return result.rows;
}

// 导出对话后问卷数据
async function exportPostSurveyData(pairId = null) {
  // 去重：每个pair只取最新的那一份问卷，每个用户只取最新回答
  let query = `
    WITH latest_survey_per_pair AS (
      SELECT DISTINCT ON (pair_id)
        id as survey_id,
        pair_id,
        questions,
        status
      FROM post_surveys
  `;

  if (pairId) {
    query += ` WHERE pair_id = $1`;
  }

  query += `
      ORDER BY pair_id, created_at DESC
    ),
    latest_responses AS (
      SELECT DISTINCT ON (survey_id, user_id)
        survey_id,
        user_id,
        user_role,
        answers,
        score,
        ai_review_result,
        submitted_at,
        pair_id
      FROM post_responses
      ORDER BY survey_id, user_id, submitted_at DESC
    )
    SELECT
      p.id as pair_id,
      p.teacher_id,
      p.student_id,
      lsp.survey_id,
      lsp.questions,
      lsp.status,
      lr.user_id,
      lr.user_role,
      lr.answers,
      lr.score,
      lr.ai_review_result,
      lr.submitted_at,
      lr.pair_id
    FROM pairs p
    JOIN latest_survey_per_pair lsp ON lsp.pair_id = p.id
    LEFT JOIN latest_responses lr ON lr.survey_id = lsp.survey_id
    WHERE 1=1
  `;

  const params = [];
  if (pairId) {
    query += ` AND p.id = $${params.length + 1}`;
    params.push(pairId);
  }

  query += ` ORDER BY p.id, lr.user_id`;

  const result = await pool.query(query, params);
  return result.rows;
}

// 获取用户名
async function getUsernames(userIds) {
  if (!userIds || userIds.length === 0) return {};
  const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
  const result = await pool.query(
    `SELECT id, username FROM users WHERE id IN (${placeholders})`,
    userIds
  );
  const map = {};
  result.rows.forEach(row => { map[row.id] = row.username; });
  return map;
}

// 生成热身问卷报告
function generatePreSurveyReport(data, usernames) {
  if (!data || data.length === 0) {
    return '## 热身问卷\n\n暂无热身问卷数据\n';
  }

  // 按pair分组
  const pairMap = new Map();
  data.forEach(row => {
    if (!pairMap.has(row.pair_id)) {
      pairMap.set(row.pair_id, {
        teacher_id: row.teacher_id,
        student_id: row.student_id,
        questions: new Map(),
        responses: []
      });
    }
    const pair = pairMap.get(row.pair_id);

    // 题目
    const qKey = row.question_id;
    if (!pair.questions.has(qKey)) {
      const qData = typeof row.question === 'string' ? JSON.parse(row.question) : row.question;
      pair.questions.set(qKey, {
        id: row.question_id,
        position: row.position,
        questionText: qData.question || qData,
        options: qData.options || [],
        topic: qData.topic || '未知',
        correct_index: row.correct_index
      });
    }

    // 回答
    if (row.user_id) {
      pair.responses.push({
        user_id: row.user_id,
        question_id: row.question_id,
        selected_index: row.selected_index,
        is_correct: row.is_correct,
        answered_at: row.answered_at
      });
    }
  });

  let report = '## 热身问卷报告\n\n';
  report += `> 生成时间: ${formatDate(new Date())}\n\n`;

  let pairNum = 1;
  for (const [pairId, pair] of pairMap) {
    const teacherName = usernames[pair.teacher_id] || `User_${pair.teacher_id}`;
    const studentName = usernames[pair.student_id] || `User_${pair.student_id}`;

    report += `### 结对 #${pairNum} (ID: ${pairId})\n\n`;
    report += `- 教师: ${teacherName}\n`;
    report += `- 学生: ${studentName}\n\n`;

    // 题目列表
    report += `#### 题目概览\n\n`;
    report += `| # | 题目 | 正确答案 | 题目领域 |\n`;
    report += `|---|------|----------|----------|\n`;

    const sortedQuestions = Array.from(pair.questions.values()).sort((a, b) => a.position - b.position);
    sortedQuestions.forEach(q => {
      const topic = q.topic || '未知';
      const correctAnswer = q.correct_index === -1 ? '无' : String.fromCharCode(65 + q.correct_index);
      report += `| ${q.position} | ${q.questionText.substring(0, 50)}${q.questionText.length > 50 ? '...' : ''} | ${correctAnswer} | ${topic} |\n`;
    });

    report += '\n';

    // 详细题目和回答
    report += `#### 题目详情与用户回答\n\n`;

    sortedQuestions.forEach(q => {
      const options = q.options || [];

      report += `--- \n\n`;
      report += `**题目 ${q.position}:** ${q.questionText}\n\n`;

      report += `**选项:**\n`;
      options.forEach((opt, idx) => {
        const marker = q.correct_index === -1 ? '' : (idx === q.correct_index ? ' ✅ (正确答案)' : '');
        report += `- ${String.fromCharCode(65 + idx)}. ${opt}${marker}\n`;
      });

      // 该题的用户回答
      const questionResponses = pair.responses.filter(r => r.question_id === q.id);
      if (questionResponses.length > 0) {
        report += `\n**用户回答:**\n`;
        questionResponses.forEach(r => {
          const userName = usernames[r.user_id] || `User_${r.user_id}`;
          const isCorrect = r.is_correct ? '✅ 正确' : '❌ 错误';
          const selectedOption = options[r.selected_index] || '未知选项';
          report += `- ${userName}: ${String.fromCharCode(65 + r.selected_index)}. ${selectedOption} ${isCorrect}\n`;
        });
      } else {
        report += `\n**用户回答:** 暂无\n`;
      }

      report += '\n';
    });

    pairNum++;
  }

  return report;
}

// 生成对话后问卷报告
function generatePostSurveyReport(data, usernames) {
  if (!data || data.length === 0) {
    return '## 对话后问卷报告\n\n暂无问卷数据\n';
  }

  // 按survey分组
  const surveyMap = new Map();
  data.forEach(row => {
    const surveyKey = row.survey_id;
    if (!surveyMap.has(surveyKey)) {
      const questions = typeof row.questions === 'string' ? JSON.parse(row.questions) : row.questions;
      surveyMap.set(surveyKey, {
        pair_id: row.pair_id,
        teacher_id: row.teacher_id,
        student_id: row.student_id,
        questions: questions,
        responses: []
      });
    }

    if (row.user_id) {
      const answers = typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers;
      const aiReview = typeof row.ai_review_result === 'string'
        ? JSON.parse(row.ai_review_result)
        : row.ai_review_result;

      surveyMap.get(surveyKey).responses.push({
        user_id: row.user_id,
        user_role: row.user_role,
        score: row.score,
        answers: answers,
        ai_review: aiReview,
        submitted_at: row.submitted_at
      });
    }
  });

  let report = '## 对话后问卷报告\n\n';
  report += `> 生成时间: ${formatDate(new Date())}\n\n`;

  let surveyNum = 1;
  for (const [surveyId, survey] of surveyMap) {
    const teacherName = usernames[survey.teacher_id] || `User_${survey.teacher_id}`;
    const studentName = usernames[survey.student_id] || `User_${survey.student_id}`;

    report += `### 问卷 #${surveyNum} (Survey ID: ${surveyId}, Pair ID: ${survey.pair_id})\n\n`;
    report += `- 教师: ${teacherName}\n`;
    report += `- 学生: ${studentName}\n`;
    report += `- 状态: ${survey.status}\n\n`;

    // 题目列表
    report += `#### 题目概览\n\n`;
    report += `| # | 题目 | 正确答案 | 难度 |\n`;
    report += `|---|------|----------|------|\n`;

    survey.questions.forEach((q, idx) => {
      const difficulty = q.difficulty || '未知';
      report += `| ${idx + 1} | ${(q.question || '').substring(0, 50)}${q.question && q.question.length > 50 ? '...' : ''} | ${String.fromCharCode(65 + (q.correct_index || 0))} | ${difficulty} |\n`;
    });

    report += '\n';

    // 详细题目和回答
    report += `#### 题目详情与用户回答\n\n`;

    survey.questions.forEach((q, idx) => {
      const options = q.options || [];
      const correctIdx = q.correct_index;

      report += `--- \n\n`;
      report += `**题目 ${idx + 1}:** ${q.question}\n\n`;

      report += `**选项:**\n`;
      options.forEach((opt, optIdx) => {
        const marker = optIdx === correctIdx ? ' ✅ (正确答案)' : '';
        report += `- ${String.fromCharCode(65 + optIdx)}. ${opt}${marker}\n`;
      });

      if (q.topic) {
        report += `\n**知识点:** ${q.topic}\n`;
      }
      if (q.difficulty) {
        report += `**难度:** ${q.difficulty}\n`;
      }

      report += '\n';
    });

    // 用户回答详情
    if (survey.responses.length > 0) {
      report += `#### 用户回答详情\n\n`;

      survey.responses.forEach(resp => {
        const userName = usernames[resp.user_id] || `User_${resp.user_id}`;
        const roleLabel = formatRole(resp.user_role);
        const scorePercent = resp.score !== null ? (resp.score * 100).toFixed(0) : 'N/A';

        report += `--- \n\n`;
        report += `**用户:** ${userName} (${roleLabel})\n`;
        report += `**得分率:** ${scorePercent}%\n`;
        report += `**提交时间:** ${formatDate(resp.submitted_at)}\n\n`;

        if (resp.answers && resp.answers.length > 0) {
          report += `**回答详情:**\n\n`;
          report += `| # | 我的选择 | 是否正确 | 解析 |\n`;
          report += `|---|----------|----------|------|\n`;

          resp.answers.forEach((ans, idx) => {
            const question = survey.questions[idx] || {};
            const options = question.options || [];
            const myChoice = options[ans.selected_index] || '未知选项';
            const isCorrect = ans.is_correct ? '✅' : '❌';
            const explanation = ans.feedback || question.explanation || (ans.is_correct ? '正确' : '无解析');

            report += `| ${idx + 1} | ${String.fromCharCode(65 + ans.selected_index)}. ${myChoice} | ${isCorrect} | ${explanation} |\n`;
          });

          report += '\n';

          // AI评语
          if (resp.ai_review && resp.ai_review.overall_comment) {
            report += `**AI整体评语:**\n`;
            report += `${resp.ai_review.overall_comment}\n\n`;
          }
        }
      });
    }

    surveyNum++;
  }

  return report;
}

// 主函数
async function main() {
  const pairId = process.argv[2] ? parseInt(process.argv[2]) : null;

  console.log('='.repeat(60));
  console.log('问卷数据导出工具');
  console.log('='.repeat(60));
  console.log();

  if (pairId) {
    console.log(`正在导出结对 ID:${pairId} 的问卷数据...`);
  } else {
    console.log('正在导出所有问卷数据...');
  }
  console.log();

  try {
    // 获取热身问卷数据
    console.log('📊 正在获取热身问卷数据...');
    const preData = await exportPreSurveyData(pairId);

    // 获取对话后问卷数据
    console.log('📊 正在获取对话后问卷数据...');
    const postData = await exportPostSurveyData(pairId);

    // 获取所有涉及的用户名
    const allUserIds = new Set();
    [...preData, ...postData].forEach(row => {
      if (row.teacher_id) allUserIds.add(row.teacher_id);
      if (row.student_id) allUserIds.add(row.student_id);
      if (row.user_id) allUserIds.add(row.user_id);
    });
    const usernames = await getUsernames(Array.from(allUserIds));

    // 生成报告
    console.log('📝 正在生成报告...\n');

    const preReport = generatePreSurveyReport(preData, usernames);
    const postReport = generatePostSurveyReport(postData, usernames);

    // 输出
    console.log('# 问卷数据导出报告\n');
    console.log('='.repeat(60));
    console.log();
    console.log(preReport);
    console.log('\n---\n');
    console.log(postReport);

    // 同时输出到文件
    const fs = require('fs');
    const outputFile = pairId
      ? `survey_export_pair_${pairId}_${Date.now()}.md`
      : `survey_export_all_${Date.now()}.md`;

    fs.writeFileSync(outputFile, `# 问卷数据导出报告

> 生成时间: ${formatDate(new Date())}
${pairId ? `\n> 结对ID: ${pairId}` : '\n> 范围: 所有结对'}

${'='.repeat(60)}

${preReport}

${'='.repeat(60)}

${postReport}
`);

    console.log();
    console.log('='.repeat(60));
    console.log(`✅ 报告已保存到: ${outputFile}`);

  } catch (error) {
    console.error('❌ 导出失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();