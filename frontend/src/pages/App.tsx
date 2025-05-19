import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Zap, Clapperboard, Voicemail, FileText, Rocket, ShieldCheck, Users } from "lucide-react";

// Helper component for consistent section titles
const SectionTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 tracking-tight ${className}`}>
    {children}
  </h2>
);

const GradientTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={`bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 ${className}`}>
    {children}
  </span>
);

export default function App() {
  const navigate = useNavigate();

  const featureCards = [
    {
      title: "AI Image Generator",
      icon: Zap,
      description: "Describe it and watch it come to life. Create stunning visuals from text prompts.",
      link: "/image-generator-page",
    },
    {
      title: "AI Video Maker",
      icon: Clapperboard,
      description: "Turn text into short, cinematic clips. Perfect for social media and marketing.",
      link: "/video-maker-page", // Assuming this is the correct link
    },
    {
      title: "Voice Generator",
      icon: Voicemail,
      description: "Make realistic voiceovers from your scripts in multiple languages and accents.",
      link: "/voice-generator-page", // Placeholder link
    },
    {
      title: "AI Writer",
      icon: FileText,
      description: "Create social media posts, captions, or short stories on the fly with AI assistance.",
      link: "/ai-writer-page", // Placeholder link
    },
  ];

  const audienceItems = [
    { title: "Social Media Creators", description: "Easily generate engaging content for all your platforms." },
    { title: "Digital Marketers", description: "Quickly create ad creatives, video snippets, and copy." },
    { title: "YouTubers & Podcasters", description: "Generate scripts, voiceovers, and visual elements." },
    { title: "Business Owners", description: "Produce professional content without a large team." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
      <header className="w-full py-4 px-8 fixed top-0 bg-background/80 backdrop-blur-md z-50 border-b border-border/20">
        <div className="container mx-auto flex justify-between items-center max-w-6xl">
          <h1 className="text-2xl font-bold"><GradientTitle>CreatiGen</GradientTitle></h1>
          <nav>
            <Button variant="ghost" onClick={() => navigate('/login-page')} className="hover:bg-accent">
              Login
            </Button>
            <Button onClick={() => navigate('/signup-page')} 
                    className="ml-2 bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700">
              Sign Up
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 md:pt-32 flex-grow max-w-5xl">
        {/* Hero Section */}
        <section id="hero" className="text-center py-16 md:py-24">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
            <GradientTitle>CreatiGen</GradientTitle>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto">
            Turn Your Ideas Into Instant Content with AI Creative Studio!
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/dashboard-page')} // Navigate to dashboard or signup
            className="text-lg px-8 py-6 bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 transform hover:scale-105"
          >
            Get Started For Free <Rocket className="ml-2 h-5 w-5" />
          </Button>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24">
          <SectionTitle><GradientTitle>Create Anything You Can Imagine</GradientTitle></SectionTitle>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {featureCards.map((feature, index) => (
              <Card 
                key={index} 
                className="bg-card shadow-xl border-border/40 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col"
                onClick={() => feature.link && navigate(feature.link)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-medium">{feature.title}</CardTitle>
                  <feature.icon className="h-6 w-6 text-indigo-400" />
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Centered Content Wrapper for subsequent sections */}
        <div className="max-w-3xl mx-auto">
          {/* Technology Section */}
          <section id="technology" className="py-16 md:py-24">
            <Card className="w-full shadow-2xl bg-card border-border/40 p-6 md:p-8">
              <SectionTitle><GradientTitle>Powered by Cutting-Edge AI</GradientTitle></SectionTitle>
              <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-12">
                CreatiGen leverages state-of-the-art AI models from industry leaders to deliver high-quality content generation, ensuring secure and rapid delivery.
              </p>
              <div className="flex justify-center items-center space-x-8 md:space-x-12">
                {[ { name: "OpenAI", logo: "https://raw.githubusercontent.com/openai/brand/main/assets/Logos/SVG/openai-logomark.svg" },
                  { name: "Stability AI", logo: "/img/stabilityai-logo-white.svg" }, // Assuming a logo is in public/img
                  { name: "ElevenLabs", logo: "https://assets-global.website-files.com/63fe08d9112fa274d0652f90/63fe090a8f7765a30613496a_elevenlabs.svg" }].map(tech => (
                  <div key={tech.name} className="flex flex-col items-center">
                    <div className="p-3 bg-muted rounded-lg mb-2 h-16 w-16 flex items-center justify-center">
                      <img src={tech.logo} alt={`${tech.name} Logo`} className="max-h-10 max-w-10 object-contain" />
                    </div>
                    <span className="font-semibold text-sm text-muted-foreground">{tech.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          {/* Audience Section */}
          <section id="audience" className="py-16 md:py-24">
             <Card className="w-full shadow-2xl bg-card border-border/40 p-6 md:p-8">
              <SectionTitle><GradientTitle>Perfect For Creative Professionals</GradientTitle></SectionTitle>
              <div className="grid md:grid-cols-2 gap-6">
                {audienceItems.map((item, index) => (
                  <Card key={index} className="bg-card-foreground/5 dark:bg-background shadow-lg border-border/20 p-6 rounded-lg flex flex-col items-start">
                    <Users className="h-8 w-8 text-indigo-400 mb-3" /> {/* Generic Icon, or map specific ones */}
                    <h3 className="text-lg font-semibold mb-2 text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground flex-grow">{item.description}</p>
                  </Card>
                ))}
              </div>
            </Card>
          </section>

          {/* Pricing Section */}
          <section id="pricing" className="py-16 md:py-24">
            <Card className="w-full shadow-2xl bg-card border-border/40 p-6 md:p-8">
              <SectionTitle><GradientTitle>Flexible Plans for Every Creator</GradientTitle></SectionTitle>
              <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-12">
                Start creating for free with a sample of credits! Need more power? Choose a credit pack or subscribe for unlimited access.
              </p>
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="bg-card-foreground/5 dark:bg-background shadow-lg border-border/20 hover:shadow-xl transition-shadow duration-300 flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-indigo-400">Credit Packs</CardTitle>
                    <CardDescription className="text-muted-foreground">For occasional bursts of creativity.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="mb-4 text-sm text-muted-foreground">Purchase credits as you go. Ideal for specific projects or trying out all features.</p>
                     {/* Placeholder for credit pack details */}
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-6">
                        <li>Access to all AI tools</li>
                        <li>Credits never expire</li>
                        <li>One-time payment</li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700">View Credit Packs</Button>
                  </CardFooter>
                </Card>
                <Card className="bg-card-foreground/5 dark:bg-background shadow-lg border-border/20 hover:shadow-xl transition-shadow duration-300 flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-indigo-400">Unlimited Subscription</CardTitle>
                    <CardDescription className="text-muted-foreground">For the dedicated content machine.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="mb-4 text-sm text-muted-foreground">Unleash your full potential with unlimited access to all generation tools.</p>
                    {/* Placeholder for subscription details */}
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-6">
                        <li>Unlimited generations</li>
                        <li>Priority access (future)</li>
                        <li>Cancel anytime</li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700">Explore Subscriptions</Button>
                  </CardFooter>
                </Card>
              </div>
            </Card>
          </section>
        </div> {/* End of centered content wrapper */}
      </main>

      <footer className="w-full py-8 px-4 border-t border-border/20 mt-16">
        <div className="container mx-auto text-center text-muted-foreground text-sm max-w-5xl">
          <p>&copy; {new Date().getFullYear()} CreatiGen. All rights reserved. Powered by AI, crafted for creators.</p>
        </div>
      </footer>
    </div>
  );
}
