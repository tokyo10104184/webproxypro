import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GhostFrame',
  description: 'Stealth Web Proxy',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0, background: '#000', color: '#fff', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  )
}
