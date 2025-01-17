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
export declare function useUploader(config: UploaderConfig): {
    upload: (file: File, options?: UploadOptions) => Promise<any>;
    cancelUpload: () => void;
    progress: number;
    status: "idle" | "uploading" | "completed" | "error";
    error: Error | undefined;
};
