'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Mic,
  Users,
  Bot,
  Settings,
  Activity,
} from 'lucide-react';

const routes = [
  {
    href: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/recordings',
    label: 'Gravações',
    icon: Mic,
  },
  {
    href: '/bots',
    label: 'Bots',
    icon: Bot,
  },
  {
    href: '/users',
    label: 'Usuários',
    icon: Users,
  },
  {
    href: '/health',
    label: 'Saúde do Sistema',
    icon: Activity,
  },
  {
    href: '/settings',
    label: 'Configurações',
    icon: Settings,
  },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {routes.map((route) => {
        const Icon = route.icon;
        return (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
              pathname === route.href
                ? 'text-foreground'
                : 'text-muted-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {route.label}
          </Link>
        );
      })}
    </nav>
  );
}
