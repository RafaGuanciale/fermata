// Fotos do Unsplash (licença Unsplash: uso livre, crédito apreciado — ver README).
// Carregadas direto do CDN deles no tamanho certo para cada lugar.

export const PHOTOS = {
  todayHero: '1635476573973-fdb06ca7ad4d',
  practiceLocate: '1638534958793-b198c7635575',
  practiceSong: '1552422535-c45813c61732',
  repertoireHero: '1551970353-3960cb854a2b',
  // Categorias do repertório
  filmes: '1688678004647-945d5aaf91c1',
  classico: '1701749059090-ac8afdba7b44',
  jazz: '1541804627596-3b5b9ef58c93',
  mpb: '1510915361894-db8b60106cb1',
  popRock: '1577648884063-1d3d1477b8a7',
  jogos: '1552820728-8b83bb6b773f',
  infantil: '1578735547202-892b1f03a587',
  musicos: '1616714109948-c74fe5029a4d',
  // Módulos de estudo
  teclado: '1538402074774-8e624f3f7e5d',
  leitura: '1507838153414-b4b713384a76',
  ritmo: '1774039889983-e7abe755832d',
  acordes: '1470019693664-1d202d2c0907',
  escalas: '1547931295-64c05303a15b',
  harmonia: '1780324008116-94a743271848',
} as const;

export type PhotoKey = keyof typeof PHOTOS;

export function photoUrl(key: PhotoKey, width: number): string {
  return `https://images.unsplash.com/photo-${PHOTOS[key]}?w=${width}&q=70&auto=format&fit=crop`;
}

export function photoSrcSet(key: PhotoKey, widths: number[] = [400, 700, 1100]): string {
  return widths.map((w) => `${photoUrl(key, w)} ${w}w`).join(', ');
}
