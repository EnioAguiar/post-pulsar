export async function publishToTelegram(connection: any, text: string) {
  const botToken = connection.access_token;
  const channelId = connection.refresh_token; // Stored in refresh_token

  if (!botToken || !channelId) {
    throw new Error("Telegram bot token or channel ID is missing.");
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: channelId,
      text: text,
      // Telegram supports Markdown or HTML, let's default to text for now.
      // parse_mode: "MarkdownV2", 
    }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error("Telegram API Error:", responseData);
    throw new Error(`Telegram API error: ${responseData.description}`);
  }

  return responseData;
}
