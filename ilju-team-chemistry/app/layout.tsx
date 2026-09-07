import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '일주 팀플 케미',
  description: '일주로 가볍게 알아보는 커뮤니티 협업 케미',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
