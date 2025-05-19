/** Body_edit_image_with_prompt */
export interface BodyEditImageWithPrompt {
  /** Prompt */
  prompt: string;
  /** User Id */
  user_id?: string | null;
  /**
   * Engine Id
   * @default "stable-diffusion-xl-1024-v1-0"
   */
  engine_id?: string;
  /**
   * Steps
   * @default 30
   */
  steps?: number;
  /**
   * Cfg Scale
   * @default 7
   */
  cfg_scale?: number;
  /**
   * Seed
   * @default 0
   */
  seed?: number;
  /**
   * Image Strength
   * @default 0.35
   */
  image_strength?: number;
  /**
   * Image File
   * @format binary
   */
  image_file: File;
}

/** GeneratedImageData */
export interface GeneratedImageData {
  /**
   * Image Path
   * Relative API path to retrieve the generated image.
   */
  image_path: string;
  /**
   * Seed
   * Seed of the generated artifact.
   */
  seed: number;
}

/** GeneratedVideoData */
export interface GeneratedVideoData {
  /**
   * Video Path
   * Relative API path to retrieve the generated video.
   */
  video_path: string;
  /**
   * Video Seed
   * Seed used for the video generation step (artifact.seed).
   */
  video_seed: number;
  /**
   * Source Image Seed
   * Seed used for the initial image generation step.
   */
  source_image_seed: number;
}

/** HTTPValidationError */
export interface HTTPValidationError {
  /** Detail */
  detail?: ValidationError[];
}

/** HealthResponse */
export interface HealthResponse {
  /** Status */
  status: string;
}

/** ImageEditResponse */
export interface ImageEditResponse {
  /**
   * Message
   * @default "Image editing process initiated."
   */
  message?: string;
  /**
   * Original Image Path
   * Relative API path to the original uploaded image.
   */
  original_image_path?: string | null;
  /**
   * Edited Images
   * List of edited images with their API paths and seeds.
   */
  edited_images: GeneratedImageData[];
}

/** ImageGenerationRequest */
export interface ImageGenerationRequest {
  /**
   * Prompt
   * The text prompt for image generation.
   * @minLength 1
   * @maxLength 2000
   */
  prompt: string;
  /**
   * User Id
   * Optional ID of the user requesting the generation.
   */
  user_id?: string | null;
  /**
   * N
   * Number of images to generate.
   * @min 1
   * @max 10
   * @default 1
   */
  n?: number;
  /**
   * Size
   * The size of the generated images. e.g., '1024x1024', '512x512'.
   * @default "1024x1024"
   */
  size?: string;
  /**
   * Engine Id
   * Stability AI engine ID.
   * @default "stable-diffusion-xl-1024-v1-0"
   */
  engine_id?: string;
  /**
   * Steps
   * Number of diffusion steps.
   * @min 10
   * @max 150
   * @default 30
   */
  steps?: number;
  /**
   * Cfg Scale
   * Classifier Free Guidance scale.
   * @min 0
   * @max 35
   * @default 7
   */
  cfg_scale?: number;
  /**
   * Seed
   * Seed for reproducibility. 0 for random.
   * @default 0
   */
  seed?: number;
}

/** ImageGenerationResponse */
export interface ImageGenerationResponse {
  /**
   * Message
   * @default "Image generation process initiated."
   */
  message?: string;
  /**
   * Generated Images
   * List of generated images with their API paths and seeds.
   */
  generated_images: GeneratedImageData[];
}

/** ValidationError */
export interface ValidationError {
  /** Location */
  loc: (string | number)[];
  /** Message */
  msg: string;
  /** Error Type */
  type: string;
}

/** VideoGenerationRequest */
export interface VideoGenerationRequest {
  /**
   * Prompt
   * Text prompt for video generation.
   * @minLength 1
   * @maxLength 2000
   */
  prompt: string;
  /**
   * Aspect Ratio
   * Aspect ratio for the video (e.g., '16:9', '1:1', '9:16').
   * @default "16:9"
   */
  aspect_ratio?: string;
  /**
   * Quality
   * Quality setting for video generation (e.g., 'Standard', 'High').
   * @default "Standard"
   */
  quality?: string;
  /**
   * Motion Intensity
   * Motion intensity for the video (e.g., 'Low', 'Medium', 'High').
   * @default "Medium"
   */
  motion_intensity?: string;
  /**
   * Seed
   * Seed for reproducibility. 0 for random.
   * @default 0
   */
  seed?: number;
  /**
   * User Id
   * Optional ID of the user requesting the generation.
   */
  user_id?: string | null;
}

/** VideoGenerationResponse */
export interface VideoGenerationResponse {
  /**
   * Message
   * @default "Video generation process initiated."
   */
  message?: string;
  generated_video?: GeneratedVideoData | null;
}

export type CheckHealthData = HealthResponse;

export type GenerateImageData = ImageGenerationResponse;

export type GenerateImageError = HTTPValidationError;

export type EditImageWithPromptData = ImageEditResponse;

export type EditImageWithPromptError = HTTPValidationError;

export interface GetImageDataParams {
  /** Image Key */
  imageKey: string;
}

export type GetImageDataData = any;

export type GetImageDataError = HTTPValidationError;

export type GenerateVideoData = VideoGenerationResponse;

export type GenerateVideoError = HTTPValidationError;

export interface GetVideoFileParams {
  /** Filename */
  filename: string;
}

export type GetVideoFileData = any;

export type GetVideoFileError = HTTPValidationError;
