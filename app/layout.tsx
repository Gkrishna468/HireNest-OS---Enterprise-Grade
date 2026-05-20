export const metadata = {
  title: 'HireNestOS',
  description: 'Enterprise Workforce Governance OS',
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
