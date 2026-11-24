'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Recycle,
  LayoutDashboard,
  Trash2,
  Map,
  Camera,
  Menu,
  X,
  LogIn,
  LogOut,
  UserCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { authClient, useSession } from '@/lib/auth-client';
import { ROLE_LABELS, type UserRole } from '@/lib/types';

const navItems: { href: string; label: string; icon: typeof Recycle; roles?: UserRole[] }[] = [
  { href: '/', label: 'Home', icon: Recycle },
  { href: '/classify', label: 'Classify Waste', icon: Camera },
  { href: '/bins', label: 'Bin Status', icon: Trash2, roles: ['admin', 'staff'] },
  { href: '/routes', label: 'Route Optimizer', icon: Map, roles: ['admin', 'staff'] },
  { href: '/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard, roles: ['admin'] },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, isPending } = useSession();
  const role = ((session?.user as { role?: UserRole } | undefined)?.role ?? 'user') as UserRole;

  const visible = navItems.filter((item) => !item.roles || (session && item.roles.includes(role)));

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error('Sign out failed', { description: error.message });
      return;
    }
    toast.success('Signed out');
    setMobileMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <nav
      aria-label="Main navigation"
      className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Recycle className="h-5 w-5 text-primary-foreground" aria-hidden />
            </div>
            <span className="text-lg font-semibold text-foreground">SmartWaste</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:items-center lg:gap-1">
            {visible.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            {isPending ? (
              <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
            ) : session ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <UserCircle className="h-5 w-5 text-muted-foreground" aria-hidden />
                  <div className="leading-tight">
                    <p className="max-w-[10rem] truncate font-medium text-foreground">{session.user.name}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="mr-1 h-4 w-4" aria-hidden />
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/sign-in">
                    <LogIn className="mr-1 h-4 w-4" aria-hidden />
                    Sign in
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/sign-up">Sign up</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="border-t border-border pb-4 lg:hidden">
            <div className="mt-2 space-y-1">
              {visible.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="mt-3 border-t border-border pt-3">
              {session ? (
                <div className="flex items-center justify-between px-3">
                  <div className="text-sm">
                    <p className="font-medium text-foreground">{session.user.name}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="mr-1 h-4 w-4" aria-hidden />
                    Sign out
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 px-3">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)}>Sign in</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1">
                    <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)}>Sign up</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
