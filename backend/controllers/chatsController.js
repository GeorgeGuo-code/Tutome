const queries = require('../models/queries');

// 发送结对申请
const applyPair = async (req, res) => {
    const { targetUserId, topicId, role } = req.body;  // 添加 role
    const userId = req.user.userId;
    
    // 验证 role 参数
    if (!role || (role !== 'teacher' && role !== 'student')) {
        return res.status(400).json({ 
            error: '请指定角色', 
            message: 'role 必须是 "teacher" 或 "student"' 
        });
    }

    try {
        // 检查发起方的结对数量
        const MAX_PAIRS = 5;
        const initiatorLimit = await queries.pair.checkUserPairLimit(userId, MAX_PAIRS);
        if (!initiatorLimit.canCreate) {
            return res.status(400).json({
                error: `已达到最大结对数量限制（${MAX_PAIRS}个）`,
                message: `您当前已有${initiatorLimit.currentCount}个活跃结对，无法创建更多`
            });
        }

        // 检查接受方的结对数量
        const targetLimit = await queries.pair.checkUserPairLimit(targetUserId, MAX_PAIRS);
        if (!targetLimit.canCreate) {
            return res.status(400).json({
                error: '对方已达到最大结对数量限制',
                message: `对方当前已有${targetLimit.currentCount}个活跃结对，无法创建更多结对`
            });
        }

        // 根据角色决定 teacher_id 和 student_id
        let teacherId, studentId;
        if (role === 'teacher') {
            // 当前用户想当老师
            teacherId = userId;
            studentId = targetUserId;
        } else {
            // 当前用户想当学生
            teacherId = targetUserId;
            studentId = userId;
        }

        // 创建结对，传入正确的 teacher_id 和 student_id
        const newPair = await queries.pair.create(teacherId, studentId, topicId);
        
        // 在返回结果中添加角色信息
        const result = {
            ...newPair,
            your_role: role,  // 你的角色
            partner_role: role === 'teacher' ? 'student' : 'teacher'  // 对方的角色
        };
        
        res.status(201).json(result);
    } catch (err) {
        console.error('申请结对失败:', err);
        res.status(500).json({ error: '申请失败' });
    }
};

// 获取结对信息
const getPairById = async (req, res) => {
    const { pairId } = req.params;
    const userId = req.user.userId;

    try {
        const pair = await queries.pair.getById(pairId);

        if (!pair) {
            return res.status(404).json({ error: '结对不存在' });
        }

        // 检查权限
        if (pair.teacher_id !== userId && pair.student_id !== userId) {
            return res.status(403).json({ error: '无权查看此结对' });
        }

        res.json(pair);
    } catch (err) {
        console.error('获取结对信息失败:', err);
        res.status(500).json({ error: '获取失败' });
    }
};

// 同意结对申请
const acceptPair = async (req, res) => {
    const { pairId } = req.body;
    const userId = req.user.userId;

    try {
        const pair = await queries.pair.getById(pairId);
        
        if (!pair) {
            return res.status(404).json({ error: '结对不存在' });
        }
        
        if (pair.student_id !== userId || pair.status !== 'pending') {
            return res.status(403).json({ error: '无权操作或状态错误' });
        }

        const updatedPair = await queries.pair.accept(pairId);
        
        res.json({ 
            success: true, 
            message: '结对成功' 
        });
    } catch (err) {
        console.error('接受结对失败:', err);
        res.status(500).json({ error: '接受失败' });
    }
};

// 获取我的结对列表
const getMyPairs = async (req, res) => {
    const userId = req.user.userId;

    try {
        const pairs = await queries.pair.getByUserId(userId);
        res.json(pairs);
    } catch (err) {
        console.error('获取结对列表失败:', err);
        res.status(500).json({ error: '获取失败' });
    }
};

