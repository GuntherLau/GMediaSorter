import React, { useEffect, useState } from 'react';
import './ConversionMenu.css';
import type { AudioStrategy, ConversionOptions, ConversionQuality, EncodingFormat } from '../types';

interface ConversionMenuProps {
  open: boolean;
  disabled: boolean;
  fileCount: number;
  initialFormat: EncodingFormat;
  initialOptions: ConversionOptions;
  onConfirm: (format: EncodingFormat, options: ConversionOptions) => void;
  onClose: () => void;
}

export const ConversionMenu: React.FC<ConversionMenuProps> = ({
  open,
  disabled,
  fileCount,
  initialFormat,
  initialOptions,
  onConfirm,
  onClose,
}) => {
  const [format, setFormat] = useState<EncodingFormat>(initialFormat);
  const [quality, setQuality] = useState<ConversionQuality>(initialOptions.quality);
  const [audioStrategy, setAudioStrategy] = useState<AudioStrategy>(initialOptions.audioStrategy);
  const [maxRetries, setMaxRetries] = useState<number>(initialOptions.maxRetries);

  useEffect(() => {
    if (open) {
      setFormat(initialFormat);
      setQuality(initialOptions.quality);
      setAudioStrategy(initialOptions.audioStrategy);
      setMaxRetries(initialOptions.maxRetries);
    }
  }, [open, initialFormat, initialOptions]);

  if (!open) {
    return null;
  }

  const handleConfirm = () => {
    if (disabled) {
      return;
    }
    onConfirm(format, {
      quality,
      audioStrategy,
      maxRetries,
    });
  };

  return (
    <div className="conversion-menu-backdrop" onClick={onClose}>
      <div className="conversion-menu" onClick={(event) => event.stopPropagation()}>
        <div className="conversion-menu-header">
          <div>
            <h3>视频转码选项</h3>
            <p className="conversion-menu-selected">
              {fileCount > 0 ? `本次将转换 ${fileCount} 个视频` : '暂无可转换的视频'}
            </p>
          </div>
          <button className="conversion-menu-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="conversion-menu-body">
          <section className="conversion-menu-section">
            <h4>目标编码格式</h4>
            <div className="conversion-format-options">
              <button
                className={`conversion-menu-option ${format === 'h264' ? 'active' : ''}`}
                onClick={() => setFormat('h264')}
                disabled={disabled}
              >
                <span className="conversion-menu-option-title">H.264</span>
                <span className="conversion-menu-option-desc">兼容性广，适合通用场景</span>
              </button>
              <button
                className={`conversion-menu-option ${format === 'h265' ? 'active' : ''}`}
                onClick={() => setFormat('h265')}
                disabled={disabled}
              >
                <span className="conversion-menu-option-title">H.265</span>
                <span className="conversion-menu-option-desc">压缩率更高，适合节省空间</span>
              </button>
            </div>
          </section>

          <section className="conversion-menu-section">
            <h4>画质策略</h4>
            <div className="conversion-radio-group">
              <label className={`conversion-radio ${quality === 'balanced' ? 'checked' : ''}`}>
                <input
                  type="radio"
                  name="quality"
                  value="balanced"
                  checked={quality === 'balanced'}
                  onChange={() => setQuality('balanced')}
                  disabled={disabled}
                />
                <div>
                  <span className="conversion-radio-title">均衡</span>
                  <span className="conversion-radio-desc">编码速度与画质均衡，适合日常使用</span>
                </div>
              </label>
              <label className={`conversion-radio ${quality === 'high' ? 'checked' : ''}`}>
                <input
                  type="radio"
                  name="quality"
                  value="high"
                  checked={quality === 'high'}
                  onChange={() => setQuality('high')}
                  disabled={disabled}
                />
                <div>
                  <span className="conversion-radio-title">高质量</span>
                  <span className="conversion-radio-desc">更佳画质，转码时间稍长</span>
                </div>
              </label>
            </div>
          </section>

          <section className="conversion-menu-section">
            <h4>音频策略</h4>
            <div className="conversion-radio-group">
              <label className={`conversion-radio ${audioStrategy === 'copy' ? 'checked' : ''}`}>
                <input
                  type="radio"
                  name="audio"
                  value="copy"
                  checked={audioStrategy === 'copy'}
                  onChange={() => setAudioStrategy('copy')}
                  disabled={disabled}
                />
                <div>
                  <span className="conversion-radio-title">保留原音轨</span>
                  <span className="conversion-radio-desc">无需重新编码，速度最快</span>
                </div>
              </label>
              <label className={`conversion-radio ${audioStrategy === 'aac' ? 'checked' : ''}`}>
                <input
                  type="radio"
                  name="audio"
                  value="aac"
                  checked={audioStrategy === 'aac'}
                  onChange={() => setAudioStrategy('aac')}
                  disabled={disabled}
                />
                <div>
                  <span className="conversion-radio-title">转为 AAC</span>
                  <span className="conversion-radio-desc">统一音频编码，兼容性更佳</span>
                </div>
              </label>
            </div>
          </section>

          <section className="conversion-menu-section">
            <h4>失败重试</h4>
            <div className="conversion-retry-control">
              <label htmlFor="conversion-retry-input">最大重试次数</label>
              <input
                id="conversion-retry-input"
                type="number"
                min={0}
                max={3}
                step={1}
                value={maxRetries}
                onChange={(event) => setMaxRetries(Math.min(3, Math.max(0, Number(event.target.value) || 0)))}
                disabled={disabled}
              />
              <span className="conversion-retry-hint">超过限制将自动记录到日志</span>
            </div>
          </section>
        </div>
        <div className="conversion-menu-footer">
          {disabled ? (
            <p className="conversion-menu-warning">请先在列表中选择至少一个视频文件</p>
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

export default ConversionMenu;
