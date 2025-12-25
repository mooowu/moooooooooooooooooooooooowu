import { Module } from '@nestjs/common';
import { NotionWebhookController } from './controllers/notion-webhook.controller';

@Module({
  imports: [],
  controllers: [NotionWebhookController],
  providers: [],
})
export class AppModule {}
