import React from 'react';
import './ConversionResultDialog.css';
import type { ContainerConversionResult } from '../types';

interface ContainerConversionResultDialogProps {
  open: boolean;
  result: ContainerConversionResult | null;
  onClose: () => void;
  onOpenOutput: () => void;
  onViewLog: () => void;
}

const formatDuration = (ms: number) => {
  if (ms <= 0) {
    return '0s';
  }
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return `${minutes}m ${remain}s`;
};

const containerLabelMap = {
  mp4: 'MP4',
  mkv: 'MKV',
} as const;

export const ContainerConversionResultDialog: React.FC<ContainerConversionResultDialogProps> = ({
  open,
  result,
  onClose,
  onOpenOutput,
  onViewLog,
}) => {
  if (!open || !result) {
    return null;
  }

  const { success, failures, cancelled, targetContainer, outputDir, elapsedMs, logPath } = result;
  const total = success.length + failures.length;
  const previewSuccess = success.slice(0, 5);
  const previewFailure = failures.slice(0, 5);

  return (
    <div className="conversion-result-overlay">
      <div className="conversion-result-card">
        <div className="conversion-result-header">
          <div>
            <h3>容器转换完成</h3>
            <p className="conversion-result-subtitle">
              目标容器：{containerLabelMap[targetContainer]} · 输出目录：{outputDir}
            </p>
          </div>
          {cancelled && <span className="conversion-result-badge">已取消</span>}
        </div>

        <div className="conversion-result-summary">
          <div>
            <strong>{total}</strong>
            <span>总文件</span>
          </div>
          <div className="ok">
            <strong>{success.length}</strong>
            <span>成功</span>
          </div>
          <div className="fail">
            <strong>{failures.length}</strong>
            <span>失败</span>
          </div>
          <div>
            <strong>{formatDuration(elapsedMs)}</strong>
            <span>耗时</span>
          </div>
        </div>

        {previewSuccess.length > 0 && (
          <div className="conversion-result-section">
            <h4>成功 ({success.length})</h4>
            <ul>
              {previewSuccess.map((item) => (
                <li key={item.input} title={item.output}>
                  <span className="result-icon ok">✓</span>
                  <span className="result-name">{item.output}</span>
                </li>
              ))}
              {success.length > previewSuccess.length && (
                <li className="result-more">… 还有 {success.length - previewSuccess.length} 个成功项目</li>
              )}
            </ul>
          </div>
        )}

        {previewFailure.length > 0 && (
          <div className="conversion-result-section">
            <h4>失败 ({failures.length})</h4>
            <ul>
              {previewFailure.map((item) => (
                <li key={item.input} title={item.error}>
                  <span className="result-icon fail">!</span>
                  <span className="result-name">{item.input}</span>
                  <span className="result-error">{item.error}</span>
                </li>
              ))}
              {failures.length > previewFailure.length && (
                <li className="result-more">… 还有 {failures.length - previewFailure.length} 个失败项目</li>
              )}
            </ul>
          </div>
        )}

        <div className="conversion-result-actions">
          <button
            className="conversion-result-log"
            onClick={onViewLog}
            disabled={!logPath}
          >
            查看日志
          </button>
          <button className="conversion-result-open" onClick={onOpenOutput}>
            打开输出目录
          </button>
          <button className="conversion-result-close" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContainerConversionResultDialog;
