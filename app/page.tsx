import Link from 'next/link';
import { BookOpen, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PuterAuthButton } from '@/components/vocabulary/PuterAuthButton';

const features = [
  {
    name: 'Vocabulary',
    description: 'Learn new words with interactive flashcards',
    icon: BookOpen,
    href: '/vocabulary',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        {/* Header */}
        <header className="text-center mb-12 animate-fade-up">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            <span className="mr-2">🌸</span>
            Bloom English
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Your journey to English fluency starts here. Learn, practice, and grow.
          </p>
        </header>

        {/* Decorative Divider */}
        <div className="flex justify-center mb-12 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="h-px w-48 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>

        {/* Puter Connection (Electron only) */}
        <div className="flex justify-center mb-8 animate-fade-up" style={{ animationDelay: '0.15s' }}>
          <PuterAuthButton />
        </div>

        {/* Features Grid */}
        <section className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-6 text-center">
            Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((feature) => (
              <Link
                key={feature.name}
                href={feature.href}
                className="block"
              >
                <Card className="hover:shadow-lg hover:translate-y-[-2px] transition-all duration-200 h-full">
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <feature.icon className="size-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground">
                        {feature.name}
                      </h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      {feature.description}
                    </p>
                    <span className="text-primary font-medium inline-flex items-center gap-1">
                      Get Started <ArrowRight className="size-4" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
