import React from 'react';
import './FeatureTipModal.css'; // 引入样式

// 通用功能提示弹窗组件
const FeatureTipModal = ({ 
  visible, 
  title, 
  features, 
  notes, 
  onClose 
}) => {
  if (!visible) return null;

  return (
    <div className="feature-tip-modal-mask">
      <div className="feature-tip-modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">
          <div className="feature-section">
            <h4>✨ 功能说明</h4>
            <ul>
              {features.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="note-section">
            <h4>⚠️ 注意事项</h4>
            <ul>
              {notes.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="modal-footer">
          <button className="confirm-btn" onClick={onClose}>
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeatureTipModal;
