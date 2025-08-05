import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Put,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entity/user.entity';
import { MultiAuthGuard } from 'src/auth/multi-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('contacts')
@UseGuards(MultiAuthGuard, RolesGuard)
@Roles('customer', 'driver')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  create(
    @Body() createContactDto: CreateContactDto,
    @CurrentUser() user: User,
  ) {
    return this.contactService.create(createContactDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.contactService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
    return this.contactService.update(+id, updateContactDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contactService.remove(+id);
  }

  @Put('toggleStatus/:id')
  toggleStatus(@Param('id') id: string) {
    return this.contactService.toggleStatus(+id);
  }
}
