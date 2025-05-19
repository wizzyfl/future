import asyncio
import databutton as db
from fastapi import APIRouter, HTTPException, Body, Depends, File, UploadFile, Form
from fastapi.responses import Response # Added for returning image bytes
from pydantic import BaseModel, Field
import stability_sdk.interfaces.gooseai.generation.generation_pb2 as generation
from stability_sdk import client as stability_client
import io
import uuid
import os

router = APIRouter(prefix="/ai-image-generation", tags=["AI Image Generation"])

class ImageGenerationRequest(BaseModel):
    prompt: str = Field(..., description="The text prompt for image generation.", min_length=1, max_length=2000)
    user_id: str | None = Field(None, description="Optional ID of the user requesting the generation.")
    n: int = Field(1, description="Number of images to generate.", ge=1, le=10)
    size: str = Field("1024x1024", description="The size of the generated images. e.g., \'1024x1024\', \'512x512\'.")
    engine_id: str = Field("stable-diffusion-xl-1024-v1-0", description="Stability AI engine ID.")
    steps: int = Field(30, description="Number of diffusion steps.", ge=10, le=150)
    cfg_scale: float = Field(7.0, description="Classifier Free Guidance scale.", ge=0, le=35)
    seed: int = Field(0, description="Seed for reproducibility. 0 for random.")

class GeneratedImageData(BaseModel):
    # url: str = Field(..., description="Public URL of the generated image.")
    image_path: str = Field(..., description="Relative API path to retrieve the generated image.")
    seed: int = Field(..., description="Seed of the generated artifact.")

class ImageGenerationResponse(BaseModel):
    message: str = "Image generation process initiated."
    generated_images: list[GeneratedImageData] = Field(..., description="List of generated images with their API paths and seeds.")

class ImageEditRequest(BaseModel):
    prompt: str = Field(..., description="The text prompt for image editing.", min_length=1, max_length=2000)
    user_id: str | None = Field(None, description="Optional ID of the user requesting the edit.")
    engine_id: str = Field("stable-diffusion-xl-1024-v1-0", description="Stability AI engine ID.")
    steps: int = Field(30, description="Number of diffusion steps.", ge=10, le=150)
    cfg_scale: float = Field(7.0, description="Classifier Free Guidance scale.", ge=0, le=35)
    seed: int = Field(0, description="Seed for reproducibility. 0 for random.")
    image_strength: float = Field(0.35, description="Controls how much the original image is preserved. Lower values (e.g., 0.1) preserve more, higher values (e.g., 0.9) give prompt more influence.", ge=0.0, le=1.0)

class ImageEditResponse(BaseModel):
    message: str = "Image editing process initiated."
    original_image_path: str | None = Field(None, description="Relative API path to the original uploaded image.")
    edited_images: list[GeneratedImageData] = Field(..., description="List of edited images with their API paths and seeds.")


# PROJECT_ID = os.environ.get("DB_PROJECT_ID", "unknown_project_id") # No longer trying to construct static URL

# --- API Endpoint to Generate Images ---
@router.post("/generate", response_model=ImageGenerationResponse)
def generate_image(request: ImageGenerationRequest = Body(...)):
    """Generates an image using Stability AI and stores it in db.storage.binary."""
    print(f"Received Stability AI image generation request: {request.prompt[:50]}...")
    
    stability_api_key = db.secrets.get("STABILITY_API_KEY")
    if not stability_api_key:
        print("Error: STABILITY_API_KEY secret not found.")
        raise HTTPException(status_code=500, detail="Configuration error: Stability AI API key not found.")

    try:
        try:
            width_str, height_str = request.size.split('x')
            width = int(width_str)
            height = int(height_str)
            if width <= 0 or height <= 0:
                raise ValueError("Image dimensions must be positive.")
        except ValueError as e:
            print(f"Error: Invalid size format '{request.size}'. Expected 'widthxheight'. Error: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid size format '{request.size}'. Expected 'widthxheight' (e.g., '1024x1024').")

        print(f"Initializing Stability AI client with engine: {request.engine_id}")
        stability_connection = stability_client.StabilityInference(
            key=stability_api_key,
            engine=request.engine_id,
            verbose=True
        )
        
        print(f"Generating {request.n} image(s) with prompt: '{request.prompt}', size: {width}x{height}, steps: {request.steps}, cfg: {request.cfg_scale}, seed: {request.seed}")

        answers = stability_connection.generate(
            prompt=request.prompt,
            height=height,
            width=width,
            samples=request.n,
            steps=request.steps,
            cfg_scale=request.cfg_scale,
            seed=request.seed if request.seed != 0 else None
        )

        processed_images: list[GeneratedImageData] = []
        for resp in answers:
            for artifact in resp.artifacts:
                if artifact.finish_reason == generation.FILTER:
                    print("Warning: Generation failed filter and was censored.")
                    continue 
                
                if artifact.type == generation.ARTIFACT_IMAGE:
                    print(f"Successfully generated image artifact with seed: {artifact.seed}")
                    image_bytes = artifact.binary
                    
                    user_prefix = request.user_id or "anon"
                    # Sanitize filename further to be safe for storage keys and URL paths
                    # Allow alphanumeric, dots, underscores, dashes.
                    safe_prompt_prefix = "".join(c if c.isalnum() or c in ('.', '_', '-') else '' for c in request.prompt[:20])
                    image_key = f"{user_prefix}_{safe_prompt_prefix}_{uuid.uuid4().hex}.png"
                    
                    print(f"Storing image bytes with key '{image_key}' in db.storage.binary...")
                    try:
                        db.storage.binary.put(key=image_key, value=image_bytes)
                        api_path = f"/ai-image-generation/images/{image_key}" # Relative path for frontend to use
                        print(f"Image stored. API path: {api_path}")
                        processed_images.append(GeneratedImageData(image_path=api_path, seed=artifact.seed))
                    except Exception as e_storage:
                        print(f"Error storing image with key '{image_key}' in db.storage.binary: {e_storage}")
                        continue
                else:
                    print(f"Received non-image artifact type: {artifact.type}")

        if not processed_images:
            print("Error: No images were successfully generated or stored.")
            raise HTTPException(status_code=500, detail="Image generation failed or produced no valid images after filtering and storage attempts.")

        print(f"Successfully generated and stored {len(processed_images)} images.")
        return ImageGenerationResponse(
            message=f"{len(processed_images)} image(s) generated successfully.",
            generated_images=processed_images
        )

    except HTTPException as http_exc:
        print(f"HTTPException during Stability AI image generation: {http_exc.detail}")
        raise http_exc from http_exc
    except Exception as e:
        print(f"Critical error during Stability AI image generation: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}") from e

