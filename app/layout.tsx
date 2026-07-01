import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rococo Outreach',
  description: 'Internal small-batch outreach workspace',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
