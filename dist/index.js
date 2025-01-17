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
        progress: 0,
        status: 'idle',
    });
    const abortControllerRef = react.useRef(null);
    const uploaderRef = react.useRef(null);
    const initializeUploader = react.useCallback(() => {
        if (!uploaderRef.current) {
            const UploaderClass = config.provider === 'aws' ? apexxUploaderCore.AwsCore : apexxUploaderCore.ApexxCloudCore;
            uploaderRef.current = new UploaderClass();
        }
        return uploaderRef.current;
    }, [config.provider]);
    const upload = react.useCallback((file_1, ...args_1) => __awaiter(this, [file_1, ...args_1], void 0, function* (file, options = {}) {
        try {
            const uploader = initializeUploader();
            setUploadState({ progress: 0, status: 'uploading' });
            abortControllerRef.current = new AbortController();
            const method = options.multipart ? 'uploadMultipart' : 'upload';
            const response = yield uploader.files[method](file, config.getSignedUrl, {
                key: options.key,
                partSize: options.partSize,
                concurrency: options.concurrency,
                signal: abortControllerRef.current.signal,
                onProgress: (progressData) => {
                    var _a;
                    setUploadState({
                        progress: progressData.progress,
                        status: 'uploading',
                    });
                    (_a = options.onProgress) === null || _a === void 0 ? void 0 : _a.call(options, progressData);
                },
                onComplete: (response) => {
                    var _a;
                    setUploadState({
                        progress: 100,
                        status: 'completed',
                    });
                    (_a = options.onComplete) === null || _a === void 0 ? void 0 : _a.call(options, response);
                },
                onError: (error) => {
                    var _a;
                    setUploadState({
                        progress: 0,
                        status: 'error',
                        error: error.error || error,
                    });
                    (_a = options.onError) === null || _a === void 0 ? void 0 : _a.call(options, error.error || error);
                },
                onStart: () => {
                    var _a;
                    (_a = options.onStart) === null || _a === void 0 ? void 0 : _a.call(options, file);
                },
            });
            return response;
        }
        catch (error) {
            setUploadState({
                progress: 0,
                status: 'error',
                error: error,
            });
            throw error;
        }
    }), [config, initializeUploader]);
    const cancelUpload = react.useCallback(() => {
        var _a;
        (_a = abortControllerRef.current) === null || _a === void 0 ? void 0 : _a.abort();
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

exports.useUploader = useUploader;
//# sourceMappingURL=index.js.map
