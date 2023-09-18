import express, { Request, Response } from 'express';
import axios from 'axios';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.json({ data: 'test' });
});

app.post('/process-video', async (req: Request, res: Response) => {
  const videoUrl = req.body.videoUrl as string;
  if (!videoUrl) {
    return res.status(400).json({ error: 'Video URL is required' });
  }

  const response = await axios.get(videoUrl, { responseType: 'stream' });
  const writer = fs.createWriteStream('downloaded-video.mp4');

  response.data.pipe(writer);

  writer.on('finish', () => {
    console.log('Video downloaded successfully.');
    const inputVideo = 'downloaded-video.mp4';
    const outputVideo = 'reduced-video.mp4';

    ffmpeg.ffprobe(inputVideo, (err, metadata) => {
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

      let width = videoStream.width;
      let height = videoStream.height;

      // Calculate the rate based on the video's dimensions
      let rate = 1.0;

      if (width >= 3500 || height >= 3500) {
        rate = 2.0;
      } else if (width >= 2500 || height >= 2500) {
        rate = 1.8;
      } else if (width >= 2000 || height >= 2000) {
        rate = 1.5;
      } else if (width >= 1500 || height >= 1500) {
        rate = 1.3;
      } else if (width >= 1200 || height >= 1200) {
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

      console.log(`Original Width: ${width}, Height: ${height}`);
      console.log(`Reduced Width: ${newWidth}, Height: ${newHeight}`);

      ffmpeg(inputVideo)
        .videoCodec('libx264')
        .addOption('-vf', `scale=${newWidth}:${newHeight}`)
        .addOption('-crf', '23')
        .on('end', () => {
          console.log('Video quality reduced successfully.');
          res.json({ videoUrl: outputVideo });
        })
        .on('error', (err, stdout, stderr) => {
          console.error('Error reducing video quality:', err);
          console.error('FFmpeg stderr:', stderr);
          res.status(500).json({ error: 'Internal server error' });
        })
        .save(outputVideo);
    });
  });

  writer.on('error', (err) => {
    console.error('Error downloading video:', err);
    res.status(500).json({ error: 'Internal server error' });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
