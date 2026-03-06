import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import { fetchTbcBankOfficeRates } from './rates/TBC';
dotenv.config();

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // ✅ Enable CORS (Important for frontend communication)
    app.enableCors();

    // adds v1 to api
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
    });

    // validates dto
    app.useGlobalPipes(new ValidationPipe());

    // Swagger configuration
    const config = new DocumentBuilder()
        .setTitle('Genix API')
        .setDescription('The Genix API documentation')
        .setVersion('1.0')
        .build();

    //configurates the swagger ui
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    // const data = await fetchBrbOfficeRatesPptr();
    // console.log('BRB Office Rates:', data);

    // tbc test
    const tbcData = await fetchTbcBankOfficeRates();
    console.log('TBC Office Rates:', tbcData);

    await app.listen(process.env.PORT);
}
bootstrap();
