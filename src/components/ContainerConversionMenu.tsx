import React, { useEffect, useState } from 'react';
import './ConversionMenu.css';
import type { ContainerFormat } from '../types';

interface ContainerConversionMenuProps {
  open: boolean;
  disabled: boolean;
  fileCount: number;
  initialTarget: ContainerFormat;
  onConfirm: (target: ContainerFormat) => void;
  onClose: () => void;
}

const formatLabelMap: Record<ContainerFormat, { title: string; description: string }> = {
  mp4: {
    title: 'MP4',
    description: '兼容性最佳的通用格式，适用于几乎所有设备',
  },
  mkv: {
    title: 'MKV',
    description: '灵活的多媒体封装格式，适合保留多轨音视频',
  },
};

export const ContainerConversionMenu: React.FC<ContainerConversionMenuProps> = ({
  open,
  disabled,
  fileCount,
  initialTarget,
  onConfirm,
  onClose,
}) => {
  const [target, setTarget] = useState<ContainerFormat>(initialTarget);

  useEffect(() => {
    if (open) {
      setTarget(initialTarget);
    }
  }, [open, initialTarget]);

  if (!open) {
    return null;
  }

  const handleConfirm = () => {
    if (disabled) {
      return;
    }
    onConfirm(target);
  };

  return (
    <div className="conversion-menu-backdrop" onClick={onClose}>
      <div className="conversion-menu" onClick={(event) => event.stopPropagation()}>
        <div className="conversion-menu-header">
          <div>
            <h3>容器格式转换</h3>
            <p className="conversion-menu-selected">
              {fileCount > 0 ? `本次将处理 ${fileCount} 个视频文件` : '暂无可转换的视频'}
            </p>
          </div>
          <button className="conversion-menu-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="conversion-menu-body">
          <section className="conversion-menu-section">
            <h4>目标容器格式</h4>
            <div className="conversion-format-options">
              {(Object.keys(formatLabelMap) as ContainerFormat[]).map((format) => {
                const label = formatLabelMap[format];
                return (
                  <button
                    key={format}
                    className={`conversion-menu-option ${target === format ? 'active' : ''}`}
                    onClick={() => setTarget(format)}
                    disabled={disabled}
                  >
                    <span className="conversion-menu-option-title">{label.title}</span>
                    <span className="conversion-menu-option-desc">{label.description}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="conversion-menu-section">
            <h4>温馨提示</h4>
            <p className="conversion-menu-hint">
              该操作仅调整封装容器，不会改变音视频编码；如遇不兼容的流类型，转换可能失败并在日志中给出原因。
            </p>
          </section>
        </div>

        <div className="conversion-menu-footer">
          {disabled ? (
            <p className="conversion-menu-warning">请先在列表中选择至少一个可处理的视频文件</p>
          ) : (
            <button className="conversion-menu-confirm" onClick={handleConfirm}>
              开始转换
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContainerConversionMenu;
