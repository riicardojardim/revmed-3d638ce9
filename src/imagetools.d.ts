/// <reference types="vite/client" />

declare module "*?as=srcset" {
  const src: string;
  export default src;
}

declare module "*&as=srcset" {
  const src: string;
  export default src;
}

declare module "*?format=webp" {
  const src: string;
  export default src;
}

declare module "*&format=webp" {
  const src: string;
  export default src;
}