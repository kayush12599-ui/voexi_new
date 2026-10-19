import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Custom Root HTML template for Expo Router Web
 * Sets 100vh height, flex layout, and black background.
 */
export default function HTML({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
html, body {
  height: 100%;
  min-height: 100vh;
  width: 100%;
  margin: 0;
  padding: 0;
  background-color: #000000;
  color: #ffffff;
  overflow-x: hidden;
}
#root {
  display: flex;
  flex: 1;
  height: 100%;
  min-height: 100vh;
  width: 100%;
  flex-direction: column;
  background-color: #000000;
}
`;
