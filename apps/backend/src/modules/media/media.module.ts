import { Module } from '@nestjs/common';
import { ImageOptimizer } from './image-optimizer.js';
import { MediaController } from './media.controller.js';

@Module({
  controllers: [MediaController],
  providers: [ImageOptimizer],
  exports: [ImageOptimizer],
})
export class MediaModule {}