// 获取问题的结对
const getPairByQuestionId = async (req, res) => {
    const { questionId } = req.params;

    try {
        const pair = await queries.pair.getByQuestionId(questionId);
        
        if (!pair) {
            return res.status(404).json({ error: '该问题暂无结对' });
        }
        
        res.json(pair);
    } catch (err) {
        console.error('获取问题结对失败:', err);
        res.status(500).json({ error: '获取失败' });
    }
};

// 自动关联结对到问题
const associatePairWithQuestion = async (req, res) => {
    const { pairId } = req.params;
    const { questionId } = req.body;

    try {
        const pair = await queries.pair.getById(pairId);
        
        if (!pair) {
            return res.status(404).json({ error: '结对不存在' });
        }

        // 检查结对是否已有问题
        if (pair.question_id) {
            return res.status(400).json({ error: '该结对已关联其他问题' });
        }

        // 更新结对的问题 ID
        const result = await queries.pair.associateQuestion(pairId, questionId);
        
        res.json({
            success: true,
            message: '结对关联成功',
            pair: result
        });
    } catch (err) {
        console.error('关联结对失败:', err);
        res.status(500).json({ error: '关联失败' });
    }
};

// 获取聊天记录
const getMessages = async (req, res) => {
    const { pairId } = req.params;
    const userId = req.user.userId;

    try {
        const pair = await queries.pair.getById(pairId);
        
        if (!pair) {
            return res.status(404).json({ error: '结对不存在' });
        }
        
        if (pair.teacher_id !== userId && pair.student_id !== userId) {
            return res.status(403).json({ error: '无权查看此聊天' });
        }

        const messages = await queries.message.getByPairId(pairId);
        res.json(messages);
    } catch (err) {
        console.error('获取消息失败:', err);
        res.status(500).json({ error: '获取失败' });
    }
};

// 发送消息
const sendMessage = async (req, res) => {
    const { pairId } = req.params;
    const { content } = req.body;
    const senderId = req.user.userId;

    try {
        const pair = await queries.pair.getById(pairId);
        
        if (!pair) {
            return res.status(404).json({ error: '结对不存在' });
        }
        
        if (pair.status !== 'active') {
            return res.status(400).json({ error: '结对未激活或已结束' });
        }
        
        if (pair.teacher_id !== senderId && pair.student_id !== senderId) {
            return res.status(403).json({ error: '无权发送消息' });
        }

        const newMessage = await queries.message.create(pairId, senderId, content);
        res.status(201).json(newMessage);
    } catch (err) {
        console.error('发送消息失败:', err);
        res.status(500).json({ error: '发送失败' });
    }
};

// 结束教学（直接结束，不要求确认）
const endTeaching = async (req, res) => {
    const { pairId } = req.params;
    const userId = req.user.userId;

    try {
        const pair = await queries.pair.getById(pairId);

        if (!pair) {
            return res.status(404).json({ error: '结对不存在' });
        }

        // 任意一方都可以结束教学
        if (pair.teacher_id !== userId && pair.student_id !== userId) {
            return res.status(403).json({ error: '无权结束此教学' });
        }

        if (pair.status !== 'active') {
            return res.status(400).json({ error: '结对未激活或已结束' });
        }

        const endedPair = await queries.pair.end(pairId);
        res.json(endedPair);
    } catch (err) {
        console.error('结束教学失败:', err);
        res.status(500).json({ error: '结束失败' });
    }
};

// 申请结束教学
const requestEndTeaching = async (req, res) => {
    const { pairId } = req.params;
    const userId = req.user.userId;

    try {
        const pair = await queries.pair.getById(pairId);

        if (!pair) {
            return res.status(404).json({ error: '结对不存在' });
        }

        // 任意一方都可以申请结束
        if (pair.teacher_id !== userId && pair.student_id !== userId) {
            return res.status(403).json({ error: '无权申请结束此教学' });
        }

        if (pair.status !== 'active') {
            return res.status(400).json({ error: '结对未激活或已结束' });
        }

        const updatedPair = await queries.pair.requestEnd(pairId, userId);
        res.json({
            success: true,
            message: '已申请结束教学，等待对方确认',
            pair: updatedPair
        });
    } catch (err) {
        console.error('申请结束教学失败:', err);
        res.status(500).json({ error: '申请失败' });
    }
};

