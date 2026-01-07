import { useCallback, useEffect, useRef, useState } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

interface HandPoint {
  x: number;
  y: number;
  z: number;
}

interface HandTrackingResult {
  indexFinger: HandPoint | null;
  isDrawing: boolean;
  depth: number; // 0-1, where 0 is close and 1 is far
}

export const useHandTracking = (
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>
) => {
  const [isLoading, setIsLoading] = useState(true);
  const [handData, setHandData] = useState<HandTrackingResult>({
    indexFinger: null,
    isDrawing: false,
    depth: 0.5,
  });
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const prevPointRef = useRef<HandPoint | null>(null);

  const onResults = useCallback((results: Results) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // Index finger tip is landmark 8
      const indexTip = landmarks[8];
      // Thumb tip is landmark 4
      const thumbTip = landmarks[4];
      
      // Calculate distance between thumb and index finger for pinch detection
      const pinchDistance = Math.sqrt(
        Math.pow(indexTip.x - thumbTip.x, 2) +
        Math.pow(indexTip.y - thumbTip.y, 2)
      );
      
      // If pinch is small enough, we're "drawing"
      const isDrawing = pinchDistance < 0.05;
      
      // Use z coordinate for depth (brush size control)
      // Normalize to 0-1 range, closer = larger brush
      const depth = Math.max(0, Math.min(1, (indexTip.z + 0.1) * 5));
      
      const point: HandPoint = {
        x: indexTip.x,
        y: indexTip.y,
        z: indexTip.z,
      };
      
      setHandData({
        indexFinger: point,
        isDrawing,
        depth,
      });
      
      prevPointRef.current = point;
    } else {
      setHandData({
        indexFinger: null,
        isDrawing: false,
        depth: 0.5,
      });
      prevPointRef.current = null;
    }
    
    setIsLoading(false);
  }, [canvasRef]);

  const startTracking = useCallback(() => {
    if (!videoRef.current) return;

    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);
    handsRef.current = hands;

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current && handsRef.current) {
          await handsRef.current.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480,
    });

    camera.start();
    cameraRef.current = camera;
  }, [videoRef, onResults]);

  const stopTracking = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    isLoading,
    handData,
    startTracking,
    stopTracking,
  };
};
