import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HireNest OS',
  description: 'Autonomous Workforce Coordination & Governance OS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
