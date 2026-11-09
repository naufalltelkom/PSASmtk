import React, { useRef, useState, useEffect } from 'react';
import { Zap, KeyRound } from 'lucide-react';
import { sound } from '../game/audio';

interface TouchControlsProps {
  onMoveVector: (vx: number, vy: number) => void;
  onSprintToggle: (sprint: boolean) => void;
  onInteract: () => void;
  isSprinting: boolean;
  canInteract: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMoveVector,
  onSprintToggle,
  onInteract,
  isSprinting,
  canInteract,
}) => {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [touchActive, setTouchActive] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  const maxRadius = 45;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setTouchActive(true);
    updateKnob(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        updateKnob(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setTouchActive(false);
        setKnobPos({ x: 0, y: 0 });
        onMoveVector(0, 0);
        break;
      }
    }
  };

  const updateKnob = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    let finalX = dx;
    let finalY = dy;
    if (dist > maxRadius) {
      finalX = (dx / dist) * maxRadius;
      finalY = (dy / dist) * maxRadius;
    }

    setKnobPos({ x: finalX, y: finalY });

    // Output normalized vector (-1 to 1)
    // Note: forward is negative Y in screen coordinates, so invert dy
    const normX = finalX / maxRadius;
    const normY = -finalY / maxRadius;
    onMoveVector(normX, normY);
  };

  return (
    <div className="md:hidden pointer-events-none absolute inset-0 z-30 select-none">
      {/* Virtual Joystick (Bottom Left) */}
      <div
        ref={joystickBaseRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="pointer-events-auto absolute bottom-8 left-6 w-28 h-28 rounded-full bg-black/45 border-2 border-neutral-700/60 backdrop-blur-sm flex items-center justify-center touch-none shadow-xl"
      >
        <div
          className={`w-12 h-12 rounded-full border transition-transform ${
            touchActive
              ? 'bg-[#6fffea]/40 border-[#6fffea] shadow-[0_0_15px_#6fffea]'
              : 'bg-neutral-800/80 border-neutral-600'
          }`}
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
        />
      </div>

      {/* Action Buttons (Bottom Right) */}
      <div className="pointer-events-auto absolute bottom-8 right-6 flex flex-col gap-3">
        {/* Sprint Button */}
        <button
          onTouchStart={() => onSprintToggle(!isSprinting)}
          onClick={() => onSprintToggle(!isSprinting)}
          className={`w-14 h-14 rounded-full border flex items-center justify-center shadow-lg font-mono text-xs transition-colors cursor-pointer ${
            isSprinting
              ? 'bg-[#ffde69]/30 border-[#ffde69] text-[#ffde69] shadow-[0_0_15px_#ffde69]'
              : 'bg-black/60 border-neutral-700 text-neutral-300'
          }`}
        >
          <Zap size={20} />
        </button>

        {/* Interact Button */}
        {canInteract && (
          <button
            onTouchStart={() => {
              sound.playClick();
              onInteract();
            }}
            onClick={() => {
              sound.playClick();
              onInteract();
            }}
            className="w-14 h-14 rounded-full border-2 border-[#6fffea] bg-[#6fffea]/30 text-white flex items-center justify-center shadow-[0_0_18px_#6fffea] font-mono text-sm font-bold animate-pulse cursor-pointer"
          >
            <KeyRound size={22} className="text-[#6fffea]" />
          </button>
        )}
      </div>
    </div>
  );
};
