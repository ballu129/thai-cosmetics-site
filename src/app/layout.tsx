import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: { default: 'SIAM CARE — тайская косметика с доставкой в Россию и СНГ', template: '%s | SIAM CARE' },
  description: 'Оригинальная сертифицированная тайская косметика, включая лечебные косметические средства. Доставка напрямую из Таиланда.',
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="ru"><body><Header/><main>{children}</main><Footer/></body></html>
}
