export type FontFamily = 'standard' | 'dyslexia';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type ColorScheme = 'default' | 'high-contrast' | 'warm' | 'cool';

export interface AppSettings {
  profileId: string;
  speed: number;
  fontSize: FontSize;
  fontFamily: FontFamily;
  colorScheme: ColorScheme;
  dyslexiaMode: boolean;
  timeBetweenWords: number;
  fullscreen: boolean;
}

export const DEFAULT_SETTINGS: Omit<AppSettings, 'profileId'> = {
  speed: 4,
  fontSize: 'large',
  fontFamily: 'standard',
  colorScheme: 'default',
  dyslexiaMode: false,
  timeBetweenWords: 0,
  fullscreen: false,
};
