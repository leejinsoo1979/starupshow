'use client';
import React from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Logo } from '@/components/ui/Logo';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
} from 'lucide-react';

interface FooterLink {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface FooterSection {
  label: string;
  links: FooterLink[];
}

const footerLinks: FooterSection[] = [
  {
    label: '제품',
    links: [
      { title: '기능', href: '#features' },
      { title: 'KPI 대시보드', href: '/dashboard-group' },
      { title: 'AI 인사이트', href: '#' },
      { title: '투자자 매칭', href: '#' },
    ],
  },
  {
    label: '회사',
    links: [
      { title: '자주 묻는 질문', href: '/faqs' },
      { title: '회사 소개', href: '/about' },
      { title: '개인정보처리방침', href: '/privacy' },
      { title: '이용약관', href: '/terms' },
    ],
  },
  {
    label: '리소스',
    links: [
      { title: '블로그', href: '/blog' },
      { title: '업데이트', href: '/changelog' },
      { title: '도움말', href: '/help' },
      { title: '문의하기', href: '/contact' },
    ],
  },
  {
    label: '소셜',
    links: [
      { title: 'Facebook', href: '#', icon: FacebookIcon },
      { title: 'Instagram', href: '#', icon: InstagramIcon },
      { title: 'Youtube', href: '#', icon: YoutubeIcon },
      { title: 'LinkedIn', href: '#', icon: LinkedinIcon },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative w-full max-w-[1600px] mx-auto flex flex-col items-center justify-center rounded-t-3xl md:rounded-t-[3rem] border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-transparent dark:bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.white/8%),transparent)] px-6 sm:px-10 lg:px-16 py-12 lg:py-16">
      <div className="absolute top-0 right-1/2 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full blur bg-accent" style={{ opacity: 0.3 }} />

      <div className="grid w-full gap-8 xl:grid-cols-3 xl:gap-8">
        <AnimatedContainer className="space-y-4">
          <Logo size="lg" href="/" />
          <p className="text-zinc-600 dark:text-zinc-400 text-sm max-w-xs">
            스타트업의 일상적인 업무 기록이 투자자에게 보여지는 IR 자료가 됩니다.
          </p>
          <p className="text-zinc-500 dark:text-zinc-500 mt-8 text-sm md:mt-0">
            © {new Date().getFullYear()} <span className="font-semibold text-accent">GlowUS</span>. All rights reserved.
          </p>
        </AnimatedContainer>

        <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4 xl:col-span-2 xl:mt-0">
          {footerLinks.map((section, index) => (
            <AnimatedContainer key={section.label} delay={0.1 + index * 0.1}>
              <div className="mb-10 md:mb-0">
                <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                  {section.label}
                </h3>
                <ul className="text-zinc-600 dark:text-zinc-400 mt-4 space-y-2 text-sm">
                  {section.links.map((link) => (
                    <li key={link.title}>
                      <a
                        href={link.href}
                        className="hover:text-accent inline-flex items-center transition-all duration-300"
                      >
                        {link.icon && <link.icon className="me-1 size-4" />}
                        {link.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedContainer>
          ))}
        </div>
      </div>
    </footer>
  );
}

type ViewAnimationProps = {
  delay?: number;
  className?: ComponentProps<typeof motion.div>['className'];
  children: ReactNode;
};

function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
      whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
