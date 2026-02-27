import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  Matches,
  ValidateIf,
  IsPhoneNumber,
  IsArray,
} from 'class-validator';

// Enums for vehicle information
export enum VehicleType {
  CAR = 'car',
  MOTORBIKE = 'motorbike',
  SCOOTY = 'scooty',
  THREEWHEEL = 'threewheel',
  VAN = 'van',
  SUV = 'suv',
  BUS = 'bus',
}

export enum ConnectorType {
  CCS = 'CCS',
  TYPE_2 = 'Type 2',
  CHADEMO = 'CHAdeMO',
  GBT = 'GBT',
}

export class EnhancedRegisterDto {
  // Basic Account Information
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Email or phone number is required' })
  emailOrPhone: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  // EV Driver Profile Information (OPTIONAL - for EV owners only)
  @ValidateIf(o => o.vehicleType !== undefined && o.vehicleType !== null && o.vehicleType !== '')
  @IsEnum(VehicleType, {
    message: 'Vehicle type must be one of: car, motorbike, scooty, threewheel, van, suv, bus',
  })
  vehicleType?: VehicleType;

  @ValidateIf(o => o.vehicleBrand !== undefined && o.vehicleBrand !== null && o.vehicleBrand !== '')
  @IsString({ message: 'vehicleBrand must be a string' })
  @MinLength(2, { message: 'Vehicle brand must be at least 2 characters long' })
  vehicleBrand?: string;

  @ValidateIf(o => o.vehicleModel !== undefined && o.vehicleModel !== null && o.vehicleModel !== '')
  @IsString({ message: 'vehicleModel must be a string' })
  @MinLength(2, { message: 'Vehicle model must be at least 2 characters long' })
  vehicleModel?: string;

  @ValidateIf(o => o.batteryCapacity !== undefined && o.batteryCapacity !== null)
  @IsNumber({}, { message: 'Battery capacity must be a valid number' })
  @Min(1, { message: 'Battery capacity must be at least 1 kWh' })
  @Max(200, { message: 'Battery capacity cannot exceed 200 kWh' })
  batteryCapacity?: number;

  @ValidateIf(o => o.connectorType !== undefined && o.connectorType !== null && o.connectorType !== '')
  @IsString({ message: 'connectorType must be a string (for backward compatibility)' })
  connectorType?: string;

  @ValidateIf(o => o.connectorTypes !== undefined && o.connectorTypes !== null)
  @IsArray({ message: 'connectorTypes must be an array' })
  @IsString({ each: true, message: 'Each connector type must be a string' })
  connectorTypes?: string[];

  // Legal Requirements
  @IsBoolean({ message: 'Terms acceptance must be a boolean value' })
  @IsNotEmpty({ message: 'You must accept the terms and conditions' })
  acceptTerms: boolean;

  @IsBoolean({ message: 'Privacy policy acceptance must be a boolean value' })
  @IsNotEmpty({ message: 'You must accept the privacy policy' })
  acceptPrivacyPolicy: boolean;
}
