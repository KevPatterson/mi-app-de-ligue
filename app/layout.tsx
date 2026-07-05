import { Cormorant_Garamond, Manrope } from 'next/font/google'
import "./globals.css";

const displayFont = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
})

const bodyFont = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600', '700', '800'],
})

export const metadata = {
  title: 'Liggo',
  description: 'Una app romántica para crear ligue, coqueteo y respuestas con estilo.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
