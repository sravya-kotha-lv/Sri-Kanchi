const romanNumerals: Record<string, string> = {
  i: '1',
  ii: '2',
  iii: '3',
  iv: '4',
  v: '5',
  vi: '6',
  vii: '7',
  viii: '8',
  ix: '9',
  x: '10',
  xi: '11',
  xii: '12',
  xiii: '13',
  xiv: '14',
  xv: '15',
  xvi: '16',
  xvii: '17',
  xviii: '18',
  xix: '19',
  xx: '20'
};

export const formatCurrency = (value: number) => `\u20B9${value.toLocaleString('en-IN')}`;

export const sanitizeDisplayText = (value: string) =>
  value
    .replace(/\b(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv|xvi|xvii|xviii|xix|xx)\b/gi, (match) =>
      romanNumerals[match.toLowerCase()] ?? match
    )
    .replace(/[^\w\s&().,/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
