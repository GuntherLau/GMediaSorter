import React, { useEffect, useState } from 'react';
import './MosaicConfigDialog.css';
import type { MosaicPerformancePreset } from './VideoMosaicPrototype';

interface MosaicConfigDialogProps {
  open: boolean;
  columns: number;
  performancePreset: MosaicPerformancePreset;
  onConfirm: (columns: number, preset: MosaicPerformancePreset) => void;
  onClose: () => void;
}

const COLUMN_OPTIONS = [2, 3, 4, 5];

const PERFORMANCE_LABELS: Record<MosaicPerformancePreset, { title: string; desc: string }> = {
  low: { title: '低（少量源）', desc: '同屏源数较少，适合性能较弱设备' },
  medium: { title: '中（默认）', desc: '大多数场景推荐，性能与画面平衡' },
  high: { title: '高（更多源）', desc: '瓦片更多，对 GPU/CPU 要求较高' },
};

export const MosaicConfigDialog: React.FC<MosaicConfigDialogProps> = ({
  open,
  columns,
  performancePreset,
  onConfirm,
  onClose,
}) => {
  const [pendingColumns, setPendingColumns] = useState(columns);
  const [pendingPreset, setPendingPreset] = useState<MosaicPerformancePreset>(performancePreset);

  useEffect(() => {
    if (open) {
      setPendingColumns(columns);
      setPendingPreset(performancePreset);
    }
  }, [open, columns, performancePreset]);

  if (!open) {
    return null;
  }

  const handleBackdropClick = () => onClose();
  const stopPropagation = (event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation();
  const handleConfirm = () => onConfirm(pendingColumns, pendingPreset);

  return (
    <div className="mosaic-config-backdrop" onClick={handleBackdropClick}>
      <div className="mosaic-config-dialog" onClick={stopPropagation} role="dialog" aria-modal="true">
        <header className="mosaic-config-header">
          <div>
            <h3>动态视频拼墙配置</h3>
            <p className="mosaic-config-subtitle">请选择列数与性能预设后继续</p>
          </div>
          <button className="mosaic-config-close" onClick={onClose} aria-label="关闭对话框">
            ×
          </button>
        </header>

        <section className="mosaic-config-section">
          <h4>拼墙列数</h4>
          <p className="mosaic-config-hint">影响同屏布局，列越多每个瓦片越小</p>
          <div className="mosaic-config-columns">
            {COLUMN_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`mosaic-config-pill ${pendingColumns === option ? 'selected' : ''}`}
                onClick={() => setPendingColumns(option)}
              >
                {option} 列
              </button>
            ))}
          </div>
        </section>

        <section className="mosaic-config-section">
          <h4>性能预设</h4>
          <div className="mosaic-config-radio-group">
            {Object.entries(PERFORMANCE_LABELS).map(([preset, meta]) => (
              <label key={preset} className={`mosaic-config-radio ${pendingPreset === preset ? 'checked' : ''}`}>
                <input
                  type="radio"
                  name="mosaic-performance"
                  value={preset}
                  checked={pendingPreset === preset}
                  onChange={() => setPendingPreset(preset as MosaicPerformancePreset)}
                />
                <div>
                  <span className="mosaic-config-radio-title">{meta.title}</span>
                  <span className="mosaic-config-radio-desc">{meta.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </section>

        <footer className="mosaic-config-footer">
          <button type="button" className="mosaic-config-secondary" onClick={onClose}>
            取消
          </button>
          <button type="button" className="mosaic-config-primary" onClick={handleConfirm}>
            开始拼墙
          </button>
        </footer>
      </div>
    </div>
  );
};

export default MosaicConfigDialog;
