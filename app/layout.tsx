import type { Metadata } from 'next';
import '../src/globals.css';

export const metadata: Metadata = {
  title: 'Plus 편집기',
  description: 'Plus 의료 콘텐츠 에디터',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
