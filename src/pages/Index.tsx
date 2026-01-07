import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceModelReady, setFaceModelReady] = useState(false);
  const [handModelReady, setHandModelReady] = useState(false);
  
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

  // Initialize camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const initCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false,
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
          setCameraError(null);
          console.log('Camera initialized successfully');
        }
      } catch (error) {
        console.error('Camera error:', error);
        setCameraError('Camera access denied or unavailable. Please allow camera access.');
      }
    };

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Face detection and emotion recognition
  useEffect(() => {
    if (!cameraReady || !videoRef.current) return;
    
    let animationId: number;
    let faceApiLoaded = false;
    let faceapi: typeof import('face-api.js');

    const loadFaceApi = async () => {
      try {
        faceapi = await import('face-api.js');
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        
        faceApiLoaded = true;
        setFaceModelReady(true);
        console.log('Face-api models loaded');
        detectFaces();
      } catch (error) {
        console.error('Face-api loading error:', error);
      }
    };

    const detectFaces = async () => {
      if (!faceApiLoaded || !videoRef.current || videoRef.current.paused) {
        animationId = requestAnimationFrame(detectFaces);
        return;
      }

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.5,
          }))
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
        // Silently handle detection errors
      }

      animationId = requestAnimationFrame(detectFaces);
    };

    loadFaceApi();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [cameraReady]);

  // Hand tracking using MediaPipe Tasks Vision
  useEffect(() => {
    if (!cameraReady || !videoRef.current) return;

    let handLandmarker: any = null;
    let animationId: number;
    let lastVideoTime = -1;

    const initHandTracking = async () => {
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const { HandLandmarker, FilesetResolver } = vision;

        const wasmFileset = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        handLandmarker = await HandLandmarker.createFromOptions(wasmFileset, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        setHandModelReady(true);
        console.log('Hand landmarker ready');
        detectHands();
      } catch (error) {
        console.error('Hand tracking init error:', error);
      }
    };

    const detectHands = () => {
      if (!handLandmarker || !videoRef.current) {
        animationId = requestAnimationFrame(detectHands);
        return;
      }

      const video = videoRef.current;
      
      if (video.currentTime !== lastVideoTime && video.readyState >= 2) {
        lastVideoTime = video.currentTime;
        
        try {
          const results = handLandmarker.detectForVideo(video, performance.now());
          
          if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            
            // Index finger tip is landmark 8, thumb tip is landmark 4
            const indexTip = landmarks[8];
            const thumbTip = landmarks[4];
            const indexMcp = landmarks[5]; // For depth reference
            
            // Calculate pinch distance
            const pinchDistance = Math.sqrt(
              Math.pow(indexTip.x - thumbTip.x, 2) +
              Math.pow(indexTip.y - thumbTip.y, 2)
            );
            
            // Calculate depth based on hand size (distance between landmarks)
            const handSize = Math.sqrt(
              Math.pow(indexTip.x - indexMcp.x, 2) +
              Math.pow(indexTip.y - indexMcp.y, 2)
            );
            
            // Normalize depth - larger hand = closer = smaller depth value
            const depth = Math.max(0, Math.min(1, 1 - (handSize * 3)));
            
            setHandData({
              indexFinger: { 
                x: indexTip.x, 
                y: indexTip.y, 
                z: indexTip.z || 0 
              },
              isDrawing: pinchDistance < 0.07,
              depth,
            });

            // Draw hand landmarks overlay
            drawHandOverlay(landmarks);
          } else {
            setHandData(prev => ({ ...prev, indexFinger: null, isDrawing: false }));
            clearOverlay();
          }
        } catch (error) {
          // Silently handle detection errors
        }
      }

      animationId = requestAnimationFrame(detectHands);
    };

    const drawHandOverlay = (landmarks: any[]) => {
      const canvas = canvasOverlayRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw landmarks
      landmarks.forEach((point, index) => {
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, index === 8 ? 8 : 4, 0, 2 * Math.PI);
        ctx.fillStyle = index === 8 ? emotionColor : 'rgba(255,255,255,0.7)';
        ctx.fill();
        
        if (index === 8) {
          ctx.strokeStyle = emotionColor;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // Draw connections
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8], // Index
        [0, 9], [9, 10], [10, 11], [11, 12], // Middle
        [0, 13], [13, 14], [14, 15], [15, 16], // Ring
        [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
        [5, 9], [9, 13], [13, 17], // Palm
      ];

      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      
      connections.forEach(([i, j]) => {
        ctx.beginPath();
        ctx.moveTo(landmarks[i].x * canvas.width, landmarks[i].y * canvas.height);
        ctx.lineTo(landmarks[j].x * canvas.width, landmarks[j].y * canvas.height);
        ctx.stroke();
      });
    };

    const clearOverlay = () => {
      const canvas = canvasOverlayRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    initHandTracking();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (handLandmarker) handLandmarker.close();
    };
  }, [cameraReady, emotionColor]);

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
            <StatusIndicator ready={cameraReady} label="Camera" />
            <StatusIndicator ready={faceModelReady} label="Face AI" />
            <StatusIndicator ready={handModelReady} label="Hands" />
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
              className="relative overflow-hidden rounded-2xl aspect-video"
              style={{ boxShadow: `0 0 30px ${emotionColor}40` }}
            >
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none z-20"
                style={{ border: `2px solid ${emotionColor}` }}
              />
              
              {cameraError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-card p-4">
                  <p className="text-sm text-destructive text-center">{cameraError}</p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover rounded-2xl scale-x-[-1]"
                  />
                  <canvas
                    ref={canvasOverlayRef}
                    className="absolute inset-0 w-full h-full rounded-2xl scale-x-[-1] pointer-events-none z-10"
                  />
                </>
              )}
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

// Status indicator component
const StatusIndicator: React.FC<{ ready: boolean; label: string }> = ({ ready, label }) => (
  <div className="flex items-center gap-2">
    <div 
      className={`w-2 h-2 rounded-full transition-all ${
        ready ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
      }`}
      style={{
        boxShadow: ready ? '0 0 8px hsl(120, 60%, 50%)' : undefined,
      }}
    />
    <span className="text-muted-foreground">{label}</span>
  </div>
);

export default Index;
