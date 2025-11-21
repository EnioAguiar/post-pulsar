require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const nodeHtmlToImage = require("node-html-to-image");
// const ytdl = require("@distube/ytdl-core"); // REMOVIDO

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Check for required environment variables
if (
  !process.env.SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_KEY ||
  !process.env.SERVICE_API_KEY
) {
  console.error(
    "[CONVERTER_SERVICE] Error: Missing required environment variables.",
  );
  process.exit(1);
}

// Initialize Supabase Admin Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

const { transcribe } = require("./src/transcriber.js");

// --- Security Middleware ---
const apiKeyAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.SERVICE_API_KEY}`) {
    console.log(
      "[CONVERTER_SERVICE] Unauthorized: Invalid or missing API Key.",
    );
    return res.status(401).json({ error: "Unauthorized: Invalid API Key" });
  }
  next();
};

// --- Helper Functions ---
const isYoutubeUrl = (url) => {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
  return youtubeRegex.test(url);
};

// Function to handle transcription and send response
async function handleTranscription(inputPath, res) {
  try {
    const transcribedText = await transcribe(inputPath);
    res.status(200).json({
      status: "success",
      message: "Audio transcribed successfully!",
      text: transcribedText,
    });
  } catch (err) {
    console.error(
      "[CONVERTER_SERVICE] (/transcribe) Error during transcription:",
      err.message,
    );
    res.status(500).json({
      status: "error",
      error: "An internal server error occurred during transcription.",
      details: err.message,
    });
  } finally {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    console.log("[CONVERTER_SERVICE] (/transcribe) Temporary file cleaned up.");
  }
}

// --- Routes ---
app.get("/", (req, res) => {
  res.send("Video Converter Service is running!");
});

app.post("/transcribe", apiKeyAuth, (req, res) => {
  const { audioUrl } = req.body;
  console.log(
    `[CONVERTER_SERVICE] Received /transcribe request for URL: ${audioUrl}`,
  );

  if (!audioUrl) {
    console.log("[CONVERTER_SERVICE] Error: Missing audioUrl for /transcribe.");
    return res.status(400).json({ error: "Missing audioUrl in request body." });
  }

  const tempDir = path.join(__dirname, "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const inputPath = path.join(
    tempDir,
    `input_${Date.now()}_audio.mp3`, // Use a consistent extension
  );

  if (isYoutubeUrl(audioUrl)) {
    console.log(
      `[CONVERTER_SERVICE] (/transcribe) YouTube URL detected. Using yt-dlp.`,
    );
    const userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36";
    const ytDlpCommand = `yt-dlp --no-check-certificate --user-agent "${userAgent}" -x --audio-format mp3 -o "${inputPath}" "${audioUrl}"`;
    console.log(`[CONVERTER_SERVICE] Executing yt-dlp: ${ytDlpCommand}`);

    exec(ytDlpCommand, (error, stdout, stderr) => {
      console.log(`[CONVERTER_SERVICE] yt-dlp stdout: ${stdout}`);
      console.error(`[CONVERTER_SERVICE] yt-dlp stderr: ${stderr}`);
      if (error) {
        console.error("[CONVERTER_SERVICE] yt-dlp failed:", error);
        if (!res.headersSent) {
          res.status(500).json({
            error: "Failed to download audio from YouTube using yt-dlp.",
            details: error.message,
          });
        }
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); // Clean up on error
        return;
      }

      // --- Start FFmpeg conversion ---
      const wavPath = inputPath.replace(".mp3", ".wav");
      const ffmpegCommand = `ffmpeg -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${wavPath}"`;
      console.log(`[CONVERTER_SERVICE] Executing ffmpeg: ${ffmpegCommand}`);

      exec(ffmpegCommand, (ffmpegError, ffmpegStdout, ffmpegStderr) => {
        // Clean up the intermediate mp3 file
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

        if (ffmpegError) {
          console.error("[CONVERTER_SERVICE] ffmpeg failed:", ffmpegError);
          console.error(`[CONVERTER_SERVICE] ffmpeg stderr: ${ffmpegStderr}`);
          if (!res.headersSent) {
            res.status(500).json({
              error: "Failed to convert audio to WAV format.",
              details: ffmpegError.message,
            });
          }
          if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath); // Clean up wav file on error
          return;
        }

        console.log("[CONVERTER_SERVICE] ffmpeg conversion successful.");
        // Now, transcribe the WAV file
        handleTranscription(wavPath, res);
      });
      // --- End FFmpeg conversion ---
    });
  } else {
    console.log(
      `[CONVERTER_SERVICE] (/transcribe) Direct URL detected. Using axios.`,
    );
    const writer = fs.createWriteStream(inputPath);

    writer.on("finish", async () => {
      console.log(
        `[CONVERTER_SERVICE] (/transcribe) Download finished. File saved to ${inputPath}`,
      );
      handleTranscription(inputPath, res);
    });

    writer.on("error", (err) => {
      console.error(
        "[CONVERTER_SERVICE] (/transcribe) File stream writer error:",
        err.message,
      );
      if (!res.headersSent) {
        res.status(500).json({
          error: "Failed to write audio file to disk.",
          details: err.message,
        });
      }
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); // Clean up on error
    });

    axios({
      method: "get",
      url: audioUrl,
      responseType: "stream",
    })
      .then((response) => {
        response.data.pipe(writer);
      })
      .catch((err) => {
        console.error(
          "[CONVERTER_SERVICE] (/transcribe) Download failed:",
          err.message,
        );
        if (!res.headersSent) {
          res.status(500).json({
            error: "Failed to download audio file.",
            details: err.message,
          });
        }
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); // Clean up on error
      });
  }
});

