export class AllocateMappingDto {
  cabinet: string;
  drawer: string;
  // A2: a ficha já está guardada nessa gaveta (acervo existente).
  alreadyStored?: boolean;
  // E5: confirma o registro de uma ficha já guardada numa gaveta com
  // 100 fichas ou mais. Só tem efeito junto com alreadyStored.
  acknowledgeOverCapacity?: boolean;
}
