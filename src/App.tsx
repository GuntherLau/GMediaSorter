import { useMemo, useState, useEffect, useCallback } from 'react';
import './App.css';
import {
  DEFAULT_CONVERSION_OPTIONS,
  type VideoFile,
  type DuplicateResult,
  type SimilarityResult,
  type DetectionProgress,
  type SimilarityOptions,
  type FilterState,
  type EncodingFormat,
  type ConversionRequest,
  type ConversionProgress,
  type ConversionResult,
  type ConversionOptions,
  type ContainerFormat,
  type ContainerConversionRequest,
  type ContainerConversionProgress,
  type ContainerConversionResult,
  type VideoPreviewSource,
  type PlayerPreferences,
} from './types';
import { filterVideoFiles, formatDuration } from './utils/filters';
import Toolbar from './components/Toolbar';
import ProgressDialog from './components/ProgressDialog';
import DuplicatePanel from './components/DuplicatePanel';
import SimilarityPanel from './components/SimilarityPanel';
import { FilterPanel } from './components/FilterPanel';
import ConversionMenu from './components/ConversionMenu';
import ConversionProgressDialog from './components/ConversionProgressDialog';
import ConversionResultDialog from './components/ConversionResultDialog';
import ContainerConversionMenu from './components/ContainerConversionMenu';
import ContainerConversionProgressDialog from './components/ContainerConversionProgressDialog';
import ContainerConversionResultDialog from './components/ContainerConversionResultDialog';
import VideoPlayer from './components/VideoPlayer';
import VideoMosaicPrototype, {
  type VideoMosaicSource,
  type MosaicPerformancePreset,
} from './components/VideoMosaicPrototype';

type ConversionDraft = {
  format: EncodingFormat;
  filePaths: string[];
  options: ConversionOptions;
};

type ContainerConversionDraft = {
  target: ContainerFormat;
  filePaths: string[];
};

const PLAYER_PREFERENCES_KEY = 'gms-player-preferences';
const DEFAULT_PLAYER_PREFERENCES: PlayerPreferences = {
  autoPlay: true,
  rememberProgress: true,
  loop: false,
  defaultPlaybackRate: 1,
};

const MOSAIC_CONFIG_KEY = 'gms-mosaic-config';
type MosaicConfig = {
  columns: number;
  performancePreset: MosaicPerformancePreset;
};

const DEFAULT_MOSAIC_CONFIG: MosaicConfig = {
  columns: 3,
  performancePreset: 'medium',
};

type MosaicState = {
  sources: VideoMosaicSource[];
  loading: boolean;
  error: string | null;
};

const createInitialMosaicState = (): MosaicState => ({
  sources: [],
  loading: false,
  error: null,
});

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatResolution = (file: VideoFile): string | null => {
  if (file.width && file.height) {
    return `${file.width} × ${file.height}`;
  }
  return null;
};

