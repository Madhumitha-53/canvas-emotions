import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';

interface DrawingCanvasProps {
  brushColor: string;
  brushSize: number;
  indexFinger: { x: number; y: number; z: number } | null;
  isDrawing: boolean;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  brushColor,
  brushSize,
  indexFinger,
  isDrawing,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevPointRef = useRef<{ x: number; y: number } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const draw = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const canvasX = (1 - x) * canvas.width; // Mirror for natural feel
      const canvasY = y * canvas.height;

      setCursorPos({ x: canvasX, y: canvasY });

      if (isDrawing) {
        ctx.beginPath();
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (prevPointRef.current) {
          ctx.moveTo(prevPointRef.current.x, prevPointRef.current.y);
          ctx.lineTo(canvasX, canvasY);
          ctx.stroke();
        }

        prevPointRef.current = { x: canvasX, y: canvasY };
      } else {
        prevPointRef.current = null;
      }
    },
    [brushColor, brushSize, isDrawing]
  );

  useEffect(() => {
    if (indexFinger) {
      draw(indexFinger.x, indexFinger.y);
    } else {
      setCursorPos(null);
      prevPointRef.current = null;
    }
  }, [indexFinger, draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Store current content
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      tempCtx?.drawImage(canvas, 0, 0);
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        // Restore content
        ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full rounded-xl"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(220 18% 12%) 0%, hsl(220 20% 6%) 100%)',
        }}
      />
      
      {/* Cursor indicator */}
      {cursorPos && (
        <motion.div
          className="absolute pointer-events-none"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            width: brushSize,
            height: brushSize,
            borderRadius: '50%',
            backgroundColor: isDrawing ? brushColor : 'transparent',
            border: `2px solid ${brushColor}`,
            transform: 'translate(-50%, -50%)',
            boxShadow: isDrawing 
              ? `0 0 20px ${brushColor}, 0 0 40px ${brushColor}` 
              : `0 0 10px ${brushColor}`,
          }}
          animate={{
            scale: isDrawing ? [1, 1.2, 1] : 1,
          }}
          transition={{
            duration: 0.3,
            repeat: isDrawing ? Infinity : 0,
          }}
        />
      )}
      
      {/* Clear button */}
      <button
        onClick={clearCanvas}
        className="absolute bottom-4 right-4 px-4 py-2 glass rounded-lg text-sm font-medium 
                   text-foreground/80 hover:text-foreground transition-all hover:scale-105
                   border border-border/50 hover:border-primary/50"
      >
        Clear Canvas
      </button>
    </div>
  );
};

export default DrawingCanvas;
