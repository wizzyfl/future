from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from PIL import Image # Added for image manipulation
import databutton as db
import stability_sdk.interfaces.gooseai.generation.generation_pb2 as generation
from stability_sdk import client as stability_client
import uuid
import io # For potential PIL Image conversion if needed by video API

router = APIRouter(
    prefix="/ai-video-generation",
    tags=["AI Video Generation"],
)

class VideoGenerationRequest(BaseModel):
    prompt: str = Field(..., description="Text prompt for video generation.", min_length=1, max_length=2000)
    aspect_ratio: str = Field("16:9", description="Aspect ratio for the video (e.g., '16:9', '1:1', '9:16').")
    quality: str = Field("Standard", description="Quality setting for video generation (e.g., 'Standard', 'High').")
    motion_intensity: str = Field("Medium", description="Motion intensity for the video (e.g., 'Low', 'Medium', 'High').")
    seed: int = Field(0, description="Seed for reproducibility. 0 for random.") # Seed for the initial image generation
    user_id: str | None = Field(None, description="Optional ID of the user requesting the generation.")

class GeneratedVideoData(BaseModel):
    video_path: str = Field(..., description="Relative API path to retrieve the generated video.")
    video_seed: int = Field(..., description="Seed used for the video generation step (artifact.seed).")
    source_image_seed: int = Field(..., description="Seed used for the initial image generation step.")
    # Potentially add thumbnail_path or intermediate_image_path if needed

class VideoGenerationResponse(BaseModel):
    message: str = "Video generation process initiated."
    generated_video: GeneratedVideoData | None = None # Made optional in case of immediate failure

# Endpoints will be added here

