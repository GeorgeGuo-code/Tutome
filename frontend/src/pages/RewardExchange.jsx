import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { rewardService, messageService } from '../services/apiService';
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
    // 红包
    // 实物
    area: '',
    address: '',
    exchangeCount: 1
  });
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({
    area: '',
    address: ''
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
      setFormData({
        area: '',
        address: '',
        exchangeCount: rewardStats[reward.id]
      });
    }
  };

  const handleSubmit = async () => {
    if (!selectedReward) return;

    const rewardCount = rewardStats[selectedReward.id] || 0;
    const exchangeCount = formData.exchangeCount || 1;

    // 验证表单
    if (selectedReward.type === 'wechat') {
      // 红包必须一次性兑换全部
      if (rewardCount === 0) {
        alert('没有可兑换的奖励');
        return;
      }
    } else {
      if (!formData.area.trim()) {
        alert('请选择地区');
        return;
      }
      if (!formData.address.trim()) {
        alert('请填写详细地址');
        return;
      }
      if (exchangeCount <= 0 || exchangeCount > rewardCount) {
        alert('兑换数量无效');
        return;
      }
    }

    setSubmitting(true);

    try {
      // 发送私信给管理员
      let messageContent = '';
      if (selectedReward.type === 'wechat') {
        // 红包：兑换n元红包（一次性兑换全部）
        messageContent = `${rewardCount}元红包`;
      } else {
        // 实物：兑换奖品*数量，地区，地址
        messageContent = `${selectedReward.name}*${exchangeCount}\n地区：${formData.area}\n${formData.address}`;
      }

      // 先发送私信
      const messageResult = await messageService.sendPrivateMessage('管理员', messageContent, null);
      if (!messageResult.success) {
        alert('发送兑换信息失败，请重试');
        setSubmitting(false);
        return;
      }

      // 再调用兑换 API
      const result = await rewardService.exchangeReward({
        rewardId: selectedReward.id,
        rewardName: selectedReward.name,
        rewardIcon: selectedReward.icon,
        rewardRarity: selectedReward.rarity,
        rewardType: selectedReward.type,
        exchangeCount: selectedReward.type === 'wechat' ? rewardCount : exchangeCount,
        area: selectedReward.type === 'physical' ? formData.area : null,
        address: selectedReward.type === 'physical' ? formData.address : null,
      });

      if (result.success) {
        if (selectedReward.type === 'wechat') {
          alert(`兑奖成功！\n奖励：${rewardCount}元红包`);
        } else {
          alert(`兑奖成功！\n奖励：${selectedReward.name}*${exchangeCount}`);
        }
        setShowForm(false);
        // 刷新兑换记录并重新加载奖励信息
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
      area: record.area || '',
      address: record.address || ''
    });
  };

  const handleEditSubmit = async () => {
    if (!editingRecord) return;

    // 验证
    if (editingRecord.reward_type === 'physical') {
      if (!editFormData.area.trim()) {
        alert('请选择地区');
        return;
      }
      if (!editFormData.address.trim()) {
        alert('请填写详细地址');
        return;
      }
    }

    try {
      const result = await rewardService.updateExchangeRecord(editingRecord.id, {
        area: editingRecord.reward_type === 'physical' ? editFormData.area : null,
        address: editingRecord.reward_type === 'physical' ? editFormData.address : null,
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
                      className={`exchange-reward-item ${reward.rarity}`}
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
                      <span className="exchange-history-name">
                        {record.reward_name}
                        {record.exchange_count > 1 && `*${record.exchange_count}`}
                      </span>
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
                          <span className="exchange-history-label">发放方式：</span>
                          <span className="exchange-history-value">支付宝口令</span>
                        </div>
                      ) : (
                        <>
                          <div className="exchange-history-info-row">
                            <span className="exchange-history-label">地区：</span>
                            <span className="exchange-history-value">{record.area || '未填写'}</span>
                          </div>
                          <div className="exchange-history-info-row">
                            <span className="exchange-history-label">{record.area === '紫金港' ? '宿舍邮箱' : '详细地址'}：</span>
                            <span className="exchange-history-value">{record.address || '未填写'}</span>
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
                  <div className="alipay-notice">将通过支付宝口令发放</div>
                </div>
              ) : (
                <>
                  <div className="exchange-form-item">
                    <label>兑换数量（最多{rewardStats[selectedReward.id] || 0}个）</label>
                    <div className="exchange-count-selector">
                      <button
                        type="button"
                        className="exchange-count-btn"
                        onClick={() => setFormData({ ...formData, exchangeCount: Math.max(1, formData.exchangeCount - 1) })}
                        disabled={formData.exchangeCount <= 1}
                      >
                        -
                      </button>
                      <span className="exchange-count-value">{formData.exchangeCount}</span>
                      <button
                        type="button"
                        className="exchange-count-btn"
                        onClick={() => setFormData({ ...formData, exchangeCount: Math.min(rewardStats[selectedReward.id] || 0, formData.exchangeCount + 1) })}
                        disabled={formData.exchangeCount >= (rewardStats[selectedReward.id] || 0)}
                      >
                        +
                      </button>
                    </div>
                    <div className="exchange-count-hint">请尽量一次性多兑换</div>
                  </div>
                  <div className="exchange-form-item">
                    <label>地区</label>
                    <select
                      value={formData.area}
                      onChange={e => setFormData({ ...formData, area: e.target.value, address: '' })}
                    >
                      <option value="">请选择地区</option>
                      <option value="紫金港">紫金港</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>
                  {formData.area && (
                    <div className="exchange-form-item">
                      <label>{formData.area === '紫金港' ? '宿舍邮箱' : '详细地址'}</label>
                      <input
                        type="text"
                        placeholder="请尽量详细填写"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="exchange-form-footer">
              <button
                className="exchange-form-submit"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? '提交中...' : (selectedReward.type === 'wechat' ? '确认兑换' : '确认兑奖')}
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
                  <div className="alipay-notice">将通过支付宝口令发放</div>
                </div>
              ) : (
                <>
                  <div className="exchange-form-item">
                    <label>地区</label>
                    <select
                      value={editFormData.area}
                      onChange={e => setEditFormData({ ...editFormData, area: e.target.value, address: '' })}
                    >
                      <option value="">请选择地区</option>
                      <option value="紫金港">紫金港</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>
                  {editFormData.area && (
                    <div className="exchange-form-item">
                      <label>{editFormData.area === '紫金港' ? '宿舍邮箱' : '详细地址'}</label>
                      <input
                        type="text"
                        placeholder="请尽量详细填写"
                        value={editFormData.address}
                        onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                      />
                    </div>
                  )}
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