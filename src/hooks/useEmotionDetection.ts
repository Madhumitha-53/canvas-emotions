import { useCallback, useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

export type Emotion = 'happy' | 'sad' | 'angry' | 'surprised' | 'fearful' | 'disgusted' | 'neutral';

interface EmotionDetectionResult {
  emotion: Emotion;
  confidence: number;
}

const EMOTION_COLORS: Record<Emotion, string> = {
  happy: 'hsl(45, 100%, 55%)',
  sad: 'hsl(210, 80%, 50%)',
  angry: 'hsl(0, 85%, 55%)',
  surprised: 'hsl(280, 100%, 65%)',
  fearful: 'hsl(270, 60%, 45%)',
  disgusted: 'hsl(120, 50%, 35%)',
  neutral: 'hsl(220, 15%, 40%)',
};

export const useEmotionDetection = (videoRef: React.RefObject<HTMLVideoElement>) => {
  const [isLoading, setIsLoading] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionDetectionResult>({
    emotion: 'neutral',
    confidence: 0,
  });
  const [emotionColor, setEmotionColor] = useState(EMOTION_COLORS.neutral);
  const intervalRef = useRef<number | null>(null);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
      
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading face-api models:', error);
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  const detectEmotion = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded) return;

    const video = videoRef.current;
    
    if (video.readyState !== 4) return;

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (detection?.expressions) {
        const expressions = detection.expressions;
        const sortedEmotions = Object.entries(expressions)
          .sort(([, a], [, b]) => b - a);
        
        const [topEmotion, topConfidence] = sortedEmotions[0];
        const emotion = topEmotion as Emotion;
        
        setCurrentEmotion({
          emotion,
          confidence: topConfidence,
        });
        setEmotionColor(EMOTION_COLORS[emotion]);
      }
    } catch (error) {
      console.error('Error detecting emotion:', error);
    }
  }, [videoRef, modelsLoaded]);

  const startDetection = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = window.setInterval(detectEmotion, 200);
  }, [detectEmotion]);

  const stopDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    modelsLoaded,
    currentEmotion,
    emotionColor,
    startDetection,
    stopDetection,
    EMOTION_COLORS,
  };
};
