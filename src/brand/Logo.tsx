// Logotipo no mesmo desenho do Permana: a moeda com a inicial faz o papel da primeira letra
// e o resto do nome segue em Cinzel. Lê-se FERMATA.
// O F é caligráfico (glifo "T" da Petit Formal Script, licença OFL) com um ramo de notas
// no lugar do traço do meio; a última nota é blush, a cor que liga o Fermata ao Permana.

const F_STROKE = 'M1142 1219Q1177 1282 1225 1339Q1273 1396 1330 1444Q1242 1452 1155.5 1467.5Q1069 1483 984.5 1498Q900 1513 818 1524Q736 1535 657 1535Q568 1535 507 1519Q446 1503 407.5 1474.5Q369 1446 352 1406Q335 1366 335 1317Q335 1268 350 1232Q365 1196 393 1172.5Q421 1149 459.5 1137.5Q498 1126 545 1126Q577 1126 612 1131Q647 1136 681.5 1145.5Q716 1155 749 1168Q782 1181 810 1197L830 1173Q764 1135 688 1114Q612 1093 543 1093Q485 1093 439 1108.5Q393 1124 360.5 1153Q328 1182 311 1224Q294 1266 294 1319Q294 1460 412.5 1535Q531 1610 755 1610Q845 1610 931.5 1599Q1018 1588 1104.5 1574.5Q1191 1561 1279 1549Q1367 1537 1460 1534Q1541 1580 1626 1606Q1711 1632 1795 1632Q1838 1632 1853.5 1624Q1869 1616 1869 1594Q1869 1561 1838 1532.5Q1807 1504 1752.5 1483Q1698 1462 1623 1450Q1548 1438 1461 1438Q1447 1438 1433 1438Q1419 1438 1405 1439Q1391 1425 1379.5 1411Q1368 1397 1358 1382Q1349 1369 1340 1351.5Q1331 1334 1319 1306.5Q1307 1279 1291 1238Q1275 1197 1252.5 1135.5Q1230 1074 1199 989.5Q1168 905 1127 791Q1047 572 964.5 414.5Q882 257 789 156.5Q696 56 589 8.5Q482 -39 353 -39Q183 -39 91.5 36Q0 111 0 251Q0 302 12 347Q24 392 44 426Q64 460 90.5 480Q117 500 147 500Q173 500 187.5 484.5Q202 469 202 440Q202 426 197.5 416Q193 406 182 398Q171 390 152 381Q133 372 104 360Q75 347 61 323.5Q47 300 47 249Q47 126 121 63.5Q195 1 345 1Q406 1 457 11Q508 21 552.5 47.5Q597 74 637.5 120Q678 166 719.5 237Q761 308 805.5 407Q850 506 903 640Q947 753 979.5 835Q1012 917 1035.5 975.5Q1059 1034 1075 1073Q1091 1112 1102.5 1139Q1114 1166 1123 1184Q1132 1202 1142 1219ZM1790 1604Q1727 1604 1662 1585Q1597 1566 1537 1534Q1594 1536 1647.5 1541.5Q1701 1547 1743 1555Q1785 1563 1810 1572.5Q1835 1582 1835 1592Q1835 1604 1790 1604Z';

const NOTES: [number, number][] = [
  [56.6, 50.5],
  [65.6, 46.5],
  [73.6, 42.5],
];

export function FermataMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <circle className="logo__coin" cx="50" cy="50" r="48" />
      <circle className="logo__ring" cx="50" cy="50" r="42.5" fill="none" />
      <path className="logo__letter" d={F_STROKE} transform="translate(14 80.68) scale(0.03852 -0.03852)" />
      <path className="logo__branch" d="M42.6 59C52.6 55 62.6 51 74.6 45" fill="none" />
      {NOTES.map(([x, y], i) => (
        <ellipse key={x} className={i === NOTES.length - 1 ? 'logo__accent' : 'logo__letter'} cx={x} cy={y} rx="3.2" ry="2.3" transform={`rotate(-25 ${x} ${y})`} />
      ))}
    </svg>
  );
}

export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={'logo' + (compact ? ' logo-compact' : '')}>
      <FermataMark className="logo__mark" title={compact ? 'Fermata' : undefined} />
      {!compact && (
        <span className="logo__word" aria-label="Fermata">
          <span aria-hidden>ERMATA</span>
        </span>
      )}
    </span>
  );
}
