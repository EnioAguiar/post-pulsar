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
    console.error('[CONVERTER_SERVICE] Error: Missing required environment variables.');
    process.exit(1);
}

// Initialize Supabase Admin Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// --- Security Middleware ---
const apiKeyAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.SERVICE_API_KEY}`) {
        console.log('[CONVERTER_SERVICE] Unauthorized: Invalid or missing API Key.');
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }
    next();
};

// --- Routes ---
app.get('/', (req, res) => {
    res.send('Video Converter Service is running!');
});

app.post('/convert', apiKeyAuth, (req, res) => {
    const { videoUrl, outputFileName } = req.body;
    console.log(`[CONVERTER_SERVICE] Received /convert request for URL: ${videoUrl}`);

    if (!videoUrl || !outputFileName) {
        console.log('[CONVERTER_SERVICE] Error: Missing videoUrl or outputFileName.');
        return res.status(400).json({ error: 'Missing videoUrl or outputFileName in request body.' });
    }

    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        console.log(`[CONVERTER_SERVICE] Created temp directory: ${tempDir}`);
    }

    const inputPath = path.join(tempDir, `input_${Date.now()}_${path.basename(new URL(videoUrl).pathname)}`);
    const outputPath = path.join(tempDir, outputFileName);

    const writer = fs.createWriteStream(inputPath);

    console.log(`[CONVERTER_SERVICE] Starting download from ${videoUrl} to ${inputPath}`);

    axios({
        method: 'get',
        url: videoUrl,
        responseType: 'stream',
    }).then(response => {
        response.data.pipe(writer);
    }).catch(err => {
        console.error('[CONVERTER_SERVICE] Download failed:', err.message);
        res.status(500).json({ error: 'Failed to download video file.', details: err.message });
    });

    writer.on('finish', () => {
        console.log(`[CONVERTER_SERVICE] Download finished. File saved to ${inputPath}`);
        
        const ffmpegCommand = `ffmpeg -i ${inputPath} -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:-1:-1,setsar=1" -c:v libx264 -profile:v main -r 30 -preset fast -crf 28 -pix_fmt yuv420p -c:a aac -b:a 128k ${outputPath}`;
        console.log(`[CONVERTER_SERVICE] Executing ffmpeg: ${ffmpegCommand}`);

        exec(ffmpegCommand, async (error, stdout, stderr) => {
            console.log(`[CONVERTER_SERVICE] FFmpeg stdout: ${stdout}`);
            console.error(`[CONVERTER_SERVICE] FFmpeg stderr: ${stderr}`);
            try {
                if (error) {
                    console.error('[CONVERTER_SERVICE] Full FFmpeg error object:', error);
                    throw new Error(`FFmpeg failed: ${stderr}`);
                }
                console.log('[CONVERTER_SERVICE] ffmpeg conversion successful.');

                const stats = fs.statSync(outputPath);
                const fileSizeInMegabytes = stats.size / (1024 * 1024);
                console.log(`[CONVERTER_SERVICE] Converted file size: ${fileSizeInMegabytes.toFixed(2)} MB`);

                console.log(`[CONVERTER_SERVICE] Uploading ${outputFileName} to Supabase...`);
                const videoBuffer = fs.readFileSync(outputPath);
                const { error: uploadError } = await supabase.storage
                    .from('processed-videos')
                    .upload(outputFileName, videoBuffer, {
                        contentType: 'video/mp4',
                        upsert: true,
                    });

                if (uploadError) {
                    throw new Error(`Supabase upload failed: ${uploadError.message}`);
                }
                console.log('[CONVERTER_SERVICE] File uploaded to Supabase.');

                const { data: publicUrlData } = supabase.storage.from('processed-videos').getPublicUrl(outputFileName);
                console.log(`[CONVERTER_SERVICE] Successfully processed. Public URL: ${publicUrlData.publicUrl}`);
                
                res.status(200).json({ message: 'Video converted successfully!', publicUrl: publicUrlData.publicUrl });

            } catch (err) {
                console.error('[CONVERTER_SERVICE] Error during conversion/upload:', err.message);
                res.status(500).json({ error: 'An internal server error occurred.', details: err.message });
            } finally {
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                console.log('[CONVERTER_SERVICE] Temporary files cleaned up.');
            }
        });
    });

    writer.on('error', (err) => {
        console.error('[CONVERTER_SERVICE] File stream writer error:', err.message);
        res.status(500).json({ error: 'Failed to write video file to disk.', details: err.message });
    });
});

app.post('/analyze', apiKeyAuth, (req, res) => {
    const { videoUrl } = req.body;
    console.log(`[CONVERTER_SERVICE] Received /analyze request for URL: ${videoUrl}`);

    if (!videoUrl) {
        console.log('[CONVERTER_SERVICE] Error: Missing videoUrl.');
        return res.status(400).json({ error: 'Missing videoUrl in request body.' });
    }

    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        console.log(`[CONVERTER_SERVICE] Created temp directory: ${tempDir}`);
    }

    const inputPath = path.join(tempDir, `input_${Date.now()}_${path.basename(new URL(videoUrl).pathname)}`);
    const writer = fs.createWriteStream(inputPath);

    console.log(`[CONVERTER_SERVICE] Starting download for analysis from ${videoUrl} to ${inputPath}`);

    axios({
        method: 'get',
        url: videoUrl,
        responseType: 'stream',
    }).then(response => {
        response.data.pipe(writer);
    }).catch(err => {
        console.error('[CONVERTER_SERVICE] Download for analysis failed:', err.message);
        res.status(500).json({ error: 'Failed to download video file for analysis.', details: err.message });
    });

    writer.on('finish', () => {
        console.log(`[CONVERTER_SERVICE] Download for analysis finished. File saved to ${inputPath}`);
        
        const ffprobeCommand = `ffprobe -v quiet -print_format json -show_format -show_streams ${inputPath}`;
        console.log(`[CONVERTER_SERVICE] Executing ffprobe: ${ffprobeCommand}`);

        exec(ffprobeCommand, (error, stdout, stderr) => {
            try {
                if (error) {
                    console.error(`[CONVERTER_SERVICE] ffprobe failed: ${stderr}`);
                    throw new Error(`ffprobe execution failed: ${stderr}`);
                }
                
                console.log('[CONVERTER_SERVICE] ffprobe analysis successful.');
                const analysisData = JSON.parse(stdout);
                res.status(200).json(analysisData);

            } catch (err) {
                console.error('[CONVERTER_SERVICE] Error during analysis:', err.message);
                res.status(500).json({ error: 'An internal server error occurred during analysis.', details: err.message });
            } finally {
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                console.log('[CONVERTER_SERVICE] Temporary analysis file cleaned up.');
            }
        });
    });

    writer.on('error', (err) => {
        console.error('[CONVERTER_SERVICE] File stream writer error during analysis:', err.message);
        res.status(500).json({ error: 'Failed to write video file to disk for analysis.', details: err.message });
    });
});

// --- Server Start ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`[CONVERTER_SERVICE] Server is running on port ${PORT}`);
});