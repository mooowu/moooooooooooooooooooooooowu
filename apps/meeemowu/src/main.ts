import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { NotionWebhookServer } from './transports/notion-webhook';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    strategy: new NotionWebhookServer({
      port: Number(process.env.NOTION_WEBHOOK_PORT) || 3001,
      path: '/notion/webhook',
      verificationToken: process.env.NOTION_VERIFICATION_TOKEN,
    }),
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);

  console.log(`meeemowu is running on port ${process.env.PORT ?? 3000}`);
  console.log(`Notion webhook listening on port ${process.env.NOTION_WEBHOOK_PORT ?? 3001}`);
}

bootstrap();
