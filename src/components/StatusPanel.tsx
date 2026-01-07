import React from 'react';
import { motion } from 'framer-motion';
import type { Emotion } from '@/hooks/useEmotionDetection';

interface StatusPanelProps {
  emotion: Emotion;
  confidence: number;
  emotionColor: string;
  depth: number;
  isDrawing: boolean;
  isTracking: boolean;
}

const StatusPanel: React.FC<StatusPanelProps> = ({
  emotion,
  confidence,
  emotionColor,
  depth,
  isDrawing,
  isTracking,
}) => {
  const brushSize = Math.max(4, 40 * (1 - depth));
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass rounded-2xl p-6 space-y-6"
    >
      <h2 className="text-lg font-semibold font-['Orbitron'] text-foreground/90">
        Status
      </h2>
      
      {/* Emotion Display */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Emotion</span>
          <motion.span
            key={emotion}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-medium capitalize"
            style={{ color: emotionColor }}
          >
            {emotion}
          </motion.span>
        </div>
        
        {/* Confidence bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Confidence</span>
            <span>{(confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: emotionColor }}
              initial={{ width: 0 }}
              animate={{ width: `${confidence * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>
      
      {/* Brush Color Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Brush Color</span>
          <motion.div
            className="w-6 h-6 rounded-full border-2 border-border"
            style={{ 
              backgroundColor: emotionColor,
              boxShadow: `0 0 15px ${emotionColor}`,
            }}
            animate={{
              boxShadow: [`0 0 15px ${emotionColor}`, `0 0 25px ${emotionColor}`, `0 0 15px ${emotionColor}`],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>
      
      {/* Depth / Brush Size */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Brush Size</span>
          <span className="text-foreground/80">{brushSize.toFixed(0)}px</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={{ width: '50%' }}
            animate={{ width: `${(1 - depth) * 100}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Move hand closer for larger brush
        </p>
      </div>
      
      {/* Drawing Status */}
      <div className="flex items-center gap-3 pt-2 border-t border-border/50">
        <motion.div
          className="w-3 h-3 rounded-full"
          style={{
            backgroundColor: isDrawing ? emotionColor : 'hsl(var(--muted-foreground))',
          }}
          animate={{
            scale: isDrawing ? [1, 1.3, 1] : 1,
            boxShadow: isDrawing 
              ? [`0 0 10px ${emotionColor}`, `0 0 20px ${emotionColor}`, `0 0 10px ${emotionColor}`]
              : 'none',
          }}
          transition={{ duration: 0.5, repeat: isDrawing ? Infinity : 0 }}
        />
        <span className="text-sm text-muted-foreground">
          {isDrawing ? 'Drawing...' : 'Pinch to draw'}
        </span>
      </div>
      
      {/* Tracking Status */}
      <div className="flex items-center gap-3">
        <div 
          className={`w-3 h-3 rounded-full ${isTracking ? 'bg-green-500' : 'bg-muted-foreground'}`}
          style={{
            boxShadow: isTracking ? '0 0 10px hsl(120, 60%, 50%)' : 'none',
          }}
        />
        <span className="text-sm text-muted-foreground">
          {isTracking ? 'Hand detected' : 'No hand detected'}
        </span>
      </div>
    </motion.div>
  );
};

export default StatusPanel;
