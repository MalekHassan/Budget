import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Camera } from 'lucide-react';
import './CameraCapture.css';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((mediaStream) => {
        if (!active) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      })
      .catch(() => {
        setError(isAr ? 'لا يمكن الوصول للكاميرا' : 'Cannot access camera');
      });

    return () => {
      active = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Update video source when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleClose = () => {
    stream?.getTracks().forEach((t) => t.stop());
    onClose();
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `receipt_${Date.now()}.jpg`, { type: 'image/jpeg' });
          stream?.getTracks().forEach((t) => t.stop());
          onCapture(file);
        }
      },
      'image/jpeg',
      0.9
    );
  };

  return (
    <div className="camera-overlay">
      <div className="camera-modal">
        <button className="camera-close" onClick={handleClose}>
          <X size={24} />
        </button>

        {error ? (
          <div className="camera-error">
            <p>{error}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-video"
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <button className="camera-shutter" onClick={takePhoto}>
              <Camera size={28} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
