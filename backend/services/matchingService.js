/**
 * 结对匹配：学习偏好、在线状态；每位候选人返回两类题目：
 * - 我出题：我的未结对题中适合与对方结对的部分
 * - 对方出题：对方的未结对题中适合我发起结对的部分
 */
const queries = require('../models/queries');
const onlineStatusModule = require('./onlineStatusService');

/** 问题 subject 标签名与 topics.name 的别名（两边命名不一致时） */
const SUBJECT_TAG_TO_TOPIC_NAME = {
  编程语言: '编程',
  编程与计算机: '编程',
  英语与学术写作: '英语',
};

function topicNameToIdMap(topics) {
  const m = new Map();
  for (const t of topics) {
    m.set(t.name, t.id);
  }
  return m;
}

function subjectTagsToTopicIds(tags, topicNameToId) {
  const subjectTags = (tags || []).filter((t) => t.category === 'subject');
  const ids = new Set();
  for (const tag of subjectTags) {
    const mappedName = SUBJECT_TAG_TO_TOPIC_NAME[tag.name] || tag.name;
    let tid = topicNameToId.get(mappedName);
    if (tid == null) {
      tid = topicNameToId.get(tag.name);
    }
    if (tid != null) ids.add(tid);
  }
  return [...ids];
}

function topicIdSetsOverlap(idsA, idsB) {
  if (!idsA.length || !idsB.length) return false;
  const setB = new Set(idsB);
  return idsA.some((id) => setB.has(id));
}

function preferenceOverlapScore(meInterestedIds, meProficientIds, themInterestedIds, themProficientIds) {
  let score = 0;
  if (topicIdSetsOverlap(meInterestedIds, themProficientIds)) {
    const a = new Set(meInterestedIds);
    const b = new Set(themProficientIds);
    for (const id of a) {
      if (b.has(id)) score += 1;
    }
  }
  if (topicIdSetsOverlap(meProficientIds, themInterestedIds)) {
    const a = new Set(meProficientIds);
    const b = new Set(themInterestedIds);
    for (const id of a) {
      if (b.has(id)) score += 1;
    }
  }
  return score;
}

/** 题目难度是否在用户设置的难度偏好内；未设置偏好则不过滤 */
function difficultyMatchesUserPrefs(questionTags, userDifficultyTagIds) {
  if (!userDifficultyTagIds.length) return true;
  const diff = (questionTags || []).find((t) => t.category === 'difficulty');
  if (!diff) return true;
  return userDifficultyTagIds.includes(diff.id);
}

/**
 * 我的题目是否适合对方（我出题 → 找对路人）
 */
function questionFitsPartner(question, partnerProfile, seeking, topicNameToId) {
  const tags = question.tags || [];
  const qTopicIds = subjectTagsToTopicIds(tags, topicNameToId);
  if (!qTopicIds.length) return { matched: false, reasons: [] };

  const partnerInterestedIds = partnerProfile.interested_topics.map((t) => t.id);
  const partnerProficientIds = partnerProfile.proficient_topics.map((t) => t.id);
  const partnerDifficultyIds = partnerProfile.difficulty_preferences.map((t) => t.id);

  const reasons = [];

  if (seeking === 'teacher') {
    if (question.role !== 'student') {
      return { matched: false, reasons: [] };
    }
    const topicOk = topicIdSetsOverlap(qTopicIds, partnerProficientIds);
    if (!topicOk) {
      return { matched: false, reasons: [] };
    }
    if (!difficultyMatchesUserPrefs(tags, partnerDifficultyIds)) {
      return { matched: false, reasons: [] };
    }
    const overlap = qTopicIds.filter((id) => partnerProficientIds.includes(id));
    overlap.forEach((id) => {
      const name = partnerProfile.proficient_topics.find((t) => t.id === id)?.name;
      if (name) reasons.push(`对方擅长「${name}」，与我的求助学科一致`);
    });
    return { matched: true, reasons };
  }

  if (seeking === 'student') {
    if (question.role !== 'teacher') {
      return { matched: false, reasons: [] };
    }
    const topicOk = topicIdSetsOverlap(qTopicIds, partnerInterestedIds);
    if (!topicOk) {
      return { matched: false, reasons: [] };
    }
    if (!difficultyMatchesUserPrefs(tags, partnerDifficultyIds)) {
      return { matched: false, reasons: [] };
    }
    const overlap = qTopicIds.filter((id) => partnerInterestedIds.includes(id));
    overlap.forEach((id) => {
      const name = partnerProfile.interested_topics.find((t) => t.id === id)?.name;
      if (name) reasons.push(`对方感兴趣「${name}」，与我的带学学科一致`);
    });
    return { matched: true, reasons };
  }

  return { matched: false, reasons: [] };
}

