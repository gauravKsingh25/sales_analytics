import '../styles/globals.css';
import Navbar from '../components/Navbar';
import ReactQueryProvider from '../components/ReactQueryProvider';

export const metadata = {
  title: 'Tally Software - Voucher Management',
  description: 'Comprehensive voucher management and analytics system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <Navbar />
        <ReactQueryProvider>
          <main className="mx-auto max-w-7xl">{children}</main>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
