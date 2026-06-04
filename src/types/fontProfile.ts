/** App-wide reusable font styling preset for canvas text labels. */
export interface FontProfile {
  id: string;
  title: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  color: string;
  fixedWidth: boolean;
  /** Width in px when fixedWidth is true; persisted even when fixedWidth is false. */
  fixedWidthPx: number;
}

/** State for the `fontProfiles` Alpine store. */
export interface FontProfilesStoreState {
  profiles: FontProfile[];
  defaultFontProfileId: string | null;
}