/**
 * 对方的题目是否适合我发起结对（对方出题 → 我找适合的人）
 * seeking=teacher：对方带学帖，学科落在我感兴趣的范围内
 * seeking=student：对方求助帖，学科落在我擅长的范围内
 */
function partnerQuestionFitsMe(question, seeking, topicNameToId, me) {
  const tags = question.tags || [];
  const qTopicIds = subjectTagsToTopicIds(tags, topicNameToId);
  if (!qTopicIds.length) return { matched: false, reasons: [] };

  const meInterestedIds = me.interested_topics.map((t) => t.id);
  const meProficientIds = me.proficient_topics.map((t) => t.id);
  const meDifficultyIds = me.difficulty_preferences.map((t) => t.id);

  const reasons = [];

  if (seeking === 'teacher') {
    if (question.role !== 'teacher') {
      return { matched: false, reasons: [] };
    }
    if (!topicIdSetsOverlap(qTopicIds, meInterestedIds)) {
      return { matched: false, reasons: [] };
    }
    if (!difficultyMatchesUserPrefs(tags, meDifficultyIds)) {
      return { matched: false, reasons: [] };
    }
    qTopicIds
      .filter((id) => meInterestedIds.includes(id))
      .forEach((id) => {
        const name = me.interested_topics.find((t) => t.id === id)?.name;
        if (name) reasons.push(`对方带学帖与我想学的「${name}」一致`);
      });
    return { matched: true, reasons };
  }

  if (seeking === 'student') {
    if (question.role !== 'student') {
      return { matched: false, reasons: [] };
    }
    if (!topicIdSetsOverlap(qTopicIds, meProficientIds)) {
      return { matched: false, reasons: [] };
    }
    if (!difficultyMatchesUserPrefs(tags, meDifficultyIds)) {
      return { matched: false, reasons: [] };
    }
    qTopicIds
      .filter((id) => meProficientIds.includes(id))
      .forEach((id) => {
        const name = me.proficient_topics.find((t) => t.id === id)?.name;
        if (name) reasons.push(`对方求助学科与您擅长的「${name}」一致`);
      });
    return { matched: true, reasons };
  }

  return { matched: false, reasons: [] };
}

function isUserOnline(userId) {
  return typeof onlineStatusModule.isUserOnline === 'function'
    ? onlineStatusModule.isUserOnline(userId)
    : false;
}

function serializeMyQuestion(q) {
  return {
    id: q.id,
    title: q.title,
    content: q.content,
    role: q.role,
    created_at: q.created_at,
    tags: q.tags,
    question_owner: 'self',
  };
}

function serializePartnerQuestion(q) {
  return {
    id: q.id,
    title: q.title,
    content: q.content,
    role: q.role,
    created_at: q.created_at,
    tags: q.tags,
    author_user_id: q.user_id,
    author_username: q.author_username,
    question_owner: 'partner',
  };
}

/**
 * @param {number} currentUserId
 * @param {object} options
 * @param {'teacher'|'student'} [options.seeking='teacher']
 * @param {boolean} [options.onlineOnly=false]
 * @param {boolean} [options.requireMatchingQuestions=false] — 两类题目合计至少 1 条
 * @param {number} [options.minPreferenceScore=0]
 */
