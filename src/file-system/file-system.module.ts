import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileSystemController } from './file-system.controller';
import { FileSystemService } from './file-system.service';
import { FileEntity } from './entities/file.entity';

@Module({
    imports: [TypeOrmModule.forFeature([FileEntity])],
    controllers: [FileSystemController],
    providers: [FileSystemService],
})
export class FileSystemModule {}
