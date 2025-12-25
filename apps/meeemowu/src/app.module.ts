import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotionWebhookController } from './controllers/notion-webhook.controller';
import { QdrantRepository } from './repositories/qdrant.repository';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [NotionWebhookController],
  providers: [QdrantRepository],
})
export class AppModule {}
