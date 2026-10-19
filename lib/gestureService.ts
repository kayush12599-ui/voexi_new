
/**
 * SAFE MODE Gesture Service
 * - Stubbed version to prevent compile errors.
 * - No AI logic.
 */

export type GestureCommand = 'SWIPE_UP' | 'SWIPE_DOWN' | 'NONE';

export class GestureService {
  /**
   * Stub detection. In Safe Mode, we don't process landmarks.
   * This is kept for type compatibility.
   */
  static detect(_landmarks: any[], _confidence: number): GestureCommand {
    return 'NONE';
  }
}
