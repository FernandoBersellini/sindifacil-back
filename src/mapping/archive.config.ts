// Estrutura física do arquivo de fichas. Fica em configuração, e não em
// tabela, porque é estável (ver docs/mapeamento.md §3.1).
//
// A ordem dos armários e das gavetas abaixo é a sequência de preenchimento
// usada na sugestão de gaveta (docs/alocar-ficha.md, RN1).
//
// PENDENTE: o número exato de armários e gavetas e a forma de identificá-los
// ainda não foram confirmados. Os valores abaixo seguem a estimativa de
// "cerca de 5 armários × 4 gavetas". Antes de reduzir esta lista, mova as
// fichas mapeadas nas gavetas que serão retiradas.

export const DRAWER_CAPACITY = 100;

export interface CabinetLayout {
  cabinet: string;
  drawers: string[];
}

export const ARCHIVE_LAYOUT: CabinetLayout[] = ['1', '2', '3', '4', '5'].map(
  (cabinet) => ({ cabinet, drawers: ['1', '2', '3', '4'] }),
);

export interface DrawerLocation {
  cabinet: string;
  drawer: string;
}

export function drawerSequence(
  layout: CabinetLayout[] = ARCHIVE_LAYOUT,
): DrawerLocation[] {
  return layout.flatMap(({ cabinet, drawers }) =>
    drawers.map((drawer) => ({ cabinet, drawer })),
  );
}

export function drawerExists(
  location: DrawerLocation,
  layout: CabinetLayout[] = ARCHIVE_LAYOUT,
): boolean {
  return layout.some(
    ({ cabinet, drawers }) =>
      cabinet === location.cabinet && drawers.includes(location.drawer),
  );
}
