// Ambient declarations for JSON assets bundled inside assets-bundle.zip
// and resolved at dev/build time by the Vite plugin in vite.config.ts.
declare module '*item_names.json' {
  const itemNames: Record<string, string>;
  export default itemNames;
}

declare module '*art_index.json' {
  const artIndex: Record<string, string>;
  export default artIndex;
}
