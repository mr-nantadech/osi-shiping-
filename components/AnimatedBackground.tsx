'use client';

import React, { useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match window
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Transportation objects
    const transports: Array<{
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      progress: number;
      speed: number;
      active: boolean;
      startTime: number;
      duration: number;
      size: number;
      intensity: number;
    }> = [];

    // Initialize transport routes
    const initializeTransports = () => {
      // Create a higher number of initial transports for a busier feel
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          createTransport();
        }, i * 500); // Faster stagger for more initial activity
      }
    };

    const createTransport = () => {
      // Generate completely random start and end points
      const startX = Math.random() * canvas.width * 0.8 + canvas.width * 0.1;
      const startY = Math.random() * canvas.height * 0.8 + canvas.height * 0.1;
      const endX = Math.random() * canvas.width * 0.8 + canvas.width * 0.1;
      const endY = Math.random() * canvas.height * 0.8 + canvas.height * 0.1;

      // Ensure the start and end points are not too close
      const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
      if (distance < 100) {
        setTimeout(createTransport, Math.random() * 1000);
        return;
      }

      const newTransport = {
        startX,
        startY,
        endX,
        endY,
        progress: 0,
        speed: 0.002 + Math.random() * 0.008, // More variation in speed
        active: true,
        startTime: Date.now(),
        duration: 2000 + Math.random() * 5000, // Random duration
        size: 1 + Math.random() * 2, // Random size
        intensity: 0.5 + Math.random() * 0.5, // Random intensity
      };

      transports.push(newTransport);
    };

    // Animation variables
    let animationFrameId: number;

    const animate = () => {
      // Clear canvas with dark blue background
      ctx.fillStyle = '#142274';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw random stars in the background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      for (let i = 0; i < 50; i++) {
        const x = (i * 12345) % canvas.width;
        const y = (i * 54321) % canvas.height;
        const size = Math.random() * 1.5;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Update and draw transports
      transports.forEach((transport, index) => {
        // Randomly decide to spawn a new transport
        if (Math.random() < 0.02) {
          createTransport();
        }

        if (!transport.active) {
          // Remove inactive transport and create a new one with chance
          if (Math.random() < 0.7) { // 70% chance to create a new one
            setTimeout(createTransport, Math.random() * 3000);
          }
          return;
        }

        // Update progress based on elapsed time
        const elapsed = Date.now() - transport.startTime;
        transport.progress = elapsed / transport.duration;

        if (transport.progress >= 1) {
          transport.active = false; // Mark as inactive and remove later
        } else {
          // Calculate current position along the route
          const easeProgress = 1 - Math.pow(1 - transport.progress, 3); // Cubic easing for smoother motion
          const currentX = transport.startX + (transport.endX - transport.startX) * easeProgress;
          const currentY = transport.startX + (transport.endY - transport.startY) * easeProgress;

          // Draw the light streak effect with even more randomness
          const tailLength = Math.floor(10 + Math.random() * 20);
          for (let i = 0; i < tailLength; i++) {
            const trailProgress = transport.progress - (i / tailLength) * 0.3;
            if (trailProgress > 0) {
              const trailEaseProgress = 1 - Math.pow(1 - trailProgress, 3);
              const trailX = transport.startX + (transport.endX - transport.startX) * trailEaseProgress;
              const trailY = transport.startX + (transport.endY - transport.startY) * trailEaseProgress;

              // Add some random deviation for more organic movement
              const deviationX = (Math.random() - 0.5) * 5;
              const deviationY = (Math.random() - 0.5) * 5;

              const alpha = (1 - i / tailLength) * transport.intensity;
              const radius = transport.size * (1 - i / tailLength);

              ctx.beginPath();
              ctx.arc(trailX + deviationX, trailY + deviationY, radius, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
              ctx.fill();
            }
          }
        }
      });

      // Occasionally clean up inactive transports
      if (Math.random() < 0.1) {
        for (let i = transports.length - 1; i >= 0; i--) {
          if (!transports[i].active && Date.now() - transports[i].startTime > 1000) {
            transports.splice(i, 1);
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    initializeTransports();
    animate();

    // Clean up
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
};

export default AnimatedBackground;