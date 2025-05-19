import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import brain from "brain";
import { 
  ImageGenerationRequest, 
  GeneratedImageData as ApiGeneratedImageData,
  BodyEditImageWithPrompt, // Assuming this type is correctly defined in types.ts or brain data-contracts
} from "types"; 
import { useUserStore } from "utils/useUserStore";
import { toast } from "sonner";
import { useGenerationsStore } from "utils/useGenerationsStore";
import { API_URL } from "app";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { PromptInput } from "components/PromptInput"; // Ensure this component is also themed or uses themed sub-components
import { UploadCloud, Wand2, Edit, ArrowLeft, XSquare, Trash2 } from "lucide-react"; 

interface GeneratedImageDisplayData {
  id: string;
  src: string;
  alt: string;
  seed?: number;
  apiPath?: string;
}

const IMAGE_GENERATION_COST = 1; 
const IMAGE_EDIT_COST = 1; 

type GenerationMode = "text-to-image" | "image-to-image" | "select-mode";

const GradientText: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={`bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 ${className}`}>
    {children}
  </span>
);

const ImageGeneratorPage: React.FC = () => {
  const [generationMode, setGenerationMode] = useState<GenerationMode>("select-mode");
  
  const [prompt, setPrompt] = useState<string>("");
  const [negativePrompt, setNegativePrompt] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<string>("1024x1024");
  const [seed, setSeed] = useState<number>(0);
  const [numImages, setNumImages] = useState<number>(1);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageDisplayData[]>([]);
  
  const [editPrompt, setEditPrompt] = useState<string>("");
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
  const [uploadedImagePreviewUrl, setUploadedImagePreviewUrl] = useState<string | null>(null);
  const [imageStrength, setImageStrength] = useState<number>(0.35); 
  const [editedImages, setEditedImages] = useState<GeneratedImageDisplayData[]>([]);
  const [originalImageForEditDisplay, setOriginalImageForEditDisplay] = useState<GeneratedImageDisplayData | null>(null);
  const [editNegativePrompt, setEditNegativePrompt] = useState<string>("");
  const [editSeed, setEditSeed] = useState<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { addGeneration } = useGenerationsStore.getState();
  const { userProfile, decrementCredits } = useUserStore(); // Get profile directly
  const navigate = useNavigate();

  useEffect(() => {
    // Revoke object URL on cleanup
    return () => {
      if (uploadedImagePreviewUrl) {
        URL.revokeObjectURL(uploadedImagePreviewUrl);
      }
    };
  }, [uploadedImagePreviewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (uploadedImagePreviewUrl) URL.revokeObjectURL(uploadedImagePreviewUrl);
      setUploadedImageFile(file);
      setUploadedImagePreviewUrl(URL.createObjectURL(file));
      setEditedImages([]); 
      setOriginalImageForEditDisplay(null);
    }
  };

  const clearUploadedImage = useCallback(() => {
    if (uploadedImagePreviewUrl) URL.revokeObjectURL(uploadedImagePreviewUrl);
    setUploadedImageFile(null);
    setUploadedImagePreviewUrl(null);
    setEditedImages([]);
    setOriginalImageForEditDisplay(null);
  }, [uploadedImagePreviewUrl]);

  const checkCreditsAndProceed = (cost: number): boolean => {
    if (!userProfile || userProfile.credits === undefined) {
      toast.error("User profile or credits not loaded. Please try again or re-login.");
      // Optionally navigate to login if userProfile is entirely missing
      if (!userProfile) navigate('/login-page'); 
      return false;
    }
    if (userProfile.credits < cost) {
      toast.error(`Insufficient credits. You need ${cost} credit(s) for this action. You have ${userProfile.credits}.`);
      return false;
    }
    return true;
  };

  const handleTextToImageSubmit = async (submittedPrompt: string) => {
    if (!userProfile?.id) { /* Ensure userProfile.id exists */
      toast.error("User ID not found. Please re-login.");
      navigate('/login-page');
      return;
    }
    const totalCost = IMAGE_GENERATION_COST * numImages;
    if (!checkCreditsAndProceed(totalCost)) return;
    if (!submittedPrompt.trim()) {
      toast.error("Please enter a prompt.");
      return;
    }
    setIsLoading(true);
    setGeneratedImages([]);
    try {
      const requestBody: ImageGenerationRequest = {
        prompt: submittedPrompt,
        negative_prompt: negativePrompt || undefined,
        user_id: userProfile.id,
        n: numImages,
        size: aspectRatio,
        seed: seed === 0 ? undefined : seed,
      };
      const response = await brain.generate_image(requestBody);
      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorResult.detail || "Failed to generate image.");
      }
      const result = await response.json();
      if (!result.generated_images || result.generated_images.length === 0) {
        throw new Error("No images returned by API.");
      }
      const newDisplayImages: GeneratedImageDisplayData[] = result.generated_images.map((item: ApiGeneratedImageData) => ({
        id: item.image_path, 
        src: `${API_URL}${item.image_path.startsWith('/') ? item.image_path : `/${item.image_path}`}`,
        alt: submittedPrompt,
        seed: item.seed,
        apiPath: item.image_path,
      }));
      setGeneratedImages(newDisplayImages);
      decrementCredits(totalCost);
      addGeneration({ 
        userId: userProfile.id,
        type: "text-to-image",
        prompt: submittedPrompt,
        negativePrompt: negativePrompt || undefined,
        settings: { aspectRatio, numImages, seed },
        result: { imageUrls: newDisplayImages.map(img => img.src), apiPaths: newDisplayImages.map(img => img.apiPath) },
        cost: totalCost,
       });
      toast.success(`${newDisplayImages.length} image(s) generated!`);
    } catch (error) {
      console.error("Text-to-image error:", error);
      toast.error(error instanceof Error ? error.message : "Unknown error during generation.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageToImageSubmit = async (submittedEditPrompt: string) => {
    if (!uploadedImageFile) {
      toast.error("Please upload an image to edit."); return;
    }
    if (!submittedEditPrompt.trim()) {
      toast.error("Please enter a prompt to describe your edits."); return;
    }
    if (!userProfile?.id) { /* Ensure userProfile.id exists */
        toast.error("User ID not found. Please re-login.");
        navigate('/login-page');
        return;
    }
    if (!checkCreditsAndProceed(IMAGE_EDIT_COST)) return;
    
    setIsLoading(true);
    setEditedImages([]);
    // Keep originalImageForEditDisplay if it's already set and user is trying another prompt
    if (!originalImageForEditDisplay && uploadedImagePreviewUrl) {
        setOriginalImageForEditDisplay({
            id: "original-" + Date.now(),
            src: uploadedImagePreviewUrl, 
            alt: "Original uploaded image",
        });
    }

    try {
      const requestPayload: BodyEditImageWithPrompt = {
        image_file: uploadedImageFile,
        prompt: submittedEditPrompt,
        user_id: userProfile.id,
        image_strength: imageStrength,
        ...(editNegativePrompt && { negative_prompt: editNegativePrompt }),
        ...(editSeed && editSeed !== 0 && { seed: editSeed }),
      };

      const response = await brain.edit_image_with_prompt(requestPayload); 

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorResult.detail || "Failed to edit image.");
      }
      const result = await response.json(); 
      
      if (!result.edited_images || result.edited_images.length === 0) {
        throw new Error("No edited images returned by API.");
      }
      // Update original image with path from backend if available
      if (result.original_image_path && uploadedImagePreviewUrl) {
        setOriginalImageForEditDisplay({
            id: "original-" + Date.now(),
            src: uploadedImagePreviewUrl, 
            alt: "Original uploaded image",
            apiPath: result.original_image_path
        });
      }

      const newEditedImages: GeneratedImageDisplayData[] = result.edited_images.map((item: ApiGeneratedImageData) => ({
        id: item.image_path,
        src: `${API_URL}${item.image_path.startsWith('/') ? item.image_path : `/${item.image_path}`}`,
        alt: submittedEditPrompt,
        seed: item.seed,
        apiPath: item.image_path,
      }));
      setEditedImages(newEditedImages);
      decrementCredits(IMAGE_EDIT_COST * newEditedImages.length);
      addGeneration({ 
        userId: userProfile.id,
        type: "image-to-image",
        prompt: submittedEditPrompt,
        negativePrompt: editNegativePrompt || undefined,
        settings: { imageStrength, originalImagePath: result.original_image_path, seed: editSeed },
        result: { imageUrls: newEditedImages.map(img => img.src), apiPaths: newEditedImages.map(img => img.apiPath) },
        cost: IMAGE_EDIT_COST * newEditedImages.length,
      });
      toast.success(`${newEditedImages.length} image(s) edited successfully!`);

    } catch (error) {
      console.error("Image-to-image error:", error);
      toast.error(error instanceof Error ? error.message : "Unknown error during image editing.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Mode Selector View
  if (generationMode === "select-mode") {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 py-8 md:p-12 flex flex-col items-center">
        <div className="container mx-auto max-w-2xl w-full">
          <div className="mb-8 w-full flex justify-start">
            <Button variant="outline" onClick={() => navigate(-1)} className="bg-card hover:bg-accent border-border/40">
              <ArrowLeft size={18} className="mr-2" /> Back to Dashboard
            </Button>
          </div>
          <Card className="w-full shadow-2xl bg-card border-border/40">
            <CardHeader className="text-center pt-8 pb-6 border-b border-border/20">
              <CardTitle className="text-3xl md:text-4xl font-extrabold tracking-tight">
                <GradientText>Choose Your Creative Path</GradientText>
              </CardTitle>
              <CardDescription className="text-lg text-muted-foreground mt-3">
                How would you like to generate an image today?
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 md:p-8">
              <Button 
                variant="outline" 
                className="h-auto p-8 flex flex-col items-center justify-center space-y-3 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 transition-all duration-200 rounded-xl border-2 border-dashed border-border/50 hover:border-indigo-500 focus:ring-2 focus:ring-indigo-500 text-foreground hover:text-indigo-400"
                onClick={() => setGenerationMode("text-to-image")}
              >
                <Wand2 size={40} className="mb-3 text-indigo-400" />
                <span className="text-xl font-semibold">Create Image from Text</span>
                <span className="text-sm text-muted-foreground text-center">Describe your vision and let AI bring it to life.</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-8 flex flex-col items-center justify-center space-y-3 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 transition-all duration-200 rounded-xl border-2 border-dashed border-border/50 hover:border-indigo-500 focus:ring-2 focus:ring-indigo-500 text-foreground hover:text-indigo-400"
                onClick={() => setGenerationMode("image-to-image")}
              >
                <Edit size={40} className="mb-3 text-indigo-400" />
                <span className="text-xl font-semibold">Edit Your Image with Text</span>
                <span className="text-sm text-muted-foreground text-center">Upload a photo and transform it with a text prompt.</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main Generator/Editor View
  return (
    <div className="min-h-screen bg-background text-foreground p-4 py-8 md:p-12">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <Button variant="outline" onClick={() => generationMode === 'select-mode' ? navigate(-1) : setGenerationMode("select-mode")} className="bg-card hover:bg-accent border-border/40">
            <ArrowLeft size={18} className="mr-2" /> {generationMode === 'select-mode' ? 'Back to Dashboard' : 'Change Mode'}
          </Button>
        </div>
        <header className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
            <GradientText>{generationMode === "text-to-image" ? "AI Image Generator" : "AI Image Editor"}</GradientText>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {generationMode === "text-to-image" 
              ? "Turn your textual descriptions into stunning visual art. Define your prompt, select options, and watch your ideas materialize."
              : "Upload an image and transform it using text prompts. Adjust strength and settings to achieve the perfect edit."}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-card shadow-xl border-border/40">
              <CardHeader className="border-b border-border/20 pb-4">
                <CardTitle className="text-2xl font-semibold">
                  {generationMode === "text-to-image" ? "Craft Your Vision" : "Define Your Edits"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {generationMode === "text-to-image" && (
                  <>
                    <div>
                      <PromptInput
                        value={prompt}
                        onValueChange={setPrompt}
                        onSubmit={handleTextToImageSubmit}
                        isLoading={isLoading}
                        contentType="image"
                        placeholderText="E.g., A cinematic shot of a raccoon astronaut..."
                        submitButtonText={isLoading ? "Generating..." : `Generate (${IMAGE_GENERATION_COST * numImages} Cr)`}
                        submitButtonClassName="bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                        maxChars={2000}
                      />
                    </div>
                    <div>
                      <Label htmlFor="negative-prompt" className="text-sm font-medium">Negative Prompt (Optional)</Label>
                      <Input id="negative-prompt" value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} placeholder="E.g., blurry, ugly, text, watermark" className="mt-1 bg-background/50 border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aspect-ratio">Aspect Ratio</Label>
                      <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={isLoading}>
                        <SelectTrigger id="aspect-ratio" className="bg-background/50 border-border/50"><SelectValue placeholder="Select aspect ratio" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1024x1024">Square (1024x1024)</SelectItem>
                          <SelectItem value="512x512">Small Square (512x512)</SelectItem>
                          <SelectItem value="1152x896">Landscape 4:3 (1152x896)</SelectItem>
                          <SelectItem value="896x1152">Portrait 3:4 (896x1152)</SelectItem>
                          <SelectItem value="1216x832">Landscape 3:2 (1216x832)</SelectItem>
                          <SelectItem value="832x1216">Portrait 2:3 (832x1216)</SelectItem>
                          <SelectItem value="1344x768">Landscape 16:9 (1344x768)</SelectItem>
                          <SelectItem value="768x1344">Portrait 9:16 (768x1344)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seed">Seed (0 for random)</Label>
                      <Input id="seed" type="number" value={String(seed)} onChange={(e) => setSeed(parseInt(e.target.value, 10) || 0)} className="mt-1 bg-background/50 border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="num-images">Number of Images</Label>
                      <Select value={String(numImages)} onValueChange={(val) => setNumImages(parseInt(val))} disabled={isLoading}>
                        <SelectTrigger id="num-images" className="bg-background/50 border-border/50"><SelectValue placeholder="Select number" /></SelectTrigger>
                        <SelectContent>
                          {[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n} Image(s)</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {generationMode === "image-to-image" && (
                  <>
                    <div>
                      <Label htmlFor="image-upload" className="text-sm font-medium">1. Upload Image</Label>
                      <Input id="image-upload" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} className="mt-1 w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-500 file:text-indigo-50 hover:file:bg-indigo-600 cursor-pointer bg-background/50 border-border/50"/>
                      {uploadedImagePreviewUrl && (
                        <div className="mt-4 relative group aspect-square border border-border/50 rounded-lg overflow-hidden bg-black/10">
                          <img src={uploadedImagePreviewUrl} alt="Uploaded preview" className="w-full h-full object-contain" />
                          <Button variant="destructive" size="icon" onClick={clearUploadedImage} className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity w-8 h-8 z-10">
                            <XSquare size={18} />
                          </Button>
                        </div>
                      )}
                    </div>
                    {uploadedImageFile && (
                      <>
                        <div className="border-t border-border/20 pt-6">
                          <Label htmlFor="edit-prompt" className="text-sm font-medium">2. Describe Your Edits</Label>
                          <PromptInput
                            value={editPrompt} 
                            onValueChange={setEditPrompt}
                            onSubmit={handleImageToImageSubmit} 
                            isLoading={isLoading}
                            contentType="image" 
                            placeholderText="E.g., Make it look like a Van Gogh painting..."
                            submitButtonText={isLoading ? "Editing..." : `Edit Image (${IMAGE_EDIT_COST} Cr)`}
                            submitButtonClassName="bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                            maxChars={2000}
                            id="edit-prompt"
                          />
                        </div>
                        <div>
                          <Label htmlFor="image-strength" className="text-sm font-medium">3. Edit Intensity</Label>
                          <Slider 
                            id="image-strength" 
                            min={0.05} 
                            max={0.95} 
                            step={0.01} 
                            value={[imageStrength]} 
                            onValueChange={(value) => setImageStrength(value[0])} 
                            className="mt-2 py-2"
                            disabled={isLoading}
                          />
                          <p className="text-xs text-muted-foreground mt-1 text-center">Current intensity: {imageStrength.toFixed(2)} (Low: subtle edits, High: major changes)</p>
                        </div>
                        <div>
                            <Label htmlFor="negative-prompt-edit" className="text-sm font-medium">Negative Prompt (Optional)</Label>
                            <Input id="negative-prompt-edit" value={editNegativePrompt} onChange={(e) => setEditNegativePrompt(e.target.value)} placeholder="E.g., blurry, artifacts, text" className="mt-1 bg-background/50 border-border/50" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="seed-edit">Seed (0 for random)</Label>
                            <Input id="seed-edit" type="number" value={String(editSeed)} onChange={(e) => setEditSeed(parseInt(e.target.value, 10) || 0)} className="mt-1 bg-background/50 border-border/50" />
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {/* Placeholder/Loading for Text-to-Image */} 
            {generationMode === "text-to-image" && isLoading && generatedImages.length === 0 && (
              <div className={`grid grid-cols-1 ${numImages > 1 ? 'sm:grid-cols-2' : ''} gap-6`}>
                {[...Array(numImages)].map((_, i) => (
                  <Card key={i} className="aspect-square bg-card/50 border-border/20 animate-pulse rounded-xl shadow-lg flex items-center justify-center">
                    <div className="text-center">
                      <Wand2 size={48} className="text-muted-foreground/30 mx-auto mb-3 animate-pulse" />
                      <p className="text-muted-foreground font-medium">Generating Image {i+1}...</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {generationMode === "text-to-image" && !isLoading && generatedImages.length === 0 && (
              <Card className="bg-card border-2 border-dashed border-border/30 aspect-[4/3] flex flex-col items-center justify-center rounded-xl shadow-lg p-8">
                <CardHeader className="text-center pb-4">
                  <Wand2 size={64} className="text-indigo-400/50 mx-auto mb-4" />
                  <CardTitle className="text-2xl font-semibold">Creations Appear Here</CardTitle>
                  <CardDescription className="text-muted-foreground mt-2">Enter a prompt and settings, then click "Generate".</CardDescription>
                </CardHeader>
              </Card>
            )}
            {/* Display Text-to-Image Results */} 
            {generationMode === "text-to-image" && generatedImages.length > 0 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-semibold"><GradientText>Results ({generatedImages.length})</GradientText></h2>
                  <Button variant="outline" onClick={() => setGeneratedImages([])} className="border-border/50 hover:bg-accent">
                    <Trash2 size={16} className="mr-2"/> Clear All
                  </Button>
                </div>
                <div className={`grid grid-cols-1 ${generatedImages.length > 1 ? 'sm:grid-cols-2' : ''} gap-6`}>
                  {generatedImages.map((image) => (
                    <Card key={image.id} className="overflow-hidden bg-card group relative rounded-xl shadow-xl border-border/40 aspect-square">
                      <img src={image.src} alt={image.alt} className="w-full h-full object-cover" />
                      {/* Future: Add overlay for actions like download, upscale, edit */}
                      <CardFooter className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <p className="text-xs text-white/80">Seed: {image.seed}</p>
                        {/* Add download button here */}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Placeholder/Loading for Image-to-Image */} 
            {generationMode === "image-to-image" && isLoading && editedImages.length === 0 && (
              <Card className="aspect-square bg-card/50 border-border/20 animate-pulse rounded-xl shadow-lg flex items-center justify-center">
                 <div className="text-center">
                    <Edit size={48} className="text-muted-foreground/30 mx-auto mb-3 animate-pulse" />
                    <p className="text-muted-foreground font-medium">Editing Your Image...</p>
                  </div>
              </Card>
            )}
            {generationMode === "image-to-image" && !isLoading && !uploadedImageFile && (
              <Card className="bg-card border-2 border-dashed border-border/30 aspect-[4/3] flex flex-col items-center justify-center rounded-xl shadow-lg p-8">
                <CardHeader className="text-center pb-4">
                  <UploadCloud size={64} className="text-indigo-400/50 mx-auto mb-4" />
                  <CardTitle className="text-2xl font-semibold">Upload an Image to Edit</CardTitle>
                  <CardDescription className="text-muted-foreground mt-2">Choose an image file to start the magic.</CardDescription>
                </CardHeader>
              </Card>
            )}
            {generationMode === "image-to-image" && uploadedImageFile && editedImages.length === 0 && !isLoading && (
              <Card className="bg-card border-2 border-dashed border-border/30 aspect-auto flex flex-col items-center justify-center rounded-xl shadow-lg p-8">
                <CardHeader className="text-center pb-4">
                  <img src={uploadedImagePreviewUrl!} alt="Ready to edit" className="max-h-60 md:max-h-80 rounded-lg border border-border/50 object-contain mb-6 shadow-md"/>
                  <CardTitle className="text-2xl font-semibold">Describe Your Edits</CardTitle>
                  <CardDescription className="text-muted-foreground mt-2">Your image is ready. Enter a prompt and click "Edit Image".</CardDescription>
                </CardHeader>
              </Card>
            )}
            {/* Display Image-to-Image Results */} 
            {generationMode === "image-to-image" && (editedImages.length > 0 || originalImageForEditDisplay) && (
              <div className="space-y-8">
                  {originalImageForEditDisplay && (
                      <div>
                          <h2 className="text-xl font-semibold mb-4 text-center"><GradientText>Original Image</GradientText></h2>
                          <Card className="overflow-hidden bg-card group relative max-w-md mx-auto rounded-xl shadow-xl border-border/40 aspect-square">
                              <img src={originalImageForEditDisplay.src} alt={originalImageForEditDisplay.alt} className="w-full h-full object-contain" />
                          </Card>
                      </div>
                  )}
                  {editedImages.length > 0 && (
                      <div className={`${originalImageForEditDisplay ? 'mt-12' : ''}`}>
                          <div className="flex justify-between items-center mb-4">
                              <h2 className="text-2xl font-semibold"><GradientText>Edited Result(s) ({editedImages.length})</GradientText></h2>
                              <Button variant="outline" onClick={() => setEditedImages([])} className="border-border/50 hover:bg-accent">
                                 <Trash2 size={16} className="mr-2"/> Clear Results
                              </Button>
                          </div>
                          <div className={`grid grid-cols-1 ${editedImages.length > 1 ? 'sm:grid-cols-2' : ''} gap-6`}>
                              {editedImages.map((image) => (
                              <Card key={image.id} className="overflow-hidden bg-card group relative rounded-xl shadow-xl border-border/40 aspect-square">
                                  <img src={image.src} alt={image.alt} className="w-full h-full object-cover" />
                                  <CardFooter className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <p className="text-xs text-white/80">Seed: {image.seed}</p>
                                  </CardFooter>
                              </Card>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGeneratorPage;
