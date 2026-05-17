const queries = require('../models/queries');
const onlineStatusService = require('../services/onlineStatusService');
const asyncRoundReviewer = require('../services/asyncRoundReviewer');
const surveyService = require('../services/surveyService');
const cosUploadService = require('../services/cosUploadService');
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (cosUploadService.isValidImageType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的图片格式'), false);
    }
  }
});

// 发送结对申请
const applyPair = async (req, res) => {
    const { targetUserId, topicId, role, questionId } = req.body;  // 添加 questionId
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
        const MAX_PAIRS = 10;
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

        // 检查是否已存在相同两人的结对（pending 或 active）
        const existingPairs = await queries.pair.checkExisting(userId, targetUserId);
        if (existingPairs.length > 0) {
          // 清理孤儿结对（没有 question_id 的 pending 结对，由之前关联失败导致）
          const orphans = existingPairs.filter(p => !p.question_id && p.status === 'pending');
          if (orphans.length > 0) {
            for (const orphan of orphans) {
              await queries.pair.delete(orphan.id);
              console.log('[applyPair] 已清理孤儿结对:', orphan.id);
            }
          } else {
            return res.status(400).json({
              error: '已存在结对申请',
              message: '您与此用户已有进行中的结对或待处理的申请'
            });
          }
        }

        // 如果提供了 questionId，检查该问题是否已被结对
        if (questionId) {
          const questionPair = await queries.pair.getByQuestionId(questionId);
          if (questionPair && questionPair.status !== 'rejected') {
            return res.status(400).json({
              error: '该问题已有结对',
              message: '此问题已被其他用户结对，请浏览其他问题'
            });
          }
        }

        // 创建结对，传入正确的 teacher_id 和 student_id
        const newPair = await queries.pair.create(teacherId, studentId, topicId);

        // 如果提供了 questionId，关联问题到结对
        if (questionId) {
          try {
            // 清理该问题已拒绝的结对记录
            const rejectedPair = await queries.pair.getRejectedPairForQuestion(questionId);
            if (rejectedPair) {
              await queries.pair.delete(rejectedPair.id);
            }
            await queries.pair.associateQuestion(newPair.id, questionId);
            newPair.question_id = questionId;
          } catch (assocErr) {
            console.error('[applyPair] 关联问题失败:', assocErr);
          }
        }

        // 创建结对申请通知
        const applicant = await queries.findUserById(userId);
        const notificationTitle = role === 'teacher' ? '收到老师申请' : '收到学生申请';
        const notificationContent = `${applicant.username} 想要与您结对`;

        try {
          const newNotification = await queries.notification.create(
              targetUserId,
              'pair_application',
              newPair.id,
              notificationTitle,
              notificationContent,
              'pending'
          );

          // 推送实时通知
          onlineStatusService.sendNotificationToUser(targetUserId, {
              id: newNotification.id,
              type: 'pair_application',
              title: notificationTitle,
              content: notificationContent,
              relatedId: newPair.id,
              applicantUsername: applicant.username
          });
        } catch (notifErr) {
          console.error('发送结对通知失败:', notifErr);
        }

        // 返回结果（无论通知是否成功，结对已创建）
        const result = {
            ...newPair,
            your_role: role,
            partner_role: role === 'teacher' ? 'student' : 'teacher',
            message: '申请已发送，等待对方确认'
        };

        res.status(201).json(result);
    } catch (err) {
        console.error('申请结对失败:', err);
        res.status(500).json({ error: '申请失败' });
    }
};

// 获取结对信息（含对方用户信息 partner）
const getPairById = async (req, res) => {
    const { pairId } = req.params;
    const userId = req.user.userId;

    try {
        const pair = await queries.pair.getById(pairId);

        if (!pair) {
            return res.status(404).json({ error: '结对不存在' });
        }

        if (pair.teacher_id !== userId && pair.student_id !== userId) {
            return res.status(403).json({ error: '无权查看此结对' });
        }

        const partnerId = pair.teacher_id === userId ? pair.student_id : pair.teacher_id;
        const partnerUser = await queries.findUserById(partnerId);
        pair.partner_username = partnerUser ? partnerUser.username : null;
        await queries.attachPartnerProfileToPairs([pair], userId);
        res.json(pair);
    } catch (err) {
        console.error('获取结对信息失败:', err);
        res.status(500).json({ error: '获取失败' });
    }
};

