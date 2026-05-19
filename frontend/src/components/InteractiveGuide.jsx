import React, { useState, useEffect, useRef } from 'react';
import './InteractiveGuide.css';

// 引导步骤配置
const guideSteps = [
  {
    id: 1,
    type: 'modal',
    title: '关于本网站',
    content: '本网站希望帮助学习者找到学习伙伴，扮演学生与老师的角色，在教中学、学中教，践行费曼学习法的理念。同时，我们引入了AI辅助系统，帮助你们总结学习内容，生成巩固试题等。由于团队能力有限，使用期间可能会遇到bug，请您多多谅解。接下来将进行正式的引导，帮助您充分利用这个网站！<span style="color: red;">如果在引导过程中断（比如页面跳转时），请尝试刷新页面！</span>',
    note: '更详细的说明可点击 主页——费曼学习法 查看'
  },
  {
    id: 2,
    type: 'highlight',
    target: '.card[data-guide="personal-card"]',
    text: '点击进入个人主页',
    nextAction: 'navigate',
    navigateTo: '/personal'
  },
  {
    id: 3,
    type: 'highlight',
    target: '[data-guide="edit-profile"]',
    text: '点击"修改"',
    nextAction: 'click'
  },
  {
    id: 4,
    type: 'modal',
    title: '第一步：设置个人信息',
    content: null,
    sections: [
      { title: '必填：', content: '学科偏好、难度偏好。这些信息将帮助您匹配合适的学习伙伴。' },
      { title: '选填：', content: '昵称、简介。展示您的个性。但请不要取太奇怪的昵称。' }
    ]
  },
  {
    id: 5,
    type: 'highlight',
    target: '[data-guide="my-history"]',
    text: '点击"我的足迹"',
    nextAction: 'click'
  },
  {
    id: 6,
    type: 'modal',
    title: '在"我的足迹"，您可以：',
    content: '- 前往进行中的对话\n- 查看历史对话记录\n- 查看对话总结'
  },
  {
    id: 7,
    type: 'highlight',
    target: '[data-guide="my-notifications"]',
    text: '点击"我的通知"',
    nextAction: 'click'
  },
  {
    id: 8,
    type: 'modal',
    title: '在"我的通知"，您可以：',
    content: '- 接收各种通知，包括结对申请、问卷提示等\n- 接收并发送私信（支持图片），例如提醒结对者上线、给"管理员"发消息让他修bug'
  },
  {
    id: 9,
    type: 'modal',
    content: '奖励中心涉及其他部分的内容，我们先去看如何开始并进行对话吧！'
  },
  {
    id: 10,
    type: 'highlight',
    target: '[data-guide="ask-link"]',
    text: '点击"提问"',
    nextAction: 'navigate',
    navigateTo: '/ask'
  },
  {
    id: 11,
    type: 'modal',
    title: '您需要',
    content: '填充问题的必要信息，让结对者清晰了解您的问题。请尽量在"标题"和"疑问"填写多一些信息，因为AI将根据这些信息生成"热身测试"，帮助您了解自己的薄弱点。当然，您也可以选择<span style="color: red;">AI提问模式</span>，您将扮演老师，在对AI的教学中进步。'
  },
  {
    id: 12,
    type: 'modal',
    title: '寻找结对者',
    content: '您可以通过智能匹配筛选合适的结对者，或者在浏览页面翻找合适的结对者。我们建议您寻找在线的用户，这会提高您的结对效率。\n\n提示：如果您无法匹配到合适人选，但想要快速结对，可以用"匹配"搜索在线用户，记住这些用户，然后在"浏览"中寻找这些用户的问题'
  },
  {
    id: 13,
    type: 'modal',
    title: '一次对话示例',
    content: '接下来将以一次模拟对话为您介绍一次完整对话的流程。您一般可以在"个人中心——我的足迹——查看详情——继续对话"进入对话。为了演示简便，将为您直接开启一次对话。'
  },
  {
    id: 14,
    type: 'guide-dialogue',
    action: 'enter-quiz'
  },
  {
    id: 15,
    type: 'modal',
    content: '对话开始前，无论您是学生还是老师都需要完成5道选择题。您完全不需要担心选错，这些问题只是希望激发您提问的兴趣或提示您的薄弱点。请随意选择5个选项后按下"提交"。'
  },
  {
    id: 16,
    type: 'guide-dialogue',
    action: 'submit-quiz'
  },
  {
    id: 17,
    type: 'guide-dialogue',
    action: 'enter-dialogue'
  },
  {
    id: 18,
    type: 'guide-dialogue',
    action: 'show-messages'
  },
  {
    id: 19,
    type: 'highlight',
    target: '[data-guide="ai-review-btn"]',
    text: '点击"AI审查"展开查看',
    nextAction: 'click'
  },
  {
    id: 20,
    type: 'modal',
    content: '第1轮：无问题\n第2轮：发现3个问题'
  },
  {
    id: 21,
    type: 'modal',
    content: '好的，现在您完成了学习，打算结束这次对话。点击此处，将发送结束申请。'
  },
  {
    id: 22,
    type: 'highlight',
    target: '[data-guide="end-dialogue-btn"]',
    text: '点击"结束对话"',
    nextAction: 'click'
  },
  {
    id: 23,
    type: 'modal',
    content: '很好，对方同意了您的结束申请。AI将为您自动生成对话总结和测试问卷（您可以在"个人中心——我的足迹——查看详情"中查看）'
  },
  {
    id: 24,
    type: 'navigate',
    navigateTo: '/personal'
  },
  {
    id: 25,
    type: 'modal',
    content: '现在，让我们回到"奖励中心"'
  },
  {
    id: 26,
    type: 'highlight',
    target: '[data-guide="reward-center"]',
    text: '点击进入奖励中心',
    nextAction: 'navigate',
    navigateTo: '/reward-exchange'
  },
  {
    id: 27,
    type: 'modal',
    title: '奖励规则',
    content: '每次完成对话并填写问卷后，您将获得1张抽奖券。在7天内，您可以抽取奖品并兑换，我们将及时将奖品送到，并向您发送私信确认。更加细致的规则，请点击"概率及奖励说明"查看'
  },
  {
    id: 28,
    type: 'modal',
    title: '恭喜您',
    content: '您已完成了所有引导，开始进行结对学习吧！有任何问题与建议，欢迎私信"管理员"'
  }
];

