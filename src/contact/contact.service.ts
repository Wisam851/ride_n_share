import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entity/contact.entity';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';
import { User } from '../users/entity/user.entity';

interface ContactDetails {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  status: boolean;
}

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {}

  //
  private toContactDetails(contact: Contact): ContactDetails {
    return {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      address: contact.address,
      latitude: contact.latitude,
      longitude: contact.longitude,
      status: contact.status,
    };
  }

  private async findContactById(id: number): Promise<Contact> {
    const contact = await this.contactRepository.findOne({ where: { id } });
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    return contact;
  }

  async create(createContactDto: CreateContactDto, user: User): Promise<any> {
    const contact = this.contactRepository.create({
      ...createContactDto,
      user,
    });
    const savedContact = await this.contactRepository.save(contact);

    return {
      success: true,
      message: 'Contact created successfully',
      data: this.toContactDetails(savedContact),
    };
  }

  async findAll(user: User): Promise<any> {
    const contacts = await this.contactRepository.find({
      where: { user: { id: user.id } },
    });

    return {
      success: true,
      message: 'Contacts retrieved successfully',
      data: contacts.map((contact) => this.toContactDetails(contact)),
    };
  }

  async findOne(id: number): Promise<any> {
    const contact = await this.findContactById(id);
    return {
      success: true,
      message: 'Contact retrieved successfully',
      data: this.toContactDetails(contact),
    };
  }

  async update(id: number, updateContactDto: UpdateContactDto): Promise<any> {
    const contact = await this.findContactById(id);
    Object.assign(contact, updateContactDto);
    const updatedContact = await this.contactRepository.save(contact);

    return {
      success: true,
      message: 'Contact updated successfully',
      data: this.toContactDetails(updatedContact),
    };
  }

  async remove(id: number): Promise<any> {
    const contact = await this.findContactById(id);
    await this.contactRepository.remove(contact);

    return {
      success: true,
      message: 'Contact deleted successfully',
      data: undefined,
    };
  }

  async toggleStatus(id: number): Promise<any> {
    const contact = await this.findContactById(id);
    contact.status = !contact.status;
    const updatedContact = await this.contactRepository.save(contact);

    return {
      success: true,
      message: `Contact ${contact.status ? 'activated' : 'deactivated'} successfully`,
      data: this.toContactDetails(updatedContact),
    };
  }
}
