"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.json({ data: 'test' });
});
app.post('/process-video', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const videoUrl = req.body.videoUrl;
    if (!videoUrl) {
        return res.status(400).json({ error: 'Video URL is required' });
    }
    try {
        fluent_ffmpeg_1.default.ffprobe(videoUrl, (err, metadata) => __awaiter(void 0, void 0, void 0, function* () {
            console.log('stage1 pass');
            if (err) {
                console.error('Error getting video metadata:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (!metadata.streams || metadata.streams.length === 0) {
                console.error('No video streams found in the metadata.');
                return res.status(500).json({ error: 'Internal server error' });
            }
            const videoStream = metadata.streams.find((stream) => stream.codec_type === 'video');
            if (!videoStream || !videoStream.width || !videoStream.height) {
                console.error('Video width or height information is missing in the metadata.');
                return res.status(500).json({ error: 'Internal server error' });
            }
            const width = videoStream.width;
            const height = videoStream.height;
            let rate = 1.0;
            if (width >= 3500 || height >= 3500) {
                rate = 2.0;
            }
            else if (width >= 2500 || height >= 2500) {
                rate = 1.8;
            }
            else if (width >= 2000 || height >= 2000) {
                rate = 1.5;
            }
            else if (width >= 1500 || height >= 1500) {
                rate = 1.3;
            }
            else if (width >= 1200 || height >= 1200) {
                rate = 1.1;
            }
            let newWidth = Math.round(width / rate);
            let newHeight = Math.round(height / rate);
            if (newWidth % 2 !== 0) {
                newWidth += 1;
            }
            if (newHeight % 2 !== 0) {
                newHeight += 1;
            }
            console.log('stage2 pass');
            const buffer = yield new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(videoUrl)
                    .videoCodec('libx264')
                    .addOption('-vf', `scale=${newWidth}:${newHeight}`)
                    .addOption('-crf', '23')
                    .toFormat('MKV')
                    .on('end', (stdout, stderr) => {
                    console.log('Video quality reduced successfully.');
                })
                    .on('error', (ffmpegError, stdout, stderr) => {
                    console.error('Error reducing video quality:', ffmpegError);
                    console.error('FFmpeg stderr:', stderr);
                    reject(ffmpegError);
                })
                    .pipe()
                    .on('data', (chunk) => {
                    resolve(chunk);
                });
            });
            res.setHeader('Content-Type', 'video/mp4');
            res.send(buffer);
            console.log('stage3 pass');
        }));
    }
    catch (error) {
        console.error('Error processing video:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