// 引导提示弹窗组件（首次进入时显示）
const GuidePromptModal = ({ visible, onStart, onDecline }) => {
  if (!visible) return null;

  return (
    <div className="guide-prompt-mask" onClick={onDecline}>
      <div className="guide-prompt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="guide-prompt-content">
          <p>您可以点击此处了解本网站</p>
          <p>建议在全屏下进行引导</p>
          <div className="guide-prompt-buttons">
            <button className="guide-btn guide-btn-primary" onClick={onStart}>
              进入引导
            </button>
            <button className="guide-btn guide-btn-secondary" onClick={onDecline}>
              稍后再说
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 引导弹窗组件
const GuideModal = ({ step, onNext, isLast }) => {
  const renderContent = () => {
    if (step.sections) {
      // 多section弹窗（如步骤3）
      return (
        <div className="guide-modal-content">
          {step.sections.map((section, index) => (
            <div key={index} className="guide-section">
              <h4>{section.title}</h4>
              <p>{section.content}</p>
            </div>
          ))}
        </div>
      );
    }

    if (step.content) {
      // 简单内容弹窗
      const isMultiLine = step.content.includes('\n');
      if (isMultiLine && step.content.includes('- ')) {
        // markdown格式内容
        const lines = step.content.split('\n').filter(line => line.trim());
        return (
          <div className="guide-modal-content">
            {lines.map((line, index) => {
              if (line.startsWith('- ')) {
                return <p key={index} className="guide-list-item">{line.slice(2)}</p>;
              }
              if (line.startsWith('提示：')) {
                return <p key={index} className="guide-hint">{line}</p>;
              }
              return <p key={index}>{line}</p>;
            })}
          </div>
        );
      }
      return (
        <div className="guide-modal-content">
          <p dangerouslySetInnerHTML={{ __html: step.content }} />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="guide-modal-overlay">
      <div className="guide-modal">
        {step.title && <h3 className="guide-modal-title">{step.title}</h3>}
        {renderContent()}
        {step.note && <p className="guide-modal-note">{step.note}</p>}
        <div className="guide-modal-footer">
          <button className="guide-btn guide-btn-primary" onClick={onNext}>
            {isLast ? '完成' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  );
};

// 高亮遮罩组件
const HighlightOverlay = ({ target, text, onClick, disabled }) => {
  const [position, setPosition] = useState(null);
  const [visible, setVisible] = useState(false);
  const [placement, setPlacement] = useState('bottom');

  useEffect(() => {
    if (!target || disabled) return;

    const updatePosition = () => {
      // 关闭可能遮挡目标元素的编辑弹窗（个人页面修改资料弹窗等）
      document.querySelector('.profile-edit-modal-close')?.click();
      // 关闭可能遮挡目标元素的AI审查面板（对话页面审查栏展开时全屏覆盖）
      const expandedReviewPanel = document.querySelector('.review-panel.expanded');
      if (expandedReviewPanel) {
        document.querySelector('.review-panel-header')?.click();
      }
      // 查找所有匹配元素，优先使用可见的（解决移动端桌面导航被隐藏导致位置错误的问题）
      const allElements = document.querySelectorAll(target);
      const element = Array.from(allElements).find(el => el.offsetParent !== null) || allElements[0];
      if (element) {
        // 自动滚动到目标元素，移动端无需手动滚动
        element.scrollIntoView({ behavior: 'instant', block: 'center' });
        const rect = element.getBoundingClientRect();
        const tipHeight = 60; // 提示框估算高度
        const gap = 20;
        const fitsBelow = rect.bottom + gap + tipHeight <= window.innerHeight;
        setPlacement(fitsBelow ? 'bottom' : 'top');
        setPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
        setVisible(true);
        sessionStorage.removeItem('guidePendingHighlight');
      }
    };

    const isPending = sessionStorage.getItem('guidePendingHighlight') === 'true';
    const delay = isPending ? 500 : 100;

    const timer = setTimeout(updatePosition, delay);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [target, disabled]);

  if (!visible || !position || disabled) return null;

  const isBottom = placement === 'bottom';

  return (
    <div className="guide-highlight-overlay">
      <div
        className="guide-highlight-mask"
        onClick={() => onClick && onClick()}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9998
        }}
      >
        <div
          className="guide-highlight-hole"
          style={{
            position: 'absolute',
            top: `${position.top - 10}px`,
            left: `${position.left - 10}px`,
            width: `${position.width + 20}px`,
            height: `${position.height + 20}px`,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
            borderRadius: '8px',
            transition: 'all 0.3s ease'
          }}
        />
      </div>

      <div
        className={`guide-highlight-tip ${isBottom ? 'guide-highlight-tip-below' : 'guide-highlight-tip-above'}`}
        style={{
          position: 'fixed',
          top: isBottom
            ? `${position.top + position.height + 20}px`
            : `${position.top - 20}px`,
          left: `${position.left + position.width / 2}px`,
          transform: isBottom ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
          zIndex: 9999
        }}
      >
        <p>{text}</p>
        <div className={`guide-highlight-arrow ${isBottom ? '' : 'guide-highlight-arrow-down'}`}></div>
      </div>
    </div>
  );
};

// 交互式引导组件
const InteractiveGuide = ({
  active,
  onComplete,
  onStepChange,
  onNavigate,
  guideModeRef,
  startingStep
}) => {
  const [currentStep, setCurrentStep] = useState(() => {
    // 优先使用 startingStep，其次从sessionStorage恢复
    if (startingStep !== undefined) {
      return startingStep;
    }
    const savedStep = sessionStorage.getItem('guideStep');
    return savedStep ? parseInt(savedStep, 10) : 0;
  });
  const [showPrompt, setShowPrompt] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const guideActionExecutingRef = useRef(false);

  // 统一步骤初始化逻辑：移除两个竞争的 useEffect，改用一个
  useEffect(() => {
    if (active) {
      // startingStep 存在时优先使用，否则从 sessionStorage 恢复
      if (startingStep !== undefined) {
        setCurrentStep(startingStep);
      } else {
        const savedStep = sessionStorage.getItem('guideStep');
        if (savedStep) {
          setCurrentStep(parseInt(savedStep, 10));
        } else {
          setCurrentStep(0);
        }
      }
    }
  }, [active, startingStep]);

  // 导航时立即隐藏当前内容，避免高亮残留
  useEffect(() => {
    if (isNavigating) {
      // 导航正在进行，立即隐藏当前步骤的渲染
    }
  }, [isNavigating]);

  // 处理跨页面导航后的步骤推进
  useEffect(() => {
    if (isNavigating) {
      // 从 sessionStorage 读取目标步骤
      const savedStep = sessionStorage.getItem('guideStep');
      if (savedStep) {
        const targetStep = parseInt(savedStep, 10);
        // 如果目标步骤大于当前步骤，说明是向前导航，需要推进
        if (targetStep > currentStep) {
          // 延迟一点时间，等页面完成渲染
          const timer = setTimeout(() => {
            setIsNavigating(false);
            setCurrentStep(targetStep);
            setTransitioning(false);
          }, 100);
          return () => clearTimeout(timer);
        }
      }
      // 如果 sessionStorage 没有记录，直接重置导航状态
      const timer = setTimeout(() => {
        setIsNavigating(false);
        setTransitioning(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isNavigating]);

  // 通知父组件步骤变化
  useEffect(() => {
    if (onStepChange && currentStep < guideSteps.length) {
      onStepChange(guideSteps[currentStep]);
    }
  }, [currentStep, onStepChange]);

  const handleNext = () => {
    // 保底：如果 isNavigating 卡住了，重置它
    if (isNavigating) {
      setIsNavigating(false);
    }
    // 保底：如果 transitioning 卡住了，重置它
    if (transitioning) {
      setTransitioning(false);
    }
    if (currentStep < guideSteps.length - 1) {
      // 确保 sessionStorage 同步
      sessionStorage.setItem('guideStep', String(currentStep + 1));
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem('guideCompleted', 'true');
      // 引导完成后清除相关标志
      sessionStorage.removeItem('guidePendingHighlight');
      if (onComplete) {
        onComplete();
      }
    }
  };

  const handleHighlightClick = (step) => {
    if (transitioning) return;
    setTransitioning(true);

    if (step.nextAction === 'navigate' && step.navigateTo) {
      // 立即标记为导航中，隐藏当前高亮
      setIsNavigating(true);
      // 保存引导状态到sessionStorage，用于跨页面恢复
      sessionStorage.setItem('guideActive', 'true');
      // 保存下一步的索引
      sessionStorage.setItem('guideStep', String(currentStep + 1));
      // 跳转到 /personal 时直接刷新页面
      if (step.navigateTo === '/personal') {
        sessionStorage.setItem('guidePendingHighlight', 'true');
        // 使用 window.location.href 刷新页面（由 handleGuideNavigate 处理）
        if (onNavigate) {
          onNavigate(step.navigateTo);
        }
      } else {
        sessionStorage.setItem('guidePendingHighlight', 'true');
        if (onNavigate) {
          onNavigate(step.navigateTo);
        }
      }
      // 导航后不立即释放transitioning，而是等待页面加载
      // 通过sessionStorage传递一个标记，让目标页面的组件知道自己需要延迟初始化highlight
    } else if (step.nextAction === 'click') {
      // 立即更新sessionStorage，确保导航前状态正确
      sessionStorage.setItem('guideStep', String(currentStep + 1));

      // 触发目标元素的点击
      const element = document.querySelector(step.target);
      if (element) {
        element.click();
      }

      // 点击后进入下一步
      setTimeout(() => {
        handleNext();
        setTimeout(() => setTransitioning(false), 300);
      }, 100);
    }
  };

  const handleGuideDialogue = (action) => {
    if (transitioning) return;
    setTransitioning(true);

    if (action === 'enter-quiz') {
      // 立即标记为导航中，隐藏当前高亮
      setIsNavigating(true);
      // 先保存下一步的步骤号，然后导航到quiz页面
      sessionStorage.setItem('guideActive', 'true');
      sessionStorage.setItem('guideStep', String(currentStep + 1));
      // 设置pending标记，延迟高亮初始化
      sessionStorage.setItem('guidePendingHighlight', 'true');
      if (onNavigate) {
        onNavigate('/quiz/pre/guide-demo');
      }
      // 导航后不立即释放transitioning，而是等待页面加载
      setTimeout(() => setTransitioning(false), 500);
    } else if (action === 'submit-quiz') {
      // 模拟提交quiz，直接进入下一步
      handleNext();
      setTimeout(() => setTransitioning(false), 300);
    } else if (action === 'enter-dialogue') {
      // 立即标记为导航中，隐藏当前高亮
      setIsNavigating(true);
      // 先保存下一步的步骤号，然后导航到dialogue页面
      sessionStorage.setItem('guideActive', 'true');
      sessionStorage.setItem('guideStep', String(currentStep + 1));
      // 设置pending标记，延迟高亮初始化
      sessionStorage.setItem('guidePendingHighlight', 'true');
      if (onNavigate) {
        onNavigate('/dialogue/guide-demo');
      }
      // 导航后不立即释放transitioning，而是等待页面加载
      setTimeout(() => setTransitioning(false), 500);
    } else if (window.guideActionHandler) {
      // 其他动作（如 show-messages）调用 window 上的处理器
      window.guideActionHandler(action);
      handleNext();
      setTimeout(() => setTransitioning(false), 300);
    }
  };

  // 处理 guide-dialogue 类型的步骤，使用 useEffect 避免渲染时调用
  useEffect(() => {
    if (guideActionExecutingRef.current) return;
    const currentStepData = guideSteps[currentStep];
    if (currentStepData && currentStepData.type === 'guide-dialogue') {
      guideActionExecutingRef.current = true;
      // 延迟执行，避免在渲染阶段触发
      const timer = setTimeout(() => {
        handleGuideDialogue(currentStepData.action);
        guideActionExecutingRef.current = false;
      }, 100);
      return () => {
        clearTimeout(timer);
        guideActionExecutingRef.current = false;
      };
    }
  }, [currentStep]);

  // 处理 navigate 类型的步骤，使用 useEffect 避免渲染时调用 setState
  useEffect(() => {
    if (guideActionExecutingRef.current) return;
    const currentStepData = guideSteps[currentStep];
    if (currentStepData && currentStepData.type === 'navigate') {
      if (!transitioning) {
        guideActionExecutingRef.current = true;
        setTransitioning(true);
        setIsNavigating(true);
        // 先保存下一步的步骤号到 sessionStorage
        sessionStorage.setItem('guideActive', 'true');
        sessionStorage.setItem('guideStep', String(currentStep + 1));
        // 设置 pending 标记，延迟高亮初始化，让目标页面有时间加载
        sessionStorage.setItem('guidePendingHighlight', 'true');
        // 调用导航
        if (onNavigate) {
          onNavigate(currentStepData.navigateTo);
        }
        // 跳转到 /personal 时由 handleGuideNavigate 处理刷新
        if (currentStepData.navigateTo === '/personal') {
          // 刷新由 handleGuideNavigate(window.location.href) 处理
        }
        // 延迟递增步骤并重置状态，等待目标页面完全加载
        const timer = setTimeout(() => {
          if (currentStep < guideSteps.length - 1) {
            setCurrentStep(currentStep + 1);
          }
          setTransitioning(false);
          guideActionExecutingRef.current = false;
        }, 500);
        return () => {
          clearTimeout(timer);
          guideActionExecutingRef.current = false;
        };
      }
    }
  }, [currentStep, transitioning, onNavigate]);

  if (!active) return null;

  // 导航中直接返回 null，避免高亮残留
  if (isNavigating) return null;

  const currentStepData = guideSteps[currentStep];

  // 根据步骤类型渲染不同内容
  switch (currentStepData.type) {
    case 'modal':
      return (
        <GuideModal
          step={currentStepData}
          onNext={handleNext}
          isLast={currentStep === guideSteps.length - 1}
        />
      );

    case 'highlight':
      return (
        <HighlightOverlay
          target={currentStepData.target}
          text={currentStepData.text}
          onClick={() => handleHighlightClick(currentStepData)}
        />
      );

    case 'navigate':
      // navigate 类型现在由 useEffect 处理，这里直接返回 null
      return null;

    case 'guide-dialogue':
      // guide-dialogue 类型现在由 useEffect 处理，这里直接返回 null
      return null;

    default:
      return null;
  }
};

export { InteractiveGuide, GuidePromptModal, guideSteps };
export default InteractiveGuide;