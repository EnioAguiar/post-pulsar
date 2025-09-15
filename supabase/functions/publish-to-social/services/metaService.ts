// supabase/functions/publish-to-social/services/metaService.ts

interface MetaConnection {
  access_token: string;
  provider_user_id: string;
}

type TNetwork = "instagram" | "threads";

async function pollMediaStatus(
  network: TNetwork,
  containerId: string,
  accessToken: string,
  maxRetries: number,
  containerType: "single video" | "carousel",
): Promise<void> {
  console.log(
    `Polling status for ${containerType} container ${containerId}...`,
  );
  const retryDelay = network === "instagram" ? 20000 : 10000; // Instagram carousel needs more time
  let isReady = false;
  const isInstagram = network === "instagram";

  for (let i = 0; i < maxRetries; i++) {
    console.log(
      `Polling attempt ${i + 1}/${maxRetries} for ${containerType} container ${containerId}...`,
    );
    const statusCheckUrl = isInstagram
      ? `https://graph.instagram.com/v19.0/${containerId}?fields=status_code,status&access_token=${accessToken}`
      : `https://graph.threads.net/v1.0/${containerId}?fields=status&access_token=${accessToken}`;

    const statusResponse = await fetch(statusCheckUrl);
    if (!statusResponse.ok) {
      console.error(
        `Error checking status for ${containerId}: ${await statusResponse.text()}`,
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      continue;
    }

    const statusData = await statusResponse.json();
    const statusCode = isInstagram ? statusData.status_code : statusData.status;
    console.log(
      `${containerType} container ${containerId} status: ${statusCode}`,
    );

    if (statusCode === "FINISHED") {
      isReady = true;
      break;
    } else if (statusCode === "ERROR" || statusCode === "FAILED") {
      console.error(
        `>>> Detected ERROR/FAILED status in ${containerType} container:`,
        JSON.stringify(statusData),
      );
      throw new Error(
        `${containerType} container processing failed on ${network}'s side. Details: ${JSON.stringify(statusData)}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }

  if (!isReady) {
    throw new Error(
      `${containerType} container processing timed out for ${containerId}.`,
    );
  }
  console.log(`${containerType} container ${containerId} is ready.`);
}

async function createSingleMediaContainer(
  network: TNetwork,
  provider_user_id: string,
  access_token: string,
  mediaUrl: string,
  isVideo: boolean,
  isCarouselItem: boolean,
  text?: string,
): Promise<string> {
  console.log(
    `Creating container for ${network}. Is video: ${isVideo}. Is carousel item: ${isCarouselItem}.`,
  );
  const isInstagram = network === "instagram";
  const graphUrl = isInstagram
    ? `https://graph.instagram.com/v19.0/${provider_user_id}/media`
    : `https://graph.threads.net/v1.0/${provider_user_id}/threads`;

  const params: any = { access_token };

  if (isInstagram) {
    params.media_type = isVideo ? "REELS" : "IMAGE";
    if (isVideo) params.video_url = mediaUrl;
    else params.image_url = mediaUrl;
    if (isCarouselItem) params.is_carousel_item = true;
    if (text && !isCarouselItem) params.caption = text;
  } else {
    // Threads
    params.media_type = isVideo ? "VIDEO" : "IMAGE";
    if (isVideo) params.video_url = mediaUrl;
    else params.image_url = mediaUrl;
    if (text) params.text = text;
  }

  const createContainerResponse = await fetch(graphUrl, {
    method: "POST",
    body: new URLSearchParams(params),
  });

  if (!createContainerResponse.ok) {
    const errorBody = await createContainerResponse.json();
    console.error(
      `${network} API Error (Create Single Container):`,
      JSON.stringify(errorBody, null, 2),
    );
    throw new Error(
      errorBody?.error?.message ||
        `Failed to create media container for ${network}.`,
    );
  }

  const { id: creationId } = await createContainerResponse.json();
  console.log(
    `Successfully created ${network} single container. Creation ID: ${creationId}`,
  );

  if (isVideo) {
    await pollMediaStatus(
      network,
      creationId,
      access_token,
      15,
      "single video",
    );
  }

  return creationId;
}

async function publishContainer(
  network: TNetwork,
  provider_user_id: string,
  creation_id: string,
  access_token: string,
): Promise<string> {
  const publishUrl =
    network === "instagram"
      ? `https://graph.instagram.com/v19.0/${provider_user_id}/media_publish`
      : `https://graph.threads.net/v1.0/${provider_user_id}/threads_publish`;
  const publishParams = new URLSearchParams({ creation_id, access_token });

  const publishResponse = await fetch(publishUrl, {
    method: "POST",
    body: publishParams,
  });
  if (!publishResponse.ok) {
    const errorBody = await publishResponse.json();
    console.error(
      `${network} API Error (Publish Container):`,
      JSON.stringify(errorBody, null, 2),
    );
    if (
      errorBody.error &&
      errorBody.error.code === 2 &&
      errorBody.error.is_transient
    ) {
      console.warn(
        "Caught transient error from Meta API (code 2). Assuming success.",
      );
      return `transient-success-${creation_id}`;
    }
    throw new Error(
      errorBody?.error?.error_user_msg || `Failed to publish to ${network}.`,
    );
  }
  const { id } = await publishResponse.json();
  return id;
}

export async function publishToMeta(
  network: TNetwork,
  connection: MetaConnection,
  text: string,
  mediaUrls?: string[],
  isCarousel?: boolean,
): Promise<string> {
  const { access_token, provider_user_id } = connection;

  if (isCarousel) {
    if (!mediaUrls || mediaUrls.length < 2)
      throw new Error("Carousel post requires at least two media URLs.");

    const childrenIds = await Promise.all(
      mediaUrls.map((url) => {
        const isVideo = url.includes(".mp4") || url.includes(".mov");
        return createSingleMediaContainer(
          network,
          provider_user_id,
          access_token,
          url,
          isVideo,
          true,
        );
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const carouselGraphUrl =
      network === "instagram"
        ? `https://graph.instagram.com/v19.0/${provider_user_id}/media`
        : `https://graph.threads.net/v1.0/${provider_user_id}/threads`;

    const carouselParams: any = {
      media_type: "CAROUSEL",
      children: childrenIds.join(","),
      access_token,
    };
    if (network === "threads") carouselParams.text = text;
    else carouselParams.caption = text;

    const createCarouselContainerResponse = await fetch(carouselGraphUrl, {
      method: "POST",
      body: new URLSearchParams(carouselParams),
    });
    if (!createCarouselContainerResponse.ok) {
      const errorBody = await createCarouselContainerResponse.json();
      console.error(
        `${network} API Error (Create Carousel Container):`,
        JSON.stringify(errorBody, null, 2),
      );
      throw new Error(
        errorBody?.error?.message ||
          `Failed to create carousel container for ${network}.`,
      );
    }
    const { id: carouselCreationId } =
      await createCarouselContainerResponse.json();
    console.log(
      `Successfully created ${network} carousel container. Creation ID: ${carouselCreationId}`,
    );

    await pollMediaStatus(
      network,
      carouselCreationId,
      access_token,
      30,
      "carousel",
    );
    return publishContainer(
      network,
      provider_user_id,
      carouselCreationId,
      access_token,
    );
  } else {
    const mediaUrl = mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null;
    if (!mediaUrl) {
      if (network === "threads") {
        // Text-only posts for Threads also use the two-step creation/publication flow.
        const textContainerUrl = `https://graph.threads.net/v1.0/${provider_user_id}/threads`;
        const textContainerParams = new URLSearchParams({
          text,
          media_type: "TEXT",
          access_token,
        });
        const textContainerResponse = await fetch(textContainerUrl, {
          method: "POST",
          body: textContainerParams,
        });
        if (!textContainerResponse.ok) {
          const errorBody = await textContainerResponse.json();
          console.error(
            `${network} API Error (Text Container):`,
            JSON.stringify(errorBody, null, 2),
          );
          throw new Error(
            errorBody?.error?.error_user_msg ||
              `Failed to create text container for ${network}.`,
          );
        }
        const { id: creationId } = await textContainerResponse.json();
        // Now, publish the text container
        return publishContainer(
          network,
          provider_user_id,
          creationId,
          access_token,
        );
      } else {
        throw new Error("Instagram requires a media file to post.");
      }
    } else {
      const isVideo = mediaUrl.includes(".mp4") || mediaUrl.includes(".mov");
      const creationId = await createSingleMediaContainer(
        network,
        provider_user_id,
        access_token,
        mediaUrl,
        isVideo,
        false,
        text,
      );
      return publishContainer(
        network,
        provider_user_id,
        creationId,
        access_token,
      );
    }
  }
}
