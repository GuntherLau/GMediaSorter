import React from 'react';
import { DetectionProgress } from '../types';
import './ProgressDialog.css';

interface ProgressDialogProps {
  title: string;
  progress: DetectionProgress;
  onCancel?: () => void;
}

const ProgressDialog: React.FC<ProgressDialogProps> = ({ title, progress, onCancel }) => {
  return (
    <div className="progress-dialog-overlay">
      <div className="progress-dialog">
        <h2>{title}</h2>
        <div className="progress-content">
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className="progress-info">
            <span className="progress-percentage">{progress.percentage}%</span>
            <span className="progress-status">
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="progress-message">{progress.message}</div>
          {progress.currentFile && (
            <div className="progress-current-file" title={progress.currentFile}>
              {progress.currentFile}
            </div>
          )}
        </div>
        {onCancel && (
          <div className="progress-actions">
            <button className="btn-cancel" onClick={onCancel}>
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressDialog;