@router.post("/generate-video", response_model=VideoGenerationResponse)
async def generate_video(request: VideoGenerationRequest):
    print(f"Received video generation request: {request.prompt[:50]}...")
    print(f"Aspect Ratio: {request.aspect_ratio}, Quality: {request.quality}, Motion: {request.motion_intensity}, Seed: {request.seed}")

    # --- Step 1: Text-to-Image Generation (Placeholder) ---
    # Map aspect ratio to image size
    aspect_ratios_map = {
        "16:9": (1024, 576),
        "1:1": (768, 768), # Or (1024,1024) depending on Stability model used for images
        "9:16": (576, 1024),
        # Add other supported ratios if necessary
    }
    image_width, image_height = aspect_ratios_map.get(request.aspect_ratio, (1024, 576)) # Default to 16:9
    print(f"Target initial image size: {image_width}x{image_height}")

    stability_api_key = db.secrets.get("STABILITY_API_KEY")
    if not stability_api_key:
        print("Error: STABILITY_API_KEY secret not found for video generation.")
        raise HTTPException(status_code=500, detail="Configuration error: Stability AI API key not found.")

    try:
        # TODO: Consider making engine_id for image step configurable or align with video model needs
        image_engine_id = "stable-diffusion-xl-1024-v1-0"
        print(f"Initializing Stability AI client for initial image generation (engine: {image_engine_id})")
        stability_image_connection = stability_client.StabilityInference(
            key=stability_api_key,
            engine=image_engine_id, # Use a suitable image engine
            verbose=True
        )
        
        # Map quality to steps, similar to image generation API
        # Example: "Standard" -> 30 steps, "High" -> 50 steps
        image_steps = 30 if request.quality == "Standard" else 50 

        print(f"Generating initial image with prompt: '{request.prompt[:50]}...', size: {image_width}x{image_height}, steps: {image_steps}, seed: {request.seed}")
        image_answers = stability_image_connection.generate(
            prompt=request.prompt,
            height=image_height,
            width=image_width,
            samples=1, # We need one initial image
            steps=image_steps,
            cfg_scale=7.0, # Standard cfg_scale, can be made configurable
            seed=request.seed if request.seed != 0 else None
        )

        initial_image_bytes = None
        initial_image_seed = 0 # Default if no image generated

        for resp in image_answers:
            for artifact in resp.artifacts:
                if artifact.finish_reason == generation.FILTER:
                    print("Warning: Initial image generation failed content filter.")
                    raise HTTPException(status_code=400, detail="Initial image generation failed content filtering.")
                if artifact.type == generation.ARTIFACT_IMAGE:
                    initial_image_bytes = artifact.binary
                    initial_image_seed = artifact.seed
                    print(f"Initial image generated successfully with seed: {initial_image_seed}")
                    break # Found our image
            if initial_image_bytes: 
                break
        
        if not initial_image_bytes:
            print("Error: Failed to generate initial image.")
            raise HTTPException(status_code=500, detail="Failed to generate initial image for video creation.")

    except HTTPException:
        raise # Re-raise if it's already an HTTPException
    except Exception as e_img:
        print(f"Critical error during initial image generation: {e_img}")
        raise HTTPException(status_code=500, detail=f"Error generating initial image: {str(e_img)}") from e_img

    # --- Step 2: Image-to-Video Generation ---
    try:
        print("Initializing Stability AI client for video generation (Stable Video Diffusion)")
        # Ensure the correct engine for Stable Video Diffusion is used.
        # Common SVD engine might be 'stable-video-diffusion-img2vid' or similar from Stability docs.
        # Let's assume 'stable-video-diffusion-v1-1' or a similar identifier based on research for SVD image-to-video.
        # The SDK might use a different client or method for SVD.
        # For this example, we'll reuse stability_image_connection but this might need adjustment
        # based on how the Python SDK specifically handles SVD calls (it might be a different method or client class).
        
        # This part is highly dependent on the Stability SDK's exact API for SVD.

        # Use a dedicated client for SVD, but do not specify engine at init for SVD as per some examples
        # The generate() method with init_image should infer SVD context
        print(f"Initializing Stability AI client for SVD generation (generic client, SVD inferred by generate())")
        stability_video_connection = stability_client.StabilityInference(
            key=stability_api_key,
            # engine=video_engine_id, # REMOVED: Let generate() handle SVD specifics with init_image
            verbose=True,
        )

        # Map motion_intensity to motion_bucket_id (e.g., Low: 10, Medium: 50, High: 100)
        # These values are illustrative and need to be tuned based on Stability AI's SVD API documentation.
        motion_mapping = {"Low": 30, "Medium": 80, "High": 120} # SVD motion_bucket_id range: 1-255
        motion_bucket_id = motion_mapping.get(request.motion_intensity, 80)

        # Video steps might be different from image steps, SVD defaults to 25 frames output.
        # The 'quality' here might influence cfg_scale for video or other video-specific params.
        video_cfg_scale = 7.0 # Default, can be tuned based on quality
        # video_steps = 25 # SVD's default, related to number of frames generated rather than quality iterations like in images. Commented out as F841

        print(f"Generating video from initial image (seed: {initial_image_seed}). Motion: {motion_bucket_id}, CFG: {video_cfg_scale}")
        
        initial_pil_image = Image.open(io.BytesIO(initial_image_bytes))
        print(f"Initial PIL image size: {initial_pil_image.size}")

        video_answers = stability_video_connection.generate( # Use the video client
            prompt=request.prompt, # Prompt can still guide the video generation
            init_image=initial_pil_image, # Pass the PIL image object
            seed=initial_image_seed, # Use the seed of the initial image for consistency if desired, or a new one for video
            motion_bucket_id=motion_bucket_id,
            cfg_scale=video_cfg_scale,
            # SVD typically doesn't take 'steps' in the same way as image generation for quality iterations.
            # The number of frames is often fixed or controlled by other parameters not exposed here, or inherent to the model.
            # width and height are also derived from the init_image for SVD.
        )

        generated_video_bytes = None
        video_artifact_seed_used = 0

        for resp in video_answers:
            for artifact in resp.artifacts:
                if artifact.finish_reason == generation.FILTER:
                    print("Warning: Video generation failed content filter.")
                    # No specific HTTP error here yet, might let it proceed to no video found
                    continue
                if artifact.type == generation.ARTIFACT_VIDEO:
                    generated_video_bytes = artifact.binary
                    video_artifact_seed_used = artifact.seed
                    print(f"Video generated successfully with seed: {video_artifact_seed_used}")
                    break
            if generated_video_bytes:
                break
        
        if not generated_video_bytes:
            print("Error: Failed to generate video from image.")
            raise HTTPException(status_code=500, detail="Failed to generate video from the initial image.")

        # Store the video
        video_filename = f"video_{request.user_id or 'anon'}_{uuid.uuid4().hex[:8]}.mp4"
        db.storage.binary.put(video_filename, generated_video_bytes)
        video_api_path = f"/ai-video-generation/videos/{video_filename}" # Placeholder for actual serving endpoint
        print(f"Video stored at: {video_filename}, API path: {video_api_path}")

        return VideoGenerationResponse(
            message="Video generated successfully.",
            generated_video=GeneratedVideoData(
                video_path=video_api_path, # This needs to be a real serveable path later
                video_seed=video_artifact_seed_used,
                source_image_seed=initial_image_seed
            )
        )

    except HTTPException:
        raise # Re-raise if it's already an HTTPException
    except Exception as e_vid:
        print(f"Critical error during video generation: {e_vid}")
        raise HTTPException(status_code=500, detail=f"Error generating video: {str(e_vid)}") from e_vid

@router.get("/videos/{filename}", tags=["stream"])
async def get_video_file(filename: str):
    print(f"Attempting to serve video file: {filename}")
    try:
        video_bytes = db.storage.binary.get(key=filename)
        if not video_bytes:
            print(f"Video file not found in db.storage: {filename}")
            raise HTTPException(status_code=404, detail="Video not found")

        video_stream = io.BytesIO(video_bytes)
        return StreamingResponse(video_stream, media_type="video/mp4")

    except HTTPException:
        raise # Re-raise if it's already an HTTPException 
    except Exception as e:
        print(f"Error serving video file {filename}: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve video file.") from e

