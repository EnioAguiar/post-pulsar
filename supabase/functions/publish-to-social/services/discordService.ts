export async function publishToDiscord(connection: any, text: string) {
  const webhookUrl = connection.access_token;

  if (!webhookUrl) {
    throw new Error("Discord webhook URL is missing.");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: text,
    }),
  });

  if (!response.ok) {
    // Discord API returns error details in the body on failure, but might not be JSON
    const errorText = await response.text();
    console.error("Discord API Error:", errorText);
    throw new Error(`Discord API error: ${response.status} ${response.statusText}. Details: ${errorText}`);
  }

  // Discord returns a 204 No Content on success, so there's no body to parse.
  return { success: true, status: response.status };
}
