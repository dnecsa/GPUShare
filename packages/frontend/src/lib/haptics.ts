import { useWebHaptics } from "web-haptics/react";

// Re-export the hook for convenience
export { useWebHaptics };

// Preset types for our app
export type HapticType = "success" | "error" | "nudge" | "buzz";

// Helper to check if haptics are supported
export function isHapticsSupported(): boolean {
  return (
    "vibrate" in navigator || "haptics" in navigator || "vibration" in navigator
  );
}

// Fallback vibration patterns for different haptic types
export const hapticPatterns = {
  success: [10, 50, 10],
  error: [50, 100, 50],
  nudge: [10],
  buzz: [30],
} as const;
