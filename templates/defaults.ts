import { Target } from '../types';

/**
 * Default tracker path using papar.jpg from public folder
 * This is the default image target for new projects
 */
export const DEFAULT_IMAGE_TRACKER_PATH = '/papar.jpg';

/**
 * Default tracker configuration using papar.jpg
 * Used as the default target when creating new blank projects
 */
export const defaultTracker: Target = {
  id: 'target_default',
  name: 'Papar Studio Tracker',
  imageUrl: DEFAULT_IMAGE_TRACKER_PATH,
  visible: true,
  contents: [],
  script: undefined,
};

/**
 * Get a fresh copy of the default tracker
 * Use this when creating new projects to avoid reference issues
 */
export const getDefaultTracker = (): Target => ({ ...defaultTracker });
