import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { useUserStore } from 'utils/useUserStore';
import { auth } from 'utils/firestoreService';
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Clapperboard, Voicemail, FileText, Icon as LucideIcon, AlertTriangle, Info, LogOut, RefreshCw } from "lucide-react";

interface FeatureCard {
  name: string;
  path: string;
  description: string;
  icon: LucideIcon;
}

const generatorFeatures: FeatureCard[] = [
  { name: "AI Image Generator", path: "/image-generator-page", description: "Create stunning visuals from text prompts.", icon: Zap },
  { name: "AI Video Maker", path: "/video-maker-page", description: "Turn text into short cinematic clips.", icon: Clapperboard },
  { name: "Voice Generator", path: "/voice-generator-page", description: "Make realistic voiceovers from your scripts.", icon: Voicemail },
  { name: "AI Writer", path: "/ai-writer-page", description: "Generate social media posts, captions, and more.", icon: FileText },
];

const GradientText: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={`bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 ${className}`}>
    {children}
  </span>
);

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, isLoading, error, fetchUserProfile } = useUserStore();

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        if (!userProfile || userProfile.id !== firebaseUser.uid) {
          await fetchUserProfile(firebaseUser.uid);
        }
      } else {
        navigate("/"); // Navigate to home/login if not authenticated
      }
    });
    return () => unsubscribe();
  }, [navigate, fetchUserProfile, userProfile]);

  // Skeleton Loading State
  if (isLoading && !userProfile) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 py-8 md:p-12 flex flex-col items-center">
        <div className="container mx-auto max-w-3xl w-full">
          <header className="mb-12 text-center">
            <Skeleton className="h-12 w-4/5 mb-4 mx-auto" />
            <Skeleton className="h-8 w-3/5 mx-auto" />
          </header>
          <section>
            <Skeleton className="h-10 w-1/2 mb-10 mx-auto" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="bg-card shadow-lg border-border/20 p-4">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-7 w-3/4" /> 
                    <Skeleton className="h-7 w-7 rounded-md" />
                  </CardHeader>
                  <CardContent className="pt-2">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6 mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 py-8 md:p-12 flex flex-col items-center justify-center">
        <Card className="w-full max-w-lg p-6 md:p-8 bg-card shadow-2xl border-destructive">
            <CardHeader className="text-center pb-4">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <CardTitle className="text-2xl text-destructive">Error Loading Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
                <p className="mb-4 text-muted-foreground">Could not fetch your profile data: {error.message}</p>
                <Button 
                    variant="destructive" 
                    onClick={() => auth().signOut().then(() => navigate('/'))} 
                    className="mt-6 w-full"
                >
                    <LogOut size={18} className="mr-2" /> Logout & Try Again
                </Button>
            </CardContent>
        </Card>
      </div>
    );
  }
  
  // Authenticated but profile data is missing or incomplete
  if (auth().currentUser && (!userProfile || !userProfile.name || userProfile.credits === undefined) && !isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 py-8 md:p-12 flex flex-col items-center justify-center">
        <Card className="w-full max-w-lg p-6 md:p-8 bg-card shadow-2xl border-border/40">
          <CardHeader className="text-center pb-4">
            <Info className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
            <CardTitle className="text-2xl"><GradientText>Welcome, Creator!</GradientText></CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              We're having a bit of trouble loading your full profile details (like your name and credits).
              Please try refreshing or logging out and back in.
            </p>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
              <Button 
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full hover:bg-accent border-border/50"
              >
                <RefreshCw size={18} className="mr-2" /> Refresh Page
              </Button>
              <Button 
                onClick={() => auth().signOut().then(() => navigate('/'))} 
                className="w-full bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700"
              >
                <LogOut size={18} className="mr-2" /> Logout & Try Again
              </Button>
            </div>
            <p className="text-xs text-muted-foreground pt-4">
              If the problem persists, please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback for user not fully loaded or not authenticated (should be caught by useEffect redirect)
  if (!userProfile) {
    return (
        <div className="min-h-screen bg-background text-foreground p-4 flex items-center justify-center">
            <p className="text-muted-foreground">Loading user data or redirecting...</p> 
        </div>
    );
  }

  // Main Dashboard View
  return (
    <div className="min-h-screen bg-background text-foreground p-4 py-8 md:p-12 flex flex-col items-center">
      <div className="container mx-auto max-w-3xl w-full">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 tracking-tight">
            <GradientText>Welcome back, {userProfile.name || 'Creator'}!</GradientText>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            You have <span className="font-semibold text-indigo-400">{userProfile.credits ?? 0}</span> credits remaining.
          </p>
        </header>

        <section>
          <h2 className="text-3xl font-bold mb-10 text-center tracking-tight">
            <GradientText>Start Creating</GradientText>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
            {generatorFeatures.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <Card 
                  key={feature.name} 
                  className="bg-card shadow-xl border-border/40 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col group p-1" // Added p-1 for inner content spacing from border
                  onClick={() => navigate(feature.path)}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5">
                    <CardTitle className="text-xl font-semibold group-hover:text-indigo-400 transition-colors duration-200">{feature.name}</CardTitle>
                    <IconComponent className="h-7 w-7 text-muted-foreground group-hover:text-indigo-400 transition-colors duration-200" />
                  </CardHeader>
                  <CardContent className="pt-2 pb-5 px-5 flex-grow flex flex-col">
                    <p className="text-sm text-muted-foreground mb-4 flex-grow">{feature.description}</p>
                    <Button 
                        variant="outline"
                        className="w-full mt-auto border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 dark:hover:bg-indigo-500/20 group-hover:border-indigo-500/70 transition-all duration-200"
                    >
                        Open {feature.name.split(' ')[0]}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
