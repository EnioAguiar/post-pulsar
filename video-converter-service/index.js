require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Check for required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.SERVICE_API_KEY) {
    console.error('Error: Missing required environment variables.');
    process.exit(1);
}

// Initialize Supabase Admin Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// --- Security Middleware ---
const apiKeyAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.SERVICE_API_KEY}`) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }
    next();
};

// --- Routes ---
app.get('/', (req, res) => {
    res.send('Video Converter Service is running!');
});

app.post('/convert', apiKeyAuth, async (req, res) => {
    const { videoUrl, outputFileName } = req.body;

    if (!videoUrl || !outputFileName) {
        return res.status(400).json({ error: 'Missing videoUrl or outputFileName in request body.' });
    }

    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    const inputPath = path.join(tempDir, `input_${Date.now()}_${path.basename(videoUrl)}`);
    const outputPath = path.join(tempDir, outputFileName);

    try {
        // TODO 1: Download the video from the provided URL
        console.log(`Downloading video from ${videoUrl}...`);
        const response = await axios({ url: videoUrl, responseType: 'stream' });
        const writer = fs.createWriteStream(inputPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
        console.log('Video downloaded successfully.');

        // TODO 2: Run the ffmpeg command for conversion
        // A more robust ffmpeg command that prevents upscaling to avoid memory issues.
        // It scales down to 1080x1920, pads to fit the aspect ratio, and ensures web-compatible pixel format.
        const ffmpegCommand = `ffmpeg -i ${inputPath} -vf "scale='min(1080,iw)':'min(1920,ih)':force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k ${outputPath}`;
        
        console.log('Starting ffmpeg conversion...');
        await new Promise((resolve, reject) => {
            exec(ffmpegCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error(`ffmpeg error: ${stderr}`);
                    return reject(new Error(`FFmpeg failed: ${stderr}`));
                }
                console.log('ffmpeg conversion successful.');
                resolve(stdout);
            });
        });

        // TODO 3: Upload the converted file to Supabase Storage
        console.log(`Uploading ${outputFileName} to Supabase...`);
        const videoBuffer = fs.readFileSync(outputPath);
        const { data, error: uploadError } = await supabase.storage
            .from('processed-videos') // Assumes a bucket named 'processed-videos'
            .upload(outputFileName, videoBuffer, {
                contentType: 'video/mp4',
                upsert: true,
            });

        if (uploadError) {
            throw new Error(`Supabase upload failed: ${uploadError.message}`);
        }
        console.log('File uploaded to Supabase.');

        // TODO 4: Get the public URL and send response
        const { data: publicUrlData } = supabase.storage.from('processed-videos').getPublicUrl(outputFileName);

        res.status(200).json({ message: 'Video converted successfully!', publicUrl: publicUrlData.publicUrl });

    } catch (error) {
        console.error('Error in /convert endpoint:', error.message);
        res.status(500).json({ error: 'An internal server error occurred.', details: error.message });
    } finally {
        // TODO 5: Cleanup temporary files
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        console.log('Temporary files cleaned up.');
    }
});

// --- Server Start ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
