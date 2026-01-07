import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Webcam from 'react-webcam';
import { useEmotionDetection } from '@/hooks/useEmotionDetection';
import { useHandTracking } from '@/hooks/useHandTracking';
import DrawingCanvas from '@/components/DrawingCanvas';
import StatusPanel from '@/components/StatusPanel';
import WebcamFeed from '@/components/WebcamFeed';
import LoadingScreen from '@/components/LoadingScreen';
import Instructions from '@/components/Instructions';

const Index: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Update video ref when webcam is ready
  useEffect(() => {
    const checkWebcam = setInterval(() => {
      if (webcamRef.current?.video) {
        videoRef.current = webcamRef.current.video;
      }
    }, 100);
    return () => clearInterval(checkWebcam);
  }, []);

  const {
    isLoading: emotionLoading,
    modelsLoaded,
    currentEmotion,
    emotionColor,
    startDetection,
    stopDetection,
  } = useEmotionDetection(videoRef);

  const {
    handData,
    startTracking,
    stopTracking,
  } = useHandTracking(videoRef, canvasRef);

  // Start tracking when video is ready
  useEffect(() => {
    const checkVideoReady = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 3 && modelsLoaded) {
        setIsReady(true);
        startDetection();
        startTracking();
      }
    };

    const interval = setInterval(checkVideoReady, 100);
    
    return () => {
      clearInterval(interval);
      stopDetection();
      stopTracking();
    };
  }, [modelsLoaded, startDetection, stopDetection, startTracking, stopTracking]);

  const brushSize = Math.max(4, 40 * (1 - handData.depth));

  if (emotionLoading && !modelsLoaded) {
    return <LoadingScreen message="Loading AI models..." />;
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated background gradient based on emotion */}
      <motion.div
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          background: `radial-gradient(ellipse at 30% 30%, ${emotionColor}40 0%, transparent 50%),
                       radial-gradient(ellipse at 70% 70%, ${emotionColor}20 0%, transparent 50%)`,
        }}
        animate={{
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      {/* Header */}
      <header className="relative z-10 px-6 py-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${emotionColor}, hsl(var(--accent)))`,
                boxShadow: `0 0 20px ${emotionColor}60`,
              }}
              animate={{
                boxShadow: [
                  `0 0 20px ${emotionColor}60`,
                  `0 0 30px ${emotionColor}80`,
                  `0 0 20px ${emotionColor}60`,
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-lg">🎨</span>
            </motion.div>
            <div>
              <h1 className="text-xl font-['Orbitron'] font-bold text-foreground">
                Canvas Control
              </h1>
              <p className="text-xs text-muted-foreground">
                AI-Powered Creative Drawing
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500'}`}
              style={{
                boxShadow: isReady 
                  ? '0 0 10px hsl(120, 60%, 50%)' 
                  : '0 0 10px hsl(45, 100%, 50%)',
              }}
            />
            <span className="text-sm text-muted-foreground">
              {isReady ? 'Ready' : 'Initializing...'}
            </span>
          </div>
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-6 pb-6 h-[calc(100vh-80px)]">
        <div className="h-full grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Webcam & Instructions */}
          <div className="lg:col-span-1 space-y-6">
            <WebcamFeed ref={webcamRef} emotionColor={emotionColor} />
            <Instructions />
          </div>

          {/* Center - Drawing Canvas */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 neon-border rounded-2xl overflow-hidden"
            style={{
              boxShadow: `0 0 40px ${emotionColor}30`,
            }}
          >
            <DrawingCanvas
              brushColor={emotionColor}
              brushSize={brushSize}
              indexFinger={handData.indexFinger}
              isDrawing={handData.isDrawing}
            />
          </motion.div>

          {/* Right Panel - Status */}
          <div className="lg:col-span-1">
            <StatusPanel
              emotion={currentEmotion.emotion}
              confidence={currentEmotion.confidence}
              emotionColor={emotionColor}
              depth={handData.depth}
              isDrawing={handData.isDrawing}
              isTracking={!!handData.indexFinger}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
