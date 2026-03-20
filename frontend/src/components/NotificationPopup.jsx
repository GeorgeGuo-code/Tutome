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
        console.log('申请人用户名:', notification.applicantUsername);
        return (
          <div key={notification.id} className="notification-popup-item">
            <div className="notification-popup-content">
              <span className="notification-popup-text">
                <span className="notification-username">{notification.applicantUsername}</span>
                向您发起
                <span className={notification.type === 'pair_application' ? 'notification-pair' : 'notification-end'}>
                  {notification.type === 'pair_application' ? '结对' : '结束'}
                </span>
                申请
              </span>
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