const queries = require('../models/queries');

// 发送结对申请
exports.applyPair = async (req, res) => {
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
        // 检查是否已有结对
        const existingPairs = await queries.pair.checkExisting(userId, targetUserId);
        
        if (existingPairs.length > 0) {
            return res.status(400).json({ error: '已有结对存在' });
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

// 同意结对申请
exports.acceptPair = async (req, res) => {
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
exports.getMyPairs = async (req, res) => {
    const userId = req.user.userId;

    try {
        const pairs = await queries.pair.getByUserId(userId);
        res.json(pairs);
    } catch (err) {
        console.error('获取结对列表失败:', err);
        res.status(500).json({ error: '获取失败' });
    }
};

// 获取聊天记录
exports.getMessages = async (req, res) => {
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
exports.sendMessage = async (req, res) => {
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

// 结束教学
exports.endTeaching = async (req, res) => {
    const { pairId } = req.params;
    const userId = req.user.userId;

    try {
        const pair = await queries.pair.getById(pairId);
        
        if (!pair) {
            return res.status(404).json({ error: '结对不存在' });
        }
        
        if (pair.student_id !== userId) {
            return res.status(403).json({ error: '只有学生可以结束教学' });
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

// 获取教学用时
exports.getTeachingTime = async (req, res) => {
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