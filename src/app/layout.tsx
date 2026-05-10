import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QA Copilot',
  description:
    'Generate structured bug reports and QA test cases from notes, designs, and requirements.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
