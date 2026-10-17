/**
 * Set while a room drives the camera itself (a bowling lane's shot, say), so
 * CameraRig's orbit stands down; cleared when it hands the view back.
 */
export const cameraHold: { by: string | null } = { by: null };
