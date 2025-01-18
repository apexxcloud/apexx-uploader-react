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
export declare function useUploaderMultiFile(config: UploaderConfig): {
    upload: (files: File[], options?: UploadOptions) => Promise<{
        [k: string]: any;
    } | undefined>;
    cancelUpload: (fileId?: string) => void;
    cancelFileUpload: (fileName: string) => void;
    reset: () => void;
    files: Record<string, FileUploadState>;
    totalProgress: number;
    status: "idle" | "uploading" | "completed" | "error";
};
