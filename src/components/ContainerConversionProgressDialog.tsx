import React from 'react';
import './ConversionProgressDialog.css';
import type { ContainerConversionProgress, ContainerFormat } from '../types';

interface ContainerConversionProgressDialogProps {
  open: boolean;
  progress: ContainerConversionProgress | null;
  target: ContainerFormat | null;
  onCancel: () => void;
}

const containerLabelMap: Record<ContainerFormat, string> = {
  mp4: 'MP4',
  mkv: 'MKV',
};

export const ContainerConversionProgressDialog: React.FC<ContainerConversionProgressDialogProps> = ({
  open,
  progress,
  target,
  onCancel,
}) => {
  if (!open || !progress) {
    return null;
  }

  const percentage = Math.min(100, Math.max(0, progress.percentage));
  const statusText = progress.status === 'cancelled' ? '已取消' : progress.status === 'completed' ? '已完成' : '正在转换';
  const formatLabel = target ? containerLabelMap[target] : '未知';
  const total = progress.total;
  const processed = progress.processed;
  const remaining = Math.max(total - processed, 0);

  return (
    <div className="conversion-progress-overlay">
      <div className="conversion-progress-card">
        <div className="conversion-progress-header">
          <div>
            <h3>容器格式转换进行中</h3>
            <p className="conversion-progress-subtitle">目标容器：{formatLabel}</p>
          </div>
          <span className={`conversion-progress-status status-${progress.status}`}>{statusText}</span>
        </div>

        <div className="conversion-progress-bar">
          <div className="conversion-progress-bar-fill" style={{ width: `${percentage}%` }} />
        </div>
        <div className="conversion-progress-percentage">{percentage}%</div>

        <div className="conversion-progress-stats">
          <div>
            <strong>{processed}</strong>
            <span>已完成</span>
          </div>
          <div>
            <strong>{remaining}</strong>
            <span>剩余</span>
          </div>
          <div>
            <strong>{progress.successCount}</strong>
            <span>成功</span>
          </div>
          <div>
            <strong>{progress.failureCount}</strong>
            <span>失败</span>
          </div>
        </div>

        {progress.currentFile && (
          <div className="conversion-progress-current" title={progress.currentFile}>
            正在处理：{progress.currentFile}
          </div>
        )}

        <div className="conversion-progress-actions">
          <button
            className="conversion-progress-cancel"
            onClick={onCancel}
            disabled={progress.status !== 'running'}
          >
            取消转换
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContainerConversionProgressDialog;
