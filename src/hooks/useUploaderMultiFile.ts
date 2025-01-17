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
  onProgress?: (progressData: any, file: File) => void;
  onComplete?: (response: any, file: File) => void;
  onError?: (error: Error, file: File) => void;
  onStart?: (file: File) => void;
}

export interface FileUploadState {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'idle' | 'uploading' | 'completed' | 'error';
  error?: Error;
  response?: any;
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
      const fileResponses: Record<string, any> = {};

      setUploadState(prev => ({
        files: files.reduce((acc, file) => ({
          ...acc,
          [file.name]: {
            fileId: file.name,
            fileName: file.name,
            progress: 0,
            status: 'idle',
            response: null
          }
        }), {}),
        totalProgress: 0,
        status: 'uploading'
      }));

      try {
        const uploadPromises = files.map(async (file) => {
          abortControllersRef.current[file.name] = new AbortController();
          const method = options.multipart ? 'uploadMultipart' : 'upload';

          try {
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
                  
                  const totalProgress = Object.values(updatedFiles).reduce((sum, fileState) => 
                    sum + fileState.progress, 0) / files.length;

                  return {
                    files: updatedFiles,
                    totalProgress,
                    status: 'uploading'
                  };
                });
                options.onProgress?.(
                  { 
                    ...progressData,
                    fileName: file.name,
                    fileId: file.name
                  }, 
                  file
                );
              },
              onComplete: (response: any) => {
                fileResponses[file.name] = response;
                setUploadState(prev => {
                  const updatedFiles = {
                    ...prev.files,
                    [file.name]: {
                      ...prev.files[file.name],
                      progress: 100,
                      status: 'completed' as const,
                      response
                    }
                  };

                  const allCompleted = Object.values(updatedFiles)
                    .every(file => file.status === 'completed');
                  const totalProgress = Object.values(updatedFiles).reduce((sum, fileState) => 
                    sum + fileState.progress, 0) / files.length;

                  return {
                    files: updatedFiles,
                    totalProgress,
                    status: allCompleted ? 'completed' : 'uploading'
                  };
                });
                options.onComplete?.(
                  { 
                    ...response,
                    fileName: file.name,
                    fileId: file.name
                  }, 
                  file
                );
              },
              onError: (error: any) => {
                setUploadState(prev => {
                  const updatedFiles = {
                    ...prev.files,
                    [file.name]: {
                      ...prev.files[file.name],
                      status: 'error' as const,
                      error: error.error || error
                    }
                  };

                  const hasInProgressFiles = Object.values(updatedFiles)
                    .some(file => file.status === 'uploading');
                  const totalProgress = Object.values(updatedFiles).reduce((sum, fileState) => 
                    sum + (fileState.status === 'completed' ? 100 : fileState.progress), 0) / files.length;

                  return {
                    files: updatedFiles,
                    totalProgress,
                    status: hasInProgressFiles ? 'uploading' : 'error'
                  };
                });
                options.onError?.(
                  {
                    ...(error.error || error),
                    fileName: file.name,
                    fileId: file.name
                  },
                  file
                );
              },
              onStart: () => {
                options.onStart?.(file);
              },
            });
            return response;
          } catch (error) {
            setUploadState(prev => ({
              ...prev,
              files: {
                ...prev.files,
                [file.name]: {
                  ...prev.files[file.name],
                  status: 'error',
                  error: error as Error
                }
              }
            }));
            throw error;
          }
        });

        await Promise.all(uploadPromises);
        return fileResponses;
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

  const calculateTotalProgress = (files: Record<string, FileUploadState>) => {
    const activeFiles = Object.values(files).filter(
      file => file.status !== 'error' && file.status !== 'idle'
    );
    
    if (activeFiles.length === 0) return 0;

    const totalProgress = activeFiles.reduce((sum, file) => {
      return sum + (file.status === 'completed' ? 100 : file.progress);
    }, 0);

    return totalProgress / activeFiles.length;
  };

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

  const cancelFileUpload = useCallback((fileName: string) => {
    const controller = abortControllersRef.current[fileName];
    if (controller) {
      controller.abort();
      delete abortControllersRef.current[fileName];

      setUploadState(prev => {
        const updatedFiles = {
          ...prev.files,
          [fileName]: {
            ...prev.files[fileName],
            progress: 0,
            status: 'error' as const,
            error: new Error('Upload cancelled')
          }
        };

        const hasInProgressFiles = Object.values(updatedFiles)
          .some(file => file.status === 'uploading');
        
        const newTotalProgress = calculateTotalProgress(updatedFiles);

        return {
          files: updatedFiles,
          totalProgress: newTotalProgress,
          status: hasInProgressFiles ? 'uploading' : 'error'
        };
      });
    }
  }, []);

  const reset = useCallback(() => {
    setUploadState({
      files: {},
      totalProgress: 0,
      status: 'idle'
    });
  }, []);

  return {
    upload,
    cancelUpload,
    cancelFileUpload,
    reset,
    files: uploadState.files,
    totalProgress: uploadState.totalProgress,
    status: uploadState.status,
  };
} 