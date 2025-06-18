import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileText, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface FileUploadProps {
  fileType: 'profile_picture' | 'portfolio' | 'document' | 'receipt' | 'certificate';
  accept?: string;
  maxSize?: number; // in MB
  onUploadSuccess?: (file: any) => void;
  className?: string;
}

export function FileUpload({ 
  fileType, 
  accept = "*/*", 
  maxSize = 10, 
  onUploadSuccess,
  className 
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const getAcceptedTypes = () => {
    switch (fileType) {
      case 'profile_picture':
        return 'image/jpeg,image/jpg,image/png,image/webp';
      case 'portfolio':
        return 'application/pdf,image/jpeg,image/jpg,image/png';
      case 'document':
        return 'application/pdf,.doc,.docx';
      case 'receipt':
        return 'image/jpeg,image/jpg,image/png,application/pdf';
      case 'certificate':
        return 'application/pdf,image/jpeg,image/jpg,image/png';
      default:
        return accept;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `File size must be less than ${maxSize}MB`,
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('fileType', fileType);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      toast({
        title: "Upload successful",
        description: `${selectedFile.name} has been uploaded successfully`,
      });

      onUploadSuccess?.(result.file);
      setSelectedFile(null);
      
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const getFileIcon = () => {
    if (fileType === 'profile_picture' || selectedFile?.type.startsWith('image/')) {
      return <Image className="h-8 w-8 text-blue-500" />;
    }
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  const getFileTypeLabel = () => {
    switch (fileType) {
      case 'profile_picture':
        return 'Profile Picture';
      case 'portfolio':
        return 'Portfolio';
      case 'document':
        return 'Document';
      case 'receipt':
        return 'Receipt';
      case 'certificate':
        return 'Certificate';
      default:
        return 'File';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload {getFileTypeLabel()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedFile ? (
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6">
            <div className="text-center">
              {getFileIcon()}
              <div className="mt-4">
                <label htmlFor={`file-${fileType}`} className="cursor-pointer">
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
                    Click to upload
                  </span>
                  <span className="text-sm text-gray-500 ml-1">
                    or drag and drop
                  </span>
                </label>
                <Input
                  id={`file-${fileType}`}
                  type="file"
                  accept={getAcceptedTypes()}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Max file size: {maxSize}MB
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              {getFileIcon()}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-center text-gray-500">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1"
              >
                {uploading ? "Uploading..." : "Upload File"}
              </Button>
              {!uploading && (
                <Button variant="outline" onClick={removeFile}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}