'use strict';

var react = require('react');
var apexxUploaderCore = require('apexx-uploader-core');

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

function useUploader(config) {
    const [uploadState, setUploadState] = react.useState({
        files: {},
        totalProgress: 0,
        status: 'idle',
    });
    const abortControllersRef = react.useRef({});
    const uploaderRef = react.useRef(null);
    const initializeUploader = react.useCallback(() => {
        if (!uploaderRef.current) {
            const UploaderClass = config.provider === 'aws' ? apexxUploaderCore.AwsCore : apexxUploaderCore.ApexxCloudCore;
            uploaderRef.current = new UploaderClass();
        }
        return uploaderRef.current;
    }, [config.provider]);
    const upload = react.useCallback((files_1, ...args_1) => __awaiter(this, [files_1, ...args_1], void 0, function* (files, options = {}) {
        const uploader = initializeUploader();
        const fileResponses = {};
        const errorFiles = {};
        setUploadState(prev => ({
            files: files.reduce((acc, file) => (Object.assign(Object.assign({}, acc), { [file.name]: {
                    fileId: file.name,
                    fileName: file.name,
                    progress: 0,
                    status: 'idle',
                    response: null
                } })), {}),
            totalProgress: 0,
            status: 'uploading'
        }));
        try {
            const uploadPromises = files.map((file) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                abortControllersRef.current[file.name] = new AbortController();
                const method = options.multipart ? 'uploadMultipart' : 'upload';
                try {
                    const response = yield uploader.files[method](file, config.getSignedUrl, Object.assign(Object.assign({}, options), { signal: abortControllersRef.current[file.name].signal, onProgress: (progressData) => {
                            var _a;
                            setUploadState(prev => {
                                const updatedFiles = Object.assign(Object.assign({}, prev.files), { [file.name]: Object.assign(Object.assign({}, prev.files[file.name]), { progress: progressData.progress, status: 'uploading' }) });
                                const totalProgress = calculateTotalProgress(updatedFiles);
                                return {
                                    files: updatedFiles,
                                    totalProgress,
                                    status: 'uploading'
                                };
                            });
                            (_a = options.onProgress) === null || _a === void 0 ? void 0 : _a.call(options, Object.assign(Object.assign({}, progressData), { fileName: file.name, fileId: file.name }), file);
                        }, onComplete: (response) => {
                            var _a;
                            fileResponses[file.name] = response;
                            setUploadState(prev => {
                                const updatedFiles = Object.assign(Object.assign({}, prev.files), { [file.name]: Object.assign(Object.assign({}, prev.files[file.name]), { progress: 100, status: 'completed', response }) });
                                const activeFiles = Object.values(updatedFiles)
                                    .filter(file => file.status !== 'error');
                                const allCompleted = activeFiles.length > 0 &&
                                    activeFiles.every(file => file.status === 'completed');
                                const totalProgress = calculateTotalProgress(updatedFiles);
                                return {
                                    files: updatedFiles,
                                    totalProgress,
                                    status: allCompleted ? 'completed' : 'uploading'
                                };
                            });
                            (_a = options.onComplete) === null || _a === void 0 ? void 0 : _a.call(options, Object.assign(Object.assign({}, response), { fileName: file.name, fileId: file.name }), file);
                        }, onError: (error) => {
                            var _a;
                            setUploadState(prev => {
                                const updatedFiles = Object.assign(Object.assign({}, prev.files), { [file.name]: Object.assign(Object.assign({}, prev.files[file.name]), { status: 'error', error: error.error || error }) });
                                errorFiles[file.name] = error.error || error;
                                const hasInProgressFiles = Object.values(updatedFiles)
                                    .some(file => file.status === 'uploading');
                                const totalProgress = calculateTotalProgress(updatedFiles);
                                return {
                                    files: updatedFiles,
                                    totalProgress,
                                    status: hasInProgressFiles ? 'uploading' : 'error'
                                };
                            });
                            (_a = options.onError) === null || _a === void 0 ? void 0 : _a.call(options, error.error || error, file);
                        }, onStart: () => {
                            var _a;
                            (_a = options.onStart) === null || _a === void 0 ? void 0 : _a.call(options, file);
                        } }));
                    fileResponses[file.name] = response;
                    return response;
                }
                catch (error) {
                    const errorObj = error instanceof Error ? error : new Error('Upload failed');
                    setUploadState(prev => (Object.assign(Object.assign({}, prev), { files: Object.assign(Object.assign({}, prev.files), { [file.name]: Object.assign(Object.assign({}, prev.files[file.name]), { status: 'error', error: errorObj }) }) })));
                    (_a = options.onError) === null || _a === void 0 ? void 0 : _a.call(options, errorObj, file);
                    if (error instanceof Error && error.name === 'AbortError') {
                        return fileResponses[file.name] || null;
                    }
                    return null;
                }
            }));
            yield Promise.allSettled(uploadPromises);
            const successfulResponses = Object.fromEntries(Object.entries(fileResponses).filter(([_, response]) => response != null));
            return successfulResponses;
        }
        catch (error) {
            setUploadState(prev => (Object.assign(Object.assign({}, prev), { status: 'error' })));
        }
    }), [config, initializeUploader]);
    const calculateTotalProgress = (files) => {
        const activeFiles = Object.values(files).filter(file => file.status !== 'error' && file.status !== 'idle');
        if (activeFiles.length === 0)
            return 0;
        const totalProgress = activeFiles.reduce((sum, file) => {
            return sum + (file.status === 'completed' ? 100 : file.progress);
        }, 0);
        return totalProgress / activeFiles.length;
    };
    const cancelUpload = react.useCallback((fileId) => {
        var _a;
        if (fileId) {
            (_a = abortControllersRef.current[fileId]) === null || _a === void 0 ? void 0 : _a.abort();
            setUploadState(prev => (Object.assign(Object.assign({}, prev), { files: Object.assign(Object.assign({}, prev.files), { [fileId]: Object.assign(Object.assign({}, prev.files[fileId]), { progress: 0, status: 'idle' }) }) })));
        }
        else {
            Object.values(abortControllersRef.current).forEach(controller => controller.abort());
            setUploadState({
                files: {},
                totalProgress: 0,
                status: 'idle'
            });
        }
    }, []);
    const cancelFileUpload = react.useCallback((fileName) => {
        const controller = abortControllersRef.current[fileName];
        if (controller) {
            controller.abort();
            delete abortControllersRef.current[fileName];
            setUploadState(prev => {
                const updatedFiles = Object.assign(Object.assign({}, prev.files), { [fileName]: Object.assign(Object.assign({}, prev.files[fileName]), { progress: 0, status: 'error', error: new Error('Upload cancelled') }) });
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
    const reset = react.useCallback(() => {
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

exports.useUploader = useUploader;
//# sourceMappingURL=index.js.map
