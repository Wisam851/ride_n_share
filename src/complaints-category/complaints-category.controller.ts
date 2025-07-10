import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { UserJwtAuthGuard } from 'src/auth/user/user-jwt.guard';
import { ComplaintsCategoryService } from './complaints-category.service';
import { AdminJwtAuthGuard } from 'src/auth/admin/admin-jwt.guard';
import { CreateComplainCategoryDto, UpdateComplainCategoryDto } from './dto/complain-category.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/common/utils/multer.config';


@Controller('complaints-category')
@UseGuards(AdminJwtAuthGuard)
export class ComplaintsCategoryController {
    constructor(private readonly service: ComplaintsCategoryService) { }



    @Post('store')
    @UseInterceptors(FileInterceptor('icon', multerConfig('uploads')))
    async store(
        @Body() body: CreateComplainCategoryDto,
        @UploadedFile() file: Express.Multer.File,
        @CurrentUser('id') userId: number,
    ) {
        if (file) {
            body.icon = file.filename;
        }
        return await this.service.create(body, userId);
    }

    @Get('list-all-categories')
    async findAll() {
        return await this.service.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: number) {
        return await this.service.findOne(id);
    }


    @Patch(':id')
    @UseInterceptors(FileInterceptor('icon', multerConfig('uploads')))
    async update(
        @Param('id') id: number,
        @Body() dto: UpdateComplainCategoryDto,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (file) {
            dto.icon = file.filename;
        }
        return await this.service.update(id, dto);
    }


    @Delete(':id')
    async delete(@Param('id') id: number) {
        return await this.service.delete(id);
    }
}


function GetUser(arg0: string): (target: ComplaintsCategoryController, propertyKey: "create", parameterIndex: 1) => void {
    throw new Error('Function not implemented.');
}