app.post("/convert", apiKeyAuth, (req, res) => {
  const { videoUrl, outputFileName } = req.body;
  console.log(
    `[CONVERTER_SERVICE] Received /convert request for URL: ${videoUrl}`,
  );

  if (!videoUrl || !outputFileName) {
    console.log(
      "[CONVERTER_SERVICE] Error: Missing videoUrl or outputFileName.",
    );
    return res
      .status(400)
      .json({ error: "Missing videoUrl or outputFileName in request body." });
  }

  const tempDir = path.join(__dirname, "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`[CONVERTER_SERVICE] Created temp directory: ${tempDir}`);
  }

  const inputPath = path.join(
    tempDir,
    `input_${Date.now()}_${path.basename(new URL(videoUrl).pathname)}`,
  );
  const outputPath = path.join(tempDir, outputFileName);

  const writer = fs.createWriteStream(inputPath);

  console.log(
    `[CONVERTER_SERVICE] Starting download from ${videoUrl} to ${inputPath}`,
  );

  axios({
    method: "get",
    url: videoUrl,
    responseType: "stream",
  })
    .then((response) => {
      response.data.pipe(writer);
    })
    .catch((err) => {
      console.error("[CONVERTER_SERVICE] Download failed:", err.message);
      res.status(500).json({
        error: "Failed to download video file.",
        details: err.message,
      });
    });

  writer.on("finish", () => {
    console.log(
      `[CONVERTER_SERVICE] Download finished. File saved to ${inputPath}`,
    );

    const ffmpegCommand = `ffmpeg -i ${inputPath} -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:-1:-1,setsar=1" -c:v libx264 -profile:v main -r 30 -preset fast -crf 28 -pix_fmt yuv420p -c:a aac -b:a 128k -shortest ${outputPath}`;
    console.log(`[CONVERTER_SERVICE] Executing ffmpeg: ${ffmpegCommand}`);

    exec(ffmpegCommand, async (error, stdout, stderr) => {
      console.log(`[CONVERTER_SERVICE] FFmpeg stdout: ${stdout}`);
      console.error(`[CONVERTER_SERVICE] FFmpeg stderr: ${stderr}`);
      try {
        if (error) {
          console.error("[CONVERTER_SERVICE] Full FFmpeg error object:", error);
          throw new Error(`FFmpeg failed: ${stderr}`);
        }
        console.log("[CONVERTER_SERVICE] ffmpeg conversion successful.");

        const stats = fs.statSync(outputPath);
        const fileSizeInMegabytes = stats.size / (1024 * 1024);
        console.log(
          `[CONVERTER_SERVICE] Converted file size: ${fileSizeInMegabytes.toFixed(2)} MB`,
        );

        console.log(
          `[CONVERTER_SERVICE] Uploading ${outputFileName} to Supabase...`,
        );
        const videoBuffer = fs.readFileSync(outputPath);
        const { error: uploadError } = await supabase.storage
          .from("processed-videos")
          .upload(outputFileName, videoBuffer, {
            contentType: "video/mp4",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Supabase upload failed: ${uploadError.message}`);
        }
        console.log("[CONVERTER_SERVICE] File uploaded to Supabase.");

        const { data: publicUrlData } = supabase.storage
          .from("processed-videos")
          .getPublicUrl(outputFileName);
        console.log(
          `[CONVERTER_SERVICE] Successfully processed. Public URL: ${publicUrlData.publicUrl}`,
        );

        res.status(200).json({
          message: "Video converted successfully!",
          publicUrl: publicUrlData.publicUrl,
        });
      } catch (err) {
        console.error(
          "[CONVERTER_SERVICE] Error during conversion/upload:",
          err.message,
        );
        res.status(500).json({
          error: "An internal server error occurred.",
          details: err.message,
        });
      } finally {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        console.log("[CONVERTER_SERVICE] Temporary files cleaned up.");
      }
    });
  });

  writer.on("error", (err) => {
    console.error("[CONVERTER_SERVICE] File stream writer error:", err.message);
    res.status(500).json({
      error: "Failed to write video file to disk.",
      details: err.message,
    });
  });
});

app.post("/clean", apiKeyAuth, (req, res) => {
  const { videoUrl, outputFileName } = req.body;
  console.log(
    `[CONVERTER_SERVICE] Received /clean request for URL: ${videoUrl}`,
  );

  if (!videoUrl || !outputFileName) {
    console.log(
      "[CONVERTER_SERVICE] Error: Missing videoUrl or outputFileName for /clean.",
    );
    return res
      .status(400)
      .json({ error: "Missing videoUrl or outputFileName in request body." });
  }

  const tempDir = path.join(__dirname, "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const inputPath = path.join(
    tempDir,
    `input_${Date.now()}_${path.basename(new URL(videoUrl).pathname)}`,
  );
  const outputPath = path.join(tempDir, outputFileName);

  const writer = fs.createWriteStream(inputPath);

  console.log(
    `[CONVERTER_SERVICE] (/clean) Starting download from ${videoUrl} to ${inputPath}`,
  );

  axios({
    method: "get",
    url: videoUrl,
    responseType: "stream",
  })
    .then((response) => {
      response.data.pipe(writer);
    })
    .catch((err) => {
      console.error(
        "[CONVERTER_SERVICE] (/clean) Download failed:",
        err.message,
      );
      res.status(500).json({
        error: "Failed to download video file.",
        details: err.message,
      });
    });

  writer.on("finish", () => {
    console.log(
      `[CONVERTER_SERVICE] (/clean) Download finished. File saved to ${inputPath}`,
    );

    // Use -c copy to remux without re-encoding. This is very fast.
    const ffmpegCommand = `ffmpeg -i ${inputPath} -c copy -movflags +faststart ${outputPath}`;
    console.log(
      `[CONVERTER_SERVICE] (/clean) Executing ffmpeg: ${ffmpegCommand}`,
    );

    exec(ffmpegCommand, async (error, stdout, stderr) => {
      console.log(`[CONVERTER_SERVICE] (/clean) FFmpeg stdout: ${stdout}`);
      console.error(`[CONVERTER_SERVICE] (/clean) FFmpeg stderr: ${stderr}`);
      try {
        if (error) {
          console.error(
            "[CONVERTER_SERVICE] (/clean) Full FFmpeg error object:",
            error,
          );
          throw new Error(`FFmpeg failed during clean: ${stderr}`);
        }
        console.log("[CONVERTER_SERVICE] (/clean) ffmpeg remux successful.");

        console.log(
          `[CONVERTER_SERVICE] (/clean) Uploading ${outputFileName} to Supabase...`,
        );
        const videoBuffer = fs.readFileSync(outputPath);
        const { error: uploadError } = await supabase.storage
          .from("processed-videos") // Still upload to processed-videos
          .upload(outputFileName, videoBuffer, {
            contentType: "video/mp4",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(
            `Supabase upload failed after clean: ${uploadError.message}`,
          );
        }
        console.log("[CONVERTER_SERVICE] (/clean) File uploaded to Supabase.");

        const { data: publicUrlData } = supabase.storage
          .from("processed-videos")
          .getPublicUrl(outputFileName);
        console.log(
          `[CONVERTER_SERVICE] (/clean) Successfully processed. Public URL: ${publicUrlData.publicUrl}`,
        );

        res.status(200).json({
          message: "Video cleaned successfully!",
          publicUrl: publicUrlData.publicUrl,
        });
      } catch (err) {
        console.error(
          "[CONVERTER_SERVICE] (/clean) Error during remux/upload:",
          err.message,
        );
        res.status(500).json({
          error: "An internal server error occurred.",
          details: err.message,
        });
      } finally {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        console.log("[CONVERTER_SERVICE] (/clean) Temporary files cleaned up.");
      }
    });
  });

  writer.on("error", (err) => {
    console.error(
      "[CONVERTER_SERVICE] (/clean) File stream writer error:",
      err.message,
    );
    res.status(500).json({
      error: "Failed to write video file to disk.",
      details: err.message,
    });
  });
});

app.post("/analyze", apiKeyAuth, (req, res) => {
  const { videoUrl } = req.body;
  console.log(
    `[CONVERTER_SERVICE] Received /analyze request for URL: ${videoUrl}`,
  );

  if (!videoUrl) {
    console.log("[CONVERTER_SERVICE] Error: Missing videoUrl.");
    return res.status(400).json({ error: "Missing videoUrl in request body." });
  }

  const tempDir = path.join(__dirname, "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`[CONVERTER_SERVICE] Created temp directory: ${tempDir}`);
  }

  const inputPath = path.join(
    tempDir,
    `input_${Date.now()}_${path.basename(new URL(videoUrl).pathname)}`,
  );
  const writer = fs.createWriteStream(inputPath);

  console.log(
    `[CONVERTER_SERVICE] Starting download for analysis from ${videoUrl} to ${inputPath}`,
  );

  axios({
    method: "get",
    url: videoUrl,
    responseType: "stream",
  })
    .then((response) => {
      response.data.pipe(writer);
    })
    .catch((err) => {
      console.error(
        "[CONVERTER_SERVICE] Download for analysis failed:",
        err.message,
      );
      res.status(500).json({
        error: "Failed to download video file for analysis.",
        details: err.message,
      });
    });

  writer.on("finish", () => {
    console.log(
      `[CONVERTER_SERVICE] Download for analysis finished. File saved to ${inputPath}`,
    );

    const ffprobeCommand = `ffprobe -v quiet -print_format json -show_format -show_streams ${inputPath}`;
    console.log(`[CONVERTER_SERVICE] Executing ffprobe: ${ffprobeCommand}`);

    exec(ffprobeCommand, (error, stdout, stderr) => {
      try {
        if (error) {
          console.error(`[CONVERTER_SERVICE] ffprobe failed: ${stderr}`);
          throw new Error(`ffprobe execution failed: ${stderr}`);
        }

        console.log("[CONVERTER_SERVICE] ffprobe analysis successful.");
        const analysisData = JSON.parse(stdout);
        res.status(200).json(analysisData);
      } catch (err) {
        console.error(
          "[CONVERTER_SERVICE] Error during analysis:",
          err.message,
        );
        res.status(500).json({
          error: "An internal server error occurred during analysis.",
          details: err.message,
        });
      } finally {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        console.log("[CONVERTER_SERVICE] Temporary analysis file cleaned up.");
      }
    });
  });

  writer.on("error", (err) => {
    console.error(
      "[CONVERTER_SERVICE] File stream writer error during analysis:",
      err.message,
    );
    res.status(500).json({
      error: "Failed to write video file to disk for analysis.",
      details: err.message,
    });
  });
});

app.post("/generate-image", apiKeyAuth, async (req, res) => {
  const {
    text,
    templateId = "default",
    color = "#7c3aed",
    userId,
    fontFamily = "'Poppins', sans-serif",
    backgroundColor = "#1a1a1a",
  } = req.body;
  console.log(`[CONVERTER_SERVICE] Received /generate-image request.`);

  if (!text || !userId) {
    console.log(
      "[CONVERTER_SERVICE] Error: Missing 'text' or 'userId' for /generate-image.",
    );
    return res
      .status(400)
      .json({ error: "Missing 'text' or 'userId' in request body." });
  }

  const tempDir = path.join(__dirname, "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const outputName = `quote_${Date.now()}.png`;
  const outputPath = path.join(tempDir, outputName);

  try {
    const templateName = templateId.endsWith(".hbs")
      ? templateId
      : `${templateId}.hbs`;
    const templatePath = path.join(__dirname, "templates", templateName);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }
    const templateContent = fs.readFileSync(templatePath, "utf8");

    console.log(
      `[CONVERTER_SERVICE] Generating image with template: ${templateId}, color: ${color}, font: ${fontFamily}, bg: ${backgroundColor}`,
    );
    await nodeHtmlToImage({
      output: outputPath,
      html: templateContent,
      content: {
        text: text,
        color: color,
        fontFamily: fontFamily,
        backgroundColor: backgroundColor,
      },
      puppeteerArgs: { args: ["--no-sandbox"] },
    });
    console.log(`[CONVERTER_SERVICE] Image generated at: ${outputPath}`);

    const supabasePath = `quote-images/${userId}/${outputName}`;
    console.log(
      `[CONVERTER_SERVICE] Uploading to Supabase path: ${supabasePath}`,
    );

    const imageBuffer = fs.readFileSync(outputPath);
    const { error: uploadError } = await supabase.storage
      .from("post-images") // Usando o bucket correto
      .upload(supabasePath, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }
    console.log(`[CONVERTER_SERVICE] File uploaded to Supabase.`);

    const { data: publicUrlData } = supabase.storage
      .from("post-images")
      .getPublicUrl(supabasePath);

    console.log(
      `[CONVERTER_SERVICE] Successfully generated image. Public URL: ${publicUrlData.publicUrl}`,
    );

    res.status(200).json({
      status: "success",
      message: "Image generated successfully!",
      publicUrl: publicUrlData.publicUrl,
    });
  } catch (err) {
    console.error("[CONVERTER_SERVICE] (/generate-image) Error:", err.message);
    res.status(500).json({
      status: "error",
      error: "An internal server error occurred during image generation.",
      details: err.message,
    });
  } finally {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
      console.log(
        "[CONVERTER_SERVICE] (/generate-image) Temporary image cleaned up.",
      );
    }
  }
});

// --- Server Start ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`[CONVERTER_SERVICE] Server is running on port ${PORT}`);
});
