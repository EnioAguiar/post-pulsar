export async function publishToTelegram(
  connection: any,
  text: string,
  mediaUrls: string[],
) {
  const botToken = connection.access_token;
  const channelId = connection.refresh_token; // Stored in refresh_token

  if (!botToken || !channelId) {
    throw new Error("Telegram bot token or channel ID is missing.");
  }

  // If there are no media URLs, send a simple text message
  if (!mediaUrls || mediaUrls.length === 0) {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: channelId, text: text }),
    });
    const responseData = await response.json();
    if (!response.ok) {
      console.error("Telegram API Error:", responseData);
      throw new Error(`Telegram API error: ${responseData.description}`);
    }
    return responseData;
  }

  // If there is media, handle the first media item
  const mediaUrl = mediaUrls[0];
  let response;
  try {
    response = await fetch(mediaUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch media from ${mediaUrl}: ${response.statusText}`,
      );
    }
  } catch (error) {
    console.error(`Error fetching media ${mediaUrl}:`, error);
    throw new Error(`Could not process media file: ${mediaUrl}`);
  }

  const blob = await response.blob();
  const contentType = blob.type;
  const filename = mediaUrl.substring(mediaUrl.lastIndexOf("/") + 1) || "file";

  let method = "sendDocument";
  let fieldName = "document";
  if (contentType.startsWith("image/")) {
    method = "sendPhoto";
    fieldName = "photo";
  } else if (contentType.startsWith("video/")) {
    method = "sendVideo";
    fieldName = "video";
  }

  const formData = new FormData();
  formData.append("chat_id", channelId);
  formData.append("caption", text);
  formData.append(fieldName, blob, filename);

  const url = `https://api.telegram.org/bot${botToken}/${method}`;

  const uploadResponse = await fetch(url, {
    method: "POST",
    body: formData, // Content-Type is automatically set to multipart/form-data
  });

  const responseData = await uploadResponse.json();

  if (!uploadResponse.ok) {
    console.error("Telegram API Error:", responseData);
    throw new Error(`Telegram API error: ${responseData.description}`);
  }

  return responseData;
}