// 同意结对申请
const acceptPair = async (req, res) => {
    const { pairId } = req.params;
    const userId = req.user.userId;

    console.log('=== 接受结对申请开始 ===');
    console.log('当前用户ID:', userId);
    console.log('结对ID:', pairId);

    try {
        const pair = await queries.pair.getById(pairId);

        if (!pair) {
            return res.status(404).json({ error: '结对不存在' });
        }

        console.log('结对信息:', {
            id: pair.id,
            teacher_id: pair.teacher_id,
            student_id: pair.student_id,
            status: pair.status,
            question_id: pair.question_id
        });

        // 检查用户是否是结对的参与者（teacher或student）
        const isParticipant = (pair.teacher_id === userId || pair.student_id === userId);
        if (!isParticipant) {
            console.log('权限验证失败: 用户不是结对参与者');
            return res.status(403).json({ error: '无权操作' });
        }

        // 如果已经是active状态，说明已经接受了，直接返回成功（幂等性）
        if (pair.status === 'active') {
            console.log('结对已经处于active状态，可能是重复点击');
            return res.json({
                success: true,
                message: '结对已经接受',
                pair_id: pair.id,
                already_accepted: true
            });
        }

        if (pair.status !== 'pending') {
            console.log('状态验证失败: 当前状态为', pair.status);
            return res.status(400).json({ error: '状态错误，只能接受待处理的结对申请' });
        }

        const updatedPair = await queries.pair.accept(pairId);

        // 生成热身题目（异步，不阻塞响应）
        // 即使question_id为null也会生成通用热身题
        surveyService.generatePreQuestions(parseInt(pairId))
          .then(preResult => {
            if (preResult.success) {
              console.log('[结对成功] 生成热身题目完成，共', preResult.questions?.length || 0, '道题');
            } else {
              console.log('[结对成功] 生成热身题目失败:', preResult.error);
            }
          })
          .catch(err => {
            console.error('[结对成功] 生成热身题目异常:', err);
          });

        // 发送通知给申请者（不影响主流程）
        const partnerId = pair.teacher_id === userId ? pair.student_id : pair.teacher_id;
        const currentUser = await queries.findUserById(userId);

        try {
            const newNotification = await queries.notification.create(
                partnerId,
                'pair_accepted',
                pairId,
                '结对申请已接受',
                `${currentUser.username} 已接受您的结对申请`,
                'processed'
            );

            onlineStatusService.sendNotificationToUser(partnerId, {
                id: newNotification.id,
                type: 'pair_accepted',
                title: '结对申请已接受',
                content: `${currentUser.username} 已接受您的结对申请`,
                relatedId: pairId,
                acceptedUsername: currentUser.username
            });

            // 更新原申请通知的状态为已处理
            const notifications = await queries.notification.getByUserId(userId, {
                type: 'pair_application',
                relatedId: pairId,
                status: 'pending'
            });
            if (notifications.length > 0) {
                await queries.notification.updateStatus(notifications[0].id, 'processed');
            }
        } catch (notifErr) {
            console.error('[acceptPair] 通知创建失败:', notifErr);
        }

        res.json({
                    success: true,
                    message: '结对成功',
                    pair: updatedPair
                });
            } catch (err) {
                console.error('接受结对失败:', err);
                res.status(500).json({ error: '接受失败' });
            }
        };
        
        // 拒绝结对申请
        const rejectPair = async (req, res) => {
            const { pairId } = req.params;
            const userId = req.user.userId;
        
            try {
                const pair = await queries.pair.getById(pairId);
        
                if (!pair) {
                    return res.status(404).json({ error: '结对不存在' });
                }
        
                // 权限检查
                if (pair.teacher_id !== userId && pair.student_id !== userId) {
                    return res.status(403).json({ error: '无权操作' });
                }

                // 状态检查
                if (pair.status !== 'pending') {
                    return res.status(400).json({ error: '只能拒绝待处理的结对申请' });
                }
        
                // 获取对方用户ID
                const partnerId = pair.teacher_id === userId ? pair.student_id : pair.teacher_id;
                const currentUser = await queries.findUserById(userId);

                // 先更新结对状态，再发通知
                await queries.pair.updateStatus(pairId, 'rejected');

                // 创建拒绝通知（不影响主流程）
                try {
                    await queries.notification.create(
                        partnerId,
                        'pair_rejected',
                        pairId,
                        '结对申请已拒绝',
                        `${currentUser.username} 已拒绝您的结对申请`,
                        'processed'
                    );

                    onlineStatusService.sendNotificationToUser(partnerId, {
                        type: 'pair_rejected',
                        title: '结对申请已拒绝',
                        message: `${currentUser.username} 已拒绝您的结对申请`,
                        data: { pairId: parseInt(pairId) }
                    });
                } catch (notifErr) {
                    console.error('[rejectPair] 通知创建失败:', notifErr);
                }

                // 更新原申请通知的状态为已处理
                const notifications = await queries.notification.getByUserId(userId, {
                    type: 'pair_application',
                    relatedId: pairId,
                    status: 'pending'
                });
                if (notifications.length > 0) {
                    await queries.notification.updateStatus(notifications[0].id, 'processed');
                }

                res.json({
                    success: true,
                    message: '已拒绝结对申请'
                });
            } catch (err) {
                console.error('拒绝结对失败:', err);
                res.status(500).json({ error: '拒绝失败' });
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

// 获取问题的结对（含对方用户信息 partner）
const getPairByQuestionId = async (req, res) => {
    const { questionId } = req.params;
    const userId = req.user.userId;

    try {
        const pair = await queries.pair.getByQuestionId(questionId);
        
        if (!pair) {
            return res.status(404).json({ error: '该问题暂无结对' });
        }

        if (pair.teacher_id !== userId && pair.student_id !== userId) {
            return res.status(403).json({ error: '无权查看此结对' });
        }

        await queries.attachPartnerProfileToPairs([pair], userId);
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

        // 权限检查：只有参与者才能关联
        if (pair.teacher_id !== req.user.userId && pair.student_id !== req.user.userId) {
            return res.status(403).json({ error: '无权操作此结对' });
        }

        // 检查结对是否已有问题
        if (pair.question_id) {
            return res.status(400).json({ error: '该结对已关联其他问题' });
        }

        // 检查问题是否已有已拒绝的结对记录，如果有则删除
        const rejectedPair = await queries.pair.getRejectedPairForQuestion(questionId);
        if (rejectedPair) {
            console.log(`删除问题 ${questionId} 的已拒绝结对记录 ${rejectedPair.id}`);
            await queries.pair.delete(rejectedPair.id);
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
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: '消息内容不能为空' });
        }

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

        const newMessage = await queries.message.create(pairId, senderId, content.trim());

        // 判断是否需要触发轮次审查（学生发送且上一条是老师）
        const messages = await queries.message.getByPairId(pairId);
        const lastMessage = messages.length > 1 ? messages[messages.length - 2] : null;
        const shouldTriggerReview =
            senderId !== pair.teacher_id && // 发送者是学生
            lastMessage && lastMessage.sender_id === pair.teacher_id; // 上一条是老师

        if (shouldTriggerReview) {
            // 异步触发轮次审查（不阻塞响应）
            asyncRoundReviewer.triggerRoundReview(pairId, senderId);
        }

        res.status(201).json(newMessage);
    } catch (err) {
        console.error('发送消息失败:', err);
        res.status(500).json({ error: '发送失败' });
    }
};

