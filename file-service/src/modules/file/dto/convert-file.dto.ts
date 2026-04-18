import { IsIn, IsOptional, IsString } from "class-validator";

export const FILE_CONVERSION_TYPES = [
  "csv_to_json",
  "json_to_csv",
  "xml_to_json",
  "json_to_xml",
  "xlsx_to_json",
  "docx_to_pdf",
  "pdf_to_text",
  "pdf_to_images",
  "pptx_to_pdf",
] as const;

export type FileConversionType = (typeof FILE_CONVERSION_TYPES)[number];

export class ConvertFileDto {
  @IsString()
  @IsOptional()
  roomId?: string;

  @IsString()
  @IsOptional()
  storageId?: string;

  @IsString()
  @IsOptional()
  resourceId?: string;

  @IsString()
  @IsOptional()
  parentId?: string | null;

  @IsString()
  fileId: string;

  @IsString()
  @IsIn(FILE_CONVERSION_TYPES)
  conversion: FileConversionType;
}

