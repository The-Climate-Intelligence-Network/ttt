'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminLayout({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/admin/login') {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/admin/login');
      } else {
        setAuthenticated(true);
      }
      setLoading(false);
    };
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && pathname !== '/admin/login') {
        router.replace('/admin/login');
      }
    });

    return () => {
      if (authListener?.subscription) authListener.subscription.unsubscribe();
    };
  }, [router, pathname]);

  if (loading) return null;
  if (!authenticated && pathname !== '/admin/login') return null;

  return <>{children}</>;
}
