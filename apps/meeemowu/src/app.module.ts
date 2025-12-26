import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotionWebhookController } from './controllers/notion-webhook.controller';
import { PgVectorRepository } from './repositories/pgvector.repository';
import { VectorRepositoryTag } from './repositories/vector.repository';
import { NotionService } from './services/notion.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [NotionWebhookController],
  providers: [
    {
      provide: VectorRepositoryTag,
      useClass: PgVectorRepository,
    },
    NotionService,
  ],
})
export class AppModule {}
