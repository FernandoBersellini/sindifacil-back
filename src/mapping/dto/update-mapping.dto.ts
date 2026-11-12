// Mover a ficha de gaveta: armário e gaveta são sempre informados juntos,
// por isso este DTO não usa PartialType.
export class UpdateMappingDto {
  cabinet: string;
  drawer: string;
}
