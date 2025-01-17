export type Provider = 'aws' | 'apexx';
export interface UploaderConfig {
    provider: Provider;
    url: string;
    getSignedUrl: (operation: string, params: Record<string, any>) => Promise<string>;
}
export interface UploadOptions {
    key?: string;
    maxSize?: number;
    acceptedFileTypes?: string[];
    multipart?: boolean;
    partSize?: number;
    concurrency?: number;
    onProgress?: (progress: ProgressEvent) => void;
    onComplete?: (response: any) => void;
    onError?: (error: Error) => void;
    onStart?: (file: File) => void;
}
export declare function useUploader(config: UploaderConfig): {
    upload: (file: File, options?: UploadOptions) => Promise<any>;
    cancelUpload: () => void;
    progress: number;
    status: "idle" | "uploading" | "completed" | "error";
    error: Error | undefined;
};
