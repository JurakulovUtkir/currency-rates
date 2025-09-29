import {
    Controller,
    Get,
    Post,
    Param,
    UseInterceptors,
    UploadedFile,
    Res,
    StreamableFile,
    BadRequestException,
    Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { createReadStream, existsSync, mkdirSync } from 'fs'; // Add these imports
import { join } from 'path';
import { diskStorage } from 'multer';
import { Response } from 'express';
import * as fs from 'fs/promises';
import { Multer } from 'multer'; // Add this import at the top
import { FileSystemService } from './file-system.service';
import { ResData } from 'src/common/utils/resData';

@ApiTags('File System')
@Controller('files')
export class FileSystemController {
    private readonly MAX_FILE_SIZE = 512 * 1024; // 0.5MB in bytes
    private uploadPath = join(process.cwd(), 'assets');

    constructor(private readonly fileSystemService: FileSystemService) {
        if (!existsSync(this.uploadPath)) {
            mkdirSync(this.uploadPath, { recursive: true });
        }
    }

    @Post('upload')
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './assets',
                filename: (req, file, cb) => {
                    const uniqueSuffix =
                        Date.now() + '-' + Math.round(Math.random() * 1e9);
                    cb(null, `${uniqueSuffix}-${file.originalname}`);
                },
            }),
            limits: {
                fileSize: 512 * 1024,
            },
            fileFilter: (req, file, cb) => {
                cb(null, true);
            },
        }),
    )
    async uploadFile(@UploadedFile() file: Multer.File): Promise<ResData<any>> {
        try {
            if (!file) {
                return new ResData('No file uploaded', 400, null);
            }

            if (file.size > this.MAX_FILE_SIZE) {
                await fs.unlink(file.path);
                return new ResData('File size exceeds 0.5MB', 400, null);
            }

            const filePath = `/assets/${file.filename}`;

            const fileData = {
                filename: file.filename,
                originalName: file.originalname,
                size: file.size,
                path: filePath,
            };

            const savedFile = await this.fileSystemService.saveFileData(
                fileData,
            );

            return new ResData('File uploaded successfully', 200, {
                id: savedFile.id,
                ...fileData,
                uploadedAt: savedFile.uploadedAt,
            });
        } catch (error) {
            console.error('Upload error:', error);
            return new ResData('Failed to upload file', 500, null);
        }
    }

    @Delete(':path')
    async deleteFile(@Param('path') path: string): Promise<ResData<any>> {
        try {
            const filePath = join(this.uploadPath, path);
            await fs.access(filePath);
            await fs.unlink(filePath);
            await this.fileSystemService.deleteFileByPath(`/assets/${path}`);
            return new ResData('File deleted successfully', 200, null);
        } catch (error) {
            console.error('Delete error:', error);
            return new ResData('Failed to delete file', 404, null);
        }
    }
}
