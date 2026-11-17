import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator.js';
import { mediaDir } from './image-optimizer.js';

const HASH = /^[a-f0-9]{64}$/;
const VARIANT = /^(400|800|1200)\.webp$/;

@Controller('media')
export class MediaController {
  // Public: <img> requests carry no bearer token.
  @Public()
  @Get(':hash/:file')
  serve(
    @Param('hash') hash: string,
    @Param('file') file: string,
    @Res() res: Response,
  ): void {
    if (!HASH.test(hash) || !VARIANT.test(file)) throw new NotFoundException();
    res.sendFile(
      `${hash}/${file}`,
      {
        root: mediaDir(),
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
          // helmet defaults to same-origin; the frontend is another origin.
          'Cross-Origin-Resource-Policy': 'cross-origin',
        },
      },
      (error) => {
        if (error && !res.headersSent) res.sendStatus(404);
      },
    );
  }
}