# --- API Endpoint for Image Editing (Image-to-Image) ---
@router.post("/edit-image", response_model=ImageEditResponse)
def edit_image_with_prompt(
    prompt: str = Form(...),
    user_id: str | None = Form(None),
    engine_id: str = Form("stable-diffusion-xl-1024-v1-0"),
    steps: int = Form(30),
    cfg_scale: float = Form(7.0),
    seed: int = Form(0),
    image_strength: float = Form(0.35),
    image_file: UploadFile = File(...)
):
    """Edits an uploaded image using Stability AI based on a text prompt."""
    print(f"Received image edit request: {prompt[:50]}... for file: {image_file.filename}")

    stability_api_key = db.secrets.get("STABILITY_API_KEY")
    if not stability_api_key:
        print("Error: STABILITY_API_KEY secret not found.")
        raise HTTPException(status_code=500, detail="Configuration error: Stability AI API key not found.")

    try:
        # --- Test general outbound connectivity ---
        try:
            import requests
            print("Attempting test call to https://google.com...")
            test_response = requests.get("https://google.com", timeout=5)
            print(f"Test call to google.com status: {test_response.status_code}")
        except Exception as e_req:
            print(f"Test call to google.com FAILED: {e_req}")
        # --- End test ---    

        # Store the original uploaded image
        original_image_bytes = asyncio.run(image_file.read())
        if not original_image_bytes:
            raise HTTPException(status_code=400, detail="Uploaded image file is empty.")

        original_user_prefix = user_id or "anon"
        original_safe_prompt_prefix = "".join(c if c.isalnum() or c in ('.', '_', '-') else '' for c in prompt[:20])
        original_image_key = f"{original_user_prefix}_original_{original_safe_prompt_prefix}_{uuid.uuid4().hex}.png" # Assume png for now, or try to get from content_type
        
        print(f"Storing original uploaded image with key '{original_image_key}'...")
        db.storage.binary.put(key=original_image_key, value=original_image_bytes)
        original_api_path = f"/ai-image-generation/images/{original_image_key}"
        print(f"Original image stored. API path: {original_api_path}")

        # Prepare for Stability AI call
        # The Stability SDK expects the init_image as bytes directly.
        # It also expects init_image_strength, which corresponds to our image_strength.
        # However, the SDK's generate function might not directly take init_image_strength for all engines
        # or might use a different parameter name. Let's check the SDK docs again for image_strength like param when init_image is provided
        # The SDK generate() parameters include: prompt, init_image (PIL.Image), start_schedule (equivalent to 1.0 - image_strength)
        # We'll need to convert our image_strength to start_schedule and our bytes to a PIL Image.

        from PIL import Image
        try:
            init_image_pil = Image.open(io.BytesIO(original_image_bytes))
        except Exception as e_pil:
            print(f"Error converting uploaded image bytes to PIL Image: {e_pil}")
            raise HTTPException(status_code=400, detail="Invalid image format. Could not process uploaded image.")

        # Convert our image_strength (0=max original, 1=max prompt) to start_schedule (0=max original, 1=max prompt)
        # The SDK's `start_schedule` parameter: "Corresponds to `1.0 - init_image_strength` in the Stability API."
        # If our `image_strength` means "how much prompt influences" (0 = original, 1 = full prompt), then:
        # `start_schedule` = `image_strength`
        # Let's stick to what SDK `generate` takes: `start_schedule`. If `image_strength` parameter means "influence of prompt", it's directly start_schedule.
        # If `image_strength` parameter means "how much original image is preserved", then `start_schedule = 1.0 - image_strength`.
        # Our Pydantic model says: "Lower values (e.g., 0.1) preserve more, higher values (e.g., 0.9) give prompt more influence."
        # This means our `image_strength` *is* the influence of the prompt, so it should map directly to `start_schedule`.
        start_schedule_val = image_strength

        print(f"Initializing Stability AI client for img2img with engine: {engine_id}")
        # Default host for StabilityInference is grpc.stability.ai:443
        # We can log this for clarity, though it's not directly configurable in the StabilityInference constructor in older SDK versions.
        # For newer versions, a host parameter might exist directly in StabilityInference or client.create_client_with_api_key.
        # Let's assume the default is being used and log that assumption.
        stability_api_host = os.environ.get("STABILITY_HOST", "grpc.stability.ai:443") # Default from SDK docs
        print(f"Stability AI SDK will attempt to connect to host: {stability_api_host}")
        
        stability_connection = stability_client.StabilityInference(
            key=stability_api_key,
            engine=engine_id,
            # host=stability_api_host, # Add if SDK supports direct host override here
            verbose=True
        )

        print(f"Editing image with prompt: '{prompt}', steps: {steps}, cfg: {cfg_scale}, seed: {seed}, start_schedule (derived from image_strength): {start_schedule_val}")

        answers = stability_connection.generate(
            prompt=prompt,
            init_image=init_image_pil, # Pass the PIL image
            start_schedule=start_schedule_val, # Control influence of init_image vs prompt
            samples=1, # For editing, usually 1 sample is enough per call
            steps=steps,
            cfg_scale=cfg_scale,
            seed=seed if seed != 0 else None
            # Width and height are often derived from the init_image by the SDK/API for img2img
        )

        processed_edited_images: list[GeneratedImageData] = []
        for resp in answers:
            for artifact in resp.artifacts:
                if artifact.finish_reason == generation.FILTER:
                    print("Warning: Edited image generation failed filter and was censored.")
                    continue
                
                if artifact.type == generation.ARTIFACT_IMAGE:
                    print(f"Successfully generated edited image artifact with seed: {artifact.seed}")
                    edited_image_bytes = artifact.binary
                    
                    edited_user_prefix = user_id or "anon"
                    edited_safe_prompt_prefix = "".join(c if c.isalnum() or c in ('.', '_', '-') else '' for c in prompt[:20])
                    edited_image_key = f"{edited_user_prefix}_edited_{edited_safe_prompt_prefix}_{uuid.uuid4().hex}.png"
                    
                    print(f"Storing edited image bytes with key '{edited_image_key}'...")
                    db.storage.binary.put(key=edited_image_key, value=edited_image_bytes)
                    edited_api_path = f"/ai-image-generation/images/{edited_image_key}"
                    print(f"Edited image stored. API path: {edited_api_path}")
                    processed_edited_images.append(GeneratedImageData(image_path=edited_api_path, seed=artifact.seed))
                else:
                    print(f"Received non-image artifact type during edit: {artifact.type}")

        if not processed_edited_images:
            print("Error: No edited images were successfully generated or stored.")
            raise HTTPException(status_code=500, detail="Image editing failed or produced no valid images after filtering/storage.")

        print(f"Successfully edited and stored {len(processed_edited_images)} image(s).")
        return ImageEditResponse(
            message=f"{len(processed_edited_images)} image(s) edited successfully.",
            original_image_path=original_api_path,
            edited_images=processed_edited_images
        )

    except HTTPException as http_exc:
        print(f"HTTPException during image editing: {http_exc.detail}")
        raise http_exc
    except Exception as e:
        print(f"Critical error during image editing: {e}")
        # It's good practice to check if image_file.close() is needed or handled by FastAPI/starlette.
        # For UploadFile from `fastapi`, `close()` is usually called automatically.
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during image editing: {str(e)}")


# --- API Endpoint to Retrieve Images ---
@router.get("/images/{image_key}", tags=["AI Image Generation"])
async def get_image_data(image_key: str):
    """Retrieves an image from db.storage.binary by its key."""
    print(f"Attempting to retrieve image with key: {image_key}")
    try:
        image_bytes = db.storage.binary.get(key=image_key)
        if not image_bytes:
            print(f"Error: No image found for key '{image_key}' or image is empty.")
            raise HTTPException(status_code=404, detail="Image not found or empty.")
        
        print(f"Successfully retrieved image '{image_key}', size: {len(image_bytes)} bytes.")
        # Return as a direct binary response
        return Response(content=image_bytes, media_type="image/png")
    except FileNotFoundError:
        print(f"Error: Image key '{image_key}' not found in db.storage.binary.")
        raise HTTPException(status_code=404, detail="Image not found.")
    except Exception as e:
        print(f"Error retrieving image '{image_key}': {e}")
        raise HTTPException(status_code=500, detail=f"Server error retrieving image: {str(e)}")

