import React from 'react';
import { motion } from 'framer-motion';
import { Hand, Smile, Move3D } from 'lucide-react';

const Instructions: React.FC = () => {
  const features = [
    {
      icon: Smile,
      title: 'Emotion Colors',
      description: 'Your facial expression controls the brush color',
      color: 'hsl(45, 100%, 55%)',
    },
    {
      icon: Hand,
      title: 'Hand Drawing',
      description: 'Pinch thumb & index finger to draw',
      color: 'hsl(280, 100%, 65%)',
    },
    {
      icon: Move3D,
      title: 'Depth Control',
      description: 'Move hand closer for larger brush size',
      color: 'hsl(180, 100%, 50%)',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass rounded-2xl p-6 space-y-4"
    >
      <h2 className="text-lg font-semibold font-['Orbitron'] text-foreground/90">
        How to Use
      </h2>
      
      <div className="space-y-4">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            className="flex items-start gap-3"
          >
            <div
              className="p-2 rounded-lg shrink-0"
              style={{
                backgroundColor: `${feature.color}20`,
                border: `1px solid ${feature.color}40`,
              }}
            >
              <feature.icon
                className="w-5 h-5"
                style={{ color: feature.color }}
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground/90">
                {feature.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {feature.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default Instructions;
