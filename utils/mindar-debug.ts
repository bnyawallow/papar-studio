/**
 * MindAR Debug Logger
 * Comprehensive debugging system for MindAR initialization pipeline
 * Captures: library init, tracker config, camera permissions, WebGL context,
 * asset loading progress, errors, and warnings
 */

export enum DebugLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface DebugEntry {
  timestamp: string;
  level: DebugLevel;
  category: string;
  message: string;
  data?: any;
}

export type DebugListener = (entry: DebugEntry) => void;

export class MindARDebugLogger {
  private entries: DebugEntry[] = [];
  private listeners: DebugListener[] = [];
  private maxEntries = 100;
  private startTime = performance.now();

  private getTimestamp(): string {
    const elapsed = Math.round(performance.now() - this.startTime);
    return `[+${elapsed}ms]`;
  }

  private getLevelName(level: DebugLevel): string {
    switch (level) {
      case DebugLevel.DEBUG: return 'DEBUG';
      case DebugLevel.INFO: return 'INFO ';
      case DebugLevel.WARN: return 'WARN ';
      case DebugLevel.ERROR: return 'ERROR';
    }
  }

  log(level: DebugLevel, category: string, message: string, data?: any): void {
    const entry: DebugEntry = {
      timestamp: this.getTimestamp(),
      level,
      category,
      message,
      data,
    };

    // Store entry
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(entry));

    // Console output with styling
    const prefix = `${entry.timestamp} [${category}] ${message}`;
    switch (level) {
      case DebugLevel.DEBUG:
        console.log(prefix, data || '');
        break;
      case DebugLevel.INFO:
        console.info(prefix, data || '');
        break;
      case DebugLevel.WARN:
        console.warn(prefix, data || '');
        break;
      case DebugLevel.ERROR:
        console.error(prefix, data || '');
        break;
    }

    // Send to parent window if in iframe
    if (window.parent !== window && typeof window.parent.postMessage === 'function') {
      window.parent.postMessage({
        type: 'mindar-debug',
        level: this.getLevelName(level),
        category,
        message,
        data,
        elapsed: Math.round(performance.now() - this.startTime),
      }, '*');
    }
  }

  // Convenience methods
  debug(category: string, message: string, data?: any): void {
    this.log(DebugLevel.DEBUG, category, message, data);
  }

  info(category: string, message: string, data?: any): void {
    this.log(DebugLevel.INFO, category, message, data);
  }

  warn(category: string, message: string, data?: any): void {
    this.log(DebugLevel.WARN, category, message, data);
  }

  error(category: string, message: string, data?: any): void {
    this.log(DebugLevel.ERROR, category, message, data);
  }

  // Specialized logging methods for MindAR pipeline
  logLibraryLoading(phase: string, data?: any): void {
    this.debug('LIBRARY', `Loading phase: ${phase}`, data);
  }

  logTrackerConfig(config: any): void {
    this.info('TRACKER', 'Tracker configuration', config);
  }

  async logCameraPermission<T>(action: () => Promise<T>): Promise<T> {
    this.info('CAMERA', 'Requesting camera permission...');
    try {
      const result = await action();
      this.info('CAMERA', 'Camera permission granted', { hasStream: !!result });
      return result;
    } catch (error: any) {
      this.error('CAMERA', 'Camera permission denied', {
        name: error.name,
        message: error.message,
      });
      throw error;
    }
  }

  logWebGLContext(status: 'creating' | 'created' | 'lost' | 'failed', data?: any): void {
    switch (status) {
      case 'creating':
        this.info('WEBGL', 'Creating WebGL context...');
        break;
      case 'created':
        this.info('WEBGL', 'WebGL context created', data);
        break;
      case 'lost':
        this.warn('WEBGL', 'WebGL context lost', data);
        break;
      case 'failed':
        this.error('WEBGL', 'WebGL context creation failed', data);
        break;
    }
  }

  logAssetLoading(assetType: string, url: string, progress?: number): void {
    const msg = progress !== undefined 
      ? `Loading ${assetType}: ${progress}%`
      : `Loading ${assetType}`;
    this.debug('ASSET', msg, { url, progress });
  }

  logMindFileStatus(status: 'fetching' | 'loaded' | 'failed', data?: any): void {
    switch (status) {
      case 'fetching':
        this.info('MIND', 'Fetching .mind file...', data);
        break;
      case 'loaded':
        this.info('MIND', '.mind file loaded successfully', data);
        break;
      case 'failed':
        this.error('MIND', '.mind file loading failed', data);
        break;
    }
  }

  logError(error: Error | string, context?: string): void {
    const errorObj = typeof error === 'string' 
      ? { name: 'Error', message: error }
      : { name: error.name, message: error.message, stack: error.stack };
    
    this.error(context || 'ERROR', 'Error occurred', errorObj);
  }

  addListener(listener: DebugListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  getEntries(): DebugEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
    this.startTime = performance.now();
  }
}

// Global instance
export const mindarDebug = new MindARDebugLogger();

// Helper to create debug log function for iframe
export function createDebugLog(name: string) {
  return (message: string, data?: any) => {
    mindarDebug.debug(name, message, data);
  };
}
