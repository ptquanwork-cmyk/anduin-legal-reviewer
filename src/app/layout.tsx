import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';

const poppins = Poppins({ subsets: ['latin', 'latin-ext'], weight: ['600', '700', '800'], variable: '--font-poppins' });
const inter = Inter({ subsets: ['latin', 'latin-ext', 'vietnamese'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Anduin Legal Reviewer',
  description: 'Review contracts before you digitize: source-linked findings, human decisions and verified exports.',
};

export const viewport: Viewport = { themeColor: '#c9ddf2' };

// Applies the saved or system theme before first paint to avoid a light/dark flash.
const themeScript = `try{var t=new URLSearchParams(location.search).get('theme')||localStorage.getItem('theme');if(t!=='dark'&&t!=='light')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
