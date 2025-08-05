import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum ChatMessageType {
  TEXT = 'text',
  IMAGE = 'image',
  LOCATION = 'location',
}

export class SendMessageDto {
  @IsNumber()
  @IsNotEmpty()
  rideId: number;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsEnum(ChatMessageType)
  messageType?: ChatMessageType;
}

export class ChatMessageResponseDto {
  id: number;
  rideId: number;
  senderId: number;
  message: string;
  messageType: ChatMessageType;
  createdAt: Date;
}