function App() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [videoFiles, setVideoFiles] = useState<VideoFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [isConversionMenuOpen, setConversionMenuOpen] = useState(false);
  const [pendingConversionDraft, setPendingConversionDraft] = useState<ConversionDraft | null>(null);
  const [conversionRequest, setConversionRequest] = useState<ConversionRequest | null>(null);
  const [activeConversionMeta, setActiveConversionMeta] = useState<{ format: EncodingFormat; outputDir: string; total: number } | null>(null);
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress | null>(null);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [lastConversionSelection, setLastConversionSelection] = useState<{ format: EncodingFormat; options: ConversionOptions }>(() => ({
    format: 'h264',
    options: { ...DEFAULT_CONVERSION_OPTIONS },
  }));
  const [conversionCandidates, setConversionCandidates] = useState<string[]>([]);
  const [isContainerConversionMenuOpen, setContainerConversionMenuOpen] = useState(false);
  const [containerConversionCandidates, setContainerConversionCandidates] = useState<string[]>([]);
  const [pendingContainerConversionDraft, setPendingContainerConversionDraft] = useState<ContainerConversionDraft | null>(null);
  const [containerConversionRequest, setContainerConversionRequest] = useState<ContainerConversionRequest | null>(null);
  const [activeContainerConversionMeta, setActiveContainerConversionMeta] = useState<{ target: ContainerFormat; outputDir: string; total: number } | null>(null);
  const [containerConversionProgress, setContainerConversionProgress] = useState<ContainerConversionProgress | null>(null);
  const [containerConversionResult, setContainerConversionResult] = useState<ContainerConversionResult | null>(null);
  const [lastContainerTarget, setLastContainerTarget] = useState<ContainerFormat>('mp4');
  const [playerState, setPlayerState] = useState<{ visible: boolean; source: VideoPreviewSource | null }>({
    visible: false,
    source: null,
  });
  const [playerPreferences, setPlayerPreferences] = useState<PlayerPreferences>(() => {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_PLAYER_PREFERENCES };
    }
    try {
      const stored = window.localStorage.getItem(PLAYER_PREFERENCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<PlayerPreferences>;
        return {
          ...DEFAULT_PLAYER_PREFERENCES,
          ...parsed,
        } satisfies PlayerPreferences;
      }
    } catch {
      // ignore storage failures
    }
    return { ...DEFAULT_PLAYER_PREFERENCES };
  });
  const [showMosaicPrototype, setShowMosaicPrototype] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.location.hash === '#mosaic-prototype';
  });
  const [mosaicState, setMosaicState] = useState<MosaicState>(() => createInitialMosaicState());
  const [mosaicConfig, setMosaicConfig] = useState<MosaicConfig>(() => {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_MOSAIC_CONFIG };
    }
    try {
      const stored = window.localStorage.getItem(MOSAIC_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<MosaicConfig>;
        const normalized: MosaicConfig = {
          columns:
            typeof parsed.columns === 'number' && parsed.columns > 0
              ? parsed.columns
              : DEFAULT_MOSAIC_CONFIG.columns,
          performancePreset:
            parsed.performancePreset === 'low' || parsed.performancePreset === 'high'
              ? parsed.performancePreset
              : DEFAULT_MOSAIC_CONFIG.performancePreset,
        } satisfies MosaicConfig;
        return normalized;
      }
    } catch {
      // ignore storage failure
    }
    return { ...DEFAULT_MOSAIC_CONFIG };
  });
  
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleHashChange = () => {
      const shouldShow = window.location.hash === '#mosaic-prototype';
      setShowMosaicPrototype(shouldShow);
      if (!shouldShow) {
        setMosaicState(createInitialMosaicState());
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(MOSAIC_CONFIG_KEY, JSON.stringify(mosaicConfig));
    } catch {
      // ignore storage failure
    }
  }, [mosaicConfig]);

  const handleCloseMosaicPrototype = useCallback(() => {
    setShowMosaicPrototype(false);
    setMosaicState(createInitialMosaicState());
    if (typeof window !== 'undefined' && window.location.hash === '#mosaic-prototype') {
      window.location.hash = '';
    }
  }, []);

  const handleMosaicColumnsChange = useCallback((columns: number) => {
    setMosaicConfig((prev) => {
      const nextColumns = columns > 0 ? columns : DEFAULT_MOSAIC_CONFIG.columns;
      if (prev.columns === nextColumns) {
        return prev;
      }
      return {
        columns: nextColumns,
        performancePreset: prev.performancePreset,
      } satisfies MosaicConfig;
    });
  }, []);

  const handleMosaicPerformanceChange = useCallback((preset: MosaicPerformancePreset) => {
    setMosaicConfig((prev) => {
      if (prev.performancePreset === preset) {
        return prev;
      }
      return {
        columns: prev.columns,
        performancePreset: preset,
      } satisfies MosaicConfig;
    });
  }, []);

  // 多维度过滤器状态
  const [filters, setFilters] = useState<FilterState>({
    resolution: 'all',
    duration: 'all',
  });

  // 过滤后的视频文件列表
  const filteredVideoFiles = useMemo(() => {
    return filterVideoFiles(videoFiles, filters);
  }, [videoFiles, filters]);

  const handleOpenMosaic = useCallback(async () => {
    if (filteredVideoFiles.length === 0) {
      alert('当前列表中没有可用于拼墙的视频，请调整过滤条件或重新加载目录。');
      return;
    }

    setMosaicState({
      sources: [],
      loading: true,
      error: null,
    });
    setShowMosaicPrototype(true);
    if (typeof window !== 'undefined') {
      window.location.hash = '#mosaic-prototype';
    }

    try {
      const previews = await Promise.all(
        filteredVideoFiles.map((file) => window.electronAPI.openFilePreview(file.path))
      );
      const sources: VideoMosaicSource[] = previews.map((preview) => ({
        id: preview.filePath,
        src: preview.url,
        title: preview.fileName,
        duration: preview.metadata?.duration ?? null,
        width: preview.metadata?.width ?? null,
        height: preview.metadata?.height ?? null,
      }));

      setMosaicState({
        sources,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('加载拼墙视频失败:', error);
      setMosaicState({
        sources: [],
        loading: false,
        error: error instanceof Error ? error.message : '拼墙资源加载失败',
      });
    }
  }, [filteredVideoFiles]);

  // 检测相关状态
  const [detecting, setDetecting] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState<DetectionProgress | null>(null);
  const [duplicateResult, setDuplicateResult] = useState<DuplicateResult | null>(null);
  const [similarityResult, setSimilarityResult] = useState<SimilarityResult | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const handleSelectDirectory = async () => {
    try {
      const dirPath = await window.electronAPI.selectDirectory();
      if (dirPath) {
        setCurrentPath(dirPath);
        await loadVideoFiles(dirPath);
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      alert('选择目录失败');
    }
  };

  const loadVideoFiles = async (dirPath: string) => {
    try {
      setLoading(true);
      const files = await window.electronAPI.getVideoFiles(dirPath);
      setVideoFiles(files);
      setSelectedFiles(new Set());
      // 重置过滤器
      setFilters({
        resolution: 'all',
        duration: 'all',
      });
    } catch (error) {
      console.error('Error loading video files:', error);
      alert('加载视频文件失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleFileSelection = (filePath: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(filePath)) {
      newSelection.delete(filePath);
    } else {
      newSelection.add(filePath);
    }
    setSelectedFiles(newSelection);
  };

  // 更新单个过滤维度
  const updateFilter = <K extends keyof FilterState>(
    dimension: K,
    value: FilterState[K]
  ) => {
    setFilters(prev => ({ ...prev, [dimension]: value }));
  };

  // 清除所有过滤器
  const clearAllFilters = () => {
    setFilters({
      resolution: 'all',
      duration: 'all',
    });
  };

  // 监听检测进度
  useEffect(() => {
    const removeListener = window.electronAPI.onDetectionProgress((progress) => {
      setDetectionProgress(progress);
    });
    return removeListener;
  }, []);

  const handleOpenConversionMenu = useCallback(() => {
    if (conversionProgress && conversionProgress.status === 'running') {
      alert('当前已有转码任务正在进行，请稍候再试');
      return;
    }

    const candidates = filteredVideoFiles.map((file) => file.path);
    if (candidates.length === 0) {
      alert('当前列表中没有可转换的视频文件');
      return;
    }

    setConversionCandidates(candidates);
    setConversionMenuOpen(true);
  }, [conversionProgress, filteredVideoFiles]);

  const handleOpenContainerConversionMenu = useCallback(() => {
    if (containerConversionProgress && containerConversionProgress.status === 'running') {
      alert('当前已有容器转换任务正在进行，请稍候再试');
      return;
    }

    const candidates = filteredVideoFiles.map((file) => file.path);
    if (candidates.length === 0) {
      alert('当前列表中没有可转换的视频文件');
      return;
    }

    setContainerConversionCandidates(candidates);
    setContainerConversionMenuOpen(true);
  }, [containerConversionProgress, filteredVideoFiles]);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onConversionMenuOpen(() => {
      handleOpenConversionMenu();
    });
    return unsubscribe;
  }, [handleOpenConversionMenu]);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onContainerConversionMenuOpen(() => {
      handleOpenContainerConversionMenu();
    });
    return unsubscribe;
  }, [handleOpenContainerConversionMenu]);

  // 处理"找相同"
  const handleFindDuplicates = async () => {
    try {
      // 清除之前的结果
      setDuplicateResult(null);
      setSimilarityResult(null);
      
      setDetecting(true);
      setCurrentTaskId('duplicate');
      setDetectionProgress({ current: 0, total: videoFiles.length, percentage: 0, message: '准备检测...' });
      
      const result = await window.electronAPI.detectDuplicates(videoFiles);
      
      // 先关闭进度对话框
      setDetectionProgress(null);
      setDetecting(false);
      setCurrentTaskId(null);
      
      // 稍微延迟一下再显示结果，确保进度对话框已关闭
      setTimeout(() => {
        setDuplicateResult(result);
      }, 100);
    } catch (error) {
      console.error('Error detecting duplicates:', error);
      setDetectionProgress(null);
      setDetecting(false);
      setCurrentTaskId(null);
      alert(`检测失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 处理"找相似"
  const handleFindSimilar = async () => {
    // 弹出配置对话框（简化版：使用固定配置）
    const threshold = 0.8; // 可以后续改为用户配置
    
    const options: SimilarityOptions = {
      threshold,
      checkDuration: true,
      checkResolution: true,
      checkFileSize: true,
      checkVisual: true,
    };

    try {
      // 清除之前的结果
      setDuplicateResult(null);
      setSimilarityResult(null);
      
      setDetecting(true);
      setCurrentTaskId('similarity');
      setDetectionProgress({ current: 0, total: videoFiles.length, percentage: 0, message: '准备检测...' });
      
      const result = await window.electronAPI.detectSimilarity(videoFiles, options);
      
      // 先关闭进度对话框
      setDetectionProgress(null);
      setDetecting(false);
      setCurrentTaskId(null);
      
      // 稍微延迟一下再显示结果，确保进度对话框已关闭
      setTimeout(() => {
        setSimilarityResult(result);
      }, 100);
    } catch (error) {
      console.error('Error detecting similarity:', error);
      setDetectionProgress(null);
      setDetecting(false);
      setCurrentTaskId(null);
      alert(`检测失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 取消检测
  const handleCancelDetection = () => {
    // 立即关闭进度对话框
    setDetecting(false);
    setDetectionProgress(null);
    const taskId = currentTaskId;
    setCurrentTaskId(null);
    
    // 异步通知后端取消
    if (taskId) {
      window.electronAPI.cancelDetection(taskId).catch(error => {
        console.error('Error cancelling detection:', error);
      });
    }
  };

  const handleOpenPlayer = useCallback(async (file: VideoFile) => {
    try {
      const preview = await window.electronAPI.openFilePreview(file.path);
      setPlayerState({ visible: true, source: preview });
    } catch (error) {
      console.error('Error opening video preview:', error);
      alert('播放失败：请检查文件是否存在或是否具备读取权限');
    }
  }, []);

  const handleClosePlayer = useCallback(() => {
    setPlayerState({ visible: false, source: null });
  }, []);

  const handlePlayerPreferencesChange = useCallback((prefs: PlayerPreferences) => {
    setPlayerPreferences(prefs);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PLAYER_PREFERENCES_KEY, JSON.stringify(playerPreferences));
    } catch {
      // ignore storage failures
    }
  }, [playerPreferences]);

  // 删除文件
  const handleDeleteFiles = async (files: VideoFile[]) => {
    const errors: string[] = [];
    
    for (const file of files) {
      try {
        const result = await window.electronAPI.deleteFile(file.path);
        if (!result.success) {
          errors.push(`${file.name}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`部分文件删除失败:\n${errors.join('\n')}`);
    }

    // 刷新视频列表
    if (currentPath) {
      await loadVideoFiles(currentPath);
    }

    // 关闭结果面板
    setDuplicateResult(null);
    setSimilarityResult(null);
  };

  useEffect(() => {
    if (!pendingConversionDraft) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const outputDir = await window.electronAPI.selectOutputDirectory();
        if (!outputDir || cancelled) {
          return;
        }
        setConversionRequest({
          format: pendingConversionDraft.format,
          filePaths: pendingConversionDraft.filePaths,
          outputDir,
          options: { ...pendingConversionDraft.options },
        });
        setActiveConversionMeta({
          format: pendingConversionDraft.format,
          outputDir,
          total: pendingConversionDraft.filePaths.length,
        });
      } catch (error) {
        console.error('选择输出目录失败:', error);
      } finally {
        if (!cancelled) {
          setPendingConversionDraft(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingConversionDraft]);

  useEffect(() => {
    if (!pendingContainerConversionDraft) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const outputDir = await window.electronAPI.selectOutputDirectory();
        if (!outputDir || cancelled) {
          return;
        }

        setContainerConversionRequest({
          targetContainer: pendingContainerConversionDraft.target,
          filePaths: pendingContainerConversionDraft.filePaths,
          outputDir,
        });
        setActiveContainerConversionMeta({
          target: pendingContainerConversionDraft.target,
          outputDir,
          total: pendingContainerConversionDraft.filePaths.length,
        });
      } catch (error) {
        console.error('选择容器转换输出目录失败:', error);
      } finally {
        if (!cancelled) {
          setPendingContainerConversionDraft(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingContainerConversionDraft]);

  useEffect(() => {
    if (!conversionRequest) {
      return;
    }

    let cancelled = false;

    const initialProgress: ConversionProgress = {
      total: conversionRequest.filePaths.length,
      processed: 0,
      successCount: 0,
      failureCount: 0,
      percentage: conversionRequest.filePaths.length === 0 ? 100 : 0,
      status: 'running',
    };
    setConversionProgress(initialProgress);

    const run = async () => {
      try {
        await window.electronAPI.requestConversion(conversionRequest);
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error('发起转码失败:', error);

        let logPath = '';
        try {
          logPath = await window.electronAPI.getConversionLogPath();
        } catch (logError) {
          console.error('获取转码日志路径失败:', logError);
        }

        if (cancelled) {
          return;
        }

        setConversionProgress(null);
        setConversionResult({
          format: conversionRequest.format,
          outputDir: conversionRequest.outputDir,
          success: [],
          failures: conversionRequest.filePaths.map((input) => ({
            input,
            error: error instanceof Error ? error.message : String(error),
            attempts: 0,
          })),
          cancelled: false,
          elapsedMs: 0,
          options: conversionRequest.options,
          logPath,
        });
        setActiveConversionMeta(null);
      } finally {
        if (!cancelled) {
          setConversionRequest(null);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [conversionRequest]);

  useEffect(() => {
    if (!containerConversionRequest) {
      return;
    }

    let cancelled = false;

    const initialProgress: ContainerConversionProgress = {
      total: containerConversionRequest.filePaths.length,
      processed: 0,
      successCount: 0,
      failureCount: 0,
      percentage: containerConversionRequest.filePaths.length === 0 ? 100 : 0,
      status: 'running',
    };
    setContainerConversionProgress(initialProgress);

    const run = async () => {
      try {
        await window.electronAPI.requestContainerConversion(containerConversionRequest);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error('发起容器转换失败:', error);

        let logPath = '';
        try {
          logPath = await window.electronAPI.getContainerConversionLogPath();
        } catch (logError) {
          console.error('获取容器转换日志路径失败:', logError);
        }

        if (cancelled) {
          return;
        }

        setContainerConversionProgress(null);
        setContainerConversionResult({
          targetContainer: containerConversionRequest.targetContainer,
          outputDir: containerConversionRequest.outputDir,
          success: [],
          failures: containerConversionRequest.filePaths.map((input) => ({
            input,
            error: error instanceof Error ? error.message : String(error),
            attempts: 0,
          })),
          cancelled: false,
          elapsedMs: 0,
          logPath,
        });
        setActiveContainerConversionMeta(null);
      } finally {
        if (!cancelled) {
          setContainerConversionRequest(null);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [containerConversionRequest]);

  useEffect(() => {
    const offProgress = window.electronAPI.onConversionProgress((progress) => {
      setConversionProgress(progress);
    });
    const offComplete = window.electronAPI.onConversionComplete((result) => {
      setConversionProgress(null);
      setConversionResult(result);
      setActiveConversionMeta(null);
    });

    return () => {
      offProgress();
      offComplete();
    };
  }, []);

  useEffect(() => {
    const offProgress = window.electronAPI.onContainerConversionProgress((progress) => {
      setContainerConversionProgress(progress);
    });
    const offComplete = window.electronAPI.onContainerConversionComplete((result) => {
      setContainerConversionProgress(null);
      setContainerConversionResult(result);
      setActiveContainerConversionMeta(null);
    });

    return () => {
      offProgress();
      offComplete();
    };
  }, []);

  const handleConversionConfirm = useCallback(
    (format: EncodingFormat, options: ConversionOptions) => {
      if (conversionCandidates.length === 0) {
        alert('没有可转换的视频文件');
        return;
      }
      setConversionMenuOpen(false);
      setConversionResult(null);
      setConversionProgress(null);
      setPendingConversionDraft({
        format,
        filePaths: conversionCandidates,
        options: { ...options },
      });
      setLastConversionSelection({
        format,
        options: { ...options },
      });
      setConversionCandidates([]);
    },
    [conversionCandidates],
  );

  const handleContainerConversionConfirm = useCallback(
    (target: ContainerFormat) => {
      if (containerConversionCandidates.length === 0) {
        alert('没有可转换的视频文件');
        return;
      }

      setContainerConversionMenuOpen(false);
      setContainerConversionResult(null);
      setContainerConversionProgress(null);
      setPendingContainerConversionDraft({
        target,
        filePaths: containerConversionCandidates,
      });
      setLastContainerTarget(target);
      setContainerConversionCandidates([]);
    },
    [containerConversionCandidates],
  );

  const handleCancelConversion = useCallback(() => {
    window.electronAPI.cancelConversion().catch((error) => {
      console.error('取消转码任务失败:', error);
    });
  }, []);

  const handleCancelContainerConversion = useCallback(() => {
    window.electronAPI.cancelContainerConversion().catch((error) => {
      console.error('取消容器转换任务失败:', error);
    });
  }, []);

  const handleCloseConversionResult = useCallback(() => {
    setConversionResult(null);
  }, []);

  const handleOpenOutputDirectory = useCallback(() => {
    if (!conversionResult) {
      return;
    }
    window.electronAPI.openPath(conversionResult.outputDir).catch((error) => {
      console.error('打开输出目录失败:', error);
    });
  }, [conversionResult]);

  const handleViewConversionLog = useCallback(() => {
    if (!conversionResult?.logPath) {
      return;
    }
    window.electronAPI.openPath(conversionResult.logPath).catch((error) => {
      console.error('打开转码日志失败:', error);
    });
  }, [conversionResult]);

  const handleCloseContainerConversionResult = useCallback(() => {
    setContainerConversionResult(null);
  }, []);

  const handleOpenContainerConversionOutput = useCallback(() => {
    if (!containerConversionResult) {
      return;
    }
    window.electronAPI.openPath(containerConversionResult.outputDir).catch((error) => {
      console.error('打开容器转换输出目录失败:', error);
    });
  }, [containerConversionResult]);

  const handleViewContainerConversionLog = useCallback(() => {
    if (!containerConversionResult?.logPath) {
      return;
    }
    window.electronAPI.openPath(containerConversionResult.logPath).catch((error) => {
      console.error('打开容器转换日志失败:', error);
    });
  }, [containerConversionResult]);

  if (showMosaicPrototype) {
    return (
      <VideoMosaicPrototype
        sources={mosaicState.sources}
        isLoading={mosaicState.loading}
        error={mosaicState.error}
        onExit={handleCloseMosaicPrototype}
        columns={mosaicConfig.columns}
        performancePreset={mosaicConfig.performancePreset}
      />
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>GMediaSorter - 视频管理工具</h1>
        <button onClick={handleSelectDirectory} className="select-btn">
          选择文件夹
        </button>
      </header>

      <main className="app-main">
        {currentPath && (
          <div className="current-path">
            <strong>当前路径:</strong> {currentPath}
          </div>
        )}

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>正在扫描视频文件...</p>
          </div>
        ) : videoFiles.length > 0 ? (
          <div className="video-list">
            <Toolbar
              onFindDuplicates={handleFindDuplicates}
              onFindSimilar={handleFindSimilar}
              onOpenConversion={handleOpenConversionMenu}
              onOpenContainerConversion={handleOpenContainerConversionMenu}
              onOpenMosaic={handleOpenMosaic}
              disabled={detecting}
              videoCount={filteredVideoFiles.length}
              conversionCount={conversionCandidates.length > 0 ? conversionCandidates.length : filteredVideoFiles.length}
              containerConversionCount={
                containerConversionCandidates.length > 0
                  ? containerConversionCandidates.length
                  : filteredVideoFiles.length
              }
              mosaicSourceCount={filteredVideoFiles.length}
              mosaicLoading={mosaicState.loading}
              mosaicColumns={mosaicConfig.columns}
              onMosaicColumnsChange={handleMosaicColumnsChange}
              mosaicPerformancePreset={mosaicConfig.performancePreset}
              onMosaicPerformanceChange={handleMosaicPerformanceChange}
            />

            {/* 新的多维度过滤器面板 */}
            <FilterPanel
              filters={filters}
              onFilterChange={updateFilter}
              onClearAll={clearAllFilters}
              totalCount={videoFiles.length}
              filteredCount={filteredVideoFiles.length}
            />

            {/* 转码提示 */}
            {filteredVideoFiles.length > 0 && (
              <div className="selection-info-bar">
                视频转码将自动处理当前列表中的全部 {filteredVideoFiles.length} 个视频
              </div>
            )}

            {filteredVideoFiles.length > 0 ? (
              <div className="video-grid">
                {filteredVideoFiles.map((file) => (
                  <div
                    key={file.path}
                    className={`video-card ${selectedFiles.has(file.path) ? 'selected' : ''}`}
                    onClick={() => toggleFileSelection(file.path)}
                  >
                    <div className="video-icon">🎬</div>
                    <div className="video-info">
                      <h3 className="video-name" title={file.name}>
                        {file.name}
                      </h3>
                      <p className="video-details">
                        {formatFileSize(file.size)} • {file.extension}
                      </p>
                      <p className="video-date">
                        {new Date(file.modified).toLocaleString('zh-CN')}
                      </p>
                      {formatResolution(file) && (
                        <p className="video-resolution" title="视频分辨率">
                          分辨率: {formatResolution(file)}
                        </p>
                      )}
                      {file.duration !== null && (
                        <p className="video-duration" title="视频时长">
                          时长: {formatDuration(file.duration)}
                        </p>
                      )}
                    </div>
                    <div className="video-card-actions">
                      <button
                        className="video-card-play"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenPlayer(file);
                        }}
                      >
                        播放
                      </button>
                    </div>
                    {selectedFiles.has(file.path) && <div className="selected-indicator">✓</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-filter-state">当前筛选条件下没有符合的视频</div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <p>请选择一个文件夹以查看视频文件</p>
          </div>
        )}
      </main>

      {/* 检测进度对话框 - 只在没有结果时显示 */}
      {detectionProgress && !duplicateResult && !similarityResult && (
        <ProgressDialog
          title={currentTaskId === 'duplicate' ? '重复文件检测中' : '相似视频检测中'}
          progress={detectionProgress}
          onCancel={handleCancelDetection}
        />
      )}

      {/* 重复检测结果面板 */}
      {duplicateResult && (
        <DuplicatePanel
          result={duplicateResult}
          onClose={() => setDuplicateResult(null)}
          onDeleteFiles={handleDeleteFiles}
        />
      )}

      {/* 相似检测结果面板 */}
      {similarityResult && (
        <SimilarityPanel
          result={similarityResult}
          onClose={() => setSimilarityResult(null)}
        />
      )}

      <ContainerConversionMenu
        open={isContainerConversionMenuOpen}
        disabled={containerConversionCandidates.length === 0}
        fileCount={containerConversionCandidates.length}
        initialTarget={lastContainerTarget}
        onConfirm={handleContainerConversionConfirm}
        onClose={() => {
          setContainerConversionMenuOpen(false);
          setContainerConversionCandidates([]);
        }}
      />

      <ConversionMenu
        open={isConversionMenuOpen}
        disabled={conversionCandidates.length === 0}
        fileCount={conversionCandidates.length}
        initialFormat={lastConversionSelection.format}
        initialOptions={lastConversionSelection.options}
        onConfirm={handleConversionConfirm}
        onClose={() => {
          setConversionMenuOpen(false);
          setConversionCandidates([]);
        }}
      />

      <ConversionProgressDialog
        open={Boolean(conversionProgress) && conversionProgress?.status === 'running'}
        progress={conversionProgress}
        format={activeConversionMeta?.format ?? null}
        onCancel={handleCancelConversion}
      />

      <ConversionResultDialog
        open={Boolean(conversionResult)}
        result={conversionResult}
        onClose={handleCloseConversionResult}
        onOpenOutput={handleOpenOutputDirectory}
        onViewLog={handleViewConversionLog}
      />

      <ContainerConversionProgressDialog
        open={Boolean(containerConversionProgress) && containerConversionProgress?.status === 'running'}
        progress={containerConversionProgress}
        target={activeContainerConversionMeta?.target ?? null}
        onCancel={handleCancelContainerConversion}
      />

      <ContainerConversionResultDialog
        open={Boolean(containerConversionResult)}
        result={containerConversionResult}
        onClose={handleCloseContainerConversionResult}
        onOpenOutput={handleOpenContainerConversionOutput}
        onViewLog={handleViewContainerConversionLog}
      />

      <VideoPlayer
        open={playerState.visible}
        source={playerState.source}
        preferences={playerPreferences}
        onClose={handleClosePlayer}
        onUpdatePreferences={handlePlayerPreferencesChange}
      />
    </div>
  );
}

export default App;