async function findMatchingPartners(currentUserId, options = {}) {
  const seeking = options.seeking === 'student' ? 'student' : 'teacher';
  const onlineOnly = Boolean(options.onlineOnly);
  const requireMatchingQuestions = Boolean(options.requireMatchingQuestions);
  const minPreferenceScore = Number.isFinite(options.minPreferenceScore)
    ? options.minPreferenceScore
    : 0;

  const topics = await queries.getTopics();
  const topicNameToId = topicNameToIdMap(topics);

  const candidateIds = await queries.getCandidateMatcherUserIds(currentUserId);
  const allIds = [...new Set([currentUserId, ...candidateIds])];
  const profiles = await queries.getBatchUserMatchingProfiles(allIds);
  const me = profiles.get(currentUserId);
  if (!me) {
    return {
      success: false,
      message: '当前用户不存在',
    };
  }

  const meInterestedIds = me.interested_topics.map((t) => t.id);
  const meProficientIds = me.proficient_topics.map((t) => t.id);

  const myQuestionsResult = await queries.getUserQuestions(currentUserId, 1, 500);
  const myQuestions =
    myQuestionsResult.success && myQuestionsResult.questions ? myQuestionsResult.questions : [];

  const questionsByPartner = await queries.getUnpairedQuestionsWithTagsForUserIds(candidateIds);

  const partners = [];

  for (const pid of candidateIds) {
    const partner = profiles.get(pid);
    if (!partner) continue;

    const themInterestedIds = partner.interested_topics.map((t) => t.id);
    const themProficientIds = partner.proficient_topics.map((t) => t.id);
    const preferenceScore = preferenceOverlapScore(
      meInterestedIds,
      meProficientIds,
      themInterestedIds,
      themProficientIds
    );

    const online = isUserOnline(pid);

    const matchingQuestionsMine = [];
    const matchingQuestionsTheirs = [];
    const seenReasons = new Set();

    for (const q of myQuestions) {
      const fit = questionFitsPartner(q, partner, seeking, topicNameToId);
      if (fit.matched) {
        matchingQuestionsMine.push(serializeMyQuestion(q));
        fit.reasons.forEach((r) => seenReasons.add(r));
      }
    }

    const partnerQs = questionsByPartner.get(pid) || [];
    for (const q of partnerQs) {
      const fit = partnerQuestionFitsMe(q, seeking, topicNameToId, me);
      if (fit.matched) {
        matchingQuestionsTheirs.push(serializePartnerQuestion(q));
        fit.reasons.forEach((r) => seenReasons.add(r));
      }
    }

    const totalMatches = matchingQuestionsMine.length + matchingQuestionsTheirs.length;

    if (preferenceScore < minPreferenceScore) continue;
    if (onlineOnly && !online) continue;
    if (requireMatchingQuestions && totalMatches === 0) continue;

    const sortScore =
      preferenceScore * 2 +
      totalMatches * 3 +
      (online ? 1.5 : 0);

    partners.push({
      user: {
        id: partner.id,
        username: partner.username,
        nickname: partner.nickname,
        last_active: partner.last_active,
        interested_topics: partner.interested_topics,
        proficient_topics: partner.proficient_topics,
        difficulty_preferences: partner.difficulty_preferences,
      },
      is_online: online,
      preference_score: preferenceScore,
      matching_questions_mine: matchingQuestionsMine,
      matching_questions_theirs: matchingQuestionsTheirs,
      matching_questions: matchingQuestionsMine,
      match_hints: Array.from(seenReasons).slice(0, 12),
      _sortScore: sortScore,
    });
  }

  partners.sort((a, b) => b._sortScore - a._sortScore);
  for (const p of partners) {
    delete p._sortScore;
  }

  const seekingLabel =
    seeking === 'teacher'
      ? '寻找老师：可基于「我的求助题」或「对方的带学帖」结对'
      : '寻找学生：可基于「我的带学帖」或「对方的求助题」结对';

  return {
    success: true,
    seeking,
    seeking_label: seekingLabel,
    me: {
      id: me.id,
      interested_topics: me.interested_topics,
      proficient_topics: me.proficient_topics,
      difficulty_preferences: me.difficulty_preferences,
    },
    partners,
  };
}

module.exports = {
  findMatchingPartners,
};
