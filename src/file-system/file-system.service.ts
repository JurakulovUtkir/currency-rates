import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from './entities/file.entity';

@Injectable()
export class FileSystemService {
    constructor(
        @InjectRepository(FileEntity)
        private fileRepository: Repository<FileEntity>,
    ) {}

    async saveFileData(fileData: Partial<FileEntity>) {
        const file = this.fileRepository.create(fileData);
        return await this.fileRepository.save(file);
    }

    async deleteFileByPath(path: string): Promise<void> {
        await this.fileRepository.delete({ path });
    }
}
