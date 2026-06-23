import React, { useState } from 'react';
import { Upload, message, Button, Progress } from 'antd';
import { InboxOutlined, FilePdfOutlined, CheckCircleFilled } from '@ant-design/icons';
import client from '../api/client';

export default function ResumeUpload({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleCustomRequest = async ({ file, onSuccess, onError }) => {
    if (!file.name.endsWith('.pdf')) {
      message.error('Only PDF files are supported.');
      onError('Invalid file format');
      return;
    }

    setFileName(file.name);
    setUploading(true);
    setProgress(10);
    setSuccess(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setProgress(30);
      const response = await client.post('/resume/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(Math.max(30, Math.min(percent, 90)));
        }
      });
      
      setProgress(100);
      setSuccess(true);
      message.success('Resume uploaded and analyzed successfully!');
      onSuccess(response.data);
      if (onUploadSuccess) {
        onUploadSuccess(response.data);
      }
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.detail || 'Failed to upload and analyze resume.';
      message.error(errMsg);
      onError(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl hover:border-violet-500/30 transition-all duration-300">
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-white mb-1">Analyze Your Resume</h3>
        <p className="text-slate-400 text-sm">Upload a PDF to parse your technical skills and find experience gaps.</p>
      </div>

      {!uploading && !success && (
        <Upload.Dragger
          name="file"
          multiple={false}
          customRequest={handleCustomRequest}
          showUploadList={false}
          className="custom-dragger border-dashed border-slate-700 bg-slate-950 hover:bg-slate-900/50 hover:border-violet-500/50 transition-colors p-8 rounded-xl block cursor-pointer"
        >
          <p className="ant-upload-drag-icon text-violet-500 text-4xl mb-3">
            <InboxOutlined />
          </p>
          <p className="text-slate-300 font-semibold text-sm">Click or drag PDF resume here</p>
          <p className="text-slate-500 text-xs mt-1">Supports PDF files up to 5MB</p>
        </Upload.Dragger>
      )}

      {uploading && (
        <div className="flex flex-col items-center justify-center py-6">
          <FilePdfOutlined className="text-slate-400 text-5xl mb-4 animate-bounce" />
          <span className="text-slate-300 text-sm font-medium mb-3">Analyzing '{fileName}'...</span>
          <Progress 
            percent={progress} 
            strokeColor={{
              '0%': '#8b5cf6',
              '100%': '#6366f1',
            }}
            trailColor="#1e293b"
            showInfo={false}
            className="w-full max-w-xs"
          />
          <span className="text-slate-400 text-xs mt-2">AI agents are identifying skill matches...</span>
        </div>
      )}

      {success && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CheckCircleFilled className="text-emerald-500 text-5xl mb-4" />
          <span className="text-emerald-400 text-sm font-semibold mb-1">Resume Uploaded!</span>
          <span className="text-slate-400 text-xs max-w-xs mb-4">Parsed: '{fileName}'</span>
          <Button 
            type="link" 
            onClick={() => setSuccess(false)}
            className="text-violet-400 hover:text-violet-300 p-0 text-xs"
          >
            Upload a different resume
          </Button>
        </div>
      )}
    </div>
  );
}
