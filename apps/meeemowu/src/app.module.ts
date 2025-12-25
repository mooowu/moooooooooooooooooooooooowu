import { Module } from '@nestjs/common';
import { NotionWebhookController } from './controllers/notion-webhook.controller';
import { SearchController } from './controllers/search.controller';
import { QdrantService } from './services/qdrant.service';

@Module({
  imports: [],
  controllers: [NotionWebhookController, SearchController],
  providers: [QdrantService],
})
export class AppModule {}
