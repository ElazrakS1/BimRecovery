declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

declare module '*.jpg';
declare module '*.png';
declare module '*.json';
declare module '*.gif';

// CSS Properties
type CSSPosition = 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';

interface CustomCSSProperties extends React.CSSProperties {
  position?: CSSPosition;
}
