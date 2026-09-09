import type {
  ColorMode,
  InputSource,
  ScannerCapabilities,
  ScanSettings,
  SourceCapabilities,
} from './escl-types';

const defaultResolution = 300;
const draftResolution = 75;
const screenResolution = 150;
const highResolution = 600;
const fallbackResolutions = [
  draftResolution,
  screenResolution,
  defaultResolution,
  highResolution,
];
const parseXmlValue = (xml: string, tag: string): string | null => {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'iu');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
};

const parseXmlValues = (xml: string, tag: string): Array<string> => {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'giu');
  const values: Array<string> = [];
  let matchResult: RegExpExecArray | null = regex.exec(xml);
  while (matchResult !== null) {
    values.push(matchResult[1].trim());
    matchResult = regex.exec(xml);
  }
  return values;
};

const extractSection = (xml: string, sectionName: string): string | null => {
  const regex = new RegExp(
    `<scan:${sectionName}[^>]*>([\\s\\S]*?)</scan:${sectionName}>`,
    'iu',
  );
  const match = xml.match(regex);
  return match ? match[0] : null;
};

const parseResolutions = (section: string): Array<number> => {
  const resolutions: Array<number> = [];
  const matches =
    section.match(/<scan:XResolution>(?:\d+)<\/scan:XResolution>/giu) || [];

  for (const match of matches) {
    const value = Number.parseInt(match.replace(/<\/?[^>]+>/gu, ''), 10);
    if (!(Number.isNaN(value) || resolutions.includes(value))) {
      resolutions.push(value);
    }
  }

  return resolutions.length > 0
    ? resolutions.sort((left, right) => left - right)
    : [...fallbackResolutions];
};

const parseColorModes = (section: string): Array<ColorMode> => {
  const colorModes: Array<ColorMode> = [];
  if (section.includes('RGB24') || section.includes('Color')) {
    colorModes.push('color');
  }
  if (section.includes('Grayscale8') || section.includes('Grayscale')) {
    colorModes.push('grayscale');
  }
  // biome-ignore lint/security/noSecrets: eSCL protocol value required by scanners.
  if (section.includes('BlackAndWhite1') || section.includes('Binary')) {
    colorModes.push('blackwhite');
  }
  return colorModes.length > 0 ? colorModes : ['color', 'grayscale'];
};

const parseSourceCapabilities = (
  xml: string,
): {
  inputSources: Array<InputSource>;
  sourceCapabilities: Record<InputSource, SourceCapabilities>;
} => {
  const inputSources: Array<InputSource> = [];
  const sourceCapabilities: Record<InputSource, SourceCapabilities> = {
    // biome-ignore lint/style/useNamingConvention: eSCL protocol value required by scanners.
    Platen: {
      resolutions: [defaultResolution],
      colorModes: ['color', 'grayscale'],
    },
    // biome-ignore lint/style/useNamingConvention: eSCL protocol value required by scanners.
    Adf: {
      resolutions: [defaultResolution],
      colorModes: ['color', 'grayscale'],
    },
  };

  const platenSection = extractSection(xml, 'Platen');
  if (platenSection) {
    inputSources.push('Platen');
    sourceCapabilities.Platen = {
      resolutions: parseResolutions(platenSection),
      colorModes: parseColorModes(platenSection),
    };
  }

  const adfSection = extractSection(xml, 'Adf');
  if (adfSection) {
    inputSources.push('Adf');
    sourceCapabilities.Adf = {
      resolutions: parseResolutions(adfSection),
      colorModes: parseColorModes(adfSection),
    };
  }

  if (inputSources.length === 0) {
    inputSources.push('Platen');
  }

  return { inputSources, sourceCapabilities };
};

export const parseCapabilitiesXml = (xml: string): ScannerCapabilities => {
  const { inputSources, sourceCapabilities } = parseSourceCapabilities(xml);
  const formats = parseXmlValues(xml, 'pwg:DocumentFormat');
  if (formats.length === 0) {
    formats.push('application/pdf', 'image/jpeg');
  }

  return {
    inputSources,
    sourceCapabilities,
    formats,
    maxWidth: Number.parseInt(
      parseXmlValue(xml, 'scan:MaxWidth') || '2550',
      10,
    ),
    maxHeight: Number.parseInt(
      parseXmlValue(xml, 'scan:MaxHeight') || '3300',
      10,
    ),
    minWidth: Number.parseInt(parseXmlValue(xml, 'scan:MinWidth') || '16', 10),
    minHeight: Number.parseInt(
      parseXmlValue(xml, 'scan:MinHeight') || '16',
      10,
    ),
  };
};

export const createScanRequestXml = (settings: ScanSettings): string => {
  const colorModeMap: Record<ColorMode, string> = {
    color: 'RGB24',
    grayscale: 'Grayscale8',
    // biome-ignore lint/security/noSecrets: eSCL protocol value required by scanners.
    blackwhite: 'BlackAndWhite1',
  };
  const formatMap: Record<ScanSettings['format'], string> = {
    pdf: 'application/pdf',
    jpeg: 'image/jpeg',
    png: 'image/png',
  };
  const inputSourceMap: Record<InputSource, string> = {
    // biome-ignore lint/style/useNamingConvention: eSCL protocol value required by scanners.
    Platen: 'Platen',
    // biome-ignore lint/style/useNamingConvention: eSCL protocol value required by scanners.
    Adf: 'Feeder',
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<scan:ScanSettings xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03"
                   xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm">
  <pwg:Version>2.0</pwg:Version>
  <scan:Intent>Document</scan:Intent>
  <pwg:ScanRegions>
    <pwg:ScanRegion>
      <pwg:ContentRegionUnits>escl:ThreeHundredthsOfInches</pwg:ContentRegionUnits>
      <pwg:XOffset>0</pwg:XOffset>
      <pwg:YOffset>0</pwg:YOffset>
      <pwg:Width>2480</pwg:Width>
      <pwg:Height>3507</pwg:Height>
    </pwg:ScanRegion>
  </pwg:ScanRegions>
  <pwg:InputSource>${inputSourceMap[settings.inputSource]}</pwg:InputSource>
  <scan:ColorMode>${colorModeMap[settings.colorMode]}</scan:ColorMode>
  <scan:XResolution>${settings.resolution}</scan:XResolution>
  <scan:YResolution>${settings.resolution}</scan:YResolution>
  <pwg:DocumentFormat>${formatMap[settings.format]}</pwg:DocumentFormat>
</scan:ScanSettings>`;
};
