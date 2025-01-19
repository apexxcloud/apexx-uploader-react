# Apexx Uploader React Hooks

React hooks for file uploads to AWS S3, Cloudflare R2, and Apexx Cloud with progress tracking and cancellation support. [Live demo](https://uploader.apexxcloud.com)

## Installation

```bash
npm install apexx-uploader-react
```

## React Hooks API

### useUploader

The main hook for handling file uploads with progress tracking and cancellation.

```typescript
const {
  upload,           // Function to start the upload
  cancelUpload,     // Function to cancel all uploads
  cancelFileUpload, // Function to cancel a specific file
  files,           // Current state of all files
  totalProgress,   // Overall upload progress (0-100)
  status          // Current upload status
} = useUploader({
  provider: "aws", // or "apexx"
  getSignedUrl: async (operation, params) => {
    // Your implementation to get signed URL
    return signedUrl;
  }
});
```

### Uploader Config

```typescript
interface UploaderConfig {
  provider: 'aws' | 'apexx';
  getSignedUrl: (operation: string, params: Record<string, any>) => Promise<string>;
}
```

### Upload Function

The `upload` function is the primary method for initiating file uploads. It returns a Promise that resolves with an object containing the responses for all successfully uploaded files.

```typescript
const responses = await upload(files, options);
// responses: Record<string, any> - Keys are file names, values are upload responses
```

#### Parameters

1. `files: File[]` - An array of File objects to upload
2. `options: UploadOptions` (optional) - Configuration options for the upload

#### Return Value

Returns a Promise that resolves with an object containing the responses for successfully uploaded files. The object's keys are file names and values are the upload responses.

```typescript
{
  "file1.jpg": { url: "https://...", key: "..." },
  "file2.png": { url: "https://...", key: "..." }
}
```

Failed uploads are excluded from the response object.

#### Upload Options

```typescript
interface UploadOptions {
  // Upload configuration
  key?: string;                    // Custom key for the uploaded file
  multipart?: boolean;             // Enable multipart upload (default: true for files > 5MB)
  partSize?: number;               // Size of each part in bytes (default: 5MB)
  concurrency?: number;            // Number of concurrent uploads (default: 3)
  
  // Callbacks
  onProgress?: (progress: number, file: File) => void;    // Progress updates
  onComplete?: (response: any, file: File) => void;       // Upload completion
  onError?: (error: Error, file: File) => void;           // Upload error
  onStart?: (file: File) => void;                         // Upload start
}


```

## Server-Side Implementation

### AWS S3 or S3-compatible Storage

```typescript
const aws = require("aws-sdk");

let s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  signatureVersion: "v4",
  region: "ap-south-1",
});

const getPresignedUrl = async (req, res) => {
  try {
    const { operation = "putObject" } = req.body;
    const { params } = req.body;
  
    const url = await s3.getSignedUrlPromise(operation, {
      ...params,
      Bucket: "your-bucket-name",
    });

    res.status(200).json({
      url,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: error.message,
    });
  }
};
```

### Apexx Cloud Storage

```typescript
const ApexxCloud = require("@apexxcloud/sdk-node");

const storage = new ApexxCloud({
  accessKey: process.env.APEXXCLOUD_ACCESS_KEY,
  secretKey: process.env.APEXXCLOUD_SECRET_KEY,
  region: process.env.APEXXCLOUD_REGION,
  bucket: process.env.APEXXCLOUD_BUCKET,
});

const getSignedUrl = async (req, res) => {
  try {
    const { operation } = req.body;
    const { params } = req.body; // Contains key, mimeType, totalParts, etc.

    const signedUrl = await storage.files.getSignedUrl(
      operation,
      {
        ...params,
      }
    );

    res.send({
      url: signedUrl,
    });
  } catch (error) {
    res.status(500).send({
      error: error.message,
    });
  }
};
```

These server-side implementations provide the necessary endpoints for generating signed URLs that the uploader will use. The client will call these endpoints through the `getSignedUrl` configuration option.


### Cancellation Functions

The uploader provides two methods for cancelling uploads: `cancelUpload` and `cancelFileUpload`.

#### cancelUpload

Cancels all ongoing uploads or a specific file upload.

```typescript
// Cancel all uploads
cancelUpload();

// Cancel specific file
cancelUpload("file1.jpg");
```

When called:
- Without arguments: Cancels all ongoing uploads and resets the upload state
- With a fileId: Cancels the specific file upload and resets its state to idle

#### cancelFileUpload

Cancels the upload for a specific file and marks it as errored.

```typescript
cancelFileUpload("file1.jpg");
```

Effects:
- Cancels the specific file upload
- Sets the file status to 'error'
- Updates the total progress
- Sets an error message indicating the upload was cancelled

### State Management

#### files

A record of all files and their current upload states.

```typescript
const { files } = useUploader(config);

// Example structure:
{
  "image.jpg": {
    fileId: "image.jpg",
    fileName: "image.jpg",
    progress: 45,
    status: "uploading",
    error: undefined,
    response: undefined
  },
  "document.pdf": {
    fileId: "document.pdf",
    fileName: "document.pdf",
    progress: 100,
    status: "completed",
    error: undefined,
    response: { url: "https://..." }
  }
}
```

The file state includes:
- `fileId`: Unique identifier for the file
- `fileName`: Original name of the file
- `progress`: Upload progress (0-100)
- `status`: Current status ('idle' | 'uploading' | 'completed' | 'error')
- `error`: Error object if upload failed
- `response`: Upload response data if completed

#### totalProgress

Overall progress of all active uploads, from 0 to 100.

```typescript
const { totalProgress } = useUploader(config);

// Example usage:
<div>Upload Progress: {totalProgress}%</div>
```

The total progress:
- Excludes errored files from calculation
- Returns 0 if no active uploads
- Reaches 100 when all active uploads complete

#### status

Current status of the upload process.

```typescript
const { status } = useUploader(config);

// Possible values:
type Status = 'idle' | 'uploading' | 'completed' | 'error';
```

Status definitions:
- `idle`: No uploads in progress
- `uploading`: At least one file is uploading
- `completed`: All active uploads finished successfully
- `error`: One or more uploads failed

#### reset

Function to clear all upload states and return to initial state.

```typescript
const { reset } = useUploader(config);

// Usage example:
<button onClick={reset}>Clear All</button>
```

Effects:
- Clears all file states
- Sets total progress to 0
- Returns status to 'idle'
- Does not cancel active uploads (use `cancelUpload` for that)



## Prebuilt Components

Looking for ready-to-use components? Check out our [prebuilt components source code](https://github.com/apexxcloud/apexx-uploader-prebuilt) for reference implementations you can copy into your project.

### Available Components

#### UploadButton
A simple button component that handles file selection and upload.

#### UploadDashboard
A full-featured upload dashboard with progress tracking and file management.

These components serve as examples of how to implement common upload UI patterns using the hooks from this library. Feel free to copy and modify them to suit your needs.

# Examples



#### Basic Usage

```typescript
import { useUploader } from "@apexxuploader/react";

function FileUploader() {
  const { upload, files, totalProgress } = useUploader({
    provider: "aws",
    getSignedUrl: async (operation, params) => { // the function will take two parameters
      const response = await fetch("/api/get-signed-url", {
        method: "POST",
        body: JSON.stringify({ operation, params })
      });
      return (await response.json()).url;
    }
  });

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files);
    const final_response = await upload(files, {
      onProgress: (progress, file) => {
        console.log(`${file.name}: ${progress}%`);
      },
      onComplete: (response, file) => {
        console.log(`${file.name} uploaded successfully`);
      }
    });
    
    
    console.log(finaLresponse)
  };

  return (
    <div>
      <input type="file" multiple onChange={handleFiles} />
      <div>Total Progress: {totalProgress}%</div>
    </div>
  );
}
```



#### Advanced Usage

```typescript
function AdvancedUploader() {
  const { upload, cancelFileUpload, files, totalProgress } = useUploader({
    provider: "aws",
    getSignedUrl: getSignedUrl
  });

  const handleUpload = async (files: File[]) => {
    await upload(files, {
      // Enable multipart upload with custom configuration
      multipart: true,
      partSize: 10 * 1024 * 1024, // 10MB chunks
      concurrency: 4,              // 4 concurrent uploads

      // Custom key for the file
      key: (file) => `uploads/${Date.now()}-${file.name}`,

      // Progress tracking
      onProgress: (progress, file) => {
        console.log(`${file.name}: ${progress}%`);
      },

      // Upload completion
      onComplete: (response, file) => {
        console.log(`${file.name} uploaded:`, response);
      },

      // Error handling
      onError: (error, file) => {
        console.error(`${file.name} failed:`, error);
      },

      // Upload start
      onStart: (file) => {
        console.log(`Starting upload: ${file.name}`);
      }
    });
  };

  return (
    <div>
      <input 
        type="file" 
        multiple 
        onChange={(e) => handleUpload(Array.from(e.target.files))} 
      />
      
      {/* Display upload progress */}
      <div>Overall Progress: {totalProgress}%</div>
      
      {/* Individual file status */}
      {Object.entries(files).map(([name, file]) => (
        <div key={name}>
          <div>{name}: {file.progress}%</div>
          <div>Status: {file.status}</div>
          
          {/* Cancel button */}
          {file.status === 'uploading' && (
            <button onClick={() => cancelFileUpload(name)}>
              Cancel
            </button>
          )}
          
          {/* Error display */}
          {file.status === 'error' && (
            <div className="text-red-500">
              Error: {file.error?.message}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

#### Example with Response Handling

```typescript
const handleUpload = async (files: File[]) => {
  try {
    const responses = await upload(files, {
      onProgress: (progress, file) => {
        console.log(`${file.name}: ${progress}%`);
      }
    });

    // Handle successful uploads
    Object.entries(responses).forEach(([fileName, response]) => {
      console.log(`${fileName} uploaded successfully:`, response);
    });
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

#### Example with Cancellation

```typescript
function FileUploader() {
  const { upload, cancelUpload, cancelFileUpload, files } = useUploader({
    provider: "aws",
    getSignedUrl: getSignedUrl
  });

  return (
    <div>
      {/* File input */}
      <input type="file" multiple onChange={handleUpload} />
      
      {/* Cancel all uploads button */}
      <button onClick={() => cancelUpload()}>
        Cancel All Uploads
      </button>
      
      {/* Individual file controls */}
      {Object.entries(files).map(([fileName, file]) => (
        <div key={fileName}>
          <div>{fileName}: {file.progress}%</div>
          {file.status === 'uploading' && (
            <button onClick={() => cancelFileUpload(fileName)}>
              Cancel Upload
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```
#### Example Using State Management

```typescript
function UploaderWithState() {
  const { upload, files, totalProgress, status, reset } = useUploader({
    provider: "aws",
    getSignedUrl: getSignedUrl
  });

  return (
    <div>
      <input type="file" multiple onChange={handleUpload} />
      
      {/* Overall status */}
      <div>Status: {status}</div>
      <div>Total Progress: {totalProgress}%</div>
      
      {/* File list */}
      {Object.entries(files).map(([fileName, file]) => (
        <div key={fileName}>
          <div>{fileName}</div>
          <div>Progress: {file.progress}%</div>
          <div>Status: {file.status}</div>
          {file.error && (
            <div className="error">Error: {file.error.message}</div>
          )}
        </div>
      ))}
      
      {/* Reset button */}
      {status !== 'idle' && (
        <button onClick={reset}>Reset Uploader</button>
      )}
    </div>
  );
}
```


## License

MIT © [Fii](https://twitter.com/CODEFIISTAR)
