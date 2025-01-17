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

export interface FileUploadState {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'idle' | 'uploading' | 'completed' | 'error';
  error?: Error;
}

export interface UploadState {
  files: Record<string, FileUploadState>;
  totalProgress: number;
  status: 'idle' | 'uploading' | 'completed' | 'error';
}

export function useUploaderMultiFile(config: UploaderConfig) {
  const [uploadState, setUploadState] = useState<UploadState>({
    files: {},
    totalProgress: 0,
    status: 'idle',
  });

  const abortControllersRef = useRef<Record<string, AbortController>>({});
  const uploaderRef = useRef<ApexxCloudCore | AwsCore | null>(null);

  const initializeUploader = useCallback(() => {
    if (!uploaderRef.current) {
      const UploaderClass = config.provider === 'aws' ? AwsCore : ApexxCloudCore;
      uploaderRef.current = new UploaderClass();
    }
    return uploaderRef.current;
  }, [config.provider]);

  const upload = useCallback(
    async (files: File[], options: UploadOptions = {}) => {
      const uploader = initializeUploader();
      const responses: any[] = [];

      setUploadState(prev => ({
        files: files.reduce((acc, file) => ({
          ...acc,
          [file.name]: {
            fileId: file.name,
            fileName: file.name,
            progress: 0,
            status: 'idle'
          }
        }), {}),
        totalProgress: 0,
        status: 'uploading'
      }));

      try {
        for (const file of files) {
          abortControllersRef.current[file.name] = new AbortController();

          const method = options.multipart ? 'uploadMultipart' : 'upload';
          
          const response = await uploader.files[method](file, config.getSignedUrl, {
            ...options,
            signal: abortControllersRef.current[file.name].signal,
            onProgress: (progressData: any) => {
              setUploadState(prev => {
                const updatedFiles = {
                  ...prev.files,
                  [file.name]: {
                    ...prev.files[file.name],
                    progress: progressData.progress,
                    status: 'uploading' as const
                  }
                };
                
                const totalProgress = Object.values(updatedFiles)
                  .reduce((sum, file) => sum + file.progress, 0) / Object.keys(updatedFiles).length;

                return {
                  files: updatedFiles,
                  totalProgress,
                  status: 'uploading'
                };
              });
              options.onProgress?.(progressData);
            },
            onComplete: (response: any) => {
              setUploadState(prev => {
                const updatedFiles = {
                  ...prev.files,
                  [file.name]: {
                    ...prev.files[file.name],
                    progress: 100,
                    status: 'completed' as const
                  }
                };

                const allCompleted = Object.values(updatedFiles)
                  .every(file => file.status === 'completed');

                return {
                  files: updatedFiles,
                  totalProgress: allCompleted ? 100 : prev.totalProgress,
                  status: allCompleted ? 'completed' : 'uploading'
                };
              });
              options.onComplete?.(response);
            },
            onError: (error: any) => {
              setUploadState(prev => ({
                ...prev,
                files: {
                  ...prev.files,
                  [file.name]: {
                    ...prev.files[file.name],
                    status: 'error',
                    error: error.error || error
                  }
                },
                status: 'error'
              }));
              options.onError?.(error.error || error);
            },
            onStart: () => {
              options.onStart?.(file);
            },
          });

          responses.push(response);
        }

        return responses;
      } catch (error) {
        setUploadState(prev => ({
          ...prev,
          status: 'error'
        }));
        throw error;
      }
    },
    [config, initializeUploader]
  );

  const cancelUpload = useCallback((fileId?: string) => {
    if (fileId) {
      abortControllersRef.current[fileId]?.abort();
      setUploadState(prev => ({
        ...prev,
        files: {
          ...prev.files,
          [fileId]: {
            ...prev.files[fileId],
            progress: 0,
            status: 'idle'
          }
        }
      }));
    } else {
      Object.values(abortControllersRef.current).forEach(controller => controller.abort());
      setUploadState({
        files: {},
        totalProgress: 0,
        status: 'idle'
      });
    }
  }, []);

  return {
    upload,
    cancelUpload,
    files: uploadState.files,
    totalProgress: uploadState.totalProgress,
    status: uploadState.status,
  };
} 