// 同意结束请求
const acceptEndRequest = async (req, res) => {
    const { pairId } = req.params;
    const userId = req.user.userId;

    try {
        const pair = await queries.pair.getById(pairId);

        if (!pair) {
            return res.status(404).json({ error: '结对不存在' });
        }

        // 只有对方可以同意（不是申请者）
        if (pair.end_requested_by === userId) {
            return res.status(403).json({ error: '不能同意自己发起的申请' });
        }

        if (pair.teacher_id !== userId && pair.student_id !== userId) {
            return res.status(403).json({ error: '无权操作此教学' });
        }

        if (pair.status !== 'end_requested' || pair.end_request_status !== 'pending') {
            return res.status(400).json({ error: '没有待确认的结束申请' });
        }

        const updatedPair = await queries.pair.acceptEndRequest(pairId);
        res.json({
            success: true,
            message: '已同意结束教学',
            pair: updatedPair
        });
    } catch (err) {
        console.error('同意结束请求失败:', err);
        res.status(500).json({ error: '操作失败' });
    }
};

// 拒绝结束请求
const rejectEndRequest = async (req, res) => {
    const { pairId } = req.params;
    const userId = req.user.userId;

    try {
        const pair = await queries.pair.getById(pairId);

        if (!pair) {
            return res.status(404).json({ error: '结对不存在' });
        }

        // 只有对方可以拒绝（不是申请者）
        if (pair.end_requested_by === userId) {
            return res.status(403).json({ error: '不能拒绝自己发起的申请' });
        }

        if (pair.teacher_id !== userId && pair.student_id !== userId) {
            return res.status(403).json({ error: '无权操作此教学' });
        }

        if (pair.status !== 'end_requested' || pair.end_request_status !== 'pending') {
            return res.status(400).json({ error: '没有待确认的结束申请' });
        }

        const updatedPair = await queries.pair.rejectEndRequest(pairId);
        res.json({
            success: true,
            message: '已拒绝结束申请，继续教学',
            pair: updatedPair
        });
    } catch (err) {
        console.error('拒绝结束请求失败:', err);
        res.status(500).json({ error: '操作失败' });
    }
};

// 获取教学用时
const getTeachingTime = async (req, res) => {
    const { pairId } = req.params;

    try {
        const pair = await queries.pair.getById(pairId);
        
        if (!pair) {
            return res.status(404).json({ error: '结对不存在' });
        }

        const { started_at, ended_at } = pair;
        let timeInSeconds = 0;

        if (started_at && ended_at) {
            timeInSeconds = (new Date(ended_at) - new Date(started_at)) / 1000;
        }

        res.json({ 
            pairId,
            timeInSeconds,
            started_at,
            ended_at 
        });
    } catch (err) {
        console.error('获取教学用时失败:', err);
        res.status(500).json({ error: '获取失败' });
    }
};

// 获取用户的待处理结束申请
const getPendingEndRequests = async (req, res) => {
    const userId = req.user.userId;
    console.log('[DEBUG] Fetching pending end requests for user:', userId);

    try {
        const pendingRequests = await queries.pair.getPendingEndRequests(userId);
        console.log('[DEBUG] Found pending requests:', pendingRequests.length);
        console.log('[DEBUG] Requests:', JSON.stringify(pendingRequests, null, 2));
        
        res.json({
            success: true,
            requests: pendingRequests
        });
    } catch (err) {
        console.error('获取待处理申请失败:', err);
        res.status(500).json({ error: '获取失败' });
    }
};

module.exports = {
    applyPair,
    acceptPair,
    getMyPairs,
    getPairById,
    getPairByQuestionId,
    associatePairWithQuestion,
    getMessages,
    sendMessage,
    endTeaching,
    requestEndTeaching,
    acceptEndRequest,
    rejectEndRequest,
    getTeachingTime,
    getPendingEndRequests
};