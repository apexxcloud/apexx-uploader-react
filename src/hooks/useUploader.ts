import { useState, useCallback, useRef } from 'react';
import { ApexxCloudCore, AwsCore } from 'apexx-uploader-core';

export type Provider = 'aws' | 'apexx';

export interface UploaderConfig {
  provider: Provider;
  getSignedUrl: (operation: string, params: Record<string, any>) => Promise<string>;
}

export interface UploadOptions {
  key?: string;
  multipart?: boolean;
  partSize?: number;
  concurrency?: number;
  onProgress?: (progressData: any) => void;
  onComplete?: (response: any) => void;
  onError?: (error: Error) => void;
  onStart?: (file: File) => void;
}

export interface UploadState {
  progress: number;
  status: 'idle' | 'uploading' | 'completed' | 'error';
  error?: Error;
}

export function useUploader(config: UploaderConfig) {
  const [uploadState, setUploadState] = useState<UploadState>({
    progress: 0,
    status: 'idle',
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const uploaderRef = useRef<ApexxCloudCore | AwsCore | null>(null);

  const initializeUploader = useCallback(() => {
    if (!uploaderRef.current) {
      const UploaderClass = config.provider === 'aws' ? AwsCore : ApexxCloudCore;
      uploaderRef.current = new UploaderClass();
    }
    return uploaderRef.current;
  }, [config.provider]);

  const upload = useCallback(
    async (file: File, options: UploadOptions = {}) => {
      try {
        const uploader = initializeUploader();
        setUploadState({ progress: 0, status: 'uploading' });

        abortControllerRef.current = new AbortController();

        const method = options.multipart ? 'uploadMultipart' : 'upload';
     
        const response = await uploader.files[method](file, config.getSignedUrl, {
          key: options.key,
          partSize: options.partSize,
          concurrency: options.concurrency,
          signal: abortControllerRef.current.signal,
          onProgress: (progressData: any) => {
            setUploadState({
              progress: progressData.progress,
              status: 'uploading',
            });
            options.onProgress?.(progressData);
          },
          onComplete: (response: any) => {
            setUploadState({
              progress: 100,
              status: 'completed',
            });
            options.onComplete?.(response);
          },
          onError: (error: any) => {
            setUploadState({
              progress: 0,
              status: 'error',
              error: error.error || error,
            });
            options.onError?.(error.error || error);
          },
          onStart: () => {
            options.onStart?.(file);
          },
        });

        return response;
      } catch (error) {
        setUploadState({
          progress: 0,
          status: 'error',
          error: error as Error,
        });
        throw error;
      }
    },
    [config, initializeUploader]
  );

  const cancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
    setUploadState({
      progress: 0,
      status: 'idle',
    });
  }, []);

  return {
    upload,
    cancelUpload,
    progress: uploadState.progress,
    status: uploadState.status,
    error: uploadState.error,
  };
} 