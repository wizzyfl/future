import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Added for navigation
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import brain from "brain";
import { API_URL } from "app"; // Import API_URL
import { GeneratedVideoData, VideoGenerationRequest } from "types";
import { ArrowLeft, Coins } from "lucide-react"; // Added for back button icon and Coins icon
import { useUserStore } from "utils/useUserStore"; // Import user store

const aspectRatios = ["16:9", "1:1", "9:16", "4:5", "3:4", "2:3"];
const qualities = ["Standard", "High"];
const motionIntensities = ["Low", "Medium", "High"];

const VIDEO_GENERATION_COST = 5; // Define cost for video generation

export default function VideoMakerPage() {
  const navigate = useNavigate(); 
  const { userProfile, decrementCredits } = useUserStore(); // Get user profile and decrement function

  const [prompt, setPrompt] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<string>(aspectRatios[0]);
  const [quality, setQuality] = useState<string>(qualities[0]);
  const [motionIntensity, setMotionIntensity] = useState<string>(motionIntensities[1]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideoData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateVideo = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt.");
      return;
    }

    if (!userProfile || userProfile.credits === undefined) {
      toast.error("User profile or credits not loaded. Please try again or re-login.");
      if (!userProfile) navigate('/login-page');
      return;
    }

    if (userProfile.credits < VIDEO_GENERATION_COST) {
      toast.error(`Insufficient credits. You need ${VIDEO_GENERATION_COST} credit(s) for this action. You have ${userProfile.credits}.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedVideo(null);

    const requestBody: VideoGenerationRequest = {
      prompt,
      aspect_ratio: aspectRatio,
      quality,
      motion_intensity: motionIntensity,
      seed: 0, 
      user_id: userProfile.id, // Pass user_id
    };

    try {
      const response = await brain.generate_video(requestBody);
      const data = await response.json();
      
      if (response.ok && data.generated_video) {
        setGeneratedVideo(data.generated_video);
        decrementCredits(VIDEO_GENERATION_COST); // Decrement credits on success
        toast.success(data.message || "Video generated successfully!");
        // Optionally add to generations store if implemented for videos
      } else {
        const errorDetail = data.detail || (data.errors && data.errors[0]?.message) || "Failed to generate video.";
        throw new Error(errorDetail);
      }
    } catch (err: any) {
      console.error("Error generating video:", err);
      const errorMessage = err.response?.data?.detail || err.message || "An unexpected error occurred.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 py-8 md:p-12">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-8 w-full flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate(-1)} className="bg-card hover:bg-accent border-border/40">
            <ArrowLeft size={18} className="mr-2" /> Back to Dashboard
          </Button>
          {userProfile && (
            <div className="flex items-center space-x-2 bg-card border border-border/40 px-3 py-2 rounded-lg shadow-sm">
              <Coins size={18} className="text-indigo-400" />
              <span className="text-sm font-medium text-muted-foreground">Credits:</span>
              <span className="text-sm font-semibold text-indigo-400">{userProfile.credits ?? 0}</span>
            </div>
          )}
        </div>
        <Card className="w-full shadow-2xl bg-card border-border/40">
          <CardHeader className="text-center border-b border-border/20 pb-6">
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
              AI Video Animator
            </h1>
            <CardDescription className="text-md text-muted-foreground mt-3">
              Turn text into short cinematic clips. Describe your scene, choose settings, and let AI bring it to life.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <Label htmlFor="prompt" className="text-lg font-medium">Your Prompt</Label>
              <Input
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A futuristic cityscape at sunset, cinematic lighting"
                className="text-base p-3 bg-background/50 border-border/50"
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aspectRatio" className="font-medium">Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={isLoading}>
                  <SelectTrigger id="aspectRatio" className="text-base p-3 bg-background/50 border-border/50">
                    <SelectValue placeholder="Select aspect ratio" />
                  </SelectTrigger>
                  <SelectContent>
                    {aspectRatios.map((ratio) => (
                      <SelectItem key={ratio} value={ratio} className="text-base">
                        {ratio}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quality" className="font-medium">Quality</Label>
                <Select value={quality} onValueChange={setQuality} disabled={isLoading}>
                  <SelectTrigger id="quality" className="text-base p-3 bg-background/50 border-border/50">
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                  <SelectContent>
                    {qualities.map((q) => (
                      <SelectItem key={q} value={q} className="text-base">
                        {q}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motionIntensity" className="font-medium">Motion Intensity</Label>
                <Select value={motionIntensity} onValueChange={setMotionIntensity} disabled={isLoading}>
                  <SelectTrigger id="motionIntensity" className="text-base p-3 bg-background/50 border-border/50">
                    <SelectValue placeholder="Select motion intensity" />
                  </SelectTrigger>
                  <SelectContent>
                    {motionIntensities.map((intensity) => (
                      <SelectItem key={intensity} value={intensity} className="text-base">
                        {intensity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-4 pt-6 border-t border-border/20">
            <Button onClick={handleGenerateVideo} disabled={isLoading} className="w-full md:w-2/3 text-lg p-6 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 font-semibold">
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Video...
                </>
              ) : (
                `Generate Video (${VIDEO_GENERATION_COST} Cr)`
              )}
            </Button>
            {error && (
              <p className="text-red-500 dark:text-red-400 text-sm text-center pt-2">Error: {error}</p>
            )}
          </CardFooter>
        </Card>

        {generatedVideo && (
          <Card className="w-full mt-8 shadow-xl bg-card border-border/40">
            <CardHeader className="border-b border-border/20 pb-4">
              <CardTitle className="text-2xl font-semibold text-center">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">Generated Video</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center items-center p-4 bg-black/10">
              <video controls key={generatedVideo.video_path} className="max-w-full rounded-lg aspect-video border border-border/20 shadow-md">
                <source src={`${API_URL}${generatedVideo.video_path.startsWith('/') ? generatedVideo.video_path : `/${generatedVideo.video_path}`}`} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground text-center justify-center pt-3 pb-3 border-t border-border/20">
              <p>Video Seed: {generatedVideo.video_seed}, Source Image Seed: {generatedVideo.source_image_seed}</p>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
