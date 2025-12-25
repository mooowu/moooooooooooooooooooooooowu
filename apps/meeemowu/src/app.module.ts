import { Module } from '@nestjs/common';
import { NotionWebhookController } from './controllers/notion-webhook.controller';
import { QdrantService } from './services/qdrant.service';

@Module({
  imports: [],
  controllers: [NotionWebhookController],
  providers: [QdrantService],
})
export class AppModule {}
