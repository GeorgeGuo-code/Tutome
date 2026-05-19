import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./dialogue.css";
import 'katex/dist/katex.min.css';
import InteractiveGuide from '../components/InteractiveGuide';
import { CameraIcon, PenIcon } from '../components/icons';
import socketService from '../services/socketService';
import { parseLatexContent } from '../utils/renderLatex';

const Dialogue = () => {
  const { pairId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastMessageId, setLastMessageId] = useState(null); // 记录最后一条消息的ID，用于去重
  const [pairStatus, setPairStatus] = useState(null); // 结对状态
  const [endRequestedBy, setEndRequestedBy] = useState(null); // 谁申请结束
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false); // 显示确认模态框
  const [showEndRequestModal, setShowEndRequestModal] = useState(false); // 显示收到申请的模态框
  const [isReviewing, setIsReviewing] = useState(false); // 是否正在进行轮次审查
  const [isSummarizing, setIsSummarizing] = useState(false); // 是否正在生成总结
  const [summary, setSummary] = useState(null); // 总结的容
  const [showSummaryModal, setShowSummaryModal] = useState(false); // 显示总结弹窗
  const [showGuideEndModal, setShowGuideEndModal] = useState(false); // 引导模式：对方同意结束的弹窗
  const [selectedImage, setSelectedImage] = useState(null); // 选择的图片文件
  const [imagePreview, setImagePreview] = useState(null); // 图片预览 URL
  const [imagePreviewModal, setImagePreviewModal] = useState(null); // 全屏预览的图片 URL
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false); // AI 审查栏是否展开
  const [roundReviews, setRoundReviews] = useState([]); // 轮次审查结果
  const [showReviewNotification, setShowReviewNotification] = useState(false); // 显示问题通知
  const notifiedErrorRoundsRef = useRef(new Set()); // 已显示过通知的问题轮次
  const [showReviewComplete, setShowReviewComplete] = useState(false); // 审查完成无错误提示
  const reviewCompleteTimeoutRef = useRef(null); // 自动消失定时器
  const [preQuizCompleted, setPreQuizCompleted] = useState(false); // 热身测试是否完成
  const [isAITeachingMode, setIsAITeachingMode] = useState(false); // 是否为AI教学模式
  const [isWaitingForAI, setIsWaitingForAI] = useState(false); // 是否正在等待AI回复
  const currentUserId = parseInt(localStorage.getItem("userId")) || null;
  const currentRoundCountRef = useRef(0); // 记录当前轮次数
  const messagesEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const pollingIntervalRef = useRef(null); // 轮询定时器引用
  const previousMessagesLengthRef = useRef(0); // 跟踪之前的消息数量

  // 引导模式相关状态
  const [guideMode, setGuideMode] = useState(false);
  const [guideActive, setGuideActive] = useState(false);
  // 从 sessionStorage 读取引导步骤，默认为19（ai-review-btn 高亮步骤）
  const [guideStep, setGuideStep] = useState(() => {
    const savedStep = sessionStorage.getItem('guideStep');
    return savedStep ? parseInt(savedStep, 10) : 19;
  });

  // 计算轮次数：学生提问且上一条是老师 = 一轮（使用 sender_role 判断）
  const calculateRoundCount = (msgs, pair) => {
    let count = 0;
    let lastWasTeacher = false;
    for (const msg of msgs) {
      const isTeacher = msg.sender_role === 'teacher';
      if (!isTeacher && lastWasTeacher) {
        count++; // AI学生提问且上一条是老师 = 一轮
      }
      lastWasTeacher = isTeacher;
    }
    return count;
  };

  const guideModeRef = useRef({
    handleGuideAction: (action) => {
      console.log('[GuideMode] action:', action);
      switch (action) {
        case 'enter-quiz':
          // 模拟进入热身测试页面
          navigate(`/quiz/pre/guide-demo`);
          break;
        case 'submit-quiz':
          // 模拟提交热身测试
          // 直接进入对话
          break;
        case 'enter-dialogue':
          // 进入对话页面，使用引导专用的pairId
          navigate(`/dialogue/guide-demo`);
          break;
        case 'show-messages':
          // 显示预制消息
          setMessages(mockGuideMessages);
          setPairStatus('active');
          setLoading(false);
          break;
        default:
          break;
      }
    }
  });

  // 引导模式：注册全局引导动作处理器到 window
  useEffect(() => {
    if (guideMode) {
      window.guideActionHandler = (action) => {
        console.log('[GuideMode] action:', action);
        switch (action) {
          case 'enter-quiz':
            navigate(`/quiz/pre/guide-demo`);
            break;
          case 'submit-quiz':
            break;
          case 'enter-dialogue':
            navigate(`/dialogue/guide-demo`);
            break;
          case 'show-messages':
            setMessages(mockGuideMessages);
            setPairStatus('active');
            setLoading(false);
            break;
          default:
            break;
        }
      };
    }
    return () => {
      if (guideMode) {
        window.guideActionHandler = null;
      }
    };
  }, [guideMode, navigate]);

  // 预制的引导消息数据
  const mockGuideMessages = [
    { id: 1, pair_id: 'guide-demo', sender_id: 1, sender_role: 'student', content: '你好，我想请教一个关于Python装饰器的问题', created_at: new Date().toISOString() },
    { id: 2, pair_id: 'guide-demo', sender_id: 2, sender_role: 'tutor', content: '好的，请说', created_at: new Date().toISOString() },
    { id: 3, pair_id: 'guide-demo', sender_id: 1, sender_role: 'student', content: '装饰器的作用是什么？如何定义一个装饰器？', created_at: new Date().toISOString() },
    { id: 4, pair_id: 'guide-demo', sender_id: 2, sender_role: 'tutor', content: '装饰器用于修改函数或类的行为。简单示例：\n\ndef my_decorator(func):\n    def wrapper():\n        print("函数执行前")\n        func()\n        print("函数执行后")\n    return wrapper', created_at: new Date().toISOString() },
    { id: 5, pair_id: 'guide-demo', sender_id: 1, sender_role: 'student', content: '那我用 @property 可以直接修改属性值吗？', created_at: new Date().toISOString() },
    { id: 6, pair_id: 'guide-demo', sender_id: 2, sender_role: 'tutor', content: '@property是用于定义getter的，要定义setter需要使用@xxx.setter', created_at: new Date().toISOString() }
  ];

  // 检查是否为引导模式
  useEffect(() => {
    if (pairId === 'guide-demo') {
      setGuideMode(true);
      // 如果 sessionStorage 中有引导状态，也激活引导组件
      if (sessionStorage.getItem('guideActive') === 'true') {
        setGuideActive(true);
      }
      // 显示预制消息
      setMessages(mockGuideMessages);
      setPairStatus('active');
      setLoading(false);
      // 预制AI审查结果
      setRoundReviews([
        { id: 1, round: 1, reviewed: true, review: { has_error: false, summary: '讨论装饰器基础概念' } },
        { id: 2, round: 2, reviewed: true, review: { has_error: true, error_details: [{ errorType: '概念混淆' }, { errorType: '用法错误' }] } }
      ]);
    }
  }, [pairId]);

  // 引导流程控制回调
  const handleGuideComplete = () => {
    setGuideActive(false);
    sessionStorage.removeItem('guideActive');
    sessionStorage.removeItem('guideStep');
  };

  const handleGuideNavigate = (path) => {
    navigate(path);
  };

  // 验证 Pair ID 并启动轮询
  useEffect(() => {
    if (!pairId || isNaN(parseInt(pairId))) {
      setError("无效的结对 ID");
      setLoading(false);
      return;
    }

    // 引导模式不需要检查热身测试
    if (guideMode) {
      return;
    }

    // 检查热身测试是否完成，如果未完成则跳转到问卷页面
    const checkPreQuiz = async () => {
      try {
        const token = localStorage.getItem('token');

        // 获取pair状态
        const pairResponse = await fetch(`/api/pairs/${pairId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        let isAiTeaching = false;
        if (pairResponse.ok) {
          const pairData = await pairResponse.json();
          isAiTeaching = !!pairData.is_ai_teaching;
          setIsAITeachingMode(isAiTeaching);
        }

        // 检查热身测试是否完成
        const response = await fetch(`/api/survey/pre/${pairId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success && result.data) {
          const hasQuestions = result.data.questions && result.data.questions.length > 0;
          const isCompleted = result.data.completed && hasQuestions;

          if (isCompleted) {
            // 完成热身测试，留在对话页面
            console.log('[Dialogue] 热身测试已完成，留在对话页面');
            setPreQuizCompleted(true);
            return;
          }
        }
        // 未完成、无题目或获取失败，跳转到热身问卷页面
        console.log('[Dialogue] 热身测试未完成或无题目，跳转问卷页面');
        navigate(`/quiz/pre/${pairId}`);
      } catch (err) {
        console.error('检查热身测试失败:', err);
        navigate(`/quiz/pre/${pairId}`);
      }
    };

    // 首次加载消息和结对状态
    checkPreQuiz();
    fetchMessages(true);
    fetchPairStatus();

    // 启动轮询：每3秒检查一次新消息和结对状态
    pollingIntervalRef.current = setInterval(() => {
      fetchMessages(false); // 轮询时不更新 loading 状态
      fetchPairStatus(); // 检查结对状态
    }, 3000);

    // 监听 Socket.IO 通知
    const handleNotification = (notification) => {
      console.log('[Socket] 收到通知:', notification.type, notification);
      console.log('[Socket] 当前 pairId:', pairId, '类型:', typeof pairId);
      console.log('[Socket] notification.relatedId:', notification.relatedId, '类型:', typeof notification.relatedId);
      // 使用宽松相等比较 pairId，避免类型不一致问题
      const isThisPair = notification.relatedId == pairId;
      console.log('[Socket] isThisPair:', isThisPair);

      // 收到结束申请通知
      if (notification.type === 'end_request' && isThisPair) {
        setPairStatus('end_requested');
        setEndRequestedBy(notification.applicantId || notification.end_requested_by);
        setShowEndRequestModal(true);
        return;
      }
      // 结束申请被拒绝
      if (notification.type === 'end_rejected' && isThisPair) {
        alert('对方拒绝结束教学');
        setPairStatus('active');
        setEndRequestedBy(null);
        return;
      }
      // 结束申请被接受
      if (notification.type === 'end_accepted' && isThisPair) {
        alert('对方已同意结束教学，正在生成总结...');
        setPairStatus('completed');
        handleDialogueEnd();
        return;
      }
      // 轮次审查完成通知
      if (notification.type === 'round_review_completed' && isThisPair) {
        console.log('[Socket] 收到轮次审查完成通知，刷新审查结果:', notification);
        // 刷新审查结果（无论侧栏是否打开都更新，保持数据最新）
        fetchRoundReviews();
        // 如果发现错误且是新的问题轮次，显示问题提示
        if (notification.reviewResult?.hasError && notification.roundId) {
          const roundId = notification.roundId;
          if (!notifiedErrorRoundsRef.current.has(roundId)) {
            notifiedErrorRoundsRef.current.add(roundId);
            setShowReviewNotification(true);
            console.log('[Socket] 新发现问题轮次:', roundId);
          }
        } else {
          // 无错误：显示"轮次审查完成"提示，2秒后自动消失
          setShowReviewComplete(true);
          if (reviewCompleteTimeoutRef.current) {
            clearTimeout(reviewCompleteTimeoutRef.current);
          }
          reviewCompleteTimeoutRef.current = setTimeout(() => {
            setShowReviewComplete(false);
          }, 2000);
        }
        return;
      }
      // 学生错误检测通知（发给老师）
      if (notification.type === 'student_error_detected' && isThisPair) {
        console.log('[Socket] 收到学生错误检测通知:', notification);
        alert(`检测到回答存在问题：${notification.content}`);
        fetchRoundReviews();
        return;
      }
      // 对话总结完成通知
      if (notification.type === 'conversation_summary_completed' && isThisPair) {
        console.log('[Socket] 收到对话总结完成通知:', notification);
        if (notification.summaryData) {
          setSummary(notification.summaryData);
          setShowSummaryModal(true);
        }
        return;
      }
    };

    socketService.on('notification', handleNotification);

    // 清理函数：组件卸载时停止轮询和移除监听
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (reviewCompleteTimeoutRef.current) {
        clearTimeout(reviewCompleteTimeoutRef.current);
        reviewCompleteTimeoutRef.current = null;
      }
      socketService.off('notification', handleNotification);
    };
  }, [pairId]);

  useEffect(() => {
    // 首次加载时总是滚动到底部
    if (previousMessagesLengthRef.current === 0 && messages.length > 0) {
      scrollToBottom();
    }
    // 只有在消息数量增加时才考虑滚动
    else if (messages.length > previousMessagesLengthRef.current) {
      // 检查用户是否在底部
      if (messagesAreaRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesAreaRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

        if (isAtBottom) {
          scrollToBottom();
        }
      }
    }

    previousMessagesLengthRef.current = messages.length;
  }, [messages]);

  // 调试用：监控 roundReviews 变化
  useEffect(() => {
    console.log('[roundReviews 变化] 最新状态，长度:', roundReviews.length);
    if (roundReviews.length > 0) {
      console.log('[roundReviews 变化] 最新数据:', JSON.stringify(roundReviews.map(r => ({
        id: r.id,
        reviewed: r.reviewed,
        summary: r.review?.summary?.substring(0, 50)
      }))));
    }
  }, [roundReviews]);

  const fetchMessages = async (isInitialLoad = false) => {
    // 引导模式：使用模拟消息，不调用 API
    if (guideMode) {
      setMessages(mockGuideMessages);
      setPairStatus('active');
      setLoading(false);
      return;
    }

    // 只在首次加载时显示 loading 状态
    if (isInitialLoad) {
      setLoading(true);
    }
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        if (isInitialLoad) {
          setError("请先登录");
          setLoading(false);
        }
        return;
      }

      const response = await fetch(
        `/api/chats/${pairId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `获取消息失败 (${response.status})`);
      }

      const data = await response.json();
      const newMessages = Array.isArray(data) ? data : [];

      // 消息去重：只在有新消息时更新状态
      if (newMessages.length > 0) {
        const currentLastId = lastMessageId;
        const newLastId = newMessages[newMessages.length - 1]?.id;

        // 如果有新消息，更新状态
        if (newLastId !== currentLastId) {
          setMessages(newMessages);
          setLastMessageId(newLastId);
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      // 轮询失败时不显示错误，避免影响用户体验
      if (isInitialLoad) {
        setError(error.message || "获取消息失败");
      }
    } finally {
      // 只在首次加载时关闭 loading
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  // 获取结对状态
  const fetchPairStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `/api/pairs/${pairId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const pairData = await response.json();
        // 检查AI教学模式并更新状态
        setIsAITeachingMode(!!pairData.is_ai_teaching);
        checkEndRequest(pairData);
      }
    } catch (error) {
      console.error("Error fetching pair status:", error);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("请先登录");
        return;
      }

      // 如果有选中图片，使用图片上传接口
      if (selectedImage) {
        const formData = new FormData();
        formData.append('image', selectedImage);
        formData.append('content', inputText);

        const response = await fetch(
          `/api/chats/${pairId}/image`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || errorData.error || `发送失败 (${response.status})`);
        }

        // 清除图片状态
        setSelectedImage(null);
        setImagePreview(null);
      } else {
        // 纯文本消息
        const response = await fetch(
          `/api/chats/${pairId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              content: inputText,
              senderRole: 'student'
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || errorData.error || `发送失败 (${response.status})`);
        }
      }

      setInputText("");
      fetchMessages(false);

      // AI教学模式：发送消息后请求AI学生追问
      if (isAITeachingMode) {
        setIsWaitingForAI(true);

        // 构建对话历史
        const conversationHistory = messages.map(msg => ({
          role: msg.sender_role === 'ai_student' ? 'ai_student' : 'teacher',
          content: msg.content
        }));

        try {
          const aiResponse = await fetch('/api/ai/student-ask', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              pairId: parseInt(pairId),
              teacherQuestion: inputText,
              conversationHistory: conversationHistory
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            if (aiData.success && aiData.data && aiData.data.question) {
              // 保存AI回复到数据库 - 使用 teacher_id 作为 sender_id
              // 因为AI学生没有真实账户，需要借用老师的sender_id但在消息中标记角色
              try {
                await fetch(`/api/chats/${pairId}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    content: aiData.data.question,
                    senderRole: 'ai_student'
                  }),
                });
              } catch (saveErr) {
                console.error('保存AI消息失败:', saveErr);
              }

              // 重新获取消息列表
              fetchMessages(false);
            }
          }
        } catch (err) {
          console.error('AI追问请求失败:', err);
        } finally {
          setIsWaitingForAI(false);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setError(error.message || "发送失败");
    }
  };

  // 处理图片选择
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('不支持的图片格式，支持 JPEG、PNG、GIF、WebP');
      return;
    }

    // 验证文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // 处理粘贴图片
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault(); // 阻止默认粘贴行为
        const file = item.getAsFile();
        if (file) {
          // 复用 handleImageSelect 的逻辑，但需要手动创建事件对象
          const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
          if (!allowedTypes.includes(file.type)) {
            alert('不支持的图片格式，支持 JPEG、PNG、GIF、WebP');
            return;
          }
          if (file.size > 5 * 1024 * 1024) {
            alert('图片大小不能超过 5MB');
            return;
          }
          setSelectedImage(file);
          setImagePreview(URL.createObjectURL(file));
        }
        break;
      }
    }
  };

  // 下载图片
  const handleDownloadImage = (imageUrl) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = imageUrl.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 引导模式：确认对方同意结束的弹窗处理
  const handleGuideEndConfirm = () => {
    setShowGuideEndModal(false);
    setPairStatus('completed');
  };

  // 申请结束对话
  const handleRequestEnd = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("请先登录");
        return;
      }

      const response = await fetch(
        `/api/chats/${pairId}/request-end`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setShowEndConfirmModal(false);
        if (data.message === '对话已结束') {
          // AI教学模式：直接结束
          setPairStatus('completed');
          alert("对话已结束，正在生成总结...");
          handleDialogueEnd();
        } else {
          alert("已申请结束教学，等待对方确认");
        }
      } else {
        alert(data.error || data.message || "申请失败");
      }
    } catch (error) {
      console.error("申请结束教学失败:", error);
      alert("服务器错误，请稍后重试");
    }
  };

  // 确认结束对话框（显示确认模态框）
  const handleConfirmEnd = async () => {
    if (guideMode) {
      // 引导模式：弹窗提示对方同意
      setShowGuideEndModal(true);
      return;
    }

    // AI教学模式：使用后端审查的轮次数判断
    if (isAITeachingMode) {
      // 先刷新轮次审查数据，确保使用最新值
      const rounds = await fetchRoundReviews();
      const reviewedRoundCount = rounds.length;
      console.log('[handleConfirmEnd] 后端审查轮次数:', reviewedRoundCount);

      if (reviewedRoundCount < 5) {
        alert(`轮次数不足，当前轮次：${reviewedRoundCount}，需达到5轮才能结束`);
        return;
      }
    }

    setShowEndConfirmModal(true);
  };

  // 同意结束请求
  const handleAcceptEnd = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("请先登录");
        return;
      }

      const response = await fetch(
        `/api/chats/${pairId}/accept-end`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setShowEndRequestModal(false);
        setPairStatus('completed');
        alert("对话已结束，正在生成总结...");

        // 执行结束后的处理流程（轮次审查 + 生成总结）
        await handleDialogueEnd();
      } else {
        alert(data.error || data.message || "操作失败");
      }
    } catch (error) {
      console.error("同意结束请求失败:", error);
      alert("服务器错误，请稍后重试");
    }
  };

  // 拒绝结束请求
  const handleRejectEnd = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("请先登录");
        return;
      }

      const response = await fetch(
        `/api/chats/${pairId}/reject-end`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setShowEndRequestModal(false);
        setPairStatus('active');
        setEndRequestedBy(null);
        alert("已拒绝结束申请，继续教学");
      } else {
        alert(data.error || data.message || "操作失败");
      }
    } catch (error) {
      console.error("拒绝结束请求失败:", error);
      alert("服务器错误，请稍后重试");
    }
  };

  // 检查对方的结束申请
  const checkEndRequest = (pairData) => {
    if (pairData.status === 'end_requested' &&
        pairData.end_request_status === 'pending' &&
        pairData.end_requested_by !== currentUserId) {
      setShowEndRequestModal(true);
      setPairStatus('end_requested');
      setEndRequestedBy(pairData.end_requested_by);
    } else {
      setPairStatus(pairData.status);
      setEndRequestedBy(pairData.end_requested_by);
    }
  };

  // 进行轮次审查
  const reviewRounds = async () => {
    // 引导模式：跳过 API 调用
    if (guideMode) {
      return true;
    }

    try {
      setIsReviewing(true);
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("未找到 token");
        return;
      }

      // 获取所有轮次
      const roundsResponse = await fetch(
        `/api/ai/rounds/${pairId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!roundsResponse.ok) {
        const errorData = await roundsResponse.json().catch(() => ({}));
        console.error('获取轮次失败:', errorData);
        return;
      }

      const roundsData = await roundsResponse.json();
      const rounds = roundsData.rounds || [];

      console.log(`[轮次审查] 开始审查 ${rounds.length} 个轮次`);

      // 对每个未审查的轮次进行审查
      for (const round of rounds) {
        if (!round.reviewed && round.studentMessageId) {
          try {
            const reviewResponse = await fetch(
              `/api/ai/round/round_${round.studentMessageId}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (reviewResponse.ok) {
              const reviewResult = await reviewResponse.json();
              console.log(`[轮次审查] 轮次 ${round.id} 审查完成`, reviewResult);
            }
          } catch (error) {
            console.error(`[轮次审查] 轮次 ${round.id} 审查失败:`, error);
          }
        }
      }

      console.log('[轮次审查] 所有轮次审查完成');
      return true;
    } catch (error) {
      console.error('轮次审查失败:', error);
      return false;
    } finally {
      setIsReviewing(false);
    }
  };

  // 获取轮次审查结果
  const fetchRoundReviews = async () => {
    // 引导模式：使用预制的审查结果（通过 setRoundReviews 设置）
    if (guideMode) {
      return roundReviews;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) return [];

      console.log('[fetchRoundReviews] 开始获取轮次审查结果, pairId:', pairId);

      const response = await fetch(
        `/api/ai/rounds/${pairId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('[fetchRoundReviews] API 响应状态:', response.status);

      if (!response.ok) {
        console.error('获取轮次审查结果失败');
        return [];
      }

      const data = await response.json();
      console.log('[fetchRoundReviews] API 返回数据:', data);

      if (data.success && data.rounds) {
        console.log('[fetchRoundReviews] 更新 roundReviews，当前数量:', data.rounds.length);
        console.log('[fetchRoundReviews] 数据:', JSON.stringify(data.rounds.slice(0, 2)));
        setRoundReviews(data.rounds);
        console.log('[fetchRoundReviews] setRoundReviews 已调用，rounds 长度:', data.rounds.length);

        // 检查是否有问题的轮次
        const hasProblems = data.rounds.some(r => r.reviewed && r.review?.has_error);
        console.log('[fetchRoundReviews] 是否有问题:', hasProblems);
        setShowReviewNotification(hasProblems);

        return data.rounds; // 返回数据供直接使用
      } else {
        console.log('[fetchRoundReviews] 数据格式不对或无 rounds:', data);
        return [];
      }
    } catch (error) {
      console.error('获取轮次审查结果失败:', error);
      return [];
    }
  };

  // 切换审查栏展开/收起
  const toggleReviewPanel = () => {
    const newState = !reviewPanelOpen;
    setReviewPanelOpen(newState);
    if (newState) {
      fetchRoundReviews();
    }
  };

  // 生成对话总结
  const generateSummary = async () => {
    try {
      setIsSummarizing(true);
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("未找到 token");
        return;
      }

      console.log('[总结] 开始生成对话总结');

      const response = await fetch(
        '/api/ai/summary',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pairId: parseInt(pairId),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('生成总结失败:', errorData);
        alert(errorData.error || errorData.message || '生成总结失败');
        return;
      }

      const data = await response.json();

      if (data.success && data.data) {
        console.log('[总结] 总结生成成功', data.data);
        setSummary(data.data);
        setShowSummaryModal(true);
      } else {
        console.error('[总结] 总结生成失败', data);
        alert(data.message || '生成总结失败');
      }
    } catch (error) {
      console.error('生成总结失败:', error);
      alert('生成总结失败，请稍后重试');
    } finally {
      setIsSummarizing(false);
    }
  };

  // 处理对话结束（生成总结）
  const handleDialogueEnd = async () => {
    console.log('[对话结束] 开始处理对话结束流程');

    // 1. 生成对话总结（轮次审查已在消息发送时自动触发）
    await generateSummary();

    // 2. 跳转到问卷页面
    console.log('[对话结束] 跳转到问卷页面');
    navigate(`/quiz/post/${pairId}`);
  };

  return (
    <div className={`dialogue-container ${reviewPanelOpen ? 'review-panel-open' : ''} ${guideMode ? 'guide-mode' : ''} ${(showEndConfirmModal || showEndRequestModal || showSummaryModal || showGuideEndModal) ? 'modal-showing' : ''}`}>
      {/* AI 审查栏 */}
      <div className={`review-panel ${reviewPanelOpen ? 'expanded' : 'collapsed'}`}>
        <div className="review-panel-header" onClick={toggleReviewPanel}>
          <span className="review-panel-title">
            <span>🔍</span>
            <span>AI 审查</span>
          </span>
          <span className="review-panel-toggle">{reviewPanelOpen ? '◀' : '▶'}</span>
        </div>
        {reviewPanelOpen && (
          <div className="review-panel-content">
            {/* 问题汇总 */}
            {(() => {
              const problemRounds = roundReviews.filter(r => r.reviewed && r.review?.has_error);
              if (problemRounds.length > 0) {
                return (
                  <div className="problem-summary">
                    <div className="problem-summary-header">
                      <span className="warning-icon">⚠️</span>
                      <span>问题（{problemRounds.length}个）</span>
                    </div>
                    <ul className="problem-list">
                      {problemRounds.map((round, index) => (
                        <li key={round.id} className="problem-item">
                          第{index + 1}轮：{round.review.error_details?.[0]?.errorType || '存在错误'}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              } else if (roundReviews.length > 0) {
                return (
                  <div className="no-problems">
                    <div className="no-problems-header">
                      <span>✓</span>
                      <span>未发现问题</span>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* 轮次总结 */}
            {roundReviews.length > 0 && (
              <div className="round-summaries">
                <div className="round-summaries-title">内容总结</div>
                {roundReviews.map((round, index) => (
                  <div
                    key={round.id}
                    className={`round-summary-item ${round.reviewed && round.review?.has_error ? 'has-error' : ''}`}
                  >
                    <div className="round-number">第{index + 1}轮</div>
                    <div className="round-summary-content">
                      {round.review?.summary || '暂无总结'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 问题通知提示 */}
      {showReviewNotification && !reviewPanelOpen && (() => {
        const problemCount = notifiedErrorRoundsRef.current.size;
        return (
          <div className="review-problem-notification" onClick={toggleReviewPanel}>
            <div className="review-problem-text">
              发现 <strong>{problemCount} 个问题</strong>，点击查看详情
            </div>
            <button
              className="review-problem-close"
              onClick={(e) => {
                e.stopPropagation();
                setShowReviewNotification(false);
              }}
            >
              ×
            </button>
          </div>
        );
      })()}

      {/* 审查完成提示（无错误时） */}
      {showReviewComplete && !reviewPanelOpen && (
        <div className="review-complete-notification">
          <div className="review-complete-text">✓ 轮次审查完成</div>
        </div>
      )}

      {/* 审查栏展开提示 - 收起时显示在左侧 */}
      <div
        className={`review-panel-expand-hint ${reviewPanelOpen ? '' : 'visible'}`}
        onClick={toggleReviewPanel}
        data-guide="ai-review-btn"
      >
        🔍 AI审查
      </div>

      <div className="dialogue-header">
        <h2 className="dialogue-title">对话</h2>
        {pairStatus === 'active' && (
          <button
            className="end-dialogue-btn"
            onClick={handleConfirmEnd}
            data-guide="end-dialogue-btn"
          >
            结束对话
          </button>
        )}
      </div>

      <div className="messages-area" ref={messagesAreaRef}>
        {loading ? (
          <div className="loading">加载中...</div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <div className="error-message">{error}</div>
            <div className="error-hint">
              {error.includes("结对不存在") && "请确认结对 ID 是否正确"}
              {error.includes("无权查看") && "您不是该结对的成员"}
              {error.includes("无效的结对 ID") && "请从有效结对进入对话"}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <div className="quick-prompts">
              <div className="prompt-bubble left">如何开始?</div>
              <div className="prompt-bubble right">可以这样开始...</div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-bubble ${
                msg.sender_role === 'ai_student' ? "left" : (msg.sender_id === currentUserId ? "right" : "left")
              }`}
            >
              <div className="message-header">
                <span className="message-avatar">
                  {msg.sender_role === 'ai_student' ? "🤖" : (msg.sender_id === currentUserId ? "👤" : "👥")}
                </span>
                <span className="message-sender">
                  {msg.sender_role === 'ai_student' ? "小智（AI学生）" : (msg.sender_nickname || (msg.sender_id === currentUserId ? "我" : "对方"))}
                </span>
              </div>
              {msg.image_url && (
                <img
                  src={msg.image_url}
                  alt="消息图片"
                  className="message-image"
                  onClick={() => setImagePreviewModal(msg.image_url)}
                />
              )}
              {msg.content && (
                <span className="message-content">
                  {parseLatexContent(msg.content).map((part, index) =>
                    part.type === 'latex' ? (
                      <span
                        key={index}
                        className={part.displayMode ? 'latex-display' : 'latex-inline'}
                        dangerouslySetInnerHTML={{ __html: part.content }}
                      />
                    ) : (
                      <span key={index}>{part.content}</span>
                    )
                  )}
                </span>
              )}
            </div>
          ))
        )}
        {pairStatus === 'completed' && (
          <div className="dialogue-ended-notice">对话已结束，无法发送新消息</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {pairStatus !== 'completed' ? (
        <div className="input-area">
          {/* 图片预览区域 */}
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="预览" />
              <button
                className="remove-image-btn"
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview(null);
                }}
              >
                ×
              </button>
            </div>
          )}

          <div className="input-container">
            <label className="image-upload-btn" title="发送图片">
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
              <CameraIcon size={20} />
            </label>
            <span className="input-icon"><PenIcon size={20} /></span>
            <textarea
              className="message-input"
              placeholder={isWaitingForAI ? "等待AI学生追问中..." : "请输入消息...（可粘贴图片 Ctrl+V；支持 LaTeX 数学公式）"}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isWaitingForAI) {
                    handleSend(e);
                  }
                }
              }}
              onPaste={handlePaste}
              disabled={isWaitingForAI}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={(!inputText.trim() && !selectedImage) || isWaitingForAI}
            >
              {isWaitingForAI ? "..." : "发送"}
            </button>
          </div>
        </div>
      ) : (
        <div className="input-area-disabled">
          <div className="dialogue-ended-notice">对话已结束，无法发送新消息</div>
        </div>
      )}

      {/* 确认结束模态框 */}
      {showEndConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowEndConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">确认结束对话</h3>
            <p className="modal-message">确定要结束当前的教学对话吗？</p>
            <div className="modal-buttons">
              <button
                className="btn-cancel"
                onClick={() => setShowEndConfirmModal(false)}
              >
                取消
              </button>
              <button
                className="btn-confirm"
                onClick={handleRequestEnd}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 引导模式：对方同意结束 */}
      {showGuideEndModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">对方同意了您的结束申请</h3>
            <p className="modal-message">对方已同意结束当前教学对话</p>
            <div className="modal-buttons">
              <button
                className="btn-confirm"
                onClick={handleGuideEndConfirm}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 收到结束申请模态框 */}
      {showEndRequestModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">对方申请结束教学</h3>
            <p className="modal-message">对方希望结束当前的教学对话</p>
            <div className="modal-buttons">
              <button
                className="btn-reject"
                onClick={handleRejectEnd}
              >
                拒绝
              </button>
              <button
                className="btn-confirm"
                onClick={handleAcceptEnd}
              >
                同意
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 总结模态框 */}
      {showSummaryModal && summary && (
        <div className="modal-overlay">
          <div className="modal-content summary-modal">
            <h3 className="modal-title">教学对话总结</h3>

            {/* 整体评价 */}
            {summary.summary_text && (
              <div className="summary-section">
                <h4 className="summary-section-title">整体评价</h4>
                <p className="summary-text">{summary.summary_text}</p>
              </div>
            )}

            {/* 亮点 */}
            {summary.highlights && summary.highlights.length > 0 && (
              <div className="summary-section">
                <h4 className="summary-section-title">🌟 教学亮点</h4>
                <ul className="summary-list">
                  {summary.highlights.map((highlight, index) => (
                    <li key={index} className="summary-item">
                      <span className="highlight-category">{highlight.category}:</span>
                      <span className="highlight-description">{highlight.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 改进建议 */}
            {summary.improvements && summary.improvements.length > 0 && (
              <div className="summary-section">
                <h4 className="summary-section-title">💡 改进建议</h4>
                <ul className="summary-list">
                  {summary.improvements.map((improvement, index) => (
                    <li key={index} className="summary-item">
                      <span className="improvement-type">{improvement.type}:</span>
                      <span className="improvement-suggestion">{improvement.suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 核心知识点 */}
            {summary.key_learnings && summary.key_learnings.length > 0 && (
              <div className="summary-section">
                <h4 className="summary-section-title">📚 核心知识点</h4>
                <ul className="summary-list">
                  {summary.key_learnings.map((learning, index) => (
                    <li key={index} className="summary-item learning-item">
                      {learning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 统计信息 */}
            {summary.statistics && (
              <div className="summary-section summary-stats">
                <h4 className="summary-section-title">📊 对话统计</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">总轮次数</span>
                    <span className="stat-value">{summary.statistics.totalRounds || 0}</span>
                  </div>
                  {summary.statistics.roundsWithError > 0 && (
                    <div className="stat-item">
                      <span className="stat-label">发现错误的轮次</span>
                      <span className="stat-value stat-value-warning">{summary.statistics.roundsWithError}</span>
                    </div>
                  )}
                  {summary.statistics.errorCount > 0 && (
                    <div className="stat-item">
                      <span className="stat-label">错误总数</span>
                      <span className="stat-value stat-value-error">{summary.statistics.errorCount}</span>
                    </div>
                  )}
                  {summary.statistics.averageConfidence > 0 && (
                    <div className="stat-item">
                      <span className="stat-label">平均置信度</span>
                      <span className="stat-value">
                        {(summary.statistics.averageConfidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 整体评级 */}
            {summary.overall_rating && (
              <div className="summary-rating">
                <span className="rating-label">整体评级：</span>
                <span className={`rating-badge rating-${summary.overall_rating}`}>
                  {summary.overall_rating === 'excellent' && '优秀'}
                  {summary.overall_rating === 'good' && '良好'}
                  {summary.overall_rating === 'fair' && '一般'}
                  {summary.overall_rating === 'needs_improvement' && '需要改进'}
                </span>
              </div>
            )}

            <div className="modal-buttons">
              <button
                className="btn-confirm"
                onClick={() => {
                  setShowSummaryModal(false);
                  setSummary(null);
                }}
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 轮次审查中提示 */}
      {isReviewing && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="loading-spinner">⏳</div>
            <h3 className="modal-title">正在进行轮次审查...</h3>
            <p className="modal-message">正在分析对话内容，请稍候</p>
          </div>
        </div>
      )}

      {/* 生成总结中提示 */}
      {isSummarizing && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="loading-spinner">⏳</div>
            <h3 className="modal-title">正在生成总结...</h3>
            <p className="modal-message">正在分析对话并生成教学总结，请稍候</p>
          </div>
        </div>
      )}

      {/* 图片预览模态框 */}
      {imagePreviewModal && (
        <div className="image-preview-modal" onClick={() => setImagePreviewModal(null)}>
          <div className="image-preview-content" onClick={e => e.stopPropagation()}>
            <button className="close-preview-btn" onClick={() => setImagePreviewModal(null)}>×</button>
            <img src={imagePreviewModal} alt="预览" />
            <button
              className="download-image-btn"
              onClick={() => handleDownloadImage(imagePreviewModal)}
            >
              ⬇️ 下载
            </button>
          </div>
        </div>
      )}

      {/* 引导组件 */}
      {guideMode && guideActive && (
        <InteractiveGuide
          active={guideActive}
          onComplete={handleGuideComplete}
          onNavigate={handleGuideNavigate}
          startingStep={guideStep}
        />
      )}
    </div>
  );
};

export default Dialogue;