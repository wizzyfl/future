import {
  BodyEditImageWithPrompt,
  CheckHealthData,
  EditImageWithPromptData,
  EditImageWithPromptError,
  GenerateImageData,
  GenerateImageError,
  GenerateVideoData,
  GenerateVideoError,
  GetImageDataData,
  GetImageDataError,
  GetImageDataParams,
  GetVideoFileData,
  GetVideoFileError,
  GetVideoFileParams,
  ImageGenerationRequest,
  VideoGenerationRequest,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Brain<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   *
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  check_health = (params: RequestParams = {}) =>
    this.request<CheckHealthData, any>({
      path: `/_healthz`,
      method: "GET",
      ...params,
    });

  /**
   * @description Generates an image using Stability AI and stores it in db.storage.binary.
   *
   * @tags AI Image Generation, dbtn/module:ai_image_generation
   * @name generate_image
   * @summary Generate Image
   * @request POST:/routes/ai-image-generation/generate
   */
  generate_image = (data: ImageGenerationRequest, params: RequestParams = {}) =>
    this.request<GenerateImageData, GenerateImageError>({
      path: `/routes/ai-image-generation/generate`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Edits an uploaded image using Stability AI based on a text prompt.
   *
   * @tags AI Image Generation, dbtn/module:ai_image_generation
   * @name edit_image_with_prompt
   * @summary Edit Image With Prompt
   * @request POST:/routes/ai-image-generation/edit-image
   */
  edit_image_with_prompt = (data: BodyEditImageWithPrompt, params: RequestParams = {}) =>
    this.request<EditImageWithPromptData, EditImageWithPromptError>({
      path: `/routes/ai-image-generation/edit-image`,
      method: "POST",
      body: data,
      type: ContentType.FormData,
      ...params,
    });

  /**
   * @description Retrieves an image from db.storage.binary by its key.
   *
   * @tags AI Image Generation, AI Image Generation, dbtn/module:ai_image_generation
   * @name get_image_data
   * @summary Get Image Data
   * @request GET:/routes/ai-image-generation/images/{image_key}
   */
  get_image_data = ({ imageKey, ...query }: GetImageDataParams, params: RequestParams = {}) =>
    this.request<GetImageDataData, GetImageDataError>({
      path: `/routes/ai-image-generation/images/${imageKey}`,
      method: "GET",
      ...params,
    });

  /**
   * No description
   *
   * @tags AI Video Generation, dbtn/module:ai_video_generation
   * @name generate_video
   * @summary Generate Video
   * @request POST:/routes/ai-video-generation/generate-video
   */
  generate_video = (data: VideoGenerationRequest, params: RequestParams = {}) =>
    this.request<GenerateVideoData, GenerateVideoError>({
      path: `/routes/ai-video-generation/generate-video`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags AI Video Generation, stream, dbtn/module:ai_video_generation
   * @name get_video_file
   * @summary Get Video File
   * @request GET:/routes/ai-video-generation/videos/{filename}
   */
  get_video_file = ({ filename, ...query }: GetVideoFileParams, params: RequestParams = {}) =>
    this.requestStream<GetVideoFileData, GetVideoFileError>({
      path: `/routes/ai-video-generation/videos/${filename}`,
      method: "GET",
      ...params,
    });
}
