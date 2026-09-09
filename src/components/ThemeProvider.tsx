// components/ThemeProvider.tsx
'use client';

import { useEffect, useState } from 'react';

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // LocalStorage ကနေ Theme ကိုဖတ်ပါ
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      // System Preference ကိုလိုက်ချင်ရင်
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const defaultTheme = prefersDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', defaultTheme);
      localStorage.setItem('theme', defaultTheme);
    }
  }, []);

  // Hydration mismatch ကိုရှောင်ဖို့
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}