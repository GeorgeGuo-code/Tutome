import React, { useState, useEffect } from 'react';
import './NotificationPopup.css';

const NotificationPopup = ({ notifications, onRemove, onNotificationClick }) => {
  // 自动移除通知（5秒后）
  useEffect(() => {
    notifications.forEach((notification) => {
      const timer = setTimeout(() => {
        onRemove(notification.id);
      }, 5000);

      return () => clearTimeout(timer);
    });
  }, [notifications, onRemove]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-popup-container">
      {notifications
        .filter(notification => notification.type !== 'survey_reminder')
        .map((notification) => {
        console.log('通知对象:', notification);
        console.log('通知类型:', notification.type);

        // 根据 notification type 获取不同的内容
        let notificationContent;
        if (notification.type === 'pair_accepted') {
          notificationContent = (
            <span className="notification-popup-text">
              <span className="notification-username">{notification.acceptedUsername || notification.applicantUsername}</span>
              已同意您的申请
            </span>
          );
        } else if (notification.type === 'end_accepted') {
          notificationContent = (
            <span className="notification-popup-text">
              对方已同意结束教学
            </span>
          );
        } else if (notification.type === 'round_review_completed') {
          notificationContent = (
            <span className="notification-popup-text">
              轮次审查完成
              {notification.reviewResult?.hasError ? '，发现错误' : ''}
            </span>
          );
        } else if (notification.type === 'conversation_summary_completed') {
          notificationContent = (
            <span className="notification-popup-text">
              对话总结已生成
            </span>
          );
        } else if (notification.type === 'student_error_detected') {
          notificationContent = (
            <span className="notification-popup-text">
              检测到学生回答存在问题
            </span>
          );
        } else if (notification.type === 'survey_reminder') {
          notificationContent = (
            <span className="notification-popup-text">
              {notification.content || notification.title || '请填写课后问卷'}
            </span>
          );
        } else if (notification.type === 'private_message') {
          notificationContent = (
            <span className="notification-popup-text">
              {notification.title || '收到私信'}
            </span>
          );
        } else {
          notificationContent = (
            <span className="notification-popup-text">
              <span className="notification-username">{notification.applicantUsername}</span>
              向您发起
              <span className={notification.type === 'pair_application' ? 'notification-pair' : 'notification-end'}>
                {notification.type === 'pair_application' ? '结对' : '结束'}
              </span>
              申请
            </span>
          );
        }

        const handleClick = () => {
          if (onNotificationClick) {
            onNotificationClick(notification);
          }
        };

        // survey_reminder 特殊处理：不使用点击关闭，显示"知道了"按钮
        if (notification.type === 'survey_reminder') {
          return (
            <div
              key={notification.id}
              className={`notification-popup-item notification-${notification.type}`}
            >
              <div className="notification-popup-content">
                {notificationContent}
                <button
                  className="notification-popup-acknowledge"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(notification.id);
                  }}
                >
                  知道了
                </button>
              </div>
            </div>
          );
        }

        // private_message 特殊处理：灰色背景，两个按钮
        if (notification.type === 'private_message') {
          return (
            <div
              key={notification.id}
              className={`notification-popup-item notification-${notification.type}`}
            >
              <div className="notification-popup-content">
                {notificationContent}
                <div className="notification-private-actions">
                  <button
                    className="notification-popup-reply"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onNotificationClick) {
                        onNotificationClick(notification, 'reply');
                      }
                    }}
                  >
                    回复
                  </button>
                  <button
                    className="notification-popup-acknowledge"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(notification.id);
                    }}
                  >
                    知道了
                  </button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div
            key={notification.id}
            className={`notification-popup-item notification-${notification.type}`}
            onClick={handleClick}
          >
            <div className="notification-popup-content">
              {notificationContent}
              <button
                className="notification-popup-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(notification.id);
                }}
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationPopup;