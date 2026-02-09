import './globals.css'

export const metadata = {
  title: '四海颂扬｜音乐事工',
  description: 'Four Seas Praise · Music Ministry',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          backgroundColor: '#0a0c10',
          color: '#ffffff',
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Noto Sans SC", Arial, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  )
}
