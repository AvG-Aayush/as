import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ProfilePictureUploadProps {
  currentImage?: string | null;
  userId: number;
  onSuccess?: (imageUrl: string) => void;
}

export function ProfilePictureUpload({ currentImage, userId, onSuccess }: ProfilePictureUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateProfilePictureMutation = useMutation({
    mutationFn: async (profilePicture: string) => {
      const response = await apiRequest("PUT", "/api/profile/picture", { profilePicture });
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: "Profile picture updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${userId}`] });
      setIsOpen(false);
      setCapturedImage(null);
      stopCamera();
      if (onSuccess && data?.user?.profilePicture) {
        onSuccess(data.user.profilePicture);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update profile picture. Please try again.",
        variant: "destructive",
      });
      console.error("Profile picture update error:", error);
    },
  });

  const startCamera = useCallback(async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
      setIsCapturing(false);
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext("2d");
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedImage(imageDataUrl);
        stopCamera();
      }
    }
  }, [stopCamera]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCapturedImage(result);
      };
      reader.readAsDataURL(file);
    }
  }, [toast]);

  const handleSave = useCallback(() => {
    if (capturedImage) {
      updateProfilePictureMutation.mutate(capturedImage);
    }
  }, [capturedImage, updateProfilePictureMutation]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setCapturedImage(null);
    stopCamera();
  }, [stopCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          <Camera className="h-4 w-4" />
          <span>Update Photo</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Profile Picture</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Image Display */}
          {currentImage && !capturedImage && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Current Photo</p>
              <img
                src={currentImage}
                alt="Current profile"
                className="w-32 h-32 rounded-full mx-auto object-cover border-2 border-border"
              />
            </div>
          )}

          {/* Camera View */}
          {isCapturing && (
            <div className="space-y-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg border"
                style={{ transform: "scaleX(-1)" }} // Mirror effect
              />
              <div className="flex justify-center space-x-2">
                <Button onClick={capturePhoto} size="sm">
                  <Camera className="h-4 w-4 mr-2" />
                  Capture Photo
                </Button>
                <Button onClick={stopCamera} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Captured Image Preview */}
          {capturedImage && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">New Photo Preview</p>
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-32 h-32 rounded-full mx-auto object-cover border-2 border-border"
                />
              </div>
              <div className="flex justify-center space-x-2">
                <Button 
                  onClick={handleSave} 
                  size="sm"
                  disabled={updateProfilePictureMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {updateProfilePictureMutation.isPending ? "Saving..." : "Save Photo"}
                </Button>
                <Button 
                  onClick={() => setCapturedImage(null)} 
                  variant="outline" 
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Retake
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!isCapturing && !capturedImage && (
            <div className="space-y-2">
              <Button
                onClick={startCamera}
                className="w-full"
                variant="default"
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo with Camera
              </Button>
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload from Device
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}
        </div>
        
        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}