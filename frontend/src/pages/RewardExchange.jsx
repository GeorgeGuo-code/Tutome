import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { rewardService } from '../services/apiService';
import "./RewardExchange.css";

// 奖池配置（和 RewardSection 保持一致）
const rewardsPool = [
  { id: 1, name: '国誉文具礼盒', icon: '🎁', rarity: 'sss', desc: '精美文具套装', type: 'physical' },
  { id: 2, name: '精品笔记本', icon: '📓', rarity: 'ss', desc: '高品质笔记本', type: 'physical' },
  { id: 3, name: '一元红包', icon: '🧧', rarity: 's', desc: '微信红包奖励', type: 'wechat' },
  { id: 4, name: '小零食', icon: '🍪', rarity: 'a', desc: '随机零食一份', type: 'physical' },
];

const RewardExchange = () => {
  const navigate = useNavigate();
  const [rewardStats, setRewardStats] = useState({});
  const [exchangeRecords, setExchangeRecords] = useState([]);
  const [selectedReward, setSelectedReward] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    wechatAccount: '',
    campus: '',
    dormitoryEmail: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({
    wechatAccount: '',
    campus: '',
    dormitoryEmail: ''
  });

  useEffect(() => {
    loadRewardInfo();
    loadExchangeRecords();
  }, []);

  const loadRewardInfo = async () => {
    try {
      const result = await rewardService.getRewardInfo();
      if (result.success && result.data) {
        setRewardStats(result.data.rewardStats || {});
      }
    } catch (error) {
      console.error('加载奖励信息失败:', error);
    }
  };

  const loadExchangeRecords = async () => {
    try {
      const result = await rewardService.getExchangeRecords();
      if (result.success && result.data) {
        setExchangeRecords(result.data || []);
      }
    } catch (error) {
      console.error('加载兑换记录失败:', error);
    }
  };

  const handleRewardClick = (reward) => {
    if (rewardStats[reward.id] > 0) {
      setSelectedReward(reward);
      setShowForm(true);
      setFormData({ wechatAccount: '', campus: '', dormitoryEmail: '' });
    }
  };

  const handleSubmit = async () => {
    if (!selectedReward) return;

    // 验证表单
    if (selectedReward.type === 'wechat') {
      if (!formData.wechatAccount.trim()) {
        alert('请填写微信账号');
        return;
      }
    } else {
      if (!formData.campus.trim() || !formData.dormitoryEmail.trim()) {
        alert('请填写完整的兑奖信息');
        return;
      }
    }

    setSubmitting(true);

    try {
      const result = await rewardService.exchangeReward({
        rewardId: selectedReward.id,
        rewardName: selectedReward.name,
        rewardIcon: selectedReward.icon,
        rewardRarity: selectedReward.rarity,
        rewardType: selectedReward.type,
        wechatAccount: selectedReward.type === 'wechat' ? formData.wechatAccount : null,
        campus: selectedReward.type === 'physical' ? formData.campus : null,
        dormitoryEmail: selectedReward.type === 'physical' ? formData.dormitoryEmail : null,
      });

      if (result.success) {
        alert(`兑奖成功！\n奖励：${selectedReward.name}`);
        setShowForm(false);
        // 刷新兑换记录并重新加载奖励信息（让后端计算剩余可兑换数量）
        loadExchangeRecords();
        loadRewardInfo();
      } else {
        alert(result.data?.message || '兑奖失败');
      }
    } catch (error) {
      console.error('兑奖失败:', error);
      alert('兑奖失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (record) => {
    setEditingRecord(record);
    setEditFormData({
      wechatAccount: record.wechat_account || '',
      campus: record.campus || '',
      dormitoryEmail: record.dormitory_email || ''
    });
  };

  const handleEditSubmit = async () => {
    if (!editingRecord) return;

    // 验证
    if (editingRecord.reward_type === 'wechat') {
      if (!editFormData.wechatAccount.trim()) {
        alert('请填写微信账号');
        return;
      }
    } else {
      if (!editFormData.campus.trim() || !editFormData.dormitoryEmail.trim()) {
        alert('请填写完整的兑奖信息');
        return;
      }
    }

    try {
      const result = await rewardService.updateExchangeRecord(editingRecord.id, {
        wechatAccount: editingRecord.reward_type === 'wechat' ? editFormData.wechatAccount : null,
        campus: editingRecord.reward_type === 'physical' ? editFormData.campus : null,
        dormitoryEmail: editingRecord.reward_type === 'physical' ? editFormData.dormitoryEmail : null,
      });

      if (result.success) {
        alert('修改成功');
        setEditingRecord(null);
        loadExchangeRecords();
      } else {
        alert(result.data?.message || '修改失败');
      }
    } catch (error) {
      console.error('修改失败:', error);
      alert('修改失败，请重试');
    }
  };

  const handleEditCancel = () => {
    setEditingRecord(null);
  };

  // 只显示已抽取的奖励（数量大于0）
  const earnedRewards = rewardsPool.filter(r => (rewardStats[r.id] || 0) > 0);

  return (
    <div className="reward-exchange-page">
      <div className="exchange-header">
        <button className="exchange-back-btn" onClick={() => navigate('/personal', { state: { activeTab: 'reward' } })}>
          &lt; 返回奖励中心
        </button>
        <h1 className="exchange-title">兑奖中心</h1>
      </div>

      <div className="exchange-content">
        {earnedRewards.length === 0 && exchangeRecords.length === 0 ? (
          <div className="exchange-empty">
            <p>您还没有抽取到任何奖励</p>
          </div>
        ) : (
          <>
            {earnedRewards.length > 0 && (
              <>
                <p className="exchange-tip">点击可兑奖的奖励进行兑换</p>
                <div className="exchange-rewards-list">
                  {earnedRewards.map(reward => (
                    <div
                      key={reward.id}
                      className={`exchange-reward-item ${reward.type}`}
                      onClick={() => handleRewardClick(reward)}
                    >
                      <div className="exchange-reward-icon">{reward.icon}</div>
                      <div className="exchange-reward-info">
                        <div className="exchange-reward-name">{reward.name}</div>
                        <div className="exchange-reward-desc">{reward.desc}</div>
                      </div>
                      <div className="exchange-reward-count">x{rewardStats[reward.id]}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* 兑奖记录区域 */}
      <div className="exchange-history-section">
        <div className="exchange-history-header" onClick={() => setShowHistory(!showHistory)}>
          <h2 className="exchange-history-title">兑奖记录</h2>
          <span className="exchange-history-toggle">{showHistory ? '▼' : '▶'}</span>
        </div>

        {showHistory && (
          <div className="exchange-history-content">
            {exchangeRecords.length === 0 ? (
              <div className="exchange-history-empty">暂无兑奖记录</div>
            ) : (
              <div className="exchange-history-list">
                {exchangeRecords.map(record => (
                  <div key={record.id} className="exchange-history-item">
                    <div className="exchange-history-item-header">
                      <span className="exchange-history-icon">{record.reward_icon}</span>
                      <span className="exchange-history-name">{record.reward_name}</span>
                      <span className="exchange-history-time">
                        {new Date(record.created_at).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="exchange-history-item-body">
                      {record.reward_type === 'wechat' ? (
                        <div className="exchange-history-info-row">
                          <span className="exchange-history-label">微信账号：</span>
                          <span className="exchange-history-value">{record.wechat_account || '未填写'}</span>
                        </div>
                      ) : (
                        <>
                          <div className="exchange-history-info-row">
                            <span className="exchange-history-label">校区：</span>
                            <span className="exchange-history-value">{record.campus || '未填写'}</span>
                          </div>
                          <div className="exchange-history-info-row">
                            <span className="exchange-history-label">宿舍邮箱：</span>
                            <span className="exchange-history-value">{record.dormitory_email || '未填写'}</span>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="exchange-history-item-footer">
                      {record.is_edited ? (
                        <span className="exchange-history-edited">已修改</span>
                      ) : (
                        <button
                          className="exchange-history-edit-btn"
                          onClick={() => handleEditClick(record)}
                        >
                          修改信息
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 兑奖表单弹窗 */}
      {showForm && selectedReward && (
        <div className="exchange-form-overlay" onClick={() => setShowForm(false)}>
          <div className="exchange-form-modal" onClick={e => e.stopPropagation()}>
            <div className="exchange-form-header">
              <h3>兑奖信息</h3>
              <button className="exchange-form-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="exchange-form-body">
              <div className="exchange-form-reward">
                <span className="exchange-form-icon">{selectedReward.icon}</span>
                <span className="exchange-form-name">{selectedReward.name}</span>
              </div>

              {selectedReward.type === 'wechat' ? (
                <div className="exchange-form-item">
                  <label>微信账号</label>
                  <input
                    type="text"
                    placeholder="请输入您的微信账号"
                    value={formData.wechatAccount}
                    onChange={e => setFormData({ ...formData, wechatAccount: e.target.value })}
                  />
                </div>
              ) : (
                <>
                  <div className="exchange-form-item">
                    <label>校区</label>
                    <input
                      type="text"
                      placeholder="请输入您的校区"
                      value={formData.campus}
                      onChange={e => setFormData({ ...formData, campus: e.target.value })}
                    />
                  </div>
                  <div className="exchange-form-item">
                    <label>宿舍邮箱</label>
                    <input
                      type="text"
                      placeholder="请输入您的宿舍邮箱"
                      value={formData.dormitoryEmail}
                      onChange={e => setFormData({ ...formData, dormitoryEmail: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="exchange-form-footer">
              <button
                className="exchange-form-submit"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? '提交中...' : '确认兑奖'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 修改兑奖信息弹窗 */}
      {editingRecord && (
        <div className="exchange-form-overlay" onClick={handleEditCancel}>
          <div className="exchange-form-modal" onClick={e => e.stopPropagation()}>
            <div className="exchange-form-header">
              <h3>修改兑奖信息</h3>
              <button className="exchange-form-close" onClick={handleEditCancel}>×</button>
            </div>
            <div className="exchange-form-body">
              <div className="exchange-form-reward">
                <span className="exchange-form-icon">{editingRecord.reward_icon}</span>
                <span className="exchange-form-name">{editingRecord.reward_name}</span>
              </div>

              {editingRecord.reward_type === 'wechat' ? (
                <div className="exchange-form-item">
                  <label>微信账号</label>
                  <input
                    type="text"
                    placeholder="请输入您的微信账号"
                    value={editFormData.wechatAccount}
                    onChange={e => setEditFormData({ ...editFormData, wechatAccount: e.target.value })}
                  />
                </div>
              ) : (
                <>
                  <div className="exchange-form-item">
                    <label>校区</label>
                    <input
                      type="text"
                      placeholder="请输入您的校区"
                      value={editFormData.campus}
                      onChange={e => setEditFormData({ ...editFormData, campus: e.target.value })}
                    />
                  </div>
                  <div className="exchange-form-item">
                    <label>宿舍邮箱</label>
                    <input
                      type="text"
                      placeholder="请输入您的宿舍邮箱"
                      value={editFormData.dormitoryEmail}
                      onChange={e => setEditFormData({ ...editFormData, dormitoryEmail: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="exchange-form-footer">
              <button
                className="exchange-form-submit"
                onClick={handleEditSubmit}
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RewardExchange;