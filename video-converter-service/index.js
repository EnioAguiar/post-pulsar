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
        // This command is based on expert recommendations for fitting video into a 1080x1920 canvas for social media.
        // It scales the video down to fit without upscaling (force_original_aspect_ratio=decrease) and pads with black bars to ensure the final output is exactly 1080x1920.
        const ffmpegCommand = `ffmpeg -i ${inputPath} -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:-1:-1,setsar=1" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k ${outputPath}`;
        
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