// 上传图片消息
const uploadImageMessage = async (req, res) => {
    const { pairId } = req.params;
    const senderId = req.user.userId;
    const { content } = req.body; // 可选的文字说明

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

        if (!req.file) {
            return res.status(400).json({ error: '未提供图片' });
        }

        // 验证文件类型
        if (!cosUploadService.isValidImageType(req.file.mimetype)) {
            return res.status(400).json({ error: '不支持的图片格式，支持 JPEG、PNG、GIF、WebP' });
        }

        // 验证文件大小
        if (!cosUploadService.isValidFileSize(req.file.size)) {
            return res.status(400).json({ error: '图片大小不能超过 5MB' });
        }

        // 上传到腾讯云 COS
        const imageUrl = await cosUploadService.uploadImage(
            req.file.buffer,
            req.file.originalname
        );

        // 创建消息记录
        const newMessage = await queries.message.create(pairId, senderId, content || '', imageUrl);

        res.status(201).json(newMessage);
    } catch (err) {
        console.error('上传图片失败:', err);
        res.status(500).json({ error: '上传失败' });
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

        // 触发对话总总结（异步，不阻塞响应）
        asyncRoundReviewer.generateConversationSummaryAsync(pairId);

        // 生成对话后问卷（异步，不阻塞响应）
        console.log('[结束教学] 生成对话后问卷');
        surveyService.generatePostSurvey(parseInt(pairId)).catch(err => {
          console.error('[结束教学] 生成对话后问卷失败:', err);
        });

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

        // 先检查是否已存在相同的待处理通知（在修改状态之前）
        const partnerId = pair.teacher_id === userId ? pair.student_id : pair.teacher_id;
        const existingNotifications = await queries.notification.getByUserId(partnerId, {
            type: 'end_request',
            relatedId: pairId,
            status: 'pending'
        });

        if (existingNotifications.length > 0) {
            return res.status(400).json({
                error: '已存在待处理的结束申请',
                details: {
                    existingNotificationId: existingNotifications[0].id,
                    createdAt: existingNotifications[0].created_at
                }
            });
        }

        // 更新结对状态
        const updatedPair = await queries.pair.requestEnd(pairId, userId);

        // 创建结束申请通知（不影响主流程）
        const currentUser = await queries.findUserById(userId);

        try {
            const newNotification = await queries.notification.create(
                partnerId,
                'end_request',
                pairId,
                '收到结束教学申请',
                `${currentUser.username} 申请结束教学`,
                'pending'
            );

            onlineStatusService.sendNotificationToUser(partnerId, {
                id: newNotification.id,
                type: 'end_request',
                title: '收到结束教学申请',
                content: `${currentUser.username} 申请结束教学`,
                relatedId: pairId,
                applicantUsername: currentUser.username,
                end_requested_by: userId
            });
        } catch (notifErr) {
            console.error('[requestEndTeaching] 通知创建失败:', notifErr);
        }

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
            console.error('结对状态验证失败 (accept):', {
                pairId,
                currentStatus: pair.status,
                requiredStatus: 'end_requested',
                currentEndStatus: pair.end_request_status,
                requiredEndStatus: 'pending'
            });
            return res.status(400).json({ 
                error: '没有待确认的结束申请',
                details: {
                    currentStatus: pair.status,
                    currentEndStatus: pair.end_request_status
                }
            });
        }

               const updatedPair = await queries.pair.acceptEndRequest(pairId);

        // 生成对话后问卷
        console.log('[结束确认] 生成对话后问卷');
        surveyService.generatePostSurvey(parseInt(pairId)).catch(err => {
          console.error('[结束确认] 生成对话后问卷失败:', err);
        });

        // 发送通知给申请者（不影响主流程）
        const requesterId = pair.end_requested_by;
        const currentUser = await queries.findUserById(userId);

        try {
            const newNotification = await queries.notification.create(
                requesterId,
                'end_accepted',
                pairId,
                '结束申请已接受',
                `${currentUser.username} 已同意结束教学`,
                'processed'
            );

            onlineStatusService.sendNotificationToUser(requesterId, {
                id: newNotification.id,
                type: 'end_accepted',
                title: '结束申请已接受',
                content: `${currentUser.username} 已同意结束教学`,
                relatedId: pairId,
                acceptedUsername: currentUser.username
            });

            // 更新原申请通知的状态为已处理
            const originalNotifications = await queries.notification.getByUserId(userId, {
                type: 'end_request',
                relatedId: pairId,
                status: 'pending'
            });

            if (originalNotifications.length > 0) {
                await queries.notification.updateStatus(originalNotifications[0].id, 'processed');
            }
        } catch (notifErr) {
            console.error('[acceptEndRequest] 通知创建失败:', notifErr);
        }

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
            console.error('结对状态验证失败 (reject):', {
                pairId,
                currentStatus: pair.status,
                requiredStatus: 'end_requested',
                currentEndStatus: pair.end_request_status,
                requiredEndStatus: 'pending'
            });
            return res.status(400).json({ 
                error: '没有待确认的结束申请',
                details: {
                    currentStatus: pair.status,
                    currentEndStatus: pair.end_request_status
                }
            });
        }

        const updatedPair = await queries.pair.rejectEndRequest(pairId);

        // 发送通知给申请者（不影响主流程）
        const requesterId = pair.end_requested_by;
        const currentUser = await queries.findUserById(userId);

        try {
            const newNotification = await queries.notification.create(
                requesterId,
                'end_rejected',
                pairId,
                '结束申请已拒绝',
                `${currentUser.username} 已拒绝结束教学，继续教学`,
                'processed'
            );

            onlineStatusService.sendNotificationToUser(requesterId, {
                id: newNotification.id,
                type: 'end_rejected',
                title: '结束申请已拒绝',
                content: `${currentUser.username} 已拒绝结束教学，继续教学`,
                relatedId: pairId,
                rejecterUsername: currentUser.username
            });

            // 更新原申请通知的状态为已处理
            const originalNotifications = await queries.notification.getByUserId(userId, {
                type: 'end_request',
                relatedId: pairId,
                status: 'pending'
            });

            if (originalNotifications.length > 0) {
                await queries.notification.updateStatus(originalNotifications[0].id, 'processed');
            }
        } catch (notifErr) {
            console.error('[rejectEndRequest] 通知创建失败:', notifErr);
        }

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

        // 权限检查：只有参与者才能查看
        if (pair.teacher_id !== req.user.userId && pair.student_id !== req.user.userId) {
            return res.status(403).json({ error: '无权查看此结对' });
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

// 获取用户的待处理通知（包括结对申请和结束申请）
const getPendingNotifications = async (req, res) => {
    const userId = req.user.userId;

    try {
        // 获取所有待处理通知
        const pendingNotifications = await queries.notification.getByUserId(userId, {
            status: 'pending',
            limit: 100
        });

        res.json({
            success: true,
            notifications: pendingNotifications
        });
    } catch (err) {
        console.error('获取待处理通知失败:', err);
        res.status(500).json({ error: '获取失败' });
    }
};

// 发送私信
const sendPrivateMessage = async (req, res) => {
    const senderId = req.user.userId;
    let receiverNickname, content, imageUrl;

    try {
        // 处理有图片的情况（multipart/form-data）
        if (req.file) {
            // 验证文件类型
            if (!cosUploadService.isValidImageType(req.file.mimetype)) {
                return res.status(400).json({ error: '不支持的图片格式，支持 JPEG、PNG、GIF、WebP' });
            }
            // 验证文件大小
            if (!cosUploadService.isValidFileSize(req.file.size)) {
                return res.status(400).json({ error: '图片大小不能超过 5MB' });
            }
            // 上传到腾讯云 COS
            imageUrl = await cosUploadService.uploadImage(req.file.buffer, req.file.originalname);
            // 从其他字段获取
            receiverNickname = req.body.receiverNickname;
            content = req.body.content;
        } else {
            // 普通 JSON 请求
            receiverNickname = req.body.receiverNickname;
            content = req.body.content;
            imageUrl = req.body.imageUrl || null;
        }

        // 验证内容不能为空
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: '消息内容不能为空' });
        }

        // 查找接收者
        const receiver = await queries.user.findByNickname(receiverNickname.trim());
        if (!receiver) {
            return res.status(404).json({ error: '用户不存在' });
        }

        // 不能给自己发私信
        if (receiver.id === senderId) {
            return res.status(400).json({ error: '不能给自己发送私信' });
        }

        // 创建私信记录
        const message = await queries.privateMessage.create(
            senderId,
            receiver.id,
            content.trim(),
            imageUrl || null
        );

        // 获取发送者信息
        const sender = await queries.user.findById(senderId);
        const senderNickname = sender.nickname || sender.username;

        // 创建通知
        const notificationContent = content.length > 100 ? content.substring(0, 100) + '...' : content;

        const notification = await queries.notification.create(
            receiver.id,
            'private_message',
            message.id,
            `收到来自 ${senderNickname} 的私信`,
            notificationContent,
            'pending'
        );

        // 推送实时通知（包含图片信息）
        onlineStatusService.sendNotificationToUser(receiver.id, {
            id: notification.id,
            type: 'private_message',
            title: notification.title,
            content: notificationContent,
            relatedId: message.id,
            senderId: senderId,
            senderNickname: senderNickname,
            hasImage: !!imageUrl,
            imageUrl: imageUrl || null
        });

        res.json({ success: true, message });
    } catch (error) {
        console.error('发送私信错误:', error);
        res.status(500).json({ error: '发送失败' });
    }
};

