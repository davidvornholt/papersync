import type {
  ColorMode,
  InputSource,
  ScannerCapabilities,
  ScanSettings,
  SourceCapabilities,
} from './escl-types';

const parseXmlValue = (xml: string, tag: string): string | null => {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
};

const parseXmlValues = (xml: string, tag: string): string[] => {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'gi');
  const values: string[] = [];
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
    'i',
  );
  const match = xml.match(regex);
  return match ? match[0] : null;
};

const parseResolutions = (section: string): number[] => {
  const resolutions: number[] = [];
  const matches =
    section.match(/<scan:XResolution>(\d+)<\/scan:XResolution>/gi) || [];

  for (const match of matches) {
    const value = parseInt(match.replace(/<\/?[^>]+>/g, ''), 10);
    if (!Number.isNaN(value) && !resolutions.includes(value)) {
      resolutions.push(value);
    }
  }

  return resolutions.length > 0
    ? resolutions.sort((left, right) => left - right)
    : [75, 150, 300, 600];
};

const parseColorModes = (section: string): ColorMode[] => {
  const colorModes: ColorMode[] = [];
  if (section.includes('RGB24') || section.includes('Color')) {
    colorModes.push('color');
  }
  if (section.includes('Grayscale8') || section.includes('Grayscale')) {
    colorModes.push('grayscale');
  }
  if (section.includes('BlackAndWhite1') || section.includes('Binary')) {
    colorModes.push('blackwhite');
  }
  return colorModes.length > 0 ? colorModes : ['color', 'grayscale'];
};

const parseSourceCapabilities = (
  xml: string,
): {
  inputSources: InputSource[];
  sourceCapabilities: Record<InputSource, SourceCapabilities>;
} => {
  const inputSources: InputSource[] = [];
  const sourceCapabilities: Record<InputSource, SourceCapabilities> = {
    Platen: { resolutions: [300], colorModes: ['color', 'grayscale'] },
    Adf: { resolutions: [300], colorModes: ['color', 'grayscale'] },
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
    maxWidth: parseInt(parseXmlValue(xml, 'scan:MaxWidth') || '2550', 10),
    maxHeight: parseInt(parseXmlValue(xml, 'scan:MaxHeight') || '3300', 10),
    minWidth: parseInt(parseXmlValue(xml, 'scan:MinWidth') || '16', 10),
    minHeight: parseInt(parseXmlValue(xml, 'scan:MinHeight') || '16', 10),
  };
};

export const createScanRequestXml = (settings: ScanSettings): string => {
  const colorModeMap: Record<ColorMode, string> = {
    color: 'RGB24',
    grayscale: 'Grayscale8',
    blackwhite: 'BlackAndWhite1',
  };
  const formatMap: Record<ScanSettings['format'], string> = {
    pdf: 'application/pdf',
    jpeg: 'image/jpeg',
    png: 'image/png',
  };
  const inputSourceMap: Record<InputSource, string> = {
    Platen: 'Platen',
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
