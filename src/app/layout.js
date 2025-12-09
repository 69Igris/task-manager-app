import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { ConfirmProvider } from '@/components/ConfirmDialog';
import PWARegister from '@/components/PWARegister';

export const metadata = {
  title: "Task Manager - Organize Your Work",
  description: "Internal task management application with RBAC",
  manifest: "/manifest.json",
  themeColor: "#4f46e5",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Task Manager"
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <PWARegister />
              {children}
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
