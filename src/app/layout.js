import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata = {
  title: 'College Date — Campus Dating for Nigerian Students',
  description: 'Connect with students from Nigerian universities. Swipe, match, chat, and find your campus crush on College Date.',
  keywords: 'dating, Nigerian students, university, campus dating, college date',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0A0A0F" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
