export async function publishToDiscord(
  connection: any,
  text: string,
  mediaUrls: string[],
) {
  const webhookUrl = connection.access_token;

  if (!webhookUrl) {
    throw new Error("Discord webhook URL is missing.");
  }

  let body;
  const headers = {};

  if (mediaUrls && mediaUrls.length > 0) {
    const formData = new FormData();
    formData.append("payload_json", JSON.stringify({ content: text }));

    // Fetch and append each file
    for (let i = 0; i < mediaUrls.length; i++) {
      const mediaUrl = mediaUrls[i];
      try {
        const response = await fetch(mediaUrl);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch media from ${mediaUrl}: ${response.statusText}`,
          );
        }
        const blob = await response.blob();
        const filename =
          mediaUrl.substring(mediaUrl.lastIndexOf("/") + 1) || `file${i}`;
        formData.append(`files[${i}]`, blob, filename);
      } catch (error) {
        console.error(`Error fetching media ${mediaUrl}:`, error);
        // Optionally, decide if you want to publish without the failed media or throw an error
        throw new Error(`Could not process media file: ${mediaUrl}`);
      }
    }
    body = formData;
    // The Content-Type header is set automatically by fetch for FormData
  } else {
    body = JSON.stringify({ content: text });
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: headers,
    body: body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Discord API Error:", errorText);
    throw new Error(
      `Discord API error: ${response.status} ${response.statusText}. Details: ${errorText}`,
    );
  }

  return { success: true, status: response.status };
}
