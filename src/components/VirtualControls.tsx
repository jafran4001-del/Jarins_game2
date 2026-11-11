import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Compass } from 'lucide-react';

interface VirtualControlsProps {
  onMove: (vx: number, vy: number) => void;
}

export const VirtualControls: React.FC<VirtualControlsProps> = ({ onMove }) => {
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [activeDirections, setActiveDirections] = useState<{ [key: string]: boolean }>({});
  const [minimized, setMinimized] = useState(false);

  const stickRef = useRef<HTMLDivElement>(null);
  const radius = 45;

  // Process directional buttons (WASD pad)
  useEffect(() => {
    if (isInteracting) return; // joystick overrides d-pad

    let vx = 0;
    let vy = 0;
    if (activeDirections['UP']) vy -= 1;
    if (activeDirections['DOWN']) vy += 1;
    if (activeDirections['LEFT']) vx -= 1;
    if (activeDirections['RIGHT']) vx += 1;

    const len = Math.hypot(vx, vy);
    if (len > 0) {
      onMove(vx / len, vy / len);
    } else {
      onMove(0, 0);
    }
  }, [activeDirections, isInteracting, onMove]);

  // Handle Joystick Touch
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsInteracting(true);
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      updateKnob(touch.clientX, touch.clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      updateKnob(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsInteracting(false);
    setKnobPos({ x: 0, y: 0 });
    onMove(0, 0);
  };

  // Handle Joystick Mouse Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsInteracting(true);
    updateKnob(e.clientX, e.clientY);

    const onMouseMove = (moveEvent: MouseEvent) => {
      updateKnob(moveEvent.clientX, moveEvent.clientY);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setIsInteracting(false);
      setKnobPos({ x: 0, y: 0 });
      onMove(0, 0);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const updateKnob = (clientX: number, clientY: number) => {
    if (!stickRef.current) return;
    const rect = stickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist <= radius) {
      setKnobPos({ x: dx, y: dy });
      onMove(dx / radius, dy / radius);
    } else {
      const angle = Math.atan2(dy, dx);
      const clampedX = Math.cos(angle) * radius;
      const clampedY = Math.sin(angle) * radius;
      setKnobPos({ x: clampedX, y: clampedY });
      onMove(clampedX / radius, clampedY / radius);
    }
  };

  const setDir = (dir: string, active: boolean) => {
    setActiveDirections((prev) => ({ ...prev, [dir]: active }));
  };

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="absolute bottom-16 left-4 z-30 pointer-events-auto p-2 bg-slate-900/80 hover:bg-slate-800 text-sky-400 border border-slate-700 rounded-xl shadow-lg cursor-pointer flex items-center gap-1.5 text-xs font-semibold backdrop-blur-md"
        title="Show Movement Controls"
      >
        <Compass className="w-4 h-4" />
        <span>D-Pad</span>
      </button>
    );
  }

  return (
    <div className="absolute bottom-16 left-4 z-30 pointer-events-auto flex items-end gap-3 select-none">
      {/* Joystick Card */}
      <div className="flex flex-col items-center bg-slate-950/80 backdrop-blur-md p-3 rounded-2xl border border-slate-800/90 shadow-2xl">
        <div className="flex items-center justify-between w-full mb-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <span>Move Player</span>
          <button
            onClick={() => setMinimized(true)}
            className="text-slate-500 hover:text-slate-300 text-[10px] cursor-pointer"
          >
            Hide
          </button>
        </div>

        <div
          ref={stickRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="w-24 h-24 rounded-full bg-slate-900/90 border-2 border-slate-700/80 flex items-center justify-center relative touch-none cursor-grab active:cursor-grabbing shadow-inner"
        >
          {/* Subtle directional indicators */}
          <div className="absolute top-1 text-[9px] text-slate-600 font-bold">W</div>
          <div className="absolute bottom-1 text-[9px] text-slate-600 font-bold">S</div>
          <div className="absolute left-1 text-[9px] text-slate-600 font-bold">A</div>
          <div className="absolute right-1 text-[9px] text-slate-600 font-bold">D</div>

          {/* Center Knob */}
          <div
            className={`w-10 h-10 rounded-full transition-transform duration-75 flex items-center justify-center shadow-lg ${
              isInteracting
                ? 'bg-sky-500 shadow-sky-500/50 scale-105'
                : 'bg-slate-700/90 hover:bg-slate-600'
            }`}
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          >
            <div className="w-3 h-3 rounded-full bg-white/40" />
          </div>
        </div>
      </div>

      {/* D-Pad Buttons for Direct Click / Tap Move */}
      <div className="hidden sm:flex flex-col items-center bg-slate-950/80 backdrop-blur-md p-2.5 rounded-2xl border border-slate-800/90 shadow-2xl">
        <button
          onMouseDown={() => setDir('UP', true)}
          onMouseUp={() => setDir('UP', false)}
          onMouseLeave={() => setDir('UP', false)}
          onTouchStart={() => setDir('UP', true)}
          onTouchEnd={() => setDir('UP', false)}
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
            activeDirections['UP']
              ? 'bg-sky-500 text-slate-950 shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
          title="Move Up (W)"
        >
          <ArrowUp className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 my-1">
          <button
            onMouseDown={() => setDir('LEFT', true)}
            onMouseUp={() => setDir('LEFT', false)}
            onMouseLeave={() => setDir('LEFT', false)}
            onTouchStart={() => setDir('LEFT', true)}
            onTouchEnd={() => setDir('LEFT', false)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
              activeDirections['LEFT']
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Move Left (A)"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            onMouseDown={() => setDir('DOWN', true)}
            onMouseUp={() => setDir('DOWN', false)}
            onMouseLeave={() => setDir('DOWN', false)}
            onTouchStart={() => setDir('DOWN', true)}
            onTouchEnd={() => setDir('DOWN', false)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
              activeDirections['DOWN']
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Move Down (S)"
          >
            <ArrowDown className="w-4 h-4" />
          </button>

          <button
            onMouseDown={() => setDir('RIGHT', true)}
            onMouseUp={() => setDir('RIGHT', false)}
            onMouseLeave={() => setDir('RIGHT', false)}
            onTouchStart={() => setDir('RIGHT', true)}
            onTouchEnd={() => setDir('RIGHT', false)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
              activeDirections['RIGHT']
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Move Right (D)"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
