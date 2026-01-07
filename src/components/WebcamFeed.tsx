import React, { forwardRef } from 'react';
import Webcam from 'react-webcam';
import { motion } from 'framer-motion';

interface WebcamFeedProps {
  emotionColor: string;
}

const WebcamFeed = forwardRef<Webcam, WebcamFeedProps>(
  ({ emotionColor }, ref) => {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl"
        style={{
          boxShadow: `0 0 30px ${emotionColor}40, 0 0 60px ${emotionColor}20`,
        }}
      >
        {/* Animated border */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none z-10"
          style={{
            border: `2px solid ${emotionColor}`,
          }}
          animate={{
            boxShadow: [
              `inset 0 0 20px ${emotionColor}30`,
              `inset 0 0 40px ${emotionColor}50`,
              `inset 0 0 20px ${emotionColor}30`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        <Webcam
          ref={ref}
          audio={false}
          mirrored
          className="w-full h-full object-cover rounded-2xl"
          videoConstraints={{
            width: 640,
            height: 480,
            facingMode: 'user',
          }}
        />
        
        {/* Overlay gradient */}
        <div 
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{
            background: `linear-gradient(180deg, transparent 70%, ${emotionColor}20 100%)`,
          }}
        />
      </motion.div>
    );
  }
);

WebcamFeed.displayName = 'WebcamFeed';

export default WebcamFeed;