// 获取私信列表
const getPrivateMessages = async (req, res) => {
    const userId = req.user.userId;
    const { page = 1, limit = 50 } = req.query;

    try {
        const messages = await queries.privateMessage.getListByUserId(userId, {
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });
        res.json({ success: true, messages });
    } catch (error) {
        console.error('获取私信列表错误:', error);
        res.status(500).json({ error: '获取失败' });
    }
};

// 获取与某用户的对话
const getPrivateConversation = async (req, res) => {
    const userId = req.user.userId;
    const { otherUserId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    try {
        // 先标记对方的来信为已读
        await queries.privateMessage.markAllAsReadFromUser(parseInt(otherUserId), userId);

        const messages = await queries.privateMessage.getConversationBetweenUsers(
            userId,
            parseInt(otherUserId),
            { limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit) }
        );
        res.json({ success: true, messages });
    } catch (error) {
        console.error('获取私信对话错误:', error);
        res.status(500).json({ error: '获取失败' });
    }
};

// 根据昵称查询用户
const findUserByNicknameController = async (req, res) => {
    const { nickname } = req.params;

    try {
        const user = await queries.user.findByNickname(nickname);
        if (!user) {
            return res.status(404).json({ success: false, error: '用户不存在' });
        }
        res.json({
            success: true,
            user: {
                id: user.id,
                nickname: user.nickname || user.username,
                avatar_url: user.avatar_url
            }
        });
    } catch (error) {
        console.error('查询用户错误:', error);
        res.status(500).json({ error: '查询失败' });
    }
};

module.exports = {
    applyPair,
    acceptPair,
    rejectPair,
    getMyPairs,
    getPairById,
    getPairByQuestionId,
    associatePairWithQuestion,
    getMessages,
    sendMessage,
    uploadImageMessage,
    endTeaching,
    requestEndTeaching,
    acceptEndRequest,
    rejectEndRequest,
    getTeachingTime,
    getPendingEndRequests,
    getPendingNotifications,
    sendPrivateMessage,
    getPrivateMessages,
    getPrivateConversation,
    findUserByNicknameController
};