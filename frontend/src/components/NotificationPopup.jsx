import React, { useState, useEffect } from 'react';
import './NotificationPopup.css';

const NotificationPopup = ({ notifications, onRemove }) => {
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
      {notifications.map((notification) => {
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

        return (
          <div key={notification.id} className={`notification-popup-item notification-${notification.type}`}>
            <div className="notification-popup-content">
              {notificationContent}
              <button
                className="notification-popup-close"
                onClick={() => onRemove(notification.id)}
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