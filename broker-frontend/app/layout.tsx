import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { CartProvider } from '@/lib/cart';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'ትዕዛዝ ደብተር | የጅምላ ንግድ ስርዓት',
  description: 'B2B Wholesale Order, Logistics & Ledger Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="am">
      <body>
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
        <Footer />
      </body>
    </html>
  );
}
