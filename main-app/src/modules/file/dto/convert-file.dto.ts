import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export const FILE_CONVERSION_TYPES = [
  'csv_to_json',
  'json_to_csv',
  'xml_to_json',
  'json_to_xml',
  'xlsx_to_json',
  'docx_to_pdf',
  'pdf_to_text',
  'pdf_to_images',
  'pptx_to_pdf',
] as const;

export type FileConversionType = (typeof FILE_CONVERSION_TYPES)[number];

export class ConvertFileDto {
  @ApiPropertyOptional({ example: '67f130f46075c9e8bbd35e4d' })
  @IsString()
  @IsOptional()
  roomId?: string;

  @ApiPropertyOptional({ example: '67f130f46075c9e8bbd35e4e' })
  @IsString()
  @IsOptional()
  storageId?: string;

  @ApiPropertyOptional({ example: '67f130f46075c9e8bbd35e4a' })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiPropertyOptional({ example: '67f130f46075c9e8bbd35e4f', nullable: true })
  @IsString()
  @IsOptional()
  parentId?: string | null;

  @ApiProperty({ example: '67f130f46075c9e8bbd35e53' })
  @IsString()
  fileId: string;

  @ApiProperty({ enum: FILE_CONVERSION_TYPES, example: 'docx_to_pdf' })
  @IsString()
  @IsIn(FILE_CONVERSION_TYPES)
  conversion: FileConversionType;
}

