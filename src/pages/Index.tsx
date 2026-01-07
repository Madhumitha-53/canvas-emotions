import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Webcam from 'react-webcam';
import DrawingCanvas from '@/components/DrawingCanvas';
import StatusPanel from '@/components/StatusPanel';
import Instructions from '@/components/Instructions';
import type { Emotion } from '@/hooks/useEmotionDetection';

const EMOTION_COLORS: Record<Emotion, string> = {
  happy: 'hsl(45, 100%, 55%)',
  sad: 'hsl(210, 80%, 50%)',
  angry: 'hsl(0, 85%, 55%)',
  surprised: 'hsl(280, 100%, 65%)',
  fearful: 'hsl(270, 60%, 45%)',
  disgusted: 'hsl(120, 50%, 35%)',
  neutral: 'hsl(180, 100%, 50%)',
};

const Index: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [isReady, setIsReady] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<{ emotion: Emotion; confidence: number }>({
    emotion: 'neutral',
    confidence: 0,
  });
  const [handData, setHandData] = useState({
    indexFinger: null as { x: number; y: number; z: number } | null,
    isDrawing: false,
    depth: 0.5,
  });

  const emotionColor = EMOTION_COLORS[currentEmotion.emotion];
  const brushSize = Math.max(4, 40 * (1 - handData.depth));

  // Load face-api models lazily
  useEffect(() => {
    let mounted = true;
    
    const loadFaceModels = async () => {
      try {
        const faceapi = await import('face-api.js');
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        
        if (mounted) {
          setModelsLoaded(true);
          console.log('Face models loaded');
        }
      } catch (error) {
        console.error('Error loading face-api models:', error);
      }
    };

    loadFaceModels();
    return () => { mounted = false; };
  }, []);

  // Emotion detection interval
  useEffect(() => {
    if (!modelsLoaded) return;
    
    let interval: number;
    
    const detectEmotion = async () => {
      const video = webcamRef.current?.video;
      if (!video || video.readyState !== 4) return;

      try {
        const faceapi = await import('face-api.js');
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions();

        if (detection?.expressions) {
          const sortedEmotions = Object.entries(detection.expressions)
            .sort(([, a], [, b]) => b - a);
          
          const [topEmotion, topConfidence] = sortedEmotions[0];
          setCurrentEmotion({
            emotion: topEmotion as Emotion,
            confidence: topConfidence,
          });
        }
      } catch (error) {
        console.error('Emotion detection error:', error);
      }
    };

    interval = window.setInterval(detectEmotion, 300);
    return () => clearInterval(interval);
  }, [modelsLoaded]);

  // Hand tracking with MediaPipe
  useEffect(() => {
    let hands: any = null;
    let camera: any = null;
    let mounted = true;

    const initHandTracking = async () => {
      const video = webcamRef.current?.video;
      if (!video) return;

      try {
        const { Hands } = await import('@mediapipe/hands');
        const { Camera } = await import('@mediapipe/camera_utils');

        hands = new Hands({
          locateFile: (file: string) => 
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0, // Use fastest model
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results: any) => {
          if (!mounted) return;
          
          if (results.multiHandLandmarks?.[0]) {
            const landmarks = results.multiHandLandmarks[0];
            const indexTip = landmarks[8];
            const thumbTip = landmarks[4];
            
            const pinchDistance = Math.sqrt(
              Math.pow(indexTip.x - thumbTip.x, 2) +
              Math.pow(indexTip.y - thumbTip.y, 2)
            );
            
            setHandData({
              indexFinger: { x: indexTip.x, y: indexTip.y, z: indexTip.z },
              isDrawing: pinchDistance < 0.06,
              depth: Math.max(0, Math.min(1, (indexTip.z + 0.1) * 5)),
            });
          } else {
            setHandData(prev => ({ ...prev, indexFinger: null, isDrawing: false }));
          }
        });

        camera = new Camera(video, {
          onFrame: async () => {
            if (hands && video.readyState === 4) {
              await hands.send({ image: video });
            }
          },
          width: 640,
          height: 480,
        });

        await camera.start();
        if (mounted) {
          setIsReady(true);
          console.log('Hand tracking started');
        }
      } catch (error) {
        console.error('Hand tracking error:', error);
      }
    };

    // Wait for video to be ready
    const checkVideo = setInterval(() => {
      if (webcamRef.current?.video?.readyState === 4) {
        clearInterval(checkVideo);
        initHandTracking();
      }
    }, 100);

    return () => {
      mounted = false;
      clearInterval(checkVideo);
      camera?.stop();
      hands?.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated background */}
      <motion.div
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          background: `radial-gradient(ellipse at 30% 30%, ${emotionColor}40 0%, transparent 50%),
                       radial-gradient(ellipse at 70% 70%, ${emotionColor}20 0%, transparent 50%)`,
        }}
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
            >
              <span className="text-lg">🎨</span>
            </motion.div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">
                Canvas Control
              </h1>
              <p className="text-xs text-muted-foreground">
                AI-Powered Creative Drawing
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${modelsLoaded ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
              <span className="text-muted-foreground">
                {modelsLoaded ? 'Face AI Ready' : 'Loading Face AI...'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
              <span className="text-muted-foreground">
                {isReady ? 'Hands Ready' : 'Loading Hands...'}
              </span>
            </div>
          </div>
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-6 pb-6 h-[calc(100vh-80px)]">
        <div className="h-full grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Webcam & Instructions */}
          <div className="lg:col-span-1 space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-2xl"
              style={{ boxShadow: `0 0 30px ${emotionColor}40` }}
            >
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none z-10"
                style={{ border: `2px solid ${emotionColor}` }}
              />
              <Webcam
                ref={webcamRef}
                audio={false}
                mirrored
                className="w-full aspect-video object-cover rounded-2xl"
                videoConstraints={{
                  width: 640,
                  height: 480,
                  facingMode: 'user',
                }}
              />
            </motion.div>
            <Instructions />
          </div>

          {/* Center - Drawing Canvas */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 neon-border rounded-2xl overflow-hidden"
            style={{ boxShadow: `0 0 40px ${emotionColor}30` }}
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
