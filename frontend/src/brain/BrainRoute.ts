import {
  BodyEditImageWithPrompt,
  CheckHealthData,
  EditImageWithPromptData,
  GenerateImageData,
  GenerateVideoData,
  GetImageDataData,
  GetVideoFileData,
  ImageGenerationRequest,
  VideoGenerationRequest,
} from "./data-contracts";

export namespace Brain {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  export namespace check_health {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckHealthData;
  }

  /**
   * @description Generates an image using Stability AI and stores it in db.storage.binary.
   * @tags AI Image Generation, dbtn/module:ai_image_generation
   * @name generate_image
   * @summary Generate Image
   * @request POST:/routes/ai-image-generation/generate
   */
  export namespace generate_image {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ImageGenerationRequest;
    export type RequestHeaders = {};
    export type ResponseBody = GenerateImageData;
  }

  /**
   * @description Edits an uploaded image using Stability AI based on a text prompt.
   * @tags AI Image Generation, dbtn/module:ai_image_generation
   * @name edit_image_with_prompt
   * @summary Edit Image With Prompt
   * @request POST:/routes/ai-image-generation/edit-image
   */
  export namespace edit_image_with_prompt {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BodyEditImageWithPrompt;
    export type RequestHeaders = {};
    export type ResponseBody = EditImageWithPromptData;
  }

  /**
   * @description Retrieves an image from db.storage.binary by its key.
   * @tags AI Image Generation, AI Image Generation, dbtn/module:ai_image_generation
   * @name get_image_data
   * @summary Get Image Data
   * @request GET:/routes/ai-image-generation/images/{image_key}
   */
  export namespace get_image_data {
    export type RequestParams = {
      /** Image Key */
      imageKey: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetImageDataData;
  }

  /**
   * No description
   * @tags AI Video Generation, dbtn/module:ai_video_generation
   * @name generate_video
   * @summary Generate Video
   * @request POST:/routes/ai-video-generation/generate-video
   */
  export namespace generate_video {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = VideoGenerationRequest;
    export type RequestHeaders = {};
    export type ResponseBody = GenerateVideoData;
  }

  /**
   * No description
   * @tags AI Video Generation, stream, dbtn/module:ai_video_generation
   * @name get_video_file
   * @summary Get Video File
   * @request GET:/routes/ai-video-generation/videos/{filename}
   */
  export namespace get_video_file {
    export type RequestParams = {
      /** Filename */
      filename: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetVideoFileData;
  }
}
