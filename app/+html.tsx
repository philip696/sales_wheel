import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />

        <style
          dangerouslySetInnerHTML={{
            __html: responsiveBackground,
          }}
        />
      </head>

      <body>
        <ScrollViewStyleReset />
        {children}
      </body>
    </html>
  );
}

const responsiveBackground = `
  html,
  body {
    margin: 0;
    padding: 0;
    width: 100%;
    min-height: 100%;
    background-color: #f8fafc;
  }

  body {
    overflow-x: hidden;
  }

  * {
    box-sizing: border-box;
  }

  button,
  input,
  textarea {
    font-family: inherit;
  }
`;