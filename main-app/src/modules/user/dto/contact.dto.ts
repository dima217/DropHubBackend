import { IsNumber } from 'class-validator';

export class ContactDto {
  @IsNumber()
  contactId: number;
}